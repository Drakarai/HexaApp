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
