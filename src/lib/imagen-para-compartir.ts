import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { resolverImagen } from "@/lib/almacen-de-imagenes";

/**
 * Lo que comparten las imágenes para mandar al grupo que se dibujan en el
 * servidor con `next/og` (satori): el resumen del locke (`api/resumen`) y la
 * tarjeta de un pokémon (`api/pokemon`). Los colores, las letras de la app y
 * cómo se preparan las imágenes guardadas y los iconos para satori.
 */

export const TINTA = "#0b0b0e";
export const TARJETA = "#16161b";
export const BORDE = "#2a2a31";
export const SUAVE = "#9c9ca5";
export const MARCA = "#818cf8";
export const ORO = "#fbbf24";

/** Las letras, leídas una vez por proceso: pesan poco y no cambian */
let fuentes: Promise<{ name: string; data: Buffer; weight: 400 | 600 | 700 | 800 }[]> | null = null;
export function cargarFuentes() {
  const de = (paquete: string, fichero: string) =>
    readFile(join(process.cwd(), "node_modules/@fontsource", paquete, "files", fichero));
  fuentes ??= Promise.all([
    de("barlow", "barlow-latin-400-normal.woff").then((data) => ({ name: "Barlow", data, weight: 400 as const })),
    de("barlow", "barlow-latin-600-normal.woff").then((data) => ({ name: "Barlow", data, weight: 600 as const })),
    de("barlow-condensed", "barlow-condensed-latin-700-normal.woff").then((data) => ({ name: "Condensed", data, weight: 700 as const })),
    de("barlow-condensed", "barlow-condensed-latin-800-normal.woff").then((data) => ({ name: "Condensed", data, weight: 800 as const })),
  ]);
  return fuentes;
}

const MAXIMO_DE_BYTES = 8 * 1024 * 1024;

/**
 * Que un enlace de imagen guardado (una foto puesta como dirección en vez de
 * subida) apunte a internet y no a la propia máquina o a su red: el servidor
 * lo baja para pintar la tarjeta, y si no, cualquiera podía hacerle pedir
 * direcciones internas poniéndolas como foto.
 */
function direccionDeFuera(enlace: string) {
  let url: URL;
  try {
    url = new URL(enlace);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  // Ninguna IP escrita a mano: las imágenes de verdad van por nombre
  if (/^[\d.]+$/.test(host) || host.includes(":")) return false;
  return true;
}

/**
 * Una imagen guardada, lista para satori: en PNG y pequeña. Las de la
 * aplicación van en WebP, que satori no sabe pintar.
 */
export async function paraLaImagen(valor: string | null, lado: number) {
  const resuelta = await resolverImagen(valor);
  if (!resuelta) return null;
  try {
    let bytes: Buffer;
    if (/^https?:\/\//.test(resuelta)) {
      if (!direccionDeFuera(resuelta)) return null;
      const respuesta = await fetch(resuelta, { signal: AbortSignal.timeout(8000), redirect: "error" });
      if (!respuesta.ok) return null;
      // Una foto de perfil no pesa más que esto; un enlace a algo enorme llenaba la memoria
      if (Number(respuesta.headers.get("content-length") ?? 0) > MAXIMO_DE_BYTES) return null;
      bytes = Buffer.from(await respuesta.arrayBuffer());
      if (bytes.length > MAXIMO_DE_BYTES) return null;
    } else {
      const coincide = /^data:[^;,]+;base64,(.*)$/s.exec(resuelta);
      if (!coincide) return null;
      bytes = Buffer.from(coincide[1], "base64");
    }
    const png = await sharp(bytes)
      .resize(lado, lado, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // Una imagen rota no puede tumbar el resumen entero: se queda sin ella
    return null;
  }
}

/**
 * Los trazos de los iconos de línea que salen en la imagen, copiados de lucide
 * (los mismos de la app). Van escritos aquí porque Next no deja renderizar un
 * componente a texto dentro de una ruta, y lucide no exporta los trazos sueltos.
 */
const TRAZOS = {
  Crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
  Star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  Skull: '<path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/>',
  Shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  Map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
  Trophy: '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
};

/** Un icono de línea de la app, como imagen para satori */
export function icono(nombre: keyof typeof TRAZOS, color: string, relleno = false) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="${relleno ? color : "none"}" ` +
    `stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${TRAZOS[nombre]}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export const plural = (cuantos: number, palabra: string) =>
  `${cuantos} ${cuantos === 1 ? palabra : `${palabra}s`}`;

