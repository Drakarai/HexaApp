"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  getMyParticipant,
  requireCompetitionManager,
} from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";

/**
 * Voto al MVP de una jornada. Vota cada jugador de la competición, una vez por
 * jornada; volver a votar cambia el voto en vez de sumar otro.
 */
export async function castMvpVoteAction(formData: FormData) {
  const me = await requireUser();
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchPokemonId = String(formData.get("matchPokemonId") ?? "");

  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { competitionId: true },
  });
  if (!matchday) return;

  // Solo votan los que juegan: un administrador que no participa, no.
  const voter = await getMyParticipant(matchday.competitionId, me.id);
  if (!voter) return;

  // El candidato tiene que ser de esa misma jornada
  const candidate = await prisma.matchPokemon.findFirst({
    where: { id: matchPokemonId, match: { matchdayId } },
    select: { id: true },
  });
  if (!candidate) return;

  await prisma.mvpVote.upsert({
    where: { matchdayId_voterId: { matchdayId, voterId: voter.id } },
    create: { matchdayId, voterId: voter.id, matchPokemonId },
    update: { matchPokemonId },
  });

  revalidatePath("/jornadas");
}

export async function clearMvpVoteAction(formData: FormData) {
  const me = await requireUser();
  const matchdayId = String(formData.get("matchdayId") ?? "");

  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { competitionId: true },
  });
  if (!matchday) return;

  const voter = await getMyParticipant(matchday.competitionId, me.id);
  if (!voter) return;

  await prisma.mvpVote.deleteMany({ where: { matchdayId, voterId: voter.id } });
  revalidatePath("/jornadas");
}

/** El texto de por qué es el MVP. Lo escribe un administrador. */
export async function setMvpReasonAction(
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

  await prisma.matchday.update({
    where: { id: matchdayId },
    data: { mvpReason: String(formData.get("reason") ?? "").trim() || null },
  });

  revalidatePath("/jornadas");
  return { success: "Guardado." };
}

/**
 * Desempate manual. Solo se usa mientras el empate siga en pie: si los votos
 * lo deshacen, manda la votación y esto se ignora.
 */
export async function setMvpTiebreakAction(formData: FormData) {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { competitionId: true },
  });
  if (!matchday) return;
  await requireCompetitionManager(matchday.competitionId);

  const matchPokemonId = String(formData.get("matchPokemonId") ?? "").trim();
  const candidate = matchPokemonId
    ? await prisma.matchPokemon.findFirst({
        where: { id: matchPokemonId, match: { matchdayId } },
        select: { id: true },
      })
    : null;

  await prisma.matchday.update({
    where: { id: matchdayId },
    data: { mvpTiebreakId: candidate?.id ?? null },
  });

  revalidatePath("/jornadas");
}

/** La ilustración grande solo se pide al abrir la ficha del MVP. */
export async function getMvpDetailImageAction(matchPokemonId: string) {
  await requireUser();
  const pokemon = await prisma.matchPokemon.findUnique({
    where: { id: matchPokemonId },
    select: { detailImage: true },
  });
  return pokemon?.detailImage ?? null;
}
