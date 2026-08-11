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
  // El mismo editor sirve para los combates de jornada y para los retos
  const esReto = formData.get("esReto") === "1";
  const combateId = String(formData.get("matchId") ?? "");

  const combate = esReto
    ? await prisma.challengeMatch.findUnique({ where: { id: combateId } })
    : await prisma.match.findUnique({
        where: { id: combateId },
        include: { matchday: { select: { competitionId: true } } },
      });
  if (!combate) return { error: "Combate no encontrado." };

  const competitionId =
    "matchday" in combate ? combate.matchday.competitionId : combate.competitionId;

  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantId = String(formData.get("participantId") ?? "");
  if (
    participantId !== combate.participantAId &&
    participantId !== combate.participantBId
  ) {
    return { error: "Ese jugador no combate aquí." };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const deQuien = esReto
    ? { challengeMatchId: combateId }
    : { matchId: combateId };

  const count = await prisma.matchPokemon.count({
    where: { ...deQuien, participantId },
  });
  if (count >= MAX_TEAM) {
    return { error: `Un equipo son ${MAX_TEAM} pokémon como mucho.` };
  }

  // Las imágenes las baja el servidor: el navegador solo manda qué pokémon es
  const sprites = await spritesDelFormulario(formData);

  await prisma.matchPokemon.create({
    data: {
      ...deQuien,
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      boxImage: sprites?.boxImage ?? null,
      detailImage: sprites?.detailImage ?? null,
      position: count,
    },
  });

  revalidatePath(esReto ? "/retos" : "/jornadas");
  return { success: "Pokémon añadido al equipo." };
}

export async function removeMatchPokemonAction(formData: FormData) {
  const id = String(formData.get("matchPokemonId") ?? "");
  const pokemon = await prisma.matchPokemon.findUnique({
    where: { id },
    include: {
      match: { include: { matchday: { select: { competitionId: true } } } },
      challengeMatch: { select: { competitionId: true } },
    },
  });
  if (!pokemon) return;

  // El pokémon es de una jornada o de un reto, nunca de los dos
  const competitionId =
    pokemon.match?.matchday.competitionId ?? pokemon.challengeMatch?.competitionId;
  if (!competitionId) return;
  await requireCompetitionManager(competitionId);

  // Al borrarlo se van también sus votos (cascada) y el desempate que lo
  // señalara (SetNull), así que la votación no queda apuntando a un fantasma.
  await prisma.matchPokemon.delete({ where: { id } });

  revalidatePath("/jornadas");
  revalidatePath("/retos");
}
