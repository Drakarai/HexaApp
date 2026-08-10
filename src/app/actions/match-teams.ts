"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import type { FormState } from "@/app/actions/auth";

/** Tope de pokémon por jugador y combate, como el equipo de un juego. */
const MAX_TEAM = 6;

/**
 * Equipo que sacó un jugador en un combate. Lo apunta el administrador, igual
 * que el resultado, y de esa lista salen los candidatos a MVP de la jornada.
 */
export async function addMatchPokemonAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: { select: { competitionId: true } } },
  });
  if (!match) return { error: "Combate no encontrado." };

  try {
    await requireCompetitionManager(match.matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantId = String(formData.get("participantId") ?? "");
  if (
    participantId !== match.participantAId &&
    participantId !== match.participantBId
  ) {
    return { error: "Ese jugador no combate aquí." };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const count = await prisma.matchPokemon.count({
    where: { matchId, participantId },
  });
  if (count >= MAX_TEAM) {
    return { error: `Un equipo son ${MAX_TEAM} pokémon como mucho.` };
  }

  // Las imágenes las baja el servidor: el navegador solo manda qué pokémon es
  const sprites = await spritesDelFormulario(formData);

  await prisma.matchPokemon.create({
    data: {
      matchId,
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      boxImage: sprites?.boxImage ?? null,
      detailImage: sprites?.detailImage ?? null,
      position: count,
    },
  });

  revalidatePath("/jornadas");
  return { success: "Pokémon añadido al equipo." };
}

export async function removeMatchPokemonAction(formData: FormData) {
  const id = String(formData.get("matchPokemonId") ?? "");
  const pokemon = await prisma.matchPokemon.findUnique({
    where: { id },
    include: { match: { include: { matchday: { select: { competitionId: true } } } } },
  });
  if (!pokemon) return;
  await requireCompetitionManager(pokemon.match.matchday.competitionId);

  // Al borrarlo se van también sus votos (cascada) y el desempate que lo
  // señalara (SetNull), así que la votación no queda apuntando a un fantasma.
  await prisma.matchPokemon.delete({ where: { id } });

  revalidatePath("/jornadas");
}
