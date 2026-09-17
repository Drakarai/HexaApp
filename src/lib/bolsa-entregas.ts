import "server-only";
import { prisma } from "@/lib/db";

/**
 * Meter y sacar cosas de la bolsa de alguien.
 *
 * Vive aparte porque ya son **dos** los sitios que reparten objetos solos —los
 * premios de un reto y las casillas de la ruleta— y los dos tienen que hacerlo
 * igual: sumando a lo que ya tenga y sin dejar cantidades negativas.
 */

/** Suma a lo que ya tenga, igual que cuando se lo da un administrador. */
export async function ponerEnLaBolsa(
  participantId: string,
  itemId: string,
  quantity: number,
  /** De dónde salió, para el apunte de la fila nueva */
  note: string,
) {
  await prisma.bagEntry.upsert({
    where: { participantId_itemId: { participantId, itemId } },
    create: { participantId, itemId, quantity, note },
    update: { quantity: { increment: quantity } },
  });
}

/**
 * Le quita lo que se le había dado. Si mientras tanto se lo ha gastado, la
 * cuenta se queda en cero y la fila desaparece: **una bolsa no puede tener
 * cantidades negativas**, y perseguir un objeto ya usado no tendría sentido.
 */
export async function quitarDeLaBolsa(
  participantId: string,
  itemId: string,
  quantity: number,
) {
  const fila = await prisma.bagEntry.findUnique({
    where: { participantId_itemId: { participantId, itemId } },
  });
  if (!fila) return;

  const queda = fila.quantity - quantity;
  if (queda > 0) {
    await prisma.bagEntry.update({
      where: { id: fila.id },
      data: { quantity: queda },
    });
  } else {
    await prisma.bagEntry.delete({ where: { id: fila.id } });
  }
}
