import datos from "./anil.json";

/**
 * Lo propio de **Pokémon Añil**, para los lockes que se juegan a él: sus dos
 * pokémon nuevos (Royaleon y Cefireon, que evolucionan de Eevee), los tipos que
 * cambia (Meganium es Planta/Hada, Typhlosion Fuego/Normal…) y sus movimientos
 * nuevos. En cualquier otro juego no existe nada de esto.
 *
 * Los datos salen de los ficheros del juego (`scripts/anil.py`, a partir del
 * repositorio del servidor de Showdown de Añil) y solo traen lo que cambia
 * respecto a los de siempre. Las megas y formas nuevas de Añil no están: el
 * grupo pidió solo los pokémon nuevos.
 *
 * Sin `server-only`: lo usan el buscador de especies y la ficha en el navegador.
 */

type EspecieDeAnil = { dex: number; name: string; tipos: number[]; de: number };
type MovimientoDeAnil = { s: string; n: string; t: number; c: number; p?: number; g: number };
type Datos = {
  especies: EspecieDeAnil[];
  tipos: Record<string, number[]>;
  movimientos: MovimientoDeAnil[];
  tiposDeMovimientos: Record<string, number>;
};
const D = datos as Datos;

/**
 * La «generación» de los tipos de un locke de Añil. Los tipos van por
 * generación en toda la app (ver lib/tipos.ts): con una propia, Añil llega a
 * cada pantalla por el mismo camino que la 2ª o la 9ª sin tocarlas una a una.
 * Es la tabla de ahora —no hay generación tan alta y se usa la última— con los
 * tipos de Añil encima.
 */
export const GENERACION_ANIL = 100;

/** Los números de sus pokémon nuevos: del 20001 en adelante (ver scripts/anil.py) */
const PRIMER_NUMERO = 20001;

export const ESPECIES_DE_ANIL = D.especies;
export const MOVIMIENTOS_DE_ANIL = D.movimientos;

/** Si un número de pokémon es de los nuevos de Añil: de esos no hay nada en PokéAPI */
export function esPokemonDeAnil(pokemonId: number | null | undefined) {
  return Boolean(pokemonId && pokemonId >= PRIMER_NUMERO && pokemonId < PRIMER_NUMERO + 1000);
}

/** Si un movimiento es de los nuevos de Añil, por su identificador */
export function esMovimientoDeAnil(slug: string) {
  return slug.startsWith("anil-");
}

/** Los tipos de un pokémon en Añil, si cambian (o si es de los suyos); si no, null */
export function tiposEnAnil(pokemonId: number): number[] | null {
  return D.tipos[String(pokemonId)] ?? ESPECIES_DE_ANIL.find((e) => e.dex === pokemonId)?.tipos ?? null;
}

/** El tipo de un movimiento en Añil, si cambia (Fuerza es Roca; Corte, Acero) */
export function tipoDeMovimientoEnAnil(slug: string): number | null {
  return D.tiposDeMovimientos[slug] ?? null;
}

/**
 * Si un locke se juega a Pokémon Añil. Va por el nombre, que es lo que se
 * escribe al elegir un juego no oficial: «Pokémon Añil», «Añil» o «Pokemon
 * Anil», con o sin tildes y con lo que se quiera detrás («Añil 2.0»). Un juego
 * de la lista oficial nunca lo es, aunque su texto libre dijera otra cosa.
 */
export function esPokemonAnil(edicion: {
  game?: string | null;
  gameId?: string | null;
  juegoNoOficial?: boolean;
}) {
  if (edicion.gameId && !edicion.juegoNoOficial) return false;
  const nombre = (edicion.game ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return /^(pokemon\s+)?anil\b/.test(nombre);
}
