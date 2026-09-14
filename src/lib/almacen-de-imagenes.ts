import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * El almacén de imágenes: guardar una imagen una sola vez y que las filas
 * apunten a ella.
 *
 * Una fila no guarda la imagen, guarda `ref:<clave>`. Veinte caracteres en vez
 * de 18 KB, y la misma imagen vale para todas las filas que la usen: el sprite
 * de Garchomp se guarda una vez aunque salga en doce combates.
 *
 * Es compatible hacia atrás a propósito: una columna puede llevar todavía la
 * imagen entera, y se sirve igual. Ver `resolverImagen`.
 */

/** Lo que lleva delante una columna que apunta al almacén. */
const MARCA = "ref:";

export function esReferencia(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && valor.startsWith(MARCA);
}

export function claveDeReferencia(valor: string) {
  return valor.slice(MARCA.length);
}

export function referenciaA(clave: string) {
  return MARCA + clave;
}

/**
 * La clave del sprite de una especie. Lleva dentro de dónde salió, así que
 * pedir dos veces el mismo pokémon no vuelve a descargar nada.
 */
export function claveDeSprite(
  pokemonId: number,
  shiny: boolean,
  tipo: "box" | "detail",
) {
  return `pkm-${pokemonId}-${tipo}${shiny ? "-shiny" : ""}`;
}

/** La clave de una imagen cualquiera: su propio contenido. */
export function claveDeContenido(dataUrl: string) {
  return `h-${createHash("md5").update(dataUrl).digest("hex")}`;
}

/**
 * Guarda una imagen en el almacén y devuelve lo que hay que escribir en la
 * columna. Si ya estaba, no la reescribe: son idénticas por definición.
 */
export async function guardar(
  clave: string,
  dataUrl: string,
): Promise<string> {
  await prisma.imagen.upsert({
    where: { clave },
    // Ya está guardada y es la misma imagen: no hay nada que actualizar
    update: {},
    create: { clave, datos: dataUrl, bytes: dataUrl.length },
  });
  return referenciaA(clave);
}

/** Guarda una imagen suelta por su contenido (avatares, mapas, medallas…). */
export async function guardarPorContenido(
  dataUrl: string | null | undefined,
): Promise<string | null | undefined> {
  if (dataUrl === null || dataUrl === undefined) return dataUrl;
  // Un enlace de fuera no es una imagen nuestra: se guarda tal cual
  if (!dataUrl.startsWith("data:")) return dataUrl;
  if (esReferencia(dataUrl)) return dataUrl;
  return guardar(claveDeContenido(dataUrl), dataUrl);
}

/** ¿Está ya en el almacén? Sirve para no descargar lo que ya tenemos. */
export async function yaGuardada(clave: string) {
  const fila = await prisma.imagen.findUnique({
    where: { clave },
    select: { clave: true },
  });
  return Boolean(fila);
}

/**
 * La imagen de verdad a partir de lo que hay en una columna: si apunta al
 * almacén se busca allí, y si lleva la imagen entera —lo de antes— se devuelve
 * tal cual.
 */
export async function resolverImagen(
  valor: string | null,
): Promise<string | null> {
  if (!valor) return null;
  if (!esReferencia(valor)) return valor;
  const fila = await prisma.imagen.findUnique({
    where: { clave: claveDeReferencia(valor) },
    select: { datos: true },
  });
  return fila?.datos ?? null;
}
