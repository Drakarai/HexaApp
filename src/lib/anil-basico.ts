import sprites from "./anil-sprites.json";

/**
 * Lo de **Pokémon Añil** que hace falta en todas partes y no pesa: saber si un
 * pokémon o un locke es de Añil y dónde están sus dibujos. Va aparte de
 * `anil.ts` porque el navegador lo carga en todas las pantallas (el sprite de
 * cada pokémon, el compañero), y aquel trae todos los datos del juego: decenas
 * de KB que solo se usan en el buscador o la ficha de combate.
 */

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

/** Si un número de pokémon es de los nuevos de Añil: de esos no hay nada en PokéAPI */
export function esPokemonDeAnil(pokemonId: number | null | undefined) {
  return Boolean(pokemonId && pokemonId >= PRIMER_NUMERO && pokemonId < PRIMER_NUMERO + 1000);
}

/** Si un movimiento es de los nuevos de Añil, por su identificador */
export function esMovimientoDeAnil(slug: string) {
  return slug.startsWith("anil-");
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
