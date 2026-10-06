import oficiales from "./habilidades.json";
import deAnil from "./habilidades-anil.json";

/**
 * Las habilidades, para la ficha de combate: nombre, descripción y cuáles puede
 * tener cada pokémon (para ofrecerlas primero).
 *
 * Las de los juegos salen de `scripts/habilidades.py` (PokéAPI); las de un
 * locke de **Pokémon Añil**, de `scripts/anil.py`: allí hay 18 nuevas (Realeza,
 * Sobrecarga…), otras hacen otra cosa (Entusiasmo también potencia los ataques
 * especiales) y muchos pokémon tienen otras. En un locke de Añil manda lo de
 * Añil, nombre y descripción incluidos; en los demás, lo de Añil no existe.
 *
 * Se guarda **el identificador de PokéAPI** ("overgrow"), como con los
 * movimientos; las nuevas de Añil, «anil-…». En el navegador se carga solo al
 * editar la ficha (con `import()`): para enseñarla, el servidor ya manda el
 * nombre y la descripción.
 */

export type Habilidad = { s: string; n: string; d: string };
type Datos = { habilidades: Habilidad[]; porPokemon: Record<string, string[]> };

const OFICIALES = oficiales as Datos;
const DE_ANIL = deAnil as Datos;

const POR_SLUG = new Map(OFICIALES.habilidades.map((h) => [h.s, h]));
const POR_SLUG_EN_ANIL = new Map(DE_ANIL.habilidades.map((h) => [h.s, h]));

/** Sin acentos, mayúsculas ni nada que no sea letra o número */
function plano(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Por su nombre en español o por el identificador en inglés (como viene de Showdown) */
function indice(lista: Habilidad[]) {
  const mapa = new Map<string, Habilidad>();
  for (const h of lista) {
    mapa.set(plano(h.n), h);
    if (!mapa.has(plano(h.s))) mapa.set(plano(h.s), h);
  }
  return mapa;
}
const POR_NOMBRE = indice(OFICIALES.habilidades);
const POR_NOMBRE_EN_ANIL = indice(DE_ANIL.habilidades);

/** Las que se pueden elegir en un locke */
export function habilidadesDelJuego(conAnil: boolean): Habilidad[] {
  return conAnil ? DE_ANIL.habilidades : OFICIALES.habilidades;
}

export function habilidadPorSlug(slug: string | null | undefined, conAnil: boolean): Habilidad | undefined {
  if (!slug) return undefined;
  return conAnil ? (POR_SLUG_EN_ANIL.get(slug) ?? POR_SLUG.get(slug)) : POR_SLUG.get(slug);
}

export function habilidadPorNombre(nombre: string, conAnil: boolean): Habilidad | undefined {
  const clave = plano(nombre.replace(/^anil-/, ""));
  return (conAnil ? POR_NOMBRE_EN_ANIL : POR_NOMBRE).get(clave);
}

/** Las que puede tener ese pokémon (la oculta, la última); vacío si no se sabe */
export function habilidadesDe(pokemonId: number | null | undefined, conAnil: boolean): string[] {
  if (!pokemonId) return [];
  const clave = String(pokemonId);
  return (conAnil ? DE_ANIL.porPokemon[clave] : undefined) ?? OFICIALES.porPokemon[clave] ?? [];
}

/** Lista para pintar en la ficha, con su descripción del juego que toque */
export function habilidadParaVer(slug: string | null | undefined, conAnil: boolean) {
  const h = habilidadPorSlug(slug, conAnil);
  return h ? { slug: h.s, nombre: h.n, descripcion: h.d } : null;
}
export type HabilidadParaVer = NonNullable<ReturnType<typeof habilidadParaVer>>;
