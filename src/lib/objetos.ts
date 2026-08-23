import data from "./objetos.json";

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

const POR_SLUG = new Map(OBJETOS.map((objeto) => [objeto.slug, objeto]));

export function objetoPorSlug(slug: string): ObjetoDelJuego | undefined {
  return POR_SLUG.get(slug);
}

/** Dirección del dibujo de un objeto en PokéAPI. */
export function spriteDeObjeto(slug: string) {
  return `${SPRITES_DE_OBJETOS}/${slug}.png`;
}

/**
 * Sugerencias para el buscador: primero los que empiezan por lo escrito, luego
 * los que lo llevan dentro. Igual que el de especies.
 */
export function buscarObjetos(consulta: string, limite = 8): ObjetoDelJuego[] {
  const aguja = normalizar(consulta);
  if (!aguja) return [];

  const empiezan: ObjetoDelJuego[] = [];
  const contienen: ObjetoDelJuego[] = [];

  for (const objeto of OBJETOS) {
    const nombre = normalizar(objeto.nombre);
    if (nombre.startsWith(aguja)) empiezan.push(objeto);
    else if (nombre.includes(aguja)) contienen.push(objeto);
    if (empiezan.length >= limite) break;
  }

  return [...empiezan, ...contienen].slice(0, limite);
}
