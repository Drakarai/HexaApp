import "server-only";
import { prisma } from "@/lib/db";
import { firmasDeImagen } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";

/**
 * La bolsa: qué objetos tiene cada uno.
 *
 * El catálogo se lee entero de una vez y las bolsas solo guardan a qué objeto
 * apuntan; juntarlos se hace aquí, en memoria. Son un puñado de filas y así no
 * hay que repetir por cada jugador las consultas de las imágenes.
 */

export type OpcionDeObjeto = {
  id: string;
  name: string;
  /** Dirección, no imagen: ver lib/imagen-url.ts */
  image: string | null;
};

export type ObjetoDelCatalogo = {
  id: string;
  name: string;
  description: string | null;
  apiSlug: string | null;
  image: string | null;
  /**
   * Si es un grupo ("Objeto competitivo"): al usarlo se elige uno de los suyos
   * en vez de gastarlo directamente.
   */
  isGroup: boolean;
  /** Lo que lleva dentro un grupo, y entre lo que se elige al usarlo. */
  options: OpcionDeObjeto[];
  /** En cuántas bolsas está, para avisar antes de borrarlo */
  enBolsas: number;
};

export type ObjetoEnBolsa = {
  entryId: string;
  quantity: number;
  note: string | null;
  item: ObjetoDelCatalogo;
};

/** Todos los objetos que un administrador ha creado, con sus opciones. */
export async function getCatalogo(): Promise<ObjetoDelCatalogo[]> {
  const objetos = await prisma.item.findMany({
    orderBy: { name: "asc" },
    // La imagen no: de la tabla solo hace falta su firma. Ver lib/imagenes.ts
    omit: { image: true },
    include: {
      options: { orderBy: { position: "asc" }, omit: { image: true } },
      _count: { select: { entries: true } },
    },
  });

  const opciones = objetos.flatMap((objeto) => objeto.options);
  const [firmasObjeto, firmasOpcion] = await Promise.all([
    firmasDeImagen(
      "objeto",
      objetos.map((objeto) => objeto.id),
    ),
    firmasDeImagen(
      "objeto-opcion",
      opciones.map((opcion) => opcion.id),
    ),
  ]);

  return objetos.map((objeto) => ({
    id: objeto.id,
    name: objeto.name,
    description: objeto.description,
    apiSlug: objeto.apiSlug,
    image: urlDeImagen("objeto", objeto.id, firmasObjeto.get(objeto.id)),
    // Los de antes de que existiera la marca: si lleva cosas dentro, es grupo
    isGroup: objeto.isGroup || objeto.options.length > 0,
    options: objeto.options.map((opcion) => ({
      id: opcion.id,
      name: opcion.name,
      image: urlDeImagen(
        "objeto-opcion",
        opcion.id,
        firmasOpcion.get(opcion.id),
      ),
    })),
    enBolsas: objeto._count.entries,
  }));
}

/**
 * Las bolsas de varios jugadores a la vez, ya juntadas con el catálogo. Se pide
 * así porque la página del administrador enseña las seis de golpe.
 */
export async function getBolsas(
  participantIds: string[],
  catalogo: ObjetoDelCatalogo[],
): Promise<Map<string, ObjetoEnBolsa[]>> {
  const bolsas = new Map<string, ObjetoEnBolsa[]>();
  for (const id of participantIds) bolsas.set(id, []);
  if (!participantIds.length) return bolsas;

  const porId = new Map(catalogo.map((objeto) => [objeto.id, objeto]));
  const filas = await prisma.bagEntry.findMany({
    where: { participantId: { in: participantIds }, quantity: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
  });

  for (const fila of filas) {
    const objeto = porId.get(fila.itemId);
    if (!objeto) continue;
    bolsas.get(fila.participantId)?.push({
      entryId: fila.id,
      quantity: fila.quantity,
      note: fila.note,
      item: objeto,
    });
  }

  // Dentro de cada bolsa, por nombre: cambiar una cantidad no debe recolocarlo
  for (const bolsa of bolsas.values()) {
    bolsa.sort((a, b) => a.item.name.localeCompare(b.item.name, "es"));
  }
  return bolsas;
}

/** La bolsa de uno solo. */
export async function getBolsa(
  participantId: string,
  catalogo: ObjetoDelCatalogo[],
) {
  return (await getBolsas([participantId], catalogo)).get(participantId) ?? [];
}
