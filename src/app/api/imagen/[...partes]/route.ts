import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FUENTES, type TipoConsultable } from "@/lib/imagenes";
import { resolverImagen } from "@/lib/almacen-de-imagenes";
import { effectiveImages } from "@/lib/image";

/**
 * Sirve una imagen guardada en la base de datos como un archivo de verdad.
 *
 * Antes cada imagen viajaba incrustada en el HTML en base64: una página del
 * cementerio eran megas de texto en cada visita, sin poder guardarse en caché.
 * Ahora el HTML lleva solo la dirección y el navegador se baja cada imagen una
 * vez. La dirección incluye una firma del contenido (`?v=`), así que se puede
 * cachear para siempre: si la imagen cambia, cambia la dirección.
 */

/**
 * Un año, y **`public`**: además del navegador de cada uno, la guarda la red de
 * Vercel, así que la segunda persona que abra el cementerio se baja las
 * imágenes del servidor que tenga más cerca en vez de cruzar hasta Fráncfort.
 * Vale porque la dirección cambia si cambia la imagen.
 *
 * El precio de `public`: quien tenga la dirección exacta puede abrirla sin
 * sesión, porque la red contesta antes de llegar aquí. La dirección lleva un
 * identificador aleatorio y no está enlazada en ningún sitio público, y lo que
 * hay dentro son sprites de pokémon y las fotos de perfil del grupo.
 */
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

/** Lo que no es una imagen no se guarda en ninguna caché, nunca. */
const SIN_CACHE = "private, no-store";

/**
 * Respuestas que no llevan imagen. Van con `no-store` a propósito: si un 401 se
 * quedara guardado en la red, se lo comería después alguien que sí tiene sesión.
 */
function sinCache(texto: string, status: number) {
  return new NextResponse(texto, {
    status,
    headers: { "Cache-Control": SIN_CACHE },
  });
}

function respuestaDeImagen(valor: string) {
  // Enlace a una imagen de fuera: no hay nada que servir, se redirige
  if (/^https?:\/\//.test(valor)) {
    return NextResponse.redirect(valor, 307);
  }

  const coincide = /^data:([^;,]+);base64,(.*)$/s.exec(valor);
  if (!coincide) return sinCache("Imagen no válida", 415);

  const [, tipoMime, base64] = coincide;
  const bytes = Buffer.from(base64, "base64");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": tipoMime,
      "Content-Length": String(bytes.length),
      "Cache-Control": CACHE,
    },
  });
}

async function buscarValor(
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partes: string[] }> },
) {
  // Las imágenes son de una competición privada: hay que tener sesión
  const usuario = await getCurrentUser();
  if (!usuario) return sinCache("No autorizado", 401);

  const { partes } = await params;
  const [tipo, id, indice] = partes;
  if (!tipo || !id) return sinCache("No encontrada", 404);

  // Una fila puede apuntar al almacén en vez de llevar la imagen dentro
  const valor = await resolverImagen(await buscarValor(tipo, id, indice));
  if (!valor) return sinCache("No encontrada", 404);

  return respuestaDeImagen(valor);
}
