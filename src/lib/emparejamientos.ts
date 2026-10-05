import type { PerfilDeLocke } from "@/lib/perfiles-de-locke";

/**
 * Quién juega contra quién en cada jornada.
 *
 * Las cinco reglas que se acordaron —seis todos contra todos, cinco con uno
 * descansando, cuatro repitiendo parejas, tres estilo Champions dentro de la
 * jornada y dos al mejor de tres— son en realidad **una sola liguilla** vista de
 * dos maneras:
 *
 * - con cuatro jugadores o más, cada jornada es **una ronda** de la liguilla;
 * - con tres o menos, la liguilla **entera** cabe en una jornada.
 *
 * De ahí sale todo lo demás sin escribir ningún caso a mano: si sois impares
 * descansa uno distinto cada ronda (rotación fija, así todos descansan una vez
 * antes de que repita nadie), y si se juegan más jornadas que rondas tiene la
 * liguilla, se da la vuelta y las parejas se repiten **en el mismo orden**, que
 * es tanto como decir que siempre se propone la que más tiempo lleva sin
 * jugarse. Y sirve igual para siete u ocho jugadores el día que hagan falta.
 */

export type Ronda = {
  /** Los emparejamientos de esa ronda */
  pares: Array<[string, string]>;
  /** Quién descansa, si el número de jugadores es impar */
  descansa: string | null;
};

/**
 * Las rondas de una liguilla de todos contra todos, por el método del círculo:
 * uno se queda quieto y los demás rotan a su alrededor. Con un número impar de
 * jugadores se mete un hueco, y a quien le toca el hueco es el que descansa.
 */
export function rondasDeLiguilla(jugadores: string[]): Ronda[] {
  if (jugadores.length < 2) return [];

  const orden: Array<string | null> =
    jugadores.length % 2 ? [...jugadores, null] : [...jugadores];
  const cuantos = orden.length;

  const rondas: Ronda[] = [];
  for (let ronda = 0; ronda < cuantos - 1; ronda++) {
    const pares: Array<[string, string]> = [];
    let descansa: string | null = null;

    for (let i = 0; i < cuantos / 2; i++) {
      const a = orden[i];
      const b = orden[cuantos - 1 - i];
      if (a === null || b === null) descansa = a ?? b;
      else pares.push([a, b]);
    }

    rondas.push({ pares, descansa });
    // Rotar todos menos el primero, que es el eje del círculo
    orden.splice(1, 0, orden.pop()!);
  }

  return rondas;
}

/**
 * Lo que toca jugar en la jornada número `numero` (la primera es la 1).
 *
 * Los jugadores tienen que venir **siempre en el mismo orden** entre jornadas
 * —por fecha de alta, no por nombre, que se puede cambiar—, porque la rotación
 * se cuenta desde ahí: si el orden baila, la liguilla deja de repartirse bien.
 */
export function emparejamientosDeJornada(
  perfil: PerfilDeLocke,
  jugadores: string[],
  numero: number,
  /** La serie de esta jornada, si se eligió (ver `alMejorDeDeLaJornada`) */
  alMejorDe: number = perfil.serieAlMejorDe ?? 1,
): Ronda {
  const rondas = rondasDeLiguilla(jugadores);
  if (!rondas.length) return { pares: [], descansa: null };

  if (perfil.liguillaEntera) {
    /**
     * Toda la liguilla en una jornada. Con dos jugadores solo hay una pareja, y
     * la jornada es una serie: se crean **los combates que se juegan siempre**
     * —dos, de un mejor de tres— y el desempate se añade solo si hace falta
     * (`lib/series.ts`). Crear los tres de entrada dejaba uno de adorno que la
     * mitad de las veces no se juega.
     */
    const pares = rondas.flatMap((ronda) => ronda.pares);
    const veces = Math.ceil(alMejorDe / 2);
    return {
      pares: Array.from({ length: veces }, () => pares).flat(),
      descansa: null,
    };
  }

  // Una ronda por jornada, dando la vuelta cuando se acaban
  const cual = (Math.max(1, numero) - 1) % rondas.length;
  return rondas[cual];
}
