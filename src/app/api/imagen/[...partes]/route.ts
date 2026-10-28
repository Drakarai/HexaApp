import { NextResponse } from "next/server";
import { esCreador, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolverImagen } from "@/lib/almacen-de-imagenes";
import { buscarValor } from "@/lib/imagen-por-tipo";

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

/**
 * Lo que se sirve como imagen. Una imagen guardada dice ella misma su tipo
 * (`data:image/…`), y eso lo manda quien la sube: sin esta lista, un
 * `data:text/html` o un SVG con código se abrirían como una página **de la
 * propia aplicación**, con la sesión de quien pinchara el enlace.
 */
const TIPOS_DE_IMAGEN = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"]);

/**
 * Las capturas de pantalla de HexaPost **no van a la caché de la red**: pueden
 * enseñar cualquier cosa de quien la mandó, y lo de la red lo abre cualquiera
 * que tenga la dirección, sin sesión. Se guardan solo en su navegador.
 */
const CACHE_PRIVADA = "private, max-age=86400";

function respuestaDeImagen(valor: string, request: Request, cache = CACHE) {
  // Enlace a una imagen de fuera: no hay nada que servir, se redirige
  if (/^https?:\/\//.test(valor)) {
    /**
     * Pero solo a quien la va a pintar. Abierta como página, esto llevaría a
     * cualquier web con la dirección de la aplicación delante: un enlace
     * perfecto para un engaño. Los navegadores dicen para qué piden cada cosa
     * (`Sec-Fetch-Dest`); el que no lo dice es viejo, y se le deja pasar.
     */
    const para = request.headers.get("sec-fetch-dest");
    if (para && para !== "image") return sinCache("Esto es una imagen: ábrela desde la aplicación.", 400);
    return NextResponse.redirect(valor, 307);
  }

  const coincide = /^data:([^;,]+);base64,(.*)$/s.exec(valor);
  if (!coincide) return sinCache("Imagen no válida", 415);

  const [, tipoMime, base64] = coincide;
  if (!TIPOS_DE_IMAGEN.has(tipoMime.toLowerCase())) return sinCache("Imagen no válida", 415);
  const bytes = Buffer.from(base64, "base64");

  // Si aun así trae algo que ejecutar (un SVG de los de antes, que se
  // aceptaban), no corre: lo impide la política de next.config.ts
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": tipoMime,
      "Content-Length": String(bytes.length),
      "Cache-Control": cache,
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partes: string[] }> },
) {
  // Las imágenes son de una competición privada: hay que tener sesión
  const usuario = await getCurrentUser();
  if (!usuario) return sinCache("No autorizado", 401);

  const { partes } = await params;
  const [tipo, id, indice] = partes;
  if (!tipo || !id) return sinCache("No encontrada", 404);

  /**
   * La captura de una sugerencia de HexaPost: solo para quien la mandó y para
   * quien lleva la aplicación, que son los únicos que ven la sugerencia.
   */
  if (tipo === "sugerencia") {
    const sugerencia = await prisma.sugerencia.findUnique({ where: { id }, select: { userId: true, imagen: true } });
    if (!sugerencia || (sugerencia.userId !== usuario.id && !esCreador(usuario))) return sinCache("No encontrada", 404);
    const captura = await resolverImagen(sugerencia.imagen);
    if (!captura) return sinCache("No encontrada", 404);
    return respuestaDeImagen(captura, request, CACHE_PRIVADA);
  }

  // Una fila puede apuntar al almacén en vez de llevar la imagen dentro
  const valor = await resolverImagen(await buscarValor(tipo, id, indice));
  if (!valor) return sinCache("No encontrada", 404);

  return respuestaDeImagen(valor, request);
}
