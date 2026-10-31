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

/** `plural` e `icono` son para la lista del mapa, que va agrupada por clase */
export const TIPOS_DE_ZONA: { id: TipoDeZona; nombre: string; plural: string; icono: string }[] = [
  { id: "ruta", nombre: "Ruta", plural: "Rutas", icono: "🛤️" },
  { id: "ciudad", nombre: "Ciudad o pueblo", plural: "Ciudades y pueblos", icono: "🏘️" },
  { id: "cueva", nombre: "Cueva o montaña", plural: "Cuevas y montañas", icono: "⛰️" },
  { id: "bosque", nombre: "Bosque", plural: "Bosques", icono: "🌲" },
  { id: "agua", nombre: "Agua", plural: "Agua", icono: "🌊" },
  { id: "otro", nombre: "Otro", plural: "Otros sitios", icono: "📍" },
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

/* ── Zonas a medida ─────────────────────────────────────────────────────────
 * Una zona "A medida" es un polígono: sus vértices, en unidades del lienzo.
 * Es la forma para las rutas en L, en zigzag o con cualquier silueta que no
 * sea un rectángulo ni un óvalo.
 */

/** Más vértices no hacen falta para ninguna ruta, y así nadie llena la base de datos */
export const MAXIMO_DE_VERTICES = 60;

type Vertice = [number, number];

/** Las cuatro esquinas de una caja: así nace una zona a medida desde un rectángulo */
export function verticesDeCaja(x: number, y: number, w: number, h: number): Vertice[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ].map(([px, py]) => [Math.round(px), Math.round(py)] as Vertice);
}

/** Un óvalo pasado a polígono, con `lados` vértices (8 parece un óvalo y se edita bien) */
export function verticesDeOvalo(x: number, y: number, w: number, h: number, lados = 8): Vertice[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return Array.from({ length: lados }, (_, i) => {
    const a = (i / lados) * Math.PI * 2 - Math.PI / 2;
    return [Math.round(cx + (w / 2) * Math.cos(a)), Math.round(cy + (h / 2) * Math.sin(a))] as Vertice;
  });
}

/**
 * La caja que envuelve los vértices. Se guarda junto a ellos: con ella se
 * colocan el número de capturas y la chapa de bajas, se reescala y se mira si
 * la zona se ha salido del lienzo, igual que en las demás formas.
 */
export function cajaDeVertices(vertices: Vertice[]) {
  const xs = vertices.map(([x]) => x);
  const ys = vertices.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(8, Math.round(Math.max(...xs) - x)),
    h: Math.max(8, Math.round(Math.max(...ys) - y)),
  };
}

/**
 * Los vértices con el giro de la zona ya aplicado, alrededor del centro de su
 * caja. Se hace al empezar a mover un vértice de una zona girada: si no, el
 * centro del giro cambia con cada vértice que se mueve y la forma entera
 * pega un salto al soltar.
 */
export function girarVertices(vertices: Vertice[], grados: number): Vertice[] {
  if (!grados) return vertices;
  const { x, y, w, h } = cajaDeVertices(vertices);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = (grados * Math.PI) / 180;
  return vertices.map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    return [Math.round(cx + dx * Math.cos(r) - dy * Math.sin(r)), Math.round(cy + dx * Math.sin(r) + dy * Math.cos(r))] as Vertice;
  });
}

/**
 * Un vértice que se está arrastrando, **pegado en línea recta** con sus dos
 * vecinos cuando pasa cerca: si está casi a la misma altura que uno, se pone
 * exactamente a su altura (y lo mismo a lo ancho). Con el dedo es imposible
 * dejar a pulso los lados de una L rectos, y rectos es como se quieren casi
 * siempre. `margen` va en unidades del lienzo.
 */
export function pegarARecta(vertices: Vertice[], indice: number, punto: Vertice, margen: number): Vertice {
  const n = vertices.length;
  const vecinos = [vertices[(indice - 1 + n) % n], vertices[(indice + 1) % n]];
  let [x, y] = punto;
  const cercaX = vecinos.map(([vx]) => vx).filter((vx) => Math.abs(vx - x) <= margen).sort((a, b) => Math.abs(a - x) - Math.abs(b - x))[0];
  const cercaY = vecinos.map(([, vy]) => vy).filter((vy) => Math.abs(vy - y) <= margen).sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0];
  if (cercaX !== undefined) x = cercaX;
  if (cercaY !== undefined) y = cercaY;
  return [Math.round(x), Math.round(y)];
}

/**
 * Los vértices que llegan del navegador, comprobados: una lista de 3 a
 * `MAXIMO_DE_VERTICES` pares de números, dentro del lienzo. Si no es eso, null
 * y no se guarda: lo que llega se puede haber falseado.
 */
export function verticesValidos(entrada: unknown, ancho: number, alto: number): Vertice[] | null {
  if (!Array.isArray(entrada) || entrada.length < 3 || entrada.length > MAXIMO_DE_VERTICES) return null;
  const limpios: Vertice[] = [];
  for (const p of entrada) {
    if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
    limpios.push([
      Math.round(Math.min(ancho, Math.max(0, p[0]))),
      Math.round(Math.min(alto, Math.max(0, p[1]))),
    ]);
  }
  return limpios;
}
