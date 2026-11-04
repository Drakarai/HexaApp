"use server";

import { revalidatePath } from "next/cache";
import { mensajeDeError } from "@/lib/permiso";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { assertPuedeTocarLaCaja } from "@/lib/caja-servidor";
import { urlsDeImagen } from "@/lib/imagenes";
import { HUECOS_POR_CAJA } from "@/lib/equipo-y-caja";
import { leerNombresDeCaja, nombreDeCaja } from "@/lib/fondos-de-caja";
import { esElMismo } from "@/lib/historia";
import { leerAses, nombrarAs, quitarAs, type PokemonDelAs } from "@/lib/as";
import { copiaDelAs, SIN_AS } from "@/lib/as-servidor";
import { findSpecies } from "@/lib/pokedex";

/**
 * El pokémon as de un jugador en la competición actual. **Se elige de su
 * caja**: uno vivo de su Equipo y PC, y desde ese momento se pone al día solo
 * con él (ver lib/as-servidor.ts). Como la caja, lo elige su dueño —en un
 * Soul Link, también quien administra—: es su caja la que se enseña para
 * elegir. Cada cambio queda en su historial (ver lib/as.ts), y de ahí en la
 * historia de los dos pokémon.
 */

export type CandidatoAAs = {
  captureId: string;
  nombre: string;
  especie: string;
  imagen: string | null;
  shiny: boolean;
  /** "Tu equipo" o el nombre de su caja */
  donde: string;
};

/** Los vivos de su Equipo y PC, para elegir el as */
export async function candidatosAAsAction(
  participantId: string,
): Promise<{ candidatos?: CandidatoAAs[]; actual?: string | null; error?: string }> {
  try {
    await assertPuedeTocarLaCaja(String(participantId ?? ""));
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
  const [jugador, vivos] = await Promise.all([
    prisma.participant.findUniqueOrThrow({
      where: { id: participantId },
      select: { aceCaptureId: true, nombresDeCaja: true },
    }),
    prisma.capture.findMany({
      where: { participantId, failed: false, deathId: null },
      orderBy: [{ lugar: "desc" }, { hueco: "asc" }],
      select: { id: true, species: true, nickname: true, shiny: true, lugar: true, hueco: true },
    }),
  ]);
  const imagenes = await urlsDeImagen(
    "captura",
    vivos.map((c) => c.id),
  );
  const nombres = leerNombresDeCaja(jugador.nombresDeCaja);
  return {
    actual: jugador.aceCaptureId,
    candidatos: vivos.map((c) => ({
      captureId: c.id,
      nombre: c.nickname || c.species,
      especie: c.species,
      imagen: imagenes(c.id),
      shiny: c.shiny,
      donde: c.lugar === "equipo" ? "Tu equipo" : nombreDeCaja(nombres, Math.floor(c.hueco / HUECOS_POR_CAJA)),
    })),
  };
}

/**
 * Nombrar as a una captura (o cambiarle solo el porqué, si ya lo era). El que
 * lo era deja de serlo en su historial: «cayó» si está en el cementerio, y si
 * no, que le ha relevado este.
 */
export async function elegirAsAction(entrada: {
  participantId: string;
  captureId: string;
  reason: string;
}): Promise<{ error?: string; success?: string }> {
  const participantId = String(entrada.participantId ?? "");
  try {
    await assertPuedeTocarLaCaja(participantId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
  const reason = String(entrada.reason ?? "").trim().slice(0, 500) || null;

  const [jugador, captura] = await Promise.all([
    prisma.participant.findUniqueOrThrow({
      where: { id: participantId },
      select: {
        aceCaptureId: true,
        aceSpecies: true,
        aceNickname: true,
        historialDeAses: true,
        aceCapture: { select: { id: true, species: true, nickname: true, pokemonId: true, deathId: true } },
      },
    }),
    prisma.capture.findFirst({
      where: { id: String(entrada.captureId ?? ""), participantId, failed: false },
      select: { id: true, species: true, nickname: true, pokemonId: true, shiny: true, image: true, deathId: true },
    }),
  ]);
  if (!captura) return { error: "Ese pokémon no está en tu caja." };
  if (captura.deathId) return { error: "Un pokémon caído ya no puede ser tu as." };

  // El mismo de antes: solo cambia el porqué, y la historia no se toca
  if (jugador.aceCaptureId === captura.id) {
    await prisma.participant.update({ where: { id: participantId }, data: { aceReason: reason } });
    revalidatePath("/", "layout");
    return { success: "As guardado." };
  }

  const anterior = await asAnterior(participantId, jugador);
  const nuevo: PokemonDelAs = {
    captureId: captura.id,
    species: captura.species,
    nickname: captura.nickname,
    pokemonId: captura.pokemonId,
  };
  await prisma.participant.update({
    where: { id: participantId },
    data: {
      ...(await copiaDelAs(captura)),
      aceCaptureId: captura.id,
      aceReason: reason,
      historialDeAses: nombrarAs(leerAses(jugador.historialDeAses), nuevo, anterior, new Date().toISOString()),
    },
  });
  revalidatePath("/", "layout");
  return { success: `${captura.nickname || captura.species} es tu nuevo as.` };
}

/**
 * El as de ahora, para cerrarlo en el historial. Uno de la caja dice solo si
 * ha caído; uno de los de antes (una especie escrita) se busca en el
 * cementerio por su mote y su familia.
 */
async function asAnterior(
  participantId: string,
  jugador: {
    aceSpecies: string | null;
    aceNickname: string | null;
    aceCapture: { id: string; species: string; nickname: string | null; pokemonId: number | null; deathId: string | null } | null;
  },
): Promise<(PokemonDelAs & { caido: boolean }) | null> {
  if (jugador.aceCapture) {
    const { id, species, nickname, pokemonId, deathId } = jugador.aceCapture;
    return { captureId: id, species, nickname, pokemonId, caido: Boolean(deathId) };
  }
  if (!jugador.aceSpecies) return null;
  const antiguo = {
    captureId: null,
    species: jugador.aceSpecies,
    nickname: jugador.aceNickname,
    pokemonId: findSpecies(jugador.aceSpecies, true)?.dex ?? null,
  };
  const bajas = await prisma.death.findMany({
    where: { participantId, revividoEl: null },
    select: { species: true, nickname: true },
  });
  return { ...antiguo, caido: bajas.some((baja) => esElMismo(baja, antiguo)) };
}

/** Quedarse sin as. Lo puede hacer también quien administra, como antes */
export async function clearAceAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  await assertCanActForParticipant(participantId);
  const jugador = await prisma.participant.findUniqueOrThrow({
    where: { id: participantId },
    select: { historialDeAses: true },
  });
  await prisma.participant.update({
    where: { id: participantId },
    data: {
      ...SIN_AS,
      historialDeAses: quitarAs(leerAses(jugador.historialDeAses), new Date().toISOString()),
    },
  });
  revalidatePath("/", "layout");
}
