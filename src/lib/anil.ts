import datos from "./anil.json";
import sprites from "./anil-sprites.json";

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
export const FORMAS_DE_ANIL = D.formas;
export const MOVIMIENTOS_DE_ANIL = D.movimientos;
export const MEGAS_DE_ANIL = D.megas;
export const OBJETOS_DE_ANIL = D.objetos.nuevos;
/** Los objetos de los juegos que en Añil no están (la Venusaurita es allí la X) */
export const OBJETOS_QUE_NO_ESTAN_EN_ANIL = new Set(D.objetos.fuera);

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

/** La potencia de un movimiento en Añil, si cambia (Fuerza pega 90) */
export function potenciaEnAnil(slug: string): number | null {
  return D.potencias[slug] ?? null;
}

/** El tipo de un movimiento en Añil, si cambia (Fuerza es Roca; Corte, Acero) */
export function tipoDeMovimientoEnAnil(slug: string): number | null {
  return D.tiposDeMovimientos[slug] ?? null;
}

/**
 * Los dibujos de lo que solo existe en Añil, en `public/anil` (ver
 * scripts/anil-sprites.py): la tira animada para la ficha, el quieto ya
 * recortado para las casillas y el icono de caja. El shiny de la tira va
 * entero o como lista de colores para repintar (`#colores`, como los de
 * Essentials); Mewtwo Armadura no trae shiny ni icono propio.
 */
const SPRITES = {
  shiny: new Set<number>(sprites.shiny),
  colores: new Set<number>(sprites.colores),
  iconosShiny: new Set<number>(sprites.iconosShiny),
};

export function spritesDeAnil(pokemonId: number, shiny: boolean) {
  const conShiny = shiny && (SPRITES.shiny.has(pokemonId) || SPRITES.colores.has(pokemonId));
  return {
    tira: !conShiny
      ? `/anil/frente/${pokemonId}.png`
      : SPRITES.shiny.has(pokemonId)
        ? `/anil/frente/shiny/${pokemonId}.png`
        : `/anil/frente/${pokemonId}.png#colores`,
    quieto: `/anil/quieto/${conShiny ? "shiny/" : ""}${pokemonId}.png`,
    icono: `/anil/iconos/${shiny && SPRITES.iconosShiny.has(pokemonId) ? "shiny/" : ""}${pokemonId}.png`,
  };
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
