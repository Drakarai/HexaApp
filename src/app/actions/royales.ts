"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  assertCanActForParticipant,
  requireCompetitionManager,
} from "@/lib/competition";
import { resolverRetiradas } from "@/lib/retiradas";
import { enlaceSeguro } from "@/lib/utils";
import type { FormState } from "@/app/actions/auth";

/**
 * Los Battle Royale: combates de más de dos en los que no hay ganador y
 * perdedor sino **orden de llegada**.
 *
 * Quién puede qué, que es lo de siempre en esta aplicación:
 * - El **orden de llegada** y la crónica los toca la organización, como los
 *   resultados de un combate normal.
 * - **Su propia línea** ("me tumbó Draka en el turno 3") la escribe cada uno,
 *   y para eso vale la misma comprobación que usan las bajas.
 */

/** Datos de un royale y de la edición a la que pertenece. */
async function royaleCon(id: string) {
  return prisma.royale.findUnique({
    where: { id },
    include: {
      matchday: {
        select: { id: true, competitionId: true, label: true, pointsForWin: true },
      },
      puestos: { select: { id: true, participantId: true, puesto: true } },
    },
  });
}

function refrescar() {
  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/");
}

/** Otro royale más en la misma jornada ("Ronda 2"). */
export async function crearRoyaleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { competitionId: true },
  });
  if (!matchday) return { error: "Esa jornada ya no está." };

  try {
    await requireCompetitionManager(matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const jugadores = await prisma.participant.findMany({
    where: { competitionId: matchday.competitionId, retiredAt: null },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (jugadores.length < 2) return { error: "Hacen falta al menos dos jugadores." };

  const cuantos = await prisma.royale.count({ where: { matchdayId } });

  await prisma.royale.create({
    data: {
      matchdayId,
      label: String(formData.get("label") ?? "").trim() || null,
      position: cuantos,
      puestos: {
        create: jugadores.map((jugador) => ({ participantId: jugador.id })),
      },
    },
  });

  refrescar();
  return { success: "Royale añadido." };
}

export async function borrarRoyaleAction(formData: FormData) {
  const id = String(formData.get("royaleId") ?? "");
  const royale = await royaleCon(id);
  if (!royale) return;
  await requireCompetitionManager(royale.matchday.competitionId);

  // Los puntos que diera se van con él: cuelgan del royale, no de la jornada
  await prisma.pointEntry.deleteMany({ where: { sourceRoyaleId: id } });
  await prisma.royale.delete({ where: { id } });
  refrescar();
}

/**
 * El orden de llegada.
 *
 * Llega como una lista de participantes en orden: el primero de la lista es el
 * que ganó. Quien se quede fuera de la lista se queda sin puesto, que es lo
 * que significa "todavía no se sabe".
 *
 * El punto de la jornada se lo lleva el primero, igual que el ganador de un
 * combate normal. Se borra y se vuelve a crear en vez de actualizarse: así
 * corregir el orden no puede dejar dos puntos ni dejárselo al que ya no va
 * primero.
 */
export async function guardarPuestosAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("royaleId") ?? "");
  const royale = await royaleCon(id);
  if (!royale) return { error: "Ese royale ya no está." };

  const manager = await requireCompetitionManager(royale.matchday.competitionId).catch(
    (error: Error) => error,
  );
  if (manager instanceof Error) return { error: manager.message };

  let orden: string[];
  try {
    orden = JSON.parse(String(formData.get("orden") ?? "[]"));
  } catch {
    return { error: "No he entendido el orden." };
  }
  if (!Array.isArray(orden)) return { error: "No he entendido el orden." };

  // Solo los que juegan este royale, y sin repetidos
  const suyos = new Set(royale.puestos.map((fila) => fila.participantId));
  const limpio = [...new Set(orden.filter((quien) => suyos.has(quien)))];

  await prisma.$transaction([
    // Los que no entran en la lista se quedan sin puesto
    prisma.royalePuesto.updateMany({
      where: { royaleId: id },
      data: { puesto: null },
    }),
    ...limpio.map((participantId, indice) =>
      prisma.royalePuesto.updateMany({
        where: { royaleId: id, participantId },
        data: { puesto: indice + 1 },
      }),
    ),
    prisma.royale.update({
      where: { id },
      data: { playedAt: limpio.length ? new Date() : null },
    }),
    prisma.pointEntry.deleteMany({ where: { sourceRoyaleId: id } }),
  ]);

  const campeon = limpio[0];
  if (campeon) {
    const quien = await prisma.participant.findUnique({
      where: { id: campeon },
      select: { displayName: true },
    });
    await prisma.pointEntry.create({
      data: {
        competitionId: royale.matchday.competitionId,
        participantId: campeon,
        delta: royale.matchday.pointsForWin,
        reason: `${royale.matchday.label}: gana el Battle Royale ${quien?.displayName ?? ""}`.trim(),
        createdById: manager.id,
        sourceRoyaleId: id,
      },
    });
  }

  // Puede que con esto la jornada quede completa y toque resolver retiradas
  await resolverRetiradas(royale.matchday.competitionId, manager.id);

  refrescar();
  return { success: limpio.length ? "Orden guardado." : "Orden borrado." };
}

/** La crónica: qué pasó. La escribe la organización. */
export async function guardarCronicaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("royaleId") ?? "");
  const royale = await royaleCon(id);
  if (!royale) return { error: "Ese royale ya no está." };

  try {
    await requireCompetitionManager(royale.matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  await prisma.royale.update({
    where: { id },
    data: {
      cronica: String(formData.get("cronica") ?? "").trim() || null,
      label: String(formData.get("label") ?? "").trim() || null,
      // Saneado antes de guardarlo: acaba en un href que ve todo el mundo
      replayUrl: enlaceSeguro(String(formData.get("replayUrl") ?? "")),
    },
  });

  refrescar();
  return { success: "Crónica guardada." };
}

/**
 * Lo que cuenta **cada jugador** de su royale: cómo le fue, quién lo tumbó.
 *
 * Esto no es de la organización: lo escribe cada uno de lo suyo, con la misma
 * comprobación que usan las bajas. Los administradores pueden escribir por
 * otro, como en todo lo demás.
 */
export async function guardarMiCronicaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const puestoId = String(formData.get("puestoId") ?? "");
  const fila = await prisma.royalePuesto.findUnique({
    where: { id: puestoId },
    select: { participantId: true },
  });
  if (!fila) return { error: "Eso ya no está." };

  try {
    await assertCanActForParticipant(fila.participantId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const vivosRaw = String(formData.get("vivos") ?? "").trim();
  const vivos = vivosRaw ? Number(vivosRaw) : null;

  await prisma.royalePuesto.update({
    where: { id: puestoId },
    data: {
      notes: String(formData.get("notes") ?? "").trim() || null,
      vivos:
        vivos !== null && Number.isFinite(vivos)
          ? Math.max(0, Math.min(6, Math.trunc(vivos)))
          : null,
    },
  });

  revalidatePath("/jornadas");
  return { success: "Guardado." };
}
