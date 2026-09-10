"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
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
  /**
   * El equipo con el que te pasaste un **gimnasio**. Es el tercer sitio del que
   * cuelga un equipo, y de momento **solo en los lockes en solitario**: en uno
   * de seis serían seis equipos que apuntar por cada gimnasio, y eso no lo hace
   * nadie.
   */
  const levelCapId = String(formData.get("levelCapId") ?? "");
  if (levelCapId) return anadirAlEquipoDelGimnasio(levelCapId, formData);

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

/**
 * El equipo de un gimnasio: un solo jugador, el de la partida, y sin combate
 * del que colgar. Se comprueba en el servidor que la edición sea de una
 * persona, porque ocultar el botón no es una comprobación.
 */
async function anadirAlEquipoDelGimnasio(
  levelCapId: string,
  formData: FormData,
): Promise<FormState> {
  const levelCap = await prisma.levelCap.findUnique({
    where: { id: levelCapId },
    select: { competitionId: true, competition: { select: { maxPlayers: true } } },
  });
  if (!levelCap) return { error: "Ese hito ya no está." };

  if (!perfilDeLocke(levelCap.competition.maxPlayers).enSolitario) {
    return {
      error: "El equipo por gimnasio es solo para los lockes en solitario.",
    };
  }

  try {
    await requireCompetitionManager(levelCap.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantId = String(formData.get("participantId") ?? "");
  const juega = await prisma.participant.count({
    where: { id: participantId, competitionId: levelCap.competitionId },
  });
  if (!juega) return { error: "Ese jugador no es de esta edición." };

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const count = await prisma.matchPokemon.count({
    where: { levelCapId, participantId },
  });
  if (count >= MAX_TEAM) {
    return { error: `Un equipo son ${MAX_TEAM} pokémon como mucho.` };
  }

  // Las imágenes las baja el servidor, igual que en los combates
  const sprites = await spritesDelFormulario(formData);

  await prisma.matchPokemon.create({
    data: {
      levelCapId,
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      boxImage: sprites?.boxImage ?? null,
      detailImage: sprites?.detailImage ?? null,
      position: count,
    },
  });

  revalidatePath("/level-caps");
  return { success: "Pokémon añadido al equipo." };
}

export async function removeMatchPokemonAction(formData: FormData) {
  const id = String(formData.get("matchPokemonId") ?? "");
  const pokemon = await prisma.matchPokemon.findUnique({
    where: { id },
    include: {
      match: { include: { matchday: { select: { competitionId: true } } } },
      challengeMatch: { select: { competitionId: true } },
      levelCap: { select: { competitionId: true } },
    },
  });
  if (!pokemon) return;

  // El pokémon cuelga de una jornada, de un reto o de un gimnasio: solo de uno
  const competitionId =
    pokemon.match?.matchday.competitionId ??
    pokemon.challengeMatch?.competitionId ??
    pokemon.levelCap?.competitionId;
  if (!competitionId) return;
  await requireCompetitionManager(competitionId);

  // Al borrarlo se van también sus votos (cascada) y el desempate que lo
  // señalara (SetNull), así que la votación no queda apuntando a un fantasma.
  await prisma.matchPokemon.delete({ where: { id } });

  revalidatePath("/jornadas");
  revalidatePath("/retos");
  revalidatePath("/level-caps");
}
