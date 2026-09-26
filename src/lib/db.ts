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
  hallOfFameEntry: { image: true, detailImage: true },
  favoritePokemon: { image: true },
  levelCap: { images: true, image: true },
  competition: { finalImages: true, logo: true },
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

/**
 * Con `CONTAR_CONSULTAS=1` se escriben en pantalla todas las consultas que
 * hace cada página.
 *
 * Sirve para lo que de verdad cuesta caro aquí: **cuántos viajes a la base de
 * datos** hace una pantalla. En el ordenador no se nota —Postgres está al
 * lado—, pero en producción está en Neon, por internet, y cada viaje se paga.
 * Así se encontró que el formato del final se pedía dos veces por visita.
 *
 * Se enciende a mano y no se queda encendido: los registros sacan el SQL
 * entero, y eso ni hace falta ni conviene en producción.
 */
/**
 * Con `LATENCIA_FALSA=30` cada consulta tarda 30 ms de más, como si la base de
 * datos estuviera lejos.
 *
 * Es la única forma de ver **aquí** lo que se va a notar en producción. En el
 * ordenador Postgres está al lado y todo va en dos centésimas, así que da igual
 * hacer veinte consultas que cuarenta; en Neon, por internet, lo que se paga es
 * cada ida y vuelta. Y lo que cuesta no es *cuántas* consultas hay sino
 * **cuántas tandas**: las que se piden a la vez cuestan una, y una que espera a
 * la anterior cuesta otra.
 *
 * Se enciende a mano para medir y se apaga: `LATENCIA_FALSA=30 npm run start`.
 */
const esperar = (ms: number) =>
  new Promise((suelta) => setTimeout(suelta, ms));

const crearCliente = () => {
  const cliente = new PrismaClient({
    log: process.env.CONTAR_CONSULTAS
      ? ["query"]
      : process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
    omit: SIN_IMAGENES,
  });

  const latencia = Number(process.env.LATENCIA_FALSA ?? 0);
  if (!latencia) return cliente;

  return cliente.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        // Con las dos encendidas sale también **cuándo** empieza cada una, que
        // es lo que enseña las tandas: las de la misma tanda salen seguidas con
        // el mismo momento, y una tanda nueva empieza 30 ms después
        if (process.env.CONTAR_CONSULTAS) {
          console.log(`tanda ${Date.now() % 100000} ${model}.${operation}`);
        }
        await esperar(latencia);
        return query(args);
      },
    },
  }) as unknown as typeof cliente;
};

// El tipo sale del propio cliente para que arrastre el `omit` de arriba
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof crearCliente>;
};

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
