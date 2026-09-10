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
