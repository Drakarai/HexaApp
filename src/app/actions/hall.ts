"use server";

import { revalidatePath } from "next/cache";
import { mensajeDeError } from "@/lib/permiso";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { lockeTerminado } from "@/lib/campeon";
import { getUltimoEquipo } from "@/lib/ultimo-equipo";
import { spriteDeEspecie, spritesDelFormulario } from "@/lib/sprites-servidor";
import { assertPuedeTocarLaCaja } from "@/lib/caja-servidor";
import { getEquipoActual } from "@/lib/soul-link";
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
  // Sin jornadas, el «último equipo» es el de su caja, que es privada: solo su dueño
  if (equipo.deDonde === "Equipo y PC") {
    try {
      await assertPuedeTocarLaCaja(participantId);
    } catch (error) {
      return { error: mensajeDeError(error) };
    }
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

/**
 * **Del Equipo y PC**: los que lleva en el equipo, o uno que se elige de la
 * caja. Es la otra forma de saber con qué equipo se acabó, aparte del último
 * combate de jornada: el que se llevaba al pasarse la Liga.
 *
 * La caja es privada (ver `assertPuedeTocarLaCaja`): solo la toca su dueño, o
 * en un Soul Link también quien administra. El hall es público, así que dejar
 * a otro traerla sería enseñar a todos lo que no se ve.
 */
async function puedeTraerDelPc(participantId: string) {
  const { participant } = await assertPuedeTocarLaCaja(participantId);
  if (!(await lockeTerminado(participant.competitionId))) {
    throw new Error("El hall de la fama se abre cuando el locke se ha acabado.");
  }
  return participant;
}

/** La ilustración grande de su especie, para la ficha del hall; si no hay, sin ella */
async function ilustracion(pokemonId: number | null, shiny: boolean) {
  if (!pokemonId) return null;
  try {
    return await spriteDeEspecie(pokemonId, shiny, "detail");
  } catch {
    return null;
  }
}

export async function traerEquipoDelPcAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");
  try {
    await puedeTraerDelPc(participantId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
  if (await prisma.hallOfFameEntry.count({ where: { participantId } })) {
    return { error: "Este equipo ya tiene pokémon: quítalos antes de traerlo." };
  }
  const equipo = (await getEquipoActual(participantId)).slice(0, TEAM_SIZE);
  if (!equipo.length) return { error: "No llevas a nadie en el equipo de Equipo y PC." };

  const ilustraciones = await Promise.all(equipo.map((p) => ilustracion(p.pokemonId, p.shiny)));
  await prisma.hallOfFameEntry.createMany({
    data: equipo.map((pokemon, posicion) => ({
      participantId,
      species: pokemon.species,
      nickname: pokemon.nickname,
      image: pokemon.image,
      detailImage: ilustraciones[posicion],
      position: posicion,
    })),
  });
  revalidatePath("/hall-de-la-fama");
  return { success: "Traído tu equipo de Equipo y PC. Cámbialo si no es el bueno." };
}

/** Uno de tus pokémon de Equipo y PC (del equipo o de la caja), al hall */
export async function anadirDelPcAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");
  const captureId = String(formData.get("captureId") ?? "");
  try {
    await puedeTraerDelPc(participantId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
  const [captura, ya] = await Promise.all([
    // Suyo y vivo: de la caja de otro no, aunque se sepa su id
    prisma.capture.findFirst({
      where: { id: captureId, participantId, failed: false, deathId: null },
      select: { species: true, nickname: true, image: true, pokemonId: true, shiny: true },
    }),
    prisma.hallOfFameEntry.findMany({
      where: { participantId },
      select: { species: true, nickname: true },
    }),
  ]);
  if (!captura) return { error: "Ese pokémon ya no está en tu Equipo y PC." };
  if (ya.length >= TEAM_SIZE) return { error: `El equipo ya tiene sus ${TEAM_SIZE} pokémon.` };
  if (ya.some((e) => e.species === captura.species && (e.nickname ?? "") === (captura.nickname ?? ""))) {
    return { error: `${captura.nickname ?? captura.species} ya está en el equipo.` };
  }

  await prisma.hallOfFameEntry.create({
    data: {
      participantId,
      species: captura.species,
      nickname: captura.nickname,
      image: captura.image,
      detailImage: await ilustracion(captura.pokemonId, captura.shiny),
      position: ya.length,
    },
  });
  revalidatePath("/hall-de-la-fama");
  return { success: `${captura.nickname ?? captura.species} añadido al equipo.` };
}

export async function removeHallPokemonAction(formData: FormData) {
  const id = String(formData.get("entryId") ?? "");
  const entry = await prisma.hallOfFameEntry.findUnique({ where: { id } });
  if (!entry) return;
  await assertCanActForParticipant(entry.participantId);

  await prisma.hallOfFameEntry.delete({ where: { id } });
  revalidatePath("/hall-de-la-fama");
}
