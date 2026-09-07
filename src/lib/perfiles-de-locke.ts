/**
 * Qué cambia en un locke según cuánta gente lo juega.
 *
 * La aplicación nació dando por hecho que un locke son seis personas. No lo es:
 * con dos, la clasificación por puntos no dice nada y lo que importa es quién
 * gana más jornadas; con tres, la liguilla entera cabe dentro de una jornada.
 * Aquí está escrito **como datos** lo que depende del número de jugadores, para
 * que las pantallas no tengan que saberse los casos.
 *
 * El tamaño sale de `Competition.maxPlayers`, que es justo eso: para cuánta
 * gente se montó la edición. Se decide **al crear el locke y no se recalcula**
 * con los que quedan activos, porque si no, retirarse a mitad le cambiaría los
 * menús y las reglas a una partida ya empezada. (El final del locke sí mira los
 * activos: eso es otra cosa y va en `lib/formatos-finales.ts`.)
 *
 * No lleva `server-only`: lo leen también componentes de cliente.
 */

/** Cómo se llama un locke de cada tamaño. Es solo el rótulo. */
const NOMBRES: Record<number, string> = {
  2: "Dualocke",
  3: "Triolocke",
  4: "Tetralocke",
  5: "Pentalocke",
  6: "Hexalocke",
  7: "Heptalocke",
  8: "Octalocke",
};

export type PerfilDeLocke = {
  /** Para cuántos jugadores se montó */
  jugadores: number;
  nombre: string;
  /**
   * Si la liguilla entera cabe dentro de **una** jornada. Con tres o menos sí
   * —tres jugadores son tres combates: A-B, B-C y A-C—, y con cuatro o más cada
   * jornada es una ronda de la liguilla.
   */
  liguillaEntera: boolean;
  /**
   * Cuántas veces se juega cada emparejamiento dentro de la jornada. Solo el
   * dualocke lo usa: allí cada jornada es un **combate al mejor de tres**.
   */
  repeticiones: number;
  /**
   * Cómo se gana el locke en combates. Con dos jugadores no hay tabla que
   * valga: gana quien se lleve más jornadas.
   */
  victoria: "puntos" | "jornadas";
  /** Cómo se llama la pantalla de la clasificación en este locke */
  rotuloDeLaTabla: string;
};

/** El menos que puede tener un locke para que sea un locke. */
export const MINIMO_DE_JUGADORES = 2;

export function perfilDeLocke(jugadores: number): PerfilDeLocke {
  const cuantos = Math.max(MINIMO_DE_JUGADORES, Math.trunc(jugadores || 0));
  const esDual = cuantos === 2;
  return {
    jugadores: cuantos,
    nombre: NOMBRES[cuantos] ?? `Locke de ${cuantos}`,
    liguillaEntera: cuantos <= 3,
    // El mejor de tres del dualocke: tres veces el mismo emparejamiento
    repeticiones: esDual ? 3 : 1,
    victoria: esDual ? "jornadas" : "puntos",
    rotuloDeLaTabla: esDual ? "Marcador" : "Puntos",
  };
}

/**
 * Cuántas jornadas hay que ganar para llevarse el locke: la mayoría de las que
 * se hayan creado. Con las seis de siempre salen **cuatro**, que es la regla
 * que se acordó; si algún día se juegan ocho, saldrán cinco solas.
 */
export function jornadasParaGanar(cuantasJornadas: number) {
  return Math.floor(cuantasJornadas / 2) + 1;
}
