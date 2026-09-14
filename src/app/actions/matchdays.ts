"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { resolverRetiradas } from "@/lib/retiradas";
import { emparejamientosDeJornada } from "@/lib/emparejamientos";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { ajustarDesempate } from "@/lib/series";
import { esRoyale, formatoDeCombate } from "@/lib/formatos-de-combate";
import { enlaceSeguro } from "@/lib/utils";

/**
 * Lo que se lleva de diferencia quien gana porque el otro no se presentó. No
 * presentarse no puede salir más barato que perder jugando, y la diferencia de
 * pokémon es el segundo desempate de la clasificación.
 */
const DIFERENCIA_POR_RETIRADA = 3;
import type { FormState } from "@/app/actions/auth";

export async function createMatchdayAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Ponle nombre a la jornada." };

  const pointsForWin = Number(formData.get("pointsForWin") ?? 1);
  // El formato se valida contra la lista: si llega uno raro, singles
  const formato = formatoDeCombate(String(formData.get("formato") ?? "")).id;
  const last = await prisma.matchday.findFirst({
    where: { competitionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? 0) + 1;

  const matchday = await prisma.matchday.create({
    data: {
      competitionId,
      label,
      milestone: String(formData.get("milestone") ?? "").trim() || null,
      pointsForWin: Number.isFinite(pointsForWin) ? Math.trunc(pointsForWin) : 1,
      formato,
      condiciones: String(formData.get("condiciones") ?? "").trim() || null,
      position,
    },
  });

  /**
   * Los emparejamientos se proponen solos si se pide (`lib/emparejamientos.ts`).
   * Se **proponen**, no se imponen: son combates normales y corrientes, así que
   * se pueden borrar y añadir otros a mano como siempre.
   */
  let propuestos = 0;
  let descansa: string | null = null;

  if (esRoyale(formato)) {
    /**
     * Un Battle Royale no se empareja: **no hay parejas**. La jornada nace con
     * un royale y todos los que siguen jugando dentro, y el orden de llegada se
     * rellena al terminar.
     */
    const jugadores = await prisma.participant.findMany({
      where: { competitionId, retiredAt: null },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (jugadores.length >= 2) {
      await prisma.royale.create({
        data: {
          matchdayId: matchday.id,
          puestos: {
            create: jugadores.map((jugador) => ({ participantId: jugador.id })),
          },
        },
      });
    }
    revalidatePath("/jornadas");
    return {
      success: `Jornada creada con un Battle Royale de ${jugadores.length} jugadores.`,
    };
  }

  if (formData.get("emparejar") === "on") {
    const resultado = await emparejarJornada(competitionId, matchday.id, position);
    propuestos = resultado.propuestos;
    descansa = resultado.descansa;
  }

  revalidatePath("/jornadas");
  if (!propuestos) return { success: "Jornada creada." };
  return {
    success: `Jornada creada con ${propuestos} ${
      propuestos === 1 ? "combate" : "combates"
    }${descansa ? `. Descansa ${descansa}.` : "."}`,
  };
}

/**
 * Rellena una jornada recién creada con los emparejamientos que le tocan.
 *
 * El orden de los jugadores es **por fecha de alta**, no por nombre: la
 * rotación de la liguilla se cuenta desde ahí, y si alguien se cambia el mote
 * el reparto no puede bailar. Solo entran los que siguen jugando.
 */
async function emparejarJornada(
  competitionId: string,
  matchdayId: string,
  position: number,
) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { maxPlayers: true },
  });

  const jugadores = await prisma.participant.findMany({
    where: { competitionId, retiredAt: null },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: { id: true, displayName: true },
  });
  if (jugadores.length < 2) return { propuestos: 0, descansa: null };

  const perfil = perfilDeLocke(competition?.maxPlayers ?? jugadores.length);
  const ronda = emparejamientosDeJornada(
    perfil,
    jugadores.map((jugador) => jugador.id),
    position,
  );
  if (!ronda.pares.length) return { propuestos: 0, descansa: null };

  await prisma.match.createMany({
    data: ronda.pares.map(([participantAId, participantBId], indice) => ({
      matchdayId,
      participantAId,
      participantBId,
      position: indice,
    })),
  });

  const queDescansa = jugadores.find((jugador) => jugador.id === ronda.descansa);
  return {
    propuestos: ronda.pares.length,
    descansa: queDescansa?.displayName ?? null,
  };
}

export async function deleteMatchdayAction(formData: FormData) {
  const id = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({ where: { id } });
  if (!matchday) return;
  await requireCompetitionManager(matchday.competitionId);

  await prisma.matchday.delete({ where: { id } });
  revalidatePath("/jornadas");
  revalidatePath("/puntos");
}

