/** Tamaño máximo (en píxeles) de cada tipo de imagen ya redimensionada. */
export const IMAGE_SIZES = {
  /** Sprite de la caja del cementerio */
  box: 256,
  /** Imagen grande del panel de detalle */
  detail: 720,
  /** Foto de perfil */
  avatar: 256,
  /** Medalla o líder de un level cap */
  badge: 320,
  /** Objeto de la bolsa. Los del juego son de 30×30, así que sobra de largo. */
  objeto: 128,
  /** Logo de una edición: sale grande de fondo en el resumen */
  logo: 640,
} as const;

/** Límite de lo que aceptamos guardar, para no inflar la base de datos. */
export const MAX_IMAGE_CHARS = 4_000_000;

/**
 * Reduce una imagen y la devuelve como data URL, para poder guardarla en la
 * base de datos sin depender de ficheros sueltos ni de servidores ajenos.
 * Se ejecuta en el navegador, y vale tanto para un archivo elegido por el
 * usuario como para una imagen descargada de internet.
 */
export async function imageToDataUrl(source: Blob, maxSize: number) {
  if (source.type && !source.type.startsWith("image/")) {
    throw new Error("Ese archivo no es una imagen.");
  }

  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo procesar la imagen.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // webp mantiene la transparencia de los sprites y pesa poco.
  // Si el navegador no lo soporta, toDataURL devuelve PNG.
  const dataUrl = canvas.toDataURL("image/webp", 0.9);

  if (dataUrl.length > MAX_IMAGE_CHARS) {
    throw new Error("La imagen es demasiado grande, prueba con una más pequeña.");
  }
  return dataUrl;
}

/** Acepta data URLs generadas por la app y enlaces http(s) normales. */
export function isValidImageValue(value: string) {
  if (!value) return true;
  if (value.length > MAX_IMAGE_CHARS) return false;
  return /^data:image\/(png|jpeg|webp|gif|svg\+xml);/.test(value) ||
    /^https?:\/\//.test(value);
}

/**
 * Imágenes efectivas de un level cap: la lista nueva, y si está vacía, la
 * imagen suelta de las versiones anteriores.
 */
export function effectiveImages(source: {
  images?: string[];
  image?: string | null;
}) {
  if (source.images?.length) return source.images;
  return source.image ? [source.image] : [];
}

/** Normaliza lo que llega de un formulario: cadena vacía se guarda como null. */
export function sanitizeImageValue(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return isValidImageValue(value) ? value : null;
}

/**
 * Marca de "esta imagen no se ha tocado".
 *
 * Los formularios de edición ya no llevan dentro la imagen actual, solo su
 * dirección para la vista previa; reenviar esa dirección la borraría. Así que
 * mandan esta marca cuando no se ha cambiado nada, y hay que distinguirla de
 * venir vacío, que sí significa "quítala".
 */
export const IMAGEN_SIN_CAMBIOS = "__igual__";

/**
 * Lo que hay que guardar según lo que mande un formulario de edición:
 * `undefined` es "no toques esa columna" en Prisma, y null es "bórrala".
 *
 * Ojo con la diferencia entre que el campo **no venga** (null, porque ese
 * formulario ni siquiera lo tiene: el buscador de especie no manda imágenes) y
 * que venga **vacío** (""), que es lo que manda el botón de quitar.
 */
export function imagenEditada(
  raw: FormDataEntryValue | null,
): string | null | undefined {
  if (raw === null) return undefined;

  const value = String(raw).trim();
  if (value === IMAGEN_SIN_CAMBIOS) return undefined;
  if (!value) return null;
  // Una dirección de nuestra propia ruta no es una imagen: no se guarda
  return isValidImageValue(value) ? value : undefined;
}
