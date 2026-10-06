import datos from "./movimientos.json";
import { tipoDelMovimiento, type TipoDeMovimiento } from "@/lib/tipo-del-movimiento";
import { tiposDeGeneracion } from "@/lib/tipos";
import { GENERACION_ANIL, MOVIMIENTOS_DE_ANIL as DE_ANIL, potenciaEnAnil, tipoDeMovimientoEnAnil } from "@/lib/anil";

/**
 * Los movimientos y las naturalezas, para la **ficha completa** de cada
 * pokémon del Equipo y PC: naturaleza, objeto y cuatro movimientos. Sin nivel:
 * el grupo no lo quiere ni opcional.
 *
 * Los datos salen de `scripts/generate-movimientos.ts` (unos 50 KB). En el
 * navegador solo se cargan al editar la ficha (con `import()`): para enseñarla,
 * el servidor ya manda los nombres y los tipos resueltos.
 *
 * Se guarda **el identificador de PokéAPI** ("thunderbolt", "adamant"), no el
 * nombre en español: es el mismo que usa Showdown y no cambia si cambia la
 * traducción.
 */

export type Movimiento = TipoDeMovimiento & {
  s: string;
  /** Nombre en español */
  n: string;
  /** 0 de estado, 1 físico, 2 especial */
  c: number;
  p?: number;
  /** Generación en la que salió */
  g: number;
};

export type Naturaleza = { s: string; n: string; sube: string | null; baja: string | null };

/**
 * Los de siempre, con su tipo en Pokémon Añil cuando allí es otro (Fuerza es
 * Roca): ver `tipoDelMovimiento`.
 */
export const MOVIMIENTOS: Movimiento[] = (datos.movimientos as Movimiento[]).map((m) => {
  const enAnil = tipoDeMovimientoEnAnil(m.s);
  return enAnil ? { ...m, an: enAnil } : m;
});
/**
 * Los nuevos de Pokémon Añil (Escalofrío, Deslizamiento…), aparte: solo se
 * ofrecen en sus lockes. Ver lib/anil.ts.
 */
export const MOVIMIENTOS_DE_ANIL: Movimiento[] = DE_ANIL;
export const NATURALEZAS: Naturaleza[] = datos.naturalezas;

export const MOVIMIENTOS_POR_POKEMON = 4;

/** Los que se pueden elegir en un locke: en uno de Añil, también los suyos */
export function movimientosDelJuego(conAnil: boolean) {
  return conAnil ? [...MOVIMIENTOS, ...MOVIMIENTOS_DE_ANIL] : MOVIMIENTOS;
}

// Por identificador, todos: lo guardado de Añil se tiene que poder enseñar
const POR_SLUG = new Map([...MOVIMIENTOS, ...MOVIMIENTOS_DE_ANIL].map((m) => [m.s, m]));
const NATURALEZA_POR_SLUG = new Map(NATURALEZAS.map((n) => [n.s, n]));

/** Sin acentos, mayúsculas ni nada que no sea letra o número */
export function plano(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const POR_NOMBRE = new Map<string, Movimiento>();
for (const m of MOVIMIENTOS) {
  POR_NOMBRE.set(plano(m.n), m);
  // También por su nombre en inglés, que es como sale en Showdown
  if (!POR_NOMBRE.has(plano(m.s))) POR_NOMBRE.set(plano(m.s), m);
}
// Los de Añil, por su nombre: con o sin tilde, que en Showdown van sin
const DE_ANIL_POR_NOMBRE = new Map(MOVIMIENTOS_DE_ANIL.map((m) => [plano(m.n), m]));
const NATURALEZA_POR_NOMBRE = new Map<string, Naturaleza>();
for (const n of NATURALEZAS) {
  NATURALEZA_POR_NOMBRE.set(plano(n.n), n);
  NATURALEZA_POR_NOMBRE.set(plano(n.s), n);
}

export function movimientoPorSlug(slug: string) {
  return POR_SLUG.get(slug);
}

/** Por su nombre en español o en inglés, como venga; con `conAnil`, también los de Añil */
export function movimientoPorNombre(nombre: string, conAnil = false) {
  const clave = plano(nombre);
  return POR_NOMBRE.get(clave) ?? (conAnil ? DE_ANIL_POR_NOMBRE.get(clave) : undefined);
}

export function naturalezaPorSlug(slug: string | null | undefined) {
  return slug ? NATURALEZA_POR_SLUG.get(slug) : undefined;
}

export function naturalezaPorNombre(nombre: string) {
  return NATURALEZA_POR_NOMBRE.get(plano(nombre));
}

/** Lo guardado en `Capture.movimientos`, leído: solo los que existen, hasta 4 */
export function leerMovimientos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((s): s is string => typeof s === "string" && POR_SLUG.has(s))
    .slice(0, MOVIMIENTOS_POR_POKEMON);
}

/**
 * Lo que necesita la cobertura de los movimientos de un pokémon: los que hacen
 * daño, con su tipo de ahora y los de antes. Los de estado no pegan a nadie.
 */
export function ataquesDeLosMovimientos(slugs: string[]): TipoDeMovimiento[] {
  return slugs.flatMap((s) => {
    const m = POR_SLUG.get(s);
    return m && m.c > 0 ? [{ t: m.t, ...(m.a ? { a: m.a } : {}), ...(m.an ? { an: m.an } : {}) }] : [];
  });
}

/** Un movimiento listo para pintar en la ficha, con su tipo en esa generación */
export function movimientoParaVer(slug: string, generacion: number) {
  const m = POR_SLUG.get(slug);
  if (!m) return null;
  const tipo = tipoDelMovimiento(m, generacion);
  const existe = tiposDeGeneracion(generacion).find((t) => t.id === tipo);
  return {
    slug: m.s,
    nombre: m.n,
    tipo: existe ? { slug: existe.slug, nombre: existe.nombre } : null,
    clase: m.c,
    // En Añil, con su potencia si la cambia (Ciclón pega 60)
    potencia: (generacion === GENERACION_ANIL ? potenciaEnAnil(m.s) : null) ?? m.p ?? null,
  };
}
export type MovimientoParaVer = NonNullable<ReturnType<typeof movimientoParaVer>>;
