/**
 * Direcciones de las imágenes guardadas en la base de datos.
 *
 * Las imágenes se siguen guardando dentro de la base de datos, pero ya no
 * viajan incrustadas en el HTML: la página lleva una dirección de unos 50
 * caracteres y el navegador pide el archivo aparte, una sola vez, y lo guarda
 * en su caché. Antes, el cementerio con 72 bajas mandaba 4 MB de base64 en
 * cada visita.
 *
 * La `firma` es un resumen del contenido de la imagen. Va en la dirección para
 * que la caché pueda ser eterna: si cambias la foto, cambia la firma, cambia la
 * dirección y el navegador se baja la nueva. Sin firma no hay caché posible sin
 * arriesgarse a enseñar la vieja.
 */
export type TipoImagen =
  | "avatar"
  | "as"
  | "as-ficha"
  | "baja"
  | "baja-ficha"
  | "equipo"
  | "equipo-ficha"
  | "salon"
  | "salon-ficha"
  | "favorito"
  | "objeto"
  | "objeto-opcion"
  | "mapa"
  | "captura"
  | "sorteo"
  | "medalla"
  | "medalla-plantilla"
  | "cartel"
  | "logo";

/**
 * Dirección de una imagen, o null si esa fila no tiene ninguna (la firma solo
 * existe cuando hay imagen, así que sirve de "¿tiene?" y de versión a la vez).
 */
export function urlDeImagen(
  tipo: TipoImagen,
  id: string,
  firma: string | null | undefined,
): string | null {
  if (!firma) return null;
  return urlDeContenido(firma) ?? `/api/imagen/${tipo}/${id}?v=${firma}`;
}

/**
 * Si la firma es una referencia al almacén, la dirección es **la de la imagen**
 * y no la de la fila. Eso quiere decir que el sprite de Garchomp tiene una sola
 * dirección en toda la aplicación: el navegador se lo baja una vez y lo reusa
 * en el cementerio, en los equipos y en el bote, en vez de una copia por fila.
 *
 * No lleva `?v=`: la clave manda en el contenido y el contenido no cambia.
 */
export function urlDeContenido(firma: string): string | null {
  if (!firma.startsWith("ref:")) return null;
  return `/api/imagen/c/${encodeURIComponent(firma.slice("ref:".length))}`;
}

/** Igual, para las medallas de un level cap, que son una lista. */
export function urlDeMedalla(
  id: string,
  indice: number,
  firma: string | null | undefined,
): string | null {
  if (!firma) return null;
  return urlDeContenido(firma) ?? `/api/imagen/medalla/${id}/${indice}?v=${firma}`;
}

/** Y el cartel del final del locke, que es otra lista, la de la competición. */
export function urlDeCartel(
  competitionId: string,
  indice: number,
  firma: string | null | undefined,
): string | null {
  if (!firma) return null;
  return (
    urlDeContenido(firma) ?? `/api/imagen/cartel/${competitionId}/${indice}?v=${firma}`
  );
}

/** Y las de un hito de plantilla, que son la misma lista pero de la base. */
export function urlDeMedallaDePlantilla(
  id: string,
  indice: number,
  firma: string | null | undefined,
): string | null {
  if (!firma) return null;
  return (
    urlDeContenido(firma) ??
    `/api/imagen/medalla-plantilla/${id}/${indice}?v=${firma}`
  );
}
