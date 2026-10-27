/**
 * Qué clases de sitio hay en un mapa y de qué color va cada una.
 *
 * Vive en su propio módulo, y no dentro de `components/mapa.tsx`, porque lo
 * usan los dos lados: el mapa (cliente) y las páginas que pintan los
 * desplegables (servidor). Un módulo con `"use client"` no puede exportar
 * datos a un componente de servidor —Next devuelve una referencia al cliente,
 * no el array— y eso revienta la página entera.
 */

export type TipoDeZona =
  | "ruta"
  | "ciudad"
  | "cueva"
  | "bosque"
  | "agua"
  | "otro";

/** El color de cada clase de sitio. Es lo único que hace el tipo de zona. */
export const COLOR_DE_ZONA: Record<string, string> = {
  ruta: "#6366f1",
  ciudad: "#f59e0b",
  cueva: "#a855f7",
  bosque: "#22c55e",
  agua: "#0ea5e9",
  otro: "#64748b",
};

export const TIPOS_DE_ZONA: { id: TipoDeZona; nombre: string }[] = [
  { id: "ruta", nombre: "Ruta" },
  { id: "ciudad", nombre: "Ciudad o pueblo" },
  { id: "cueva", nombre: "Cueva o montaña" },
  { id: "bosque", nombre: "Bosque" },
  { id: "agua", nombre: "Agua" },
  { id: "otro", nombre: "Otro" },
];

export function colorDeZona(tipo: string) {
  return COLOR_DE_ZONA[tipo] ?? COLOR_DE_ZONA.otro;
}

/**
 * Las formas que puede tener una zona sobre el mapa.
 *
 * "circle" es el **óvalo**, que se estira a lo ancho y a lo alto por separado,
 * y "circulo" el **círculo redondo de verdad**, que mantiene el mismo ancho que
 * alto pase lo que pase. Se llama "circle" el óvalo por lo de siempre: es el
 * nombre que ya está guardado en la base de datos y cambiarlo dejaría todas las
 * zonas de antes sin forma.
 */
export type FormaDeZona = "rect" | "circle" | "circulo" | "poly" | "none";

export const FORMAS: { id: FormaDeZona; nombre: string }[] = [
  { id: "rect", nombre: "Rectángulo" },
  { id: "circulo", nombre: "Círculo" },
  { id: "circle", nombre: "Óvalo" },
  { id: "poly", nombre: "A medida" },
  { id: "none", nombre: "Sin dibujar" },
];

/** Las que se dibujan redondas, con el ancho y el alto siempre iguales. */
export function esRedonda(forma: string) {
  return forma === "circulo";
}

/** Los vértices de un polígono, o null si no los tiene o vienen rotos. */
export function verticesDeZona(points: string | null): [number, number][] | null {
  if (!points) return null;
  try {
    const lista = JSON.parse(points);
    if (!Array.isArray(lista) || lista.length < 3) return null;
    const limpios = lista
      .filter(
        (p: unknown): p is [number, number] =>
          Array.isArray(p) &&
          p.length === 2 &&
          Number.isFinite(p[0]) &&
          Number.isFinite(p[1]),
      )
      .map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]);
    return limpios.length >= 3 ? limpios : null;
  } catch {
    return null;
  }
}

type CajaDeZona = {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: string;
  points: [number, number][] | null;
};

/**
 * Una zona llevada a un lienzo de otro tamaño. La imagen de fondo se estira al
 * lienzo entero, así que para que la zona siga **encima del mismo sitio de la
 * imagen** se escala igual que ella: `sx` a lo ancho y `sy` a lo alto.
 *
 * Un círculo no puede quedarse ovalado: se escala con el menor de los dos y
 * se deja con el mismo centro.
 */
export function reescalarZona<Z extends CajaDeZona>(zona: Z, sx: number, sy: number) {
  const points = zona.points
    ? zona.points.map(([px, py]) => [Math.round(px * sx), Math.round(py * sy)] as [number, number])
    : null;
  if (esRedonda(zona.shape)) {
    const lado = Math.max(8, Math.round(Math.min(zona.w * sx, zona.h * sy)));
    const cx = (zona.x + zona.w / 2) * sx;
    const cy = (zona.y + zona.h / 2) * sy;
    return { x: Math.round(cx - lado / 2), y: Math.round(cy - lado / 2), w: lado, h: lado, points };
  }
  return {
    x: Math.round(zona.x * sx),
    y: Math.round(zona.y * sy),
    w: Math.max(8, Math.round(zona.w * sx)),
    h: Math.max(8, Math.round(zona.h * sy)),
    points,
  };
}

/**
 * Las que se han quedado fuera del lienzo: después de encogerlo no se veían y
 * parecía que se habían borrado. Cuenta su centro, no el borde: una zona que
 * asoma un poco por el filo del mapa es normal y no hay que avisar.
 */
export function zonasQueSeSalen<Z extends { x: number; y: number; w: number; h: number; shape: string }>(
  zonas: Z[],
  ancho: number,
  alto: number,
) {
  return zonas.filter((zona) => {
    if (zona.shape === "none") return false;
    const cx = zona.x + zona.w / 2;
    const cy = zona.y + zona.h / 2;
    return cx < 0 || cy < 0 || cx > ancho || cy > alto;
  });
}

/**
 * El tamaño que seguramente tenía el lienzo cuando se colocaron: lo que
 * ocupan las zonas, redondeado hacia arriba, y como poco el de siempre.
 */
export function lienzoProbable(zonas: { x: number; y: number; w: number; h: number }[]) {
  const hasta = (n: number) => Math.ceil(n / 10) * 10;
  return {
    ancho: Math.max(1900, hasta(Math.max(0, ...zonas.map((z) => z.x + z.w)))),
    alto: Math.max(960, hasta(Math.max(0, ...zonas.map((z) => z.y + z.h)))),
  };
}
