import datos from "./movimientos-detalle.json";

/**
 * Lo que sale al tocar un movimiento en la ficha de combate: precisión, PP,
 * prioridad, si hace contacto, su descripción y sus efectos con la
 * probabilidad exacta, **con los valores de la generación del locke** (Rayo
 * tenía 95 de potencia hasta la 5ª; Onda Trueno no fallaba hasta la 6ª).
 *
 * Los datos salen de `scripts/generate-movimientos-detalle.ts` (PokéAPI para
 * los números, su historial y la descripción; Showdown para los efectos). De
 * antes solo se sabe cuánto cambió la probabilidad del efecto, no si el efecto
 * era otro: los efectos son los de hoy. En el navegador se carga al tocar un
 * movimiento por primera vez (`import()`), no antes.
 */

type Cambio = { p?: number; pc?: number | null; pp?: number; pr?: number; ec?: number };
type Crudo = {
  pc?: number;
  pp: number;
  pr?: number;
  k?: 1;
  d: string;
  e?: [number, string][];
  x?: string[];
  h?: [number, Cambio][];
};

const DETALLE = datos as unknown as Record<string, Crudo>;

/** Lo que tenía en esa generación: los cambios de después de ella no cuentan */
function enGeneracion(m: Crudo, generacion: number): Cambio {
  const valores: Cambio = {};
  // Del más nuevo al más antiguo: cada cambio pisa lo de después
  for (const [hasta, antes] of [...(m.h ?? [])].reverse()) {
    if (generacion <= hasta) Object.assign(valores, antes);
  }
  return valores;
}

/** La potencia que tenía en esa generación, si cambió (si no, null: vale la de la lista) */
export function potenciaEnGeneracion(slug: string, generacion: number): number | null {
  const m = DETALLE[slug];
  return m ? (enGeneracion(m, generacion).p ?? null) : null;
}

export type DetalleDeMovimiento = {
  /** null: no falla nunca */
  precision: number | null;
  pp: number;
  prioridad: number;
  contacto: boolean;
  descripcion: string;
  efectos: { probabilidad: number; texto: string }[];
  notas: string[];
};

export function detalleDelMovimiento(slug: string, generacion: number): DetalleDeMovimiento | null {
  const m = DETALLE[slug];
  if (!m) return null;
  const antes = enGeneracion(m, generacion);
  // La probabilidad de antes vale para los efectos que hoy tienen la de ahora (el principal);
  // 0 es que entonces no tenía efecto (Triataque en la 1ª)
  const hoy = m.e?.find(([p]) => p < 100)?.[0];
  const efectos = (m.e ?? [])
    .map(([probabilidad, texto]) => ({
      probabilidad: antes.ec !== undefined && probabilidad === hoy ? antes.ec : probabilidad,
      texto,
    }))
    .filter((e) => e.probabilidad > 0);
  const precision = "pc" in antes ? (antes.pc ?? null) : (m.pc ?? null);
  return {
    precision,
    pp: antes.pp ?? m.pp,
    prioridad: antes.pr ?? m.pr ?? 0,
    contacto: m.k === 1,
    descripcion: m.d,
    efectos,
    notas: m.x ?? [],
  };
}
