/** Tamaño máximo (en píxeles) de cada tipo de imagen ya redimensionada. */
export const IMAGE_SIZES = {
  /** Sprite de la caja del cementerio */
  box: 256,
  /** Imagen grande del panel de detalle */
  detail: 720,
  /** Foto de perfil */
  avatar: 256,
} as const;

/** Límite de lo que aceptamos guardar, para no inflar la base de datos. */
export const MAX_IMAGE_CHARS = 4_000_000;

/**
 * Reduce una imagen del disco del usuario y la devuelve como data URL, para
 * poder guardarla en la base de datos sin depender de ficheros sueltos.
 * Se ejecuta en el navegador.
 */
export async function fileToDataUrl(file: File, maxSize: number) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Ese archivo no es una imagen.");
  }

  const bitmap = await createImageBitmap(file);
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

/** Normaliza lo que llega de un formulario: cadena vacía se guarda como null. */
export function sanitizeImageValue(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return isValidImageValue(value) ? value : null;
}
