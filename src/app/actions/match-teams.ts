"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  assertCanActForParticipant,
  requireCompetitionManager,
} from "@/lib/competition";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { formatoDeCombate } from "@/lib/formatos-de-combate";
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

  /** Y el cuarto: el equipo que alguien sacó a un Battle Royale. */
  const royaleId = String(formData.get("royaleId") ?? "");
  if (royaleId) return anadirAlEquipoDelRoyale(royaleId, formData);

  /** Y el quinto: el equipo con el que alguien juega la final entera. */
  const finalFourId = String(formData.get("finalFourId") ?? "");
  if (finalFourId) return anadirAlEquipoDelFinal(finalFourId, formData);

  // El mismo editor sirve para los combates de jornada y para los retos
  const esReto = formData.get("esReto") === "1";
  const combateId = String(formData.get("matchId") ?? "");

  const combate = esReto
    ? await prisma.challengeMatch.findUnique({ where: { id: combateId } })
    : await prisma.match.findUnique({
        where: { id: combateId },
        include: {
          matchday: { select: { competitionId: true, formato: true } },
        },
      });
  if (!combate) return { error: "Combate no encontrado." };

  const competitionId =
    "matchday" in combate ? combate.matchday.competitionId : combate.competitionId;

  /**
   * Cuántos caben depende del tipo de combate: en VGC son cuatro y no seis. En
   * una jornada manda el formato de la jornada, salvo que ese combate lleve la
   * contraria; en un reto, el suyo.
   */
  const formato = formatoDeCombate(
    "matchday" in combate
      ? (combate.formato ?? combate.matchday.formato)
      : combate.formato,
  );

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
  if (count >= formato.equipo) {
    return {
      error: `En ${formato.nombre} un equipo son ${formato.equipo} pokémon como mucho.`,
    };
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

/**
 * El equipo que alguien sacó a un Battle Royale.
 *
 * Como en los combates de jornada, lo apunta la organización: es información
 * del combate, no del jugador.
 */
async function anadirAlEquipoDelRoyale(
  royaleId: string,
  formData: FormData,
): Promise<FormState> {
  const royale = await prisma.royale.findUnique({
    where: { id: royaleId },
    include: {
      matchday: { select: { competitionId: true, formato: true } },
      puestos: { select: { participantId: true } },
    },
  });
  if (!royale) return { error: "Ese royale ya no está." };

  try {
    await requireCompetitionManager(royale.matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantId = String(formData.get("participantId") ?? "");
  if (!royale.puestos.some((fila) => fila.participantId === participantId)) {
    return { error: "Ese jugador no está en este royale." };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const formato = formatoDeCombate(royale.matchday.formato);
  const count = await prisma.matchPokemon.count({
    where: { royaleId, participantId },
  });
  if (count >= formato.equipo) {
    return { error: `Un equipo son ${formato.equipo} pokémon como mucho.` };
  }

  const sprites = await spritesDelFormulario(formData);

  await prisma.matchPokemon.create({
    data: {
      royaleId,
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

/**
 * El equipo con el que alguien juega la Final Four.
 *
 * Es **uno para todo el cuadro**, no uno por llave: en la final cada uno se
 * presenta con su equipo y con ese juega hasta que cae. Por eso no hay que
 * apuntarlo combate a combate, y por eso luego se puede traer al hall de la
 * fama de una pieza.
 *
 * Lo apunta **cada uno el suyo**, o quien administre: es su equipo, y obligar a
 * que lo metiera la organización por los cuatro era trabajo de más para nada.
 */
async function anadirAlEquipoDelFinal(
  finalFourId: string,
  formData: FormData,
): Promise<FormState> {
  const cuadro = await prisma.finalFour.findUnique({
    where: { id: finalFourId },
    select: { competitionId: true, seeds: true },
  });
  if (!cuadro) return { error: "Ese cuadro ya no está." };

  const participantId = String(formData.get("participantId") ?? "");
  if (!cuadro.seeds.includes(participantId)) {
    return { error: "Ese jugador no está en el cuadro." };
  }

  try {
    await assertCanActForParticipant(participantId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const count = await prisma.matchPokemon.count({
    where: { finalFourId, participantId },
  });
  if (count >= MAX_TEAM) {
    return { error: `Un equipo son ${MAX_TEAM} pokémon como mucho.` };
  }

  const sprites = await spritesDelFormulario(formData);

  await prisma.matchPokemon.create({
    data: {
      finalFourId,
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      boxImage: sprites?.boxImage ?? null,
      detailImage: sprites?.detailImage ?? null,
      position: count,
    },
  });

  revalidatePath("/final-four");
  revalidatePath("/hall-de-la-fama");
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
      royale: { include: { matchday: { select: { competitionId: true } } } },
      finalFour: { select: { competitionId: true } },
    },
  });
  if (!pokemon) return;

  /**
   * El de la final lo puede quitar su dueño, igual que lo pone: los demás
   * equipos son cosa de la organización, pero este es suyo.
   */
  if (pokemon.finalFourId) {
    await assertCanActForParticipant(pokemon.participantId);
    await prisma.matchPokemon.delete({ where: { id } });
    revalidatePath("/final-four");
    revalidatePath("/hall-de-la-fama");
    return;
  }

  // El pokémon cuelga de una jornada, de un reto, de un gimnasio o de un
  // royale: siempre de uno solo
  const competitionId =
    pokemon.match?.matchday.competitionId ??
    pokemon.challengeMatch?.competitionId ??
    pokemon.levelCap?.competitionId ??
    pokemon.royale?.matchday.competitionId;
  if (!competitionId) return;
  await requireCompetitionManager(competitionId);

  // Al borrarlo se van también sus votos (cascada) y el desempate que lo
  // señalara (SetNull), así que la votación no queda apuntando a un fantasma.
  await prisma.matchPokemon.delete({ where: { id } });

  revalidatePath("/jornadas");
  revalidatePath("/retos");
  revalidatePath("/level-caps");
}
