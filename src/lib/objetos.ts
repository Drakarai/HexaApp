import data from "./objetos.json";
import { OBJETOS_DE_ANIL, OBJETOS_QUE_NO_ESTAN_EN_ANIL } from "./anil";

export type ObjetoDelJuego = {
  /** El nombre del sprite en PokéAPI ("ultra-ball") */
  slug: string;
  /** El nombre en español ("Ultra Ball") */
  nombre: string;
  /** La familia a la que pertenece ("Bolas", "Bayas", "Medicinas"…) */
  grupo: string;
};

/**
 * Todos los objetos de los juegos con nombre en español y dibujo propio. Se
 * genera con scripts/generate-items.ts a partir de los datos abiertos de
 * PokéAPI, igual que la pokédex, y el resultado se sube al repositorio: buscar
 * un objeto no depende de que nadie de fuera conteste.
 */
export const OBJETOS: ObjetoDelJuego[] = data.objetos;

/** De dónde salen los dibujos. Solo se usa al crear el objeto. */
export const SPRITES_DE_OBJETOS = data.sprites;

/** Sin acentos, en minúscula y sin guiones: "Poké Ball" -> "pokeball" */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Los de un locke de **Pokémon Añil**: los suyos (megapiedras nuevas, Peluca
 * Regia, Supermin. Evol.…) y, de los de siempre, solo los que hay en Añil (allí
 * la Venusaurita es la X). Ver lib/anil.ts.
 */
const CON_ANIL: ObjetoDelJuego[] = [
  ...OBJETOS.filter((objeto) => !OBJETOS_QUE_NO_ESTAN_EN_ANIL.has(objeto.slug)),
  ...OBJETOS_DE_ANIL,
].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

/** Los objetos que hay en un locke: en uno de Añil, los de Añil */
export function objetosDelJuego(conAnil: boolean) {
  return conAnil ? CON_ANIL : OBJETOS;
}

// Por identificador, todos: lo guardado de Añil se tiene que poder enseñar
const POR_SLUG = new Map([...OBJETOS, ...OBJETOS_DE_ANIL].map((objeto) => [objeto.slug, objeto]));

export function objetoPorSlug(slug: string): ObjetoDelJuego | undefined {
  return POR_SLUG.get(slug);
}

/** Si un objeto es de los que solo hay en Añil */
export function esObjetoDeAnil(slug: string) {
  return slug.startsWith("anil-");
}

/** Dirección del dibujo de un objeto: en PokéAPI, o en la app si es de Añil */
export function spriteDeObjeto(slug: string) {
  return esObjetoDeAnil(slug) ? `/anil/objetos/${slug}.png` : `${SPRITES_DE_OBJETOS}/${slug}.png`;
}

/**
 * Sugerencias para el buscador: primero los que empiezan por lo escrito, luego
 * los que lo llevan dentro. Igual que el de especies.
 */
export function buscarObjetos(consulta: string, limite = 8, conAnil = false): ObjetoDelJuego[] {
  const aguja = normalizar(consulta);
  if (!aguja) return [];

  const empiezan: ObjetoDelJuego[] = [];
  const contienen: ObjetoDelJuego[] = [];

  for (const objeto of objetosDelJuego(conAnil)) {
    const nombre = normalizar(objeto.nombre);
    if (nombre.startsWith(aguja)) empiezan.push(objeto);
    else if (nombre.includes(aguja)) contienen.push(objeto);
    if (empiezan.length >= limite) break;
  }

  return [...empiezan, ...contienen].slice(0, limite);
}
