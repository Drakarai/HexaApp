"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { isLockeFinished } from "@/lib/final-four";
import { sanitizeImageValue } from "@/lib/image";
import type { FormState } from "@/app/actions/auth";

const TEAM_SIZE = 6;

/**
 * Añade un pokémon al equipo con el que un jugador termina el locke. Solo se
 * puede cuando la Final Four ya tiene campeón: el hall de la fama es el
 * broche, no algo que se vaya rellenando por el camino.
 */
export async function addHallPokemonAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");

  let participant;
  try {
    ({ participant } = await assertCanActForParticipant(participantId));
  } catch (error) {
    return { error: (error as Error).message };
  }

  if (!(await isLockeFinished(participant.competitionId))) {
    return { error: "El hall de la fama se abre al terminar la Final Four." };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const count = await prisma.hallOfFameEntry.count({ where: { participantId } });
  if (count >= TEAM_SIZE) {
    return { error: `El equipo ya tiene sus ${TEAM_SIZE} pokémon.` };
  }

  await prisma.hallOfFameEntry.create({
    data: {
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      image: sanitizeImageValue(formData.get("boxImage")),
      position: count,
    },
  });

  revalidatePath("/hall-de-la-fama");
  return { success: `${species} añadido al equipo.` };
}

export async function removeHallPokemonAction(formData: FormData) {
  const id = String(formData.get("entryId") ?? "");
  const entry = await prisma.hallOfFameEntry.findUnique({ where: { id } });
  if (!entry) return;
  await assertCanActForParticipant(entry.participantId);

  await prisma.hallOfFameEntry.delete({ where: { id } });
  revalidatePath("/hall-de-la-fama");
}

export async function updateHallPokemonAction(formData: FormData) {
  const id = String(formData.get("entryId") ?? "");
  const entry = await prisma.hallOfFameEntry.findUnique({ where: { id } });
  if (!entry) return;
  await assertCanActForParticipant(entry.participantId);

  await prisma.hallOfFameEntry.update({
    where: { id },
    data: {
      nickname: String(formData.get("nickname") ?? "").trim() || null,
    },
  });
  revalidatePath("/hall-de-la-fama");
}
