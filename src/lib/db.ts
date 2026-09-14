import { PrismaClient } from "@prisma/client";

/**
 * Las imágenes se guardan dentro de la base de datos como data URL, y pesan de
 * 13 KB (un sprite) a 44 KB (una ilustración). Si se leen sin querer acaban
 * incrustadas en el HTML de la página: así llegó el cementerio a mandar 4 MB
 * en cada visita.
 *
 * Por eso se descartan por defecto en todas las consultas. Quien las necesita
 * de verdad —la ruta que las sirve y los formularios de edición— las pide
 * explícitamente con un `select`. Lo normal es no querer los bytes, sino la
 * dirección: eso lo dan `lib/imagenes.ts` y `lib/imagen-url.ts`.
 */
const SIN_IMAGENES = {
  user: { avatarImage: true },
  participant: { aceImage: true, aceDetailImage: true },
  death: { boxImage: true, detailImage: true },
  matchPokemon: { boxImage: true, detailImage: true },
  hallOfFameEntry: { image: true },
  favoritePokemon: { image: true },
  levelCap: { images: true, image: true },
  levelCapTemplateItem: { images: true },
  // Se quedaron fuera de la lista al añadirlas y se colaban enteras en su
  // página: el mapa con 60 capturas eran 800 KB, y el fondo de una isla, 300
  capture: { image: true },
  mapRegion: { image: true },
  sorteoPokemon: { boxImage: true },
  // No es una imagen, pero pesa como todas juntas: el volcado de una copia son
  // varios megas y no puede colarse en un listado por descuido
  backup: { payload: true },
} as const;

const crearCliente = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    omit: SIN_IMAGENES,
  });

// El tipo sale del propio cliente para que arrastre el `omit` de arriba
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof crearCliente>;
};

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
