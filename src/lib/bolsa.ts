import "server-only";
import { prisma } from "@/lib/db";
import { firmaDeColumna } from "@/lib/imagenes";
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
  /**
   * Los objetos y las firmas de sus imágenes **a la vez**: el catálogo es
   * entero, así que las firmas se piden de toda la tabla sin esperar a saber
   * qué ids hay. Antes eran dos idas y vueltas en fila.
   */
  const [objetos, filasObjeto, filasOpcion] = await Promise.all([
    prisma.item.findMany({
      orderBy: { name: "asc" },
      // La imagen no: de la tabla solo hace falta su firma. Ver lib/imagenes.ts
      omit: { image: true },
      include: {
        options: { orderBy: { position: "asc" }, omit: { image: true } },
        _count: { select: { entries: true } },
      },
    }),
    prisma.$queryRaw<{ id: string; v: string | null }[]>`
      select "id", ${firmaDeColumna(`"image"`)} as v from "Item"
    `,
    prisma.$queryRaw<{ id: string; v: string | null }[]>`
      select "id", ${firmaDeColumna(`"image"`)} as v from "ItemOption"
    `,
  ]);
  const firmasObjeto = new Map(filasObjeto.map((fila) => [fila.id, fila.v]));
  const firmasOpcion = new Map(filasOpcion.map((fila) => [fila.id, fila.v]));

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
  /** Los jugadores, o todos los de un locke (sin tener que esperar a saberlos) */
  quienes: string[] | { competitionId: string },
  /** Puede venir sin esperar: las bolsas se piden a la vez que el catálogo */
  catalogoPedido: ObjetoDelCatalogo[] | Promise<ObjetoDelCatalogo[]>,
): Promise<Map<string, ObjetoEnBolsa[]>> {
  const participantIds = Array.isArray(quienes) ? quienes : null;
  if (participantIds && !participantIds.length) return new Map();

  const [catalogo, filas] = await Promise.all([
    catalogoPedido,
    prisma.bagEntry.findMany({
      where: {
        participant: Array.isArray(quienes) ? { id: { in: quienes } } : quienes,
        quantity: { gt: 0 },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const porJugador = new Map<string, typeof filas>();
  for (const id of participantIds ?? []) porJugador.set(id, []);
  for (const fila of filas) {
    porJugador.set(fila.participantId, [...(porJugador.get(fila.participantId) ?? []), fila]);
  }
  return new Map(
    [...porJugador].map(([id, suyas]) => [id, juntarConElCatalogo(suyas, catalogo)]),
  );
}

/**
 * La bolsa de uno solo: por su participante, o por su cuenta dentro del locke
 * (que es lo mismo, y deja pedirla sin esperar a saber qué participante es).
 */
export async function getBolsa(
  quien: string | { competitionId: string; userId: string },
  catalogoPedido: ObjetoDelCatalogo[] | Promise<ObjetoDelCatalogo[]>,
) {
  const [catalogo, filas] = await Promise.all([
    catalogoPedido,
    prisma.bagEntry.findMany({
      where: { participant: typeof quien === "string" ? { id: quien } : quien, quantity: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return juntarConElCatalogo(filas, catalogo);
}

function juntarConElCatalogo(
  filas: { id: string; itemId: string; quantity: number; note: string | null }[],
  catalogo: ObjetoDelCatalogo[],
): ObjetoEnBolsa[] {
  const porId = new Map(catalogo.map((objeto) => [objeto.id, objeto]));
  return filas
    .flatMap((fila) => {
      const objeto = porId.get(fila.itemId);
      return objeto
        ? [{ entryId: fila.id, quantity: fila.quantity, note: fila.note, item: objeto }]
        : [];
    })
    // Por nombre: cambiar una cantidad no debe recolocarlo
    .sort((a, b) => a.item.name.localeCompare(b.item.name, "es"));
}
