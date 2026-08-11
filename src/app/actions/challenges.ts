"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";

/**
 * Combates de reto: piques sueltos entre dos jugadores, con premio y castigo.
 * Cuentan para el historial de victorias y derrotas pero **no dan puntos**; su
 * diferencia de pokémon solo entra en el desempate si la edición lo permite.
 */
export async function createChallengeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantAId = String(formData.get("participantAId") ?? "");
  const participantBId = String(formData.get("participantBId") ?? "");
  if (!participantAId || !participantBId) {
    return { error: "Elige a los dos jugadores del reto." };
  }
  if (participantAId === participantBId) {
    return { error: "Un jugador no puede retarse a sí mismo." };
  }

  const ambos = await prisma.participant.count({
    where: { id: { in: [participantAId, participantBId] }, competitionId },
  });
  if (ambos !== 2) return { error: "Esos jugadores no son de esta edición." };

  await prisma.challengeMatch.create({
    data: {
      competitionId,
      participantAId,
      participantBId,
      prize: String(formData.get("prize") ?? "").trim() || null,
      punishment: String(formData.get("punishment") ?? "").trim() || null,
    },
  });

  revalidatePath("/retos");
  return { success: "Reto creado." };
}

/** Resultado, premio, castigo y diferencia de un reto. */
export async function setChallengeResultAction(formData: FormData) {
  const id = String(formData.get("challengeId") ?? "");
  const reto = await prisma.challengeMatch.findUnique({ where: { id } });
  if (!reto) return;
  await requireCompetitionManager(reto.competitionId);

  const ganadorBruto = String(formData.get("winnerId") ?? "").trim();
  const winnerId =
    ganadorBruto === reto.participantAId || ganadorBruto === reto.participantBId
      ? ganadorBruto
      : null;

  const difBruta = String(formData.get("pokemonDiff") ?? "").trim();
  const dif = difBruta ? Number(difBruta) : null;
  const fechaBruta = String(formData.get("playedAt") ?? "").trim();

  await prisma.challengeMatch.update({
    where: { id },
    data: {
      winnerId,
      pokemonDiff:
        dif !== null && Number.isFinite(dif) ? Math.abs(Math.trunc(dif)) : null,
      prize: String(formData.get("prize") ?? "").trim() || null,
      punishment: String(formData.get("punishment") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      playedAt: fechaBruta ? new Date(fechaBruta) : winnerId ? new Date() : null,
    },
  });

  revalidatePath("/retos");
  revalidatePath("/puntos");
  revalidatePath("/jugador", "layout");
}

export async function deleteChallengeAction(formData: FormData) {
  const id = String(formData.get("challengeId") ?? "");
  const reto = await prisma.challengeMatch.findUnique({ where: { id } });
  if (!reto) return;
  await requireCompetitionManager(reto.competitionId);

  await prisma.challengeMatch.delete({ where: { id } });

  revalidatePath("/retos");
  revalidatePath("/puntos");
  revalidatePath("/jugador", "layout");
}

/**
 * Si la diferencia de pokémon de los retos cuenta para el desempate de la
 * clasificación. Los puntos nunca salen de un reto; esto es solo el tercer
 * criterio, cuando dos van empatados a puntos y a caídos.
 */
export async function setChallengeDiffCountsAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  await prisma.competition.update({
    where: { id: competitionId },
    data: { challengeDiffCounts: formData.get("cuenta") === "on" },
  });

  revalidatePath("/admin");
  revalidatePath("/puntos");
  revalidatePath("/");
}
