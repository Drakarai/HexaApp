"use server";

import { revalidatePath } from "next/cache";
import { mensajeDeError } from "@/lib/permiso";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { lockeTerminado } from "@/lib/campeon";
import { getUltimoEquipo } from "@/lib/ultimo-equipo";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import type { FormState } from "@/app/actions/auth";

const TEAM_SIZE = 6;

/**
 * Añade un pokémon al equipo con el que un jugador termina el locke. Solo se
 * puede cuando el locke ya tiene campeón: el hall de la fama es el
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
    return { error: mensajeDeError(error) };
  }

  if (!(await lockeTerminado(participant.competitionId))) {
    return { error: "El hall de la fama se abre cuando el locke se ha acabado." };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const count = await prisma.hallOfFameEntry.count({ where: { participantId } });
  if (count >= TEAM_SIZE) {
    return { error: `El equipo ya tiene sus ${TEAM_SIZE} pokémon.` };
  }

  // Las dos: el sprite de la casilla y la ilustración de la ficha en grande
  const sprites = await spritesDelFormulario(formData);

  await prisma.hallOfFameEntry.create({
    data: {
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      image: sprites?.boxImage ?? null,
      detailImage: sprites?.detailImage ?? null,
      position: count,
    },
  });

  revalidatePath("/hall-de-la-fama");
  return { success: `${species} añadido al equipo.` };
}

/**
 * Rellena el equipo del hall con el del último combate de jornada.
 *
 * Es un atajo, no una regla: **solo se ofrece cuando el equipo está vacío** y
 * lo que deja se puede quitar y cambiar como si se hubiera escrito a mano. El
 * equipo con el que se termina el locke suele ser el del último combate, y
 * volver a teclear seis pokémon que la aplicación ya conoce no tenía sentido.
 */
export async function traerUltimoEquipoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");

  let participant;
  try {
    ({ participant } = await assertCanActForParticipant(participantId));
  } catch (error) {
    return { error: mensajeDeError(error) };
  }

  if (!(await lockeTerminado(participant.competitionId))) {
    return { error: "El hall de la fama se abre cuando el locke se ha acabado." };
  }

  const cuantos = await prisma.hallOfFameEntry.count({ where: { participantId } });
  if (cuantos > 0) {
    return { error: "Este equipo ya tiene pokémon: quítalos antes de traerlo." };
  }

  const equipo = await getUltimoEquipo(participantId, participant.competitionId);
  if (!equipo) {
    return { error: "No hay ningún equipo apuntado del que traerlo." };
  }

  await prisma.hallOfFameEntry.createMany({
    data: equipo.pokemon.slice(0, TEAM_SIZE).map((pokemon, posicion) => ({
      participantId,
      species: pokemon.species,
      nickname: pokemon.nickname,
      image: pokemon.boxImage,
      detailImage: pokemon.detailImage,
      position: posicion,
    })),
  });

  revalidatePath("/hall-de-la-fama");
  return {
    success: `Traído el equipo de ${equipo.deDonde}. Cámbialo si no es el bueno.`,
  };
}

export async function removeHallPokemonAction(formData: FormData) {
  const id = String(formData.get("entryId") ?? "");
  const entry = await prisma.hallOfFameEntry.findUnique({ where: { id } });
  if (!entry) return;
  await assertCanActForParticipant(entry.participantId);

  await prisma.hallOfFameEntry.delete({ where: { id } });
  revalidatePath("/hall-de-la-fama");
}
