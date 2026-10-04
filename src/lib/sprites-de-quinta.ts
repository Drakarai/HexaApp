/**
 * Los sprites al estilo de Blanco y Negro, sin cargar la Pokédex: solo arma
 * direcciones, así que lo puede usar cualquier pantalla del navegador.
 *
 * Hasta Genesect (#649) son los de los juegos; del 650 en adelante, los que
 * hizo la comunidad de Smogon con el mismo estilo, que PokéAPI sirve en la
 * misma carpeta. Quietos los hay de todos; animados, solo de algunos (y de
 * algunas formas, como Rotom Lavado). Así ninguno sale con el modelo 3D de los
 * juegos de ahora, que al grupo no le gusta.
 */
const CARPETA =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white";

export function spriteQuietoDeQuinta(pokemonId: number, shiny: boolean) {
  return `${CARPETA}/${shiny ? "shiny/" : ""}${pokemonId}.png`;
}

export function spriteAnimadoDeQuinta(pokemonId: number, shiny: boolean) {
  return `${CARPETA}/animated/${shiny ? "shiny/" : ""}${pokemonId}.gif`;
}

/** Para la ficha grande, en el orden en que se prueban: el animado y, si no hay, el quieto */
export function spritesDeQuinta(pokemonId: number | null | undefined, shiny: boolean) {
  if (!pokemonId) return [];
  return [spriteAnimadoDeQuinta(pokemonId, shiny), spriteQuietoDeQuinta(pokemonId, shiny)];
}

/**
 * Qué pokémon es una imagen del almacén, por su dirección: todas las de
 * pokémon se guardan como `pkm-<número>-<box|detail>[-shiny]` (ver
 * lib/almacen-de-imagenes.ts) y salen por `/api/imagen/c/<esa clave>`. Las de
 * antes del almacén (incrustadas) no lo dicen, y entonces se quedan como están.
 */
export function pokemonDeLaImagen(src: string | null | undefined) {
  const encontrado = /\/api\/imagen\/c\/pkm-(\d+)-[a-z]+(-shiny)?(?:$|[?#])/.exec(decodeURIComponent(src ?? ""));
  return encontrado ? { pokemonId: Number(encontrado[1]), shiny: Boolean(encontrado[2]) } : null;
}

/** El estilo de sprites que elige cada uno en Mi perfil; sin elegir, Blanco y Negro */
export const COOKIE_DE_SPRITES = "hexaapp-sprites";
export type EstiloDeSprites = "quinta" | "home";
export function leerEstiloDeSprites(valor: string | null | undefined): EstiloDeSprites {
  return valor === "home" ? "home" : "quinta";
}