export async function addMatchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: { _count: { select: { matches: true } } },
  });
  if (!matchday) return { error: "Jornada no encontrada." };

  try {
    await requireCompetitionManager(matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantAId = String(formData.get("participantAId") ?? "");
  const participantBId = String(formData.get("participantBId") ?? "");
  if (!participantAId || !participantBId) {
    return { error: "Elige los dos jugadores del emparejamiento." };
  }
  if (participantAId === participantBId) {
    return { error: "Un jugador no puede combatir contra sí mismo." };
  }

  const both = await prisma.participant.count({
    where: {
      id: { in: [participantAId, participantBId] },
      competitionId: matchday.competitionId,
    },
  });
  if (both !== 2) return { error: "Esos jugadores no son de esta competición." };

  await prisma.match.create({
    data: {
      matchdayId,
      participantAId,
      participantBId,
      position: matchday._count.matches,
    },
  });

  revalidatePath("/jornadas");
  return { success: "Emparejamiento añadido." };
}

/**
 * Guarda el resultado de un combate y sincroniza el punto de la victoria:
 * cada combate genera como mucho una entrada de puntos, enlazada por
 * sourceMatchId, de modo que corregir el resultado no duplica puntos.
 */
export async function setMatchResultAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  const manager = await requireCompetitionManager(match.matchday.competitionId);

  const winnerRaw = String(formData.get("winnerId") ?? "").trim();
  const winnerId =
    winnerRaw === match.participantAId || winnerRaw === match.participantBId
      ? winnerRaw
      : null;

  const diffRaw = String(formData.get("pokemonDiff") ?? "").trim();
  const diff = diffRaw ? Number(diffRaw) : null;
  const playedAtRaw = String(formData.get("playedAt") ?? "").trim();

  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId,
      pokemonDiff:
        diff !== null && Number.isFinite(diff) ? Math.abs(Math.trunc(diff)) : null,
      playedAt: playedAtRaw ? new Date(playedAtRaw) : winnerId ? new Date() : null,
      // Guardar un resultado a mano quiere decir que se jugó: si antes estaba
      // dado por retirada, deja de estarlo
      porRetirada: false,
      notes: String(formData.get("notes") ?? "").trim() || null,
      // Saneado antes de guardarlo: acaba en un href de la pantalla de todos
      replayUrl: enlaceSeguro(String(formData.get("replayUrl") ?? "")),
    },
  });

  const existing = await prisma.pointEntry.findUnique({
    where: { sourceMatchId: matchId },
  });

  if (!winnerId) {
    if (existing) {
      await prisma.pointEntry.delete({ where: { id: existing.id } });
    }
  } else {
    const winner = await prisma.participant.findUnique({
      where: { id: winnerId },
      select: { displayName: true },
    });
    const payload = {
      competitionId: match.matchday.competitionId,
      participantId: winnerId,
      delta: match.matchday.pointsForWin,
      reason: `${match.matchday.label}: victoria de ${winner?.displayName ?? "?"}`,
      createdById: manager.id,
      sourceMatchId: matchId,
    };
    if (existing) {
      await prisma.pointEntry.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.pointEntry.create({ data: payload });
    }
  }

  /**
   * Con este resultado puede haberse completado la jornada, y entonces toca
   * dar por ganados los combates que estaban esperando por retirada.
   */
  await resolverRetiradas(match.matchday.competitionId, manager.id);

  // Y si la jornada es una serie al mejor de tres, puede tocar añadir o quitar
  // el desempate: ver lib/series.ts
  await ajustarDesempate(match.matchdayId);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/");
}

/**
 * Dar un combate por retirada: alguien no se presenta y lo pierde.
 *
 * Es distinto de retirarse del locke entero (ver `lib/retiradas.ts`): aquí el
 * que no aparece sigue jugando, simplemente no se presentó a ese combate. Por
 * eso se resuelve **en el momento**, sin esperar a que acabe la jornada.
 *
 * El ganador se lleva su punto y una **diferencia de 3 pokémon**, que es el
 * castigo acordado: no presentarse no puede salir más barato que perder
 * jugando.
 */
export async function darPorRetiradaAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  const manager = await requireCompetitionManager(match.matchday.competitionId);

  const seRetiraId = String(formData.get("seRetiraId") ?? "").trim();
  if (seRetiraId !== match.participantAId && seRetiraId !== match.participantBId) {
    return;
  }
  const ganadorId =
    seRetiraId === match.participantAId
      ? match.participantBId
      : match.participantAId;

  const [ganador, perdedor] = await Promise.all([
    prisma.participant.findUnique({
      where: { id: ganadorId },
      select: { displayName: true },
    }),
    prisma.participant.findUnique({
      where: { id: seRetiraId },
      select: { displayName: true },
    }),
  ]);

  const fechaRaw = String(formData.get("playedAt") ?? "").trim();

  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: ganadorId,
      pokemonDiff: DIFERENCIA_POR_RETIRADA,
      porRetirada: true,
      playedAt: fechaRaw ? new Date(fechaRaw) : new Date(),
    },
  });

  const datos = {
    competitionId: match.matchday.competitionId,
    participantId: ganadorId,
    delta: match.matchday.pointsForWin,
    reason: `${match.matchday.label}: victoria de ${ganador?.displayName ?? "?"} por retirada de ${perdedor?.displayName ?? "?"}`,
    createdById: manager.id,
    sourceMatchId: matchId,
  };
  const existente = await prisma.pointEntry.findUnique({
    where: { sourceMatchId: matchId },
  });
  if (existente) {
    await prisma.pointEntry.update({ where: { id: existente.id }, data: datos });
  } else {
    await prisma.pointEntry.create({ data: datos });
  }

  // Puede haber completado la jornada y desbloquear otras retiradas
  await resolverRetiradas(match.matchday.competitionId, manager.id);
  await ajustarDesempate(match.matchdayId);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/");
}

export async function deleteMatchAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  await requireCompetitionManager(match.matchday.competitionId);

  await prisma.pointEntry.deleteMany({ where: { sourceMatchId: matchId } });
  await prisma.match.delete({ where: { id: matchId } });

  // Borrar el combate que faltaba también deja la jornada terminada
  await resolverRetiradas(match.matchday.competitionId, null);
  await ajustarDesempate(match.matchdayId);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
}
