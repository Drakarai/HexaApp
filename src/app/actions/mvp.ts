"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireCompetitionManager } from "@/lib/competition";
import { sanitizeImageValue } from "@/lib/image";
import type { FormState } from "@/app/actions/auth";

/**
 * MVP de una jornada. Lo nombran los administradores, no cada jugador: es un
 * premio de la organización, como el resultado de los combates.
 */
export async function updateMatchdayMvpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { competitionId: true },
  });
  if (!matchday) return { error: "Jornada no encontrada." };

  try {
    await requireCompetitionManager(matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del MVP." };

  const participantId = String(formData.get("participantId") ?? "").trim();
  const owner = participantId
    ? await prisma.participant.findFirst({
        where: { id: participantId, competitionId: matchday.competitionId },
      })
    : null;
  if (!owner) return { error: "Di de quién es el pokémon." };

  await prisma.matchday.update({
    where: { id: matchdayId },
    data: {
      mvpParticipantId: owner.id,
      mvpSpecies: species,
      mvpNickname: String(formData.get("nickname") ?? "").trim() || null,
      mvpReason: String(formData.get("reason") ?? "").trim() || null,
      mvpImage: sanitizeImageValue(formData.get("boxImage")),
      mvpDetailImage: sanitizeImageValue(formData.get("detailImage")),
    },
  });

  revalidatePath("/jornadas");
  revalidatePath("/");
  return { success: "MVP guardado." };
}

export async function clearMatchdayMvpAction(formData: FormData) {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { competitionId: true },
  });
  if (!matchday) return;
  await requireCompetitionManager(matchday.competitionId);

  await prisma.matchday.update({
    where: { id: matchdayId },
    data: {
      mvpParticipantId: null,
      mvpSpecies: null,
      mvpNickname: null,
      mvpReason: null,
      mvpImage: null,
      mvpDetailImage: null,
    },
  });

  revalidatePath("/jornadas");
  revalidatePath("/");
}

/** La ilustración grande solo se pide al abrir la ficha del MVP. */
export async function getMatchdayMvpDetailImageAction(matchdayId: string) {
  await requireUser();
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { mvpDetailImage: true },
  });
  return matchday?.mvpDetailImage ?? null;
}
