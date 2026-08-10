"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";

/**
 * Un ticket da derecho a una tirada de ruleta y se gasta al usarlo. Solo los
 * administradores los reparten; el saldo es la suma de los movimientos.
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
      delta: Math.trunc(amount),
      reason: reason || null,
      createdById: manager.id,
    },
  });

  revalidatePath("/ruleta");
  revalidatePath("/");
  const cantidad = Math.trunc(amount);
  return {
    success:
      cantidad > 0
        ? `${cantidad} ticket(s) para ${participant.displayName}.`
        : `Retirados ${Math.abs(cantidad)} ticket(s) a ${participant.displayName}.`,
  };
}

/** Botón de +1 desde la lista de saldos. */
export async function quickGrantTicketAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  const manager = await requireCompetitionManager(competitionId);

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
      delta: Math.trunc(delta),
      reason: "Ajuste rápido",
      createdById: manager.id,
    },
  });

  revalidatePath("/ruleta");
  revalidatePath("/");
}
