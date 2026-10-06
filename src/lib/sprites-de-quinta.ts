import iconos from "./iconos-de-caja.json";

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

/**
 * Los iconos de caja, en dos estilos a elegir en Mi perfil:
 *
 * - **Espada y Escudo** (`iconos`): los muñequitos del PC de la 8ª, con más
 *   detalle. PokéAPI los tiene hasta el #898 y casi todas sus formas; los que
 *   faltan (Hisui, Paldea, las megas nuevas…) salen del paquete de Pokémon
 *   Essentials. Sin variocolor, como en Espada y Escudo: la casilla ya lleva su
 *   destello.
 * - **Todos iguales** (`iconos-todos`): todos los del paquete de Essentials
 *   (los de la 7ª al doble, y los nuevos al mismo estilo), también variocolor.
 *   Los que el paquete no trae (algunas Gigamax, Pikachu con gorra…) se quedan
 *   con el de Espada y Escudo.
 *
 * Los del paquete van en `public/iconos-de-caja`, ya recortados (los genera
 * `scripts/iconos-de-caja.py`). Las formas que se ven igual que otra (los
 * Dominantes, Minior Meteorito…) usan el de esa.
 */
const ICONOS = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons";
const DEL_PAQUETE = {
  todos: new Set<number>(iconos.todos),
  shiny: new Set<number>(iconos.shiny),
  colores: new Set<number>(iconos.colores),
  sinEspadaYEscudo: new Set<number>(iconos.sinEspadaYEscudo),
};
const ALIAS: Record<string, number> = iconos.alias;

/** Lo que va detrás de `#` en una imagen que hay que repintar de shiny (ver `SpritePokemon`) */
export const REPINTAR = "#colores";

export function iconoDeCaja(pokemonId: number, shiny = false, todosIguales = false): string {
  const id = ALIAS[pokemonId] ?? pokemonId;
  const delPaquete = DEL_PAQUETE.todos.has(id) && (todosIguales || DEL_PAQUETE.sinEspadaYEscudo.has(id));
  if (!delPaquete) return `${ICONOS}/${id}.png`;
  if (todosIguales && shiny && DEL_PAQUETE.shiny.has(id)) return `/iconos-de-caja/shiny/${id}.png`;
  if (todosIguales && shiny && DEL_PAQUETE.colores.has(id)) return `/iconos-de-caja/${id}.png${REPINTAR}`;
  return `/iconos-de-caja/${id}.png`;
}

/** El estilo de sprites que elige cada uno en Mi perfil; sin elegir, Blanco y Negro */
export const COOKIE_DE_SPRITES = "hexaapp-sprites";
export type EstiloDeSprites = "quinta" | "iconos" | "iconos-todos" | "home";
export function leerEstiloDeSprites(valor: string | null | undefined): EstiloDeSprites {
  return valor === "home" || valor === "iconos" || valor === "iconos-todos" ? valor : "quinta";
}
