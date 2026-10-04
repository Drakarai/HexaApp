import data from "./pokedex.json";

export type PokedexForm = { id: number; label: string };
export type PokedexSpecies = {
  dex: number;
  name: string;
  forms: PokedexForm[];
};

type RawSpecies = { dex: number; name: string; forms?: [number, string][] };

/**
 * Lista completa de especies con su nombre en español. Se genera con
 * scripts/generate-pokedex.ts a partir de los datos abiertos de PokéAPI.
 */
export const POKEDEX: PokedexSpecies[] = (data.species as RawSpecies[]).map(
  (entry) => ({
    dex: entry.dex,
    name: entry.name,
    forms: entry.forms
      ? entry.forms.map(([id, label]) => ({ id, label }))
      : [{ id: entry.dex, label: "Normal" }],
  }),
);

/** Sin acentos, en minúscula y sin guiones: "Porygon-Z" -> "porygonz" */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const BY_NORMALIZED = new Map(
  POKEDEX.map((species) => [normalize(species.name), species]),
);

/** Busca por nombre exacto, ignorando acentos y mayúsculas. */
export function findSpecies(name: string): PokedexSpecies | undefined {
  return BY_NORMALIZED.get(normalize(name));
}

/** Sugerencias para el buscador: primero las que empiezan por lo escrito. */
export function searchSpecies(query: string, limit = 8): PokedexSpecies[] {
  const needle = normalize(query);
  if (!needle) return [];

  const startsWith: PokedexSpecies[] = [];
  const contains: PokedexSpecies[] = [];

  for (const species of POKEDEX) {
    const name = normalize(species.name);
    if (name.startsWith(needle)) startsWith.push(species);
    else if (name.includes(needle)) contains.push(species);
    if (startsWith.length >= limit) break;
  }

  return [...startsWith, ...contains].slice(0, limit);
}

const SPRITES =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/**
 * Direcciones a probar en orden para una imagen. Se intenta la siguiente si
 * alguna no existe, que pasa con formas muy recientes.
 *
 * - "box": render de Pokémon HOME, que es el que va bien de sprite pequeño.
 * - "detail": ilustración oficial, para la ficha.
 * - "mini": el sprite pixelado de siempre. Pesa unos 900 bytes en vez de 110
 *   KB, así que es el que se usa para la vista previa del buscador, donde solo
 *   hace falta reconocer al pokémon.
 */
export function spriteCandidates(
  pokemonId: number,
  shiny: boolean,
  kind: "box" | "detail" | "mini",
) {
  const variant = shiny ? "shiny/" : "";
  const home = `${SPRITES}/other/home/${variant}${pokemonId}.png`;
  const artwork = `${SPRITES}/other/official-artwork/${variant}${pokemonId}.png`;
  const basic = `${SPRITES}/${variant}${pokemonId}.png`;

  if (kind === "mini") return [basic, home, artwork];
  return kind === "box" ? [home, artwork, basic] : [artwork, home, basic];
}

/**
 * Los sprites **al estilo de Blanco y Negro** para la ficha grande, en el
 * orden en que se prueban: el animado y, si no hay, el quieto.
 *
 * Hasta Genesect (#649) son los de los juegos; del 650 en adelante, los que
 * hizo la comunidad de Smogon con el mismo estilo, que PokéAPI sirve en la
 * misma carpeta. Quietos los hay de todos; animados, solo de algunos (y de
 * algunas formas, como Rotom Lavado). Así ninguno sale con el modelo 3D de los
 * juegos de ahora, que al grupo no le gusta: si no hay ninguno de estos, quien
 * los pinta se queda con el sprite de siempre.
 */
export function spritesDeQuinta(pokemonId: number | null | undefined, shiny: boolean) {
  if (!pokemonId) return [];
  const carpeta = `${SPRITES}/versions/generation-v/black-white`;
  const variocolor = shiny ? "shiny/" : "";
  return [`${carpeta}/animated/${variocolor}${pokemonId}.gif`, `${carpeta}/${variocolor}${pokemonId}.png`];
}
