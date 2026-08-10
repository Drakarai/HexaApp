"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getStandings, requireCompetitionManager } from "@/lib/competition";
import { BRACKET_KEYS, type BracketKey } from "@/lib/final-four";
import type { FormState } from "@/app/actions/auth";

/**
 * Genera el cuadro con la clasificación actual. Solo se permite cuando todas
 * las jornadas están jugadas: la siembra se congela aquí para que un ajuste de
 * puntos posterior no recoloque a nadie a mitad del torneo.
 */
export async function generateBracketAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const existing = await prisma.finalFour.findUnique({
    where: { competitionId },
  });
  if (existing) return { error: "El cuadro ya estaba generado." };

  const matches = await prisma.match.findMany({
    where: { matchday: { competitionId } },
    select: { winnerId: true },
  });
  if (!matches.length) {
    return { error: "Todavía no hay jornadas con combates." };
  }
  const pendientes = matches.filter((match) => !match.winnerId).length;
  if (pendientes > 0) {
    return {
      error: `Faltan ${pendientes} combates de jornada por resolver.`,
    };
  }

  const standings = await getStandings(competitionId);
  if (standings.length < 6) {
    return {
      error: "Hacen falta 6 jugadores clasificados para montar el cuadro.",
    };
  }

  await prisma.finalFour.create({
    data: {
      competitionId,
      seeds: standings.slice(0, 6).map((row) => row.participantId),
      matches: { create: BRACKET_KEYS.map((key) => ({ key })) },
    },
  });

  revalidatePath("/final-four");
  revalidatePath("/");
  return { success: "Cuadro generado. ¡Que empiece la Final Four!" };
}

export async function setFinalMatchResultAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  const key = String(formData.get("key") ?? "") as BracketKey;
  if (!BRACKET_KEYS.includes(key)) return;

  const finalFour = await prisma.finalFour.findUnique({
    where: { competitionId },
  });
  if (!finalFour) return;

  const winnerRaw = String(formData.get("winnerId") ?? "").trim();
  const winnerId = finalFour.seeds.includes(winnerRaw) ? winnerRaw : null;

  const diffRaw = String(formData.get("pokemonDiff") ?? "").trim();
  const diff = diffRaw ? Number(diffRaw) : null;
  const playedAtRaw = String(formData.get("playedAt") ?? "").trim();

  await prisma.finalMatch.update({
    where: { finalFourId_key: { finalFourId: finalFour.id, key } },
    data: {
      winnerId,
      pokemonDiff:
        diff !== null && Number.isFinite(diff) ? Math.abs(Math.trunc(diff)) : null,
      playedAt: playedAtRaw ? new Date(playedAtRaw) : winnerId ? new Date() : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  // Si se cambia un resultado anterior, las rondas siguientes dejan de valer
  const posteriores: Record<BracketKey, BracketKey[]> = {
    CROSS_A: ["SEMI_A", "FINAL"],
    CROSS_B: ["SEMI_B", "FINAL"],
    SEMI_A: ["FINAL"],
    SEMI_B: ["FINAL"],
    FINAL: [],
  };
  const afectadas = posteriores[key];
  if (afectadas.length) {
    await prisma.finalMatch.updateMany({
      where: { finalFourId: finalFour.id, key: { in: afectadas } },
      data: { winnerId: null, pokemonDiff: null, playedAt: null },
    });
  }

  revalidatePath("/final-four");
  revalidatePath("/hall-de-la-fama");
  revalidatePath("/");
}

export async function resetBracketAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  await prisma.finalFour.deleteMany({ where: { competitionId } });

  revalidatePath("/final-four");
  revalidatePath("/hall-de-la-fama");
  revalidatePath("/");
}
