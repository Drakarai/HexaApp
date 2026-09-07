import "server-only";
import { prisma } from "@/lib/db";

/**
 * Los premios de un reto que son **objetos de la bolsa**, y el anuncio de los
 * castigos.
 *
 * Un reto tiene dos clases de premio y no se pisan: el texto libre de siempre
 * ("eliges su starter", "te debe una"), que no es nada que se pueda guardar en
 * ninguna bolsa, y una lista de objetos del catálogo que **caen solos** en la
 * bolsa del que gane en cuanto se apunta el resultado. Antes había que
 * acordarse de dárselos a mano desde Administración, que es justo el tipo de
 * cosa que se olvida.
 */

/**
 * Pone al día los objetos de un reto: se los da a quien haya ganado y se los
 * quita a quien los tuviera y ya no le tocan.
 *
 * Se llama después de tocar el resultado o la lista de objetos, y se apoya en
 * `ChallengePrize.entregadoA`, fila por fila. Así funcionan los tres casos que
 * pasan de verdad: apuntar el ganador (se entrega), corregirlo (se le quita al
 * primero y se le da al segundo) y añadir un objeto cuando el reto ya estaba
 * jugado (se entrega ese y los demás se quedan quietos).
 */
export async function sincronizarPremios(challengeMatchId: string) {
  const reto = await prisma.challengeMatch.findUnique({
    where: { id: challengeMatchId },
    select: { winnerId: true, premios: true },
  });
  if (!reto) return;

  for (const premio of reto.premios) {
    if (premio.entregadoA === reto.winnerId) continue;

    if (premio.entregadoA) {
      await quitarDeLaBolsa(premio.entregadoA, premio.itemId, premio.quantity);
    }
    if (reto.winnerId) {
      await ponerEnLaBolsa(reto.winnerId, premio.itemId, premio.quantity);
    }

    await prisma.challengePrize.update({
      where: { id: premio.id },
      data: { entregadoA: reto.winnerId },
    });
  }
}

/**
 * Devuelve un objeto ya entregado antes de borrar su fila de premio. Hay que
 * llamarla **antes** de borrarla, porque después ya no se sabe a quién se le
 * había dado.
 */
export async function devolverPremio(premioId: string) {
  const premio = await prisma.challengePrize.findUnique({
    where: { id: premioId },
  });
  if (!premio?.entregadoA) return;
  await quitarDeLaBolsa(premio.entregadoA, premio.itemId, premio.quantity);
}

/** Suma a lo que ya tenga, igual que cuando se lo da un administrador. */
async function ponerEnLaBolsa(
  participantId: string,
  itemId: string,
  quantity: number,
) {
  await prisma.bagEntry.upsert({
    where: { participantId_itemId: { participantId, itemId } },
    create: { participantId, itemId, quantity, note: "Premio de un reto" },
    update: { quantity: { increment: quantity } },
  });
}

/**
 * Le quita lo que se le había dado. Si mientras tanto se lo ha gastado, la
 * cuenta se queda en cero y la fila desaparece: **una bolsa no puede tener
 * cantidades negativas**, y perseguir un objeto ya usado no tendría sentido.
 */
async function quitarDeLaBolsa(
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

export type CastigoPendiente = {
  challengeId: string;
  /** Quien lo perdió y se lo traga */
  displayName: string;
  color: string;
  participantId: string;
  castigo: string;
  cuando: Date | null;
};

/**
 * Los castigos que hay que anunciar: retos ya jugados, con castigo escrito y
 * que un administrador no haya quitado todavía.
 *
 * Salen en la portada porque un castigo es información para todo el grupo —de
 * eso va el pique—, y dentro de la pantalla de retos se perdía entre lo demás.
 */
export async function getCastigosPendientes(
  competitionId: string,
): Promise<CastigoPendiente[]> {
  const retos = await prisma.challengeMatch.findMany({
    where: {
      competitionId,
      castigoVisible: true,
      punishment: { not: null },
      winnerId: { not: null },
    },
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      punishment: true,
      playedAt: true,
      winnerId: true,
      participantA: { select: { id: true, displayName: true, color: true } },
      participantB: { select: { id: true, displayName: true, color: true } },
    },
  });

  return retos.map((reto) => {
    // El castigo es del que perdió, o sea del que no ganó
    const perdedor =
      reto.winnerId === reto.participantA.id ? reto.participantB : reto.participantA;
    return {
      challengeId: reto.id,
      participantId: perdedor.id,
      displayName: perdedor.displayName,
      color: perdedor.color,
      castigo: reto.punishment ?? "",
      cuando: reto.playedAt,
    };
  });
}
