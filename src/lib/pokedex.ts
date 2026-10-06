import data from "./pokedex.json";
import { ESPECIES_DE_ANIL, FORMAS_DE_ANIL, esPokemonDeAnil } from "./anil";

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

/**
 * Los pokémon nuevos de **Pokémon Añil** (Royaleon y Cefireon), aparte: solo
 * existen en sus lockes, así que los buscadores solo los ofrecen si se les
 * pide (`conAnil`). Ver lib/anil.ts.
 */
export const POKEDEX_DE_ANIL: PokedexSpecies[] = ESPECIES_DE_ANIL.map((especie) => ({
  dex: especie.dex,
  name: especie.name,
  forms: [{ id: especie.dex, label: "Normal" }],
}));

/**
 * La pokédex de un locke de Añil: la de siempre con las formas y megas de Añil
 * en su especie (Venusaur gana «Mega Y»; Furfrou, sus cortes) y sus pokémon
 * nuevos al final.
 */
const FORMAS_POR_ESPECIE = new Map<number, PokedexForm[]>();
for (const forma of FORMAS_DE_ANIL) {
  FORMAS_POR_ESPECIE.set(forma.de, [...(FORMAS_POR_ESPECIE.get(forma.de) ?? []), { id: forma.id, label: forma.etiqueta }]);
}
export const POKEDEX_CON_ANIL: PokedexSpecies[] = [
  ...POKEDEX.map((especie) => {
    const deAnil = FORMAS_POR_ESPECIE.get(especie.dex);
    return deAnil ? { ...especie, forms: [...especie.forms, ...deAnil] } : especie;
  }),
  ...POKEDEX_DE_ANIL,
];

const BY_NORMALIZED = new Map(
  POKEDEX.map((species) => [normalize(species.name), species]),
);
const CON_ANIL_POR_NOMBRE = new Map(POKEDEX_CON_ANIL.map((species) => [normalize(species.name), species]));

/** Busca por nombre exacto, ignorando acentos y mayúsculas; con `conAnil`, con lo de Añil */
export function findSpecies(name: string, conAnil = false): PokedexSpecies | undefined {
  return (conAnil ? CON_ANIL_POR_NOMBRE : BY_NORMALIZED).get(normalize(name));
}

/** Sugerencias para el buscador: primero las que empiezan por lo escrito. */
export function searchSpecies(query: string, limit = 8, conAnil = false): PokedexSpecies[] {
  const needle = normalize(query);
  if (!needle) return [];

  const startsWith: PokedexSpecies[] = [];
  const contains: PokedexSpecies[] = [];

  for (const species of conAnil ? POKEDEX_CON_ANIL : POKEDEX) {
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
  // De los de Añil no hay nada en PokéAPI: no se pide lo que no existe
  if (esPokemonDeAnil(pokemonId)) return [];
  const variant = shiny ? "shiny/" : "";
  const home = `${SPRITES}/other/home/${variant}${pokemonId}.png`;
  const artwork = `${SPRITES}/other/official-artwork/${variant}${pokemonId}.png`;
  const basic = `${SPRITES}/${variant}${pokemonId}.png`;

  if (kind === "mini") return [basic, home, artwork];
  return kind === "box" ? [home, artwork, basic] : [artwork, home, basic];
}
