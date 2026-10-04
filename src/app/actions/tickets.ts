"use server";

import { revalidatePath } from "next/cache";
import { registrar } from "@/lib/registro";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";

/** Comprueba que la ruleta es de esa competición antes de tocar sus tickets. */
async function findRoulette(competitionId: string, rouletteId: string) {
  return prisma.roulette.findFirst({
    where: { id: rouletteId, competitionId },
    select: { id: true, name: true },
  });
}

/**
 * Un ticket da derecho a una tirada **de su ruleta**: el de una no sirve para
 * otra. Solo los administradores los reparten, y el saldo es la suma de los
 * movimientos de esa ruleta.
 */
export async function grantTicketsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  let manager;
  try {
    manager = await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const rouletteId = String(formData.get("rouletteId") ?? "");
  const roulette = await findRoulette(competitionId, rouletteId);
  if (!roulette) return { error: "Esa ruleta no es de esta competición." };

  const participantId = String(formData.get("participantId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isFinite(amount) || Math.trunc(amount) === 0) {
    return { error: "Di cuántos tickets, distinto de 0." };
  }

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, competitionId },
  });
  if (!participant) return { error: "Ese jugador no está en la competición." };

  await prisma.rouletteTicket.create({
    data: {
      competitionId,
      participantId,
      rouletteId: roulette.id,
      delta: Math.trunc(amount),
      reason: reason || null,
      createdById: manager.id,
    },
  });
  await registrar(
    competitionId,
    "bolsa",
    `${Math.trunc(amount) > 0 ? "Da" : "Quita"} ${Math.abs(Math.trunc(amount))} ticket(s) de ${roulette.name} a ${participant.displayName}${reason ? `: ${reason}` : ""}`,
  );

  revalidatePath("/ruleta");
  revalidatePath("/");
  const cantidad = Math.trunc(amount);
  return {
    success:
      cantidad > 0
        ? `${cantidad} ticket(s) de ${roulette.name} para ${participant.displayName}.`
        : `Retirados ${Math.abs(cantidad)} ticket(s) de ${roulette.name} a ${participant.displayName}.`,
  };
}

/** Botón de ±1 desde la lista de saldos de una ruleta. */
export async function quickGrantTicketAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  const manager = await requireCompetitionManager(competitionId);

  const rouletteId = String(formData.get("rouletteId") ?? "");
  const roulette = await findRoulette(competitionId, rouletteId);
  if (!roulette) return;

  const participantId = String(formData.get("participantId") ?? "");
  const delta = Number(formData.get("delta") ?? 1);
  if (!Number.isFinite(delta) || Math.trunc(delta) === 0) return;

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, competitionId },
  });
  if (!participant) return;

  await prisma.rouletteTicket.create({
    data: {
      competitionId,
      participantId,
      rouletteId: roulette.id,
      delta: Math.trunc(delta),
      reason: "Ajuste rápido",
      createdById: manager.id,
    },
  });
  await registrar(
    competitionId,
    "bolsa",
    `${Math.trunc(delta) > 0 ? "Da" : "Quita"} ${Math.abs(Math.trunc(delta))} ticket de ${roulette.name} a ${participant.displayName}`,
  );

  revalidatePath("/ruleta");
  revalidatePath("/");
}
