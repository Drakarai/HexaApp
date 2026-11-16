import datos from "./anil.json";

/**
 * Lo propio de **Pokémon Añil**, para los lockes que se juegan a él: sus dos
 * pokémon nuevos (Royaleon y Cefireon, que evolucionan de Eevee), sus formas y
 * megas nuevas (Mega Venusaur Y, Mega Snorlax, los cortes de Furfrou con su
 * tipo…) con sus megapiedras, los tipos que cambia (Meganium es Planta/Hada),
 * sus movimientos nuevos y los que cambian, sus objetos y sus habilidades (estas,
 * en lib/habilidades.ts). En cualquier otro juego no existe nada de esto.
 *
 * Los datos salen de los ficheros del juego (`scripts/anil.py`, a partir del
 * repositorio del servidor de Showdown de Añil) y solo traen lo que cambia
 * respecto a los de siempre; los dibujos, de su carpeta de gráficos
 * (`scripts/anil-sprites.py`).
 *
 * Sin `server-only`: lo usan el buscador de especies y la ficha en el navegador.
 */

type EspecieDeAnil = { dex: number; name: string; tipos: number[]; de: number };
type FormaDeAnil = { id: number; de: number; etiqueta: string; tipos: number[]; mega?: string; sprite: string };
type MovimientoDeAnil = { s: string; n: string; t: number; c: number; p?: number; g: number };
type ObjetoDeAnil = { slug: string; nombre: string; grupo: string };
type Datos = {
  especies: EspecieDeAnil[];
  formas: FormaDeAnil[];
  tipos: Record<string, number[]>;
  movimientos: MovimientoDeAnil[];
  tiposDeMovimientos: Record<string, number>;
  potencias: Record<string, number>;
  /** Cada megapiedra de Añil: a qué mega lleva y desde qué forma */
  megas: Record<string, [number, number][]>;
  objetos: { nuevos: ObjetoDeAnil[]; fuera: string[] };
};
const D = datos as unknown as Datos;

/**
 * Lo pequeño (si un número es de Añil, sus dibujos, si un locke es de Añil)
 * vive en `anil-basico.ts`, que es lo que importa el navegador en todas las
 * pantallas: este fichero arrastra todos los datos del juego (objetos, megas,
 * formas…) y solo hace falta donde se usan.
 */
export {
  GENERACION_ANIL,
  esPokemonDeAnil,
  esMovimientoDeAnil,
  spritesDeAnil,
  esPokemonAnil,
} from "./anil-basico";

export const ESPECIES_DE_ANIL = D.especies;
export const FORMAS_DE_ANIL = D.formas;
export const MOVIMIENTOS_DE_ANIL = D.movimientos;
export const MEGAS_DE_ANIL = D.megas;
export const OBJETOS_DE_ANIL = D.objetos.nuevos;
/** Los objetos de los juegos que en Añil no están (la Venusaurita es allí la X) */
export const OBJETOS_QUE_NO_ESTAN_EN_ANIL = new Set(D.objetos.fuera);

/** Los tipos de un pokémon en Añil, si cambian (o si es de los suyos); si no, null */
export function tiposEnAnil(pokemonId: number): number[] | null {
  return D.tipos[String(pokemonId)] ?? ESPECIES_DE_ANIL.find((e) => e.dex === pokemonId)?.tipos ?? null;
}

/** La potencia de un movimiento en Añil, si cambia (Fuerza pega 90) */
export function potenciaEnAnil(slug: string): number | null {
  return D.potencias[slug] ?? null;
}

/** El tipo de un movimiento en Añil, si cambia (Fuerza es Roca; Corte, Acero) */
export function tipoDeMovimientoEnAnil(slug: string): number | null {
  return D.tiposDeMovimientos[slug] ?? null;
}
