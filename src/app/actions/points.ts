"use server";

import { revalidatePath } from "next/cache";
import { nombresDeJugadores, registrar } from "@/lib/registro";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";

/** Suma o resta puntos a un participante dejando constancia del motivo. */
export async function adjustPointsAction(
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
  const delta = Number(formData.get("delta") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!participantId) return { error: "Elige a un jugador." };
  if (!Number.isFinite(delta) || Math.trunc(delta) === 0) {
    return { error: "Los puntos tienen que ser un número distinto de 0." };
  }
  if (!reason) return { error: "Escribe el motivo del ajuste." };

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, competitionId },
  });
  if (!participant) return { error: "Ese jugador no está en la competición." };

  await prisma.pointEntry.create({
    data: {
      competitionId,
      participantId,
      delta: Math.trunc(delta),
      reason,
      createdById: manager.id,
    },
  });
  await registrar(
    competitionId,
    "puntos",
    `${Math.trunc(delta) > 0 ? "+" : ""}${Math.trunc(delta)} a ${participant.displayName}: ${reason}`,
  );

  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/");
  return {
    success: `${Math.trunc(delta) > 0 ? "+" : ""}${Math.trunc(delta)} a ${participant.displayName}.`,
  };
}

/** Ajuste rápido de ±1 desde la tabla de clasificación. */
export async function quickAdjustPointsAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  const manager = await requireCompetitionManager(competitionId);

  const participantId = String(formData.get("participantId") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  if (!Number.isFinite(delta) || Math.trunc(delta) === 0) return;

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, competitionId },
  });
  if (!participant) return;

  await prisma.pointEntry.create({
    data: {
      competitionId,
      participantId,
      delta: Math.trunc(delta),
      reason: "Ajuste rápido",
      createdById: manager.id,
    },
  });
  await registrar(
    competitionId,
    "puntos",
    `${Math.trunc(delta) > 0 ? "+" : ""}${Math.trunc(delta)} a ${participant.displayName} (ajuste rápido)`,
  );

  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/");
}

/** Aplica el mismo ajuste a todos los participantes de la competición. */
export async function adjustAllPointsAction(
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

  const delta = Number(formData.get("delta") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isFinite(delta) || Math.trunc(delta) === 0) {
    return { error: "Los puntos tienen que ser un número distinto de 0." };
  }
  if (!reason) return { error: "Escribe el motivo del ajuste." };

  const participants = await prisma.participant.findMany({
    where: { competitionId },
    select: { id: true },
  });
  if (!participants.length) return { error: "No hay jugadores todavía." };

  await prisma.pointEntry.createMany({
    data: participants.map((participant) => ({
      competitionId,
      participantId: participant.id,
      delta: Math.trunc(delta),
      reason,
      createdById: manager.id,
    })),
  });
  await registrar(
    competitionId,
    "puntos",
    `${Math.trunc(delta) > 0 ? "+" : ""}${Math.trunc(delta)} a todos (${participants.length}): ${reason}`,
  );

  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/");
  return {
    success: `Aplicado a los ${participants.length} jugadores.`,
  };
}

export async function deletePointEntryAction(formData: FormData) {
  const id = String(formData.get("entryId") ?? "");
  const entry = await prisma.pointEntry.findUnique({ where: { id } });
  if (!entry) return;
  await requireCompetitionManager(entry.competitionId);

  await prisma.pointEntry.delete({ where: { id } });
  const nombre = await nombresDeJugadores(entry.participantId);
  await registrar(
    entry.competitionId,
    "puntos",
    `Borra la entrada de puntos de ${nombre(entry.participantId)} (${entry.delta > 0 ? "+" : ""}${entry.delta}: ${entry.reason})`,
  );
  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/");
}
