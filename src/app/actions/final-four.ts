"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getStandings, requireCompetitionManager } from "@/lib/competition";
import {
  clavesDelFormato,
  combatesDeLaLlave,
  formatoParaJugadores,
  llavesPosteriores,
} from "@/lib/formatos-finales";
import { getFinalFourState } from "@/lib/final-four";
import { enlaceSeguro } from "@/lib/utils";
import { IMAGEN_SIN_CAMBIOS, sanitizeImageValue } from "@/lib/image";
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

  // Lo mismo que decide si la pantalla enseña el botón, para que no se pueda
  // generar mandando el formulario a mano antes de tiempo
  const estado = await getFinalFourState(competitionId);
  if (estado.status === "SIN_JORNADAS") {
    return { error: "Todavía no hay jornadas con combates." };
  }
  if (estado.status === "BLOQUEADA") {
    const pendientes = estado.total - estado.jugados;
    return {
      error: pendientes
        ? `Faltan ${pendientes} combates de jornada por resolver.`
        : `Faltan ${estado.faltanPorCrear} de las jornadas previstas por crear.`,
    };
  }
  if (estado.status === "POR_ABANDONO") {
    return { error: `No hay final que jugar: ${estado.champion.displayName} es el único que queda.` };
  }

  /**
   * El formato sale de cuántos siguen jugando, y se guarda con el cuadro: si
   * alguien se retira con la final empezada, no puede cambiar de forma a mitad.
   */
  const standings = await getStandings(competitionId);
  const clasificables = standings.filter((row) => !row.retirado);
  const formato = formatoParaJugadores(clasificables.length);
  if (!formato) {
    return {
      error: `Con ${clasificables.length} jugador${clasificables.length === 1 ? "" : "es"} no hay final que jugar.`,
    };
  }

  await prisma.finalFour.create({
    data: {
      competitionId,
      jugadores: formato.jugadores,
      seeds: clasificables
        .slice(0, formato.jugadores)
        .map((row) => row.participantId),
      matches: { create: clavesDelFormato(formato).map((key) => ({ key })) },
    },
  });

  revalidatePath("/", "layout");
  return { success: `Cuadro generado. ¡Que empiece la ${formato.nombre}!` };
}

export async function setFinalMatchResultAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  const finalFour = await prisma.finalFour.findUnique({
    where: { competitionId },
  });
  if (!finalFour) return;

  const formato = formatoParaJugadores(finalFour.jugadores);
  if (!formato) return;

  // La clave es la de un combate concreto: "SEMI_A#2"
  const key = String(formData.get("key") ?? "");
  if (!clavesDelFormato(formato).includes(key)) return;

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
      // Saneado antes de guardarlo: acaba en un href de la pantalla de todos
      replayUrl: enlaceSeguro(String(formData.get("replayUrl") ?? "")),
    },
  });

  /**
   * Si se cambia un resultado anterior, las rondas que dependían de él dejan
   * de valer. Se sacan del propio formato, sin lista escrita a mano, y se
   * borran **los tres combates** de cada llave afectada.
   *
   * De la propia llave no se borra nada: los combates que dejen de hacer falta
   * los descarta `comoVaLaSerie` al contarlos, así que corregir el primero no
   * tira a la basura lo que ya se había apuntado del tercero.
   */
  const afectadas = llavesPosteriores(formato, key.split("#")[0]).flatMap(
    combatesDeLaLlave,
  );
  if (afectadas.length) {
    await prisma.finalMatch.updateMany({
      where: { finalFourId: finalFour.id, key: { in: afectadas } },
      data: {
        winnerId: null,
        pokemonDiff: null,
        playedAt: null,
        notes: null,
        replayUrl: null,
      },
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

/**
 * El cartel del final: las ilustraciones que salen de fondo en el resumen
 * cuando ya no quedan level caps que superar.
 *
 * Se guardan en la competición y no en el cuadro porque se ponen **antes** de
 * que haya cuadro, que es justo cuando la tarjeta empieza a enseñarlas. Las que
 * ya estaban no vuelven a viajar enteras: ver `readImages` en los level caps.
 */
export async function guardarCartelDelFinalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const actuales = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { finalImages: true },
  });
  if (!actuales) return { error: "No encuentro esa edición." };

  const finalImages = formData
    .getAll("images")
    .map((valor) => {
      const texto = String(valor ?? "").trim();
      if (texto.startsWith(`${IMAGEN_SIN_CAMBIOS}:`)) {
        return actuales.finalImages[Number(texto.split(":")[1])] ?? null;
      }
      return sanitizeImageValue(texto);
    })
    .filter((valor): valor is string => Boolean(valor))
    .slice(0, 8);

  await prisma.competition.update({
    where: { id: competitionId },
    data: { finalImages },
  });

  revalidatePath("/final-four");
  revalidatePath("/");
  return {
    success: finalImages.length
      ? `Cartel guardado: ${finalImages.length} ${finalImages.length === 1 ? "imagen" : "imágenes"}.`
      : "Cartel quitado.",
  };
}
