import "server-only";
import { prisma } from "@/lib/db";
import { FUENTES, type TipoConsultable } from "@/lib/imagenes";
import { effectiveImages } from "@/lib/image";

/**
 * Dónde está guardada cada imagen según su tipo: la columna de su fila, o un
 * sitio de una lista. Devuelve lo que haya en la columna, que puede ser la
 * imagen o una referencia al almacén (se resuelve con `resolverImagen`).
 *
 * Vivía dentro de `api/imagen`, pero la imagen del resumen del locke necesita
 * las mismas imágenes sin pasar por una petición: se lee de la base de datos
 * directamente y no se reparte la sesión por ahí.
 */
export async function buscarValor(
  tipo: string,
  id: string,
  indice: string | undefined,
): Promise<string | null> {
  /**
   * `/api/imagen/c/<clave>`: la imagen del almacén, directa. No hace falta
   * pasar por ninguna fila, y por eso la comparten todas las que la usen.
   */
  if (tipo === "c") {
    const imagen = await prisma.imagen.findUnique({
      where: { clave: decodeURIComponent(id) },
      select: { datos: true },
    });
    return imagen?.datos ?? null;
  }

  if (tipo === "medalla") {
    const cap = await prisma.levelCap.findUnique({
      where: { id },
      select: { images: true, image: true },
    });
    if (!cap) return null;
    const lista = effectiveImages(cap);
    return lista[Number(indice ?? 0)] ?? null;
  }

  // El cartel del final: la lista de la competición
  if (tipo === "cartel") {
    const edicion = await prisma.competition.findUnique({
      where: { id },
      select: { finalImages: true },
    });
    return edicion?.finalImages[Number(indice ?? 0)] ?? null;
  }

  // Las medallas de una plantilla son una lista, como las del level cap
  if (tipo === "medalla-plantilla") {
    const item = await prisma.levelCapTemplateItem.findUnique({
      where: { id },
      select: { images: true },
    });
    if (!item) return null;
    return item.images[Number(indice ?? 0)] ?? null;
  }

  const fuente = FUENTES[tipo as TipoConsultable];
  if (!fuente) return null;

  // El modelo de Prisma es el nombre de la tabla con la primera en minúscula
  const modelo = (fuente.tabla.charAt(0).toLowerCase() +
    fuente.tabla.slice(1)) as "user";
  const fila = (await (prisma[modelo] as {
    findUnique: (args: unknown) => Promise<Record<string, string | null> | null>;
  }).findUnique({
    where: { id },
    select: { [fuente.columna]: true },
  })) as Record<string, string | null> | null;

  return fila?.[fuente.columna] ?? null;
}

