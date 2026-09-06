"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { resolverRetiradas } from "@/lib/retiradas";
import { enlaceSeguro } from "@/lib/utils";
import type { FormState } from "@/app/actions/auth";

export async function createMatchdayAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Ponle nombre a la jornada." };

  const pointsForWin = Number(formData.get("pointsForWin") ?? 1);
  const last = await prisma.matchday.findFirst({
    where: { competitionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.matchday.create({
    data: {
      competitionId,
      label,
      milestone: String(formData.get("milestone") ?? "").trim() || null,
      pointsForWin: Number.isFinite(pointsForWin) ? Math.trunc(pointsForWin) : 1,
      position: (last?.position ?? 0) + 1,
    },
  });

  revalidatePath("/jornadas");
  return { success: "Jornada creada." };
}

export async function deleteMatchdayAction(formData: FormData) {
  const id = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({ where: { id } });
  if (!matchday) return;
  await requireCompetitionManager(matchday.competitionId);

  await prisma.matchday.delete({ where: { id } });
  revalidatePath("/jornadas");
  revalidatePath("/puntos");
}

export async function addMatchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: { _count: { select: { matches: true } } },
  });
  if (!matchday) return { error: "Jornada no encontrada." };

  try {
    await requireCompetitionManager(matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantAId = String(formData.get("participantAId") ?? "");
  const participantBId = String(formData.get("participantBId") ?? "");
  if (!participantAId || !participantBId) {
    return { error: "Elige los dos jugadores del emparejamiento." };
  }
  if (participantAId === participantBId) {
    return { error: "Un jugador no puede combatir contra sí mismo." };
  }

  const both = await prisma.participant.count({
    where: {
      id: { in: [participantAId, participantBId] },
      competitionId: matchday.competitionId,
    },
  });
  if (both !== 2) return { error: "Esos jugadores no son de esta competición." };

  await prisma.match.create({
    data: {
      matchdayId,
      participantAId,
      participantBId,
      position: matchday._count.matches,
    },
  });

  revalidatePath("/jornadas");
  return { success: "Emparejamiento añadido." };
}

/**
 * Guarda el resultado de un combate y sincroniza el punto de la victoria:
 * cada combate genera como mucho una entrada de puntos, enlazada por
 * sourceMatchId, de modo que corregir el resultado no duplica puntos.
 */
export async function setMatchResultAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  const manager = await requireCompetitionManager(match.matchday.competitionId);

  const winnerRaw = String(formData.get("winnerId") ?? "").trim();
  const winnerId =
    winnerRaw === match.participantAId || winnerRaw === match.participantBId
      ? winnerRaw
      : null;

  const diffRaw = String(formData.get("pokemonDiff") ?? "").trim();
  const diff = diffRaw ? Number(diffRaw) : null;
  const playedAtRaw = String(formData.get("playedAt") ?? "").trim();

  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId,
      pokemonDiff:
        diff !== null && Number.isFinite(diff) ? Math.abs(Math.trunc(diff)) : null,
      playedAt: playedAtRaw ? new Date(playedAtRaw) : winnerId ? new Date() : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      // Saneado antes de guardarlo: acaba en un href de la pantalla de todos
      replayUrl: enlaceSeguro(String(formData.get("replayUrl") ?? "")),
    },
  });

  const existing = await prisma.pointEntry.findUnique({
    where: { sourceMatchId: matchId },
  });

  if (!winnerId) {
    if (existing) {
      await prisma.pointEntry.delete({ where: { id: existing.id } });
    }
  } else {
    const winner = await prisma.participant.findUnique({
      where: { id: winnerId },
      select: { displayName: true },
    });
    const payload = {
      competitionId: match.matchday.competitionId,
      participantId: winnerId,
      delta: match.matchday.pointsForWin,
      reason: `${match.matchday.label}: victoria de ${winner?.displayName ?? "?"}`,
      createdById: manager.id,
      sourceMatchId: matchId,
    };
    if (existing) {
      await prisma.pointEntry.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.pointEntry.create({ data: payload });
    }
  }

  /**
   * Con este resultado puede haberse completado la jornada, y entonces toca
   * dar por ganados los combates que estaban esperando por retirada.
   */
  await resolverRetiradas(match.matchday.competitionId, manager.id);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/");
}

export async function deleteMatchAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  await requireCompetitionManager(match.matchday.competitionId);

  await prisma.pointEntry.deleteMany({ where: { sourceMatchId: matchId } });
  await prisma.match.delete({ where: { id: matchId } });

  // Borrar el combate que faltaba también deja la jornada terminada
  await resolverRetiradas(match.matchday.competitionId, null);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
}
