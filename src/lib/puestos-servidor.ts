import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStandings, ordenarClasificacion } from "@/lib/competition";
import {
  leerPremiosPorPuesto,
  leerPuntosPorPuesto,
  tablaDeLaJornada,
  type FilaDePuesto,
  type PremioDeUnPuesto,
} from "@/lib/puestos";
import type { EstadisticasDePokemon } from "@/lib/showdown";

/**
 * Lo de la clasificación por puestos que toca la base de datos (las cuentas,
 * en `lib/puestos.ts`): la tabla de una jornada, **sus puntos y sus premios,
 * que se ponen solos al cerrarse la jornada** y se rehacen si luego cambia un
 * resultado, y los premios de la clasificación final.
 */

export type TablaDeJornada = {
  competitionId: string;
  /** Todos sus combates tienen resultado: los puntos y los premios ya cuentan */
  jugada: boolean;
  filas: FilaDePuesto[];
  /** Quienes no han jugado ningún reto en esta jornada (si el locke lo pide) */
  sinReto: string[];
  premios: PremioDeUnPuesto[];
};

type Guardado = { version?: number; lados?: Record<string, string>; pokemon?: (EstadisticasDePokemon & { lado: string })[] };

/** Los críticos hechos y recibidos de cada uno en unos combates, de sus repeticiones ya leídas */
function criticosDe(combates: { replayUrl: string | null; estadisticas: Prisma.JsonValue; estadisticasDe: string | null }[]) {
  const total = new Map<string, { hechos: number; recibidos: number }>();
  for (const c of combates) {
    const g = c.estadisticas as Guardado | null;
    // Solo si lo leído es de su repetición de ahora
    if (!g || !c.replayUrl || c.estadisticasDe !== c.replayUrl || !g.lados || !g.pokemon) continue;
    for (const p of g.pokemon) {
      const quien = g.lados[p.lado];
      if (!quien) continue;
      const t = total.get(quien) ?? { hechos: 0, recibidos: 0 };
      t.hechos += p.criticosHechos ?? 0;
      t.recibidos += p.criticosRecibidos ?? 0;
      total.set(quien, t);
    }
  }
  return total;
}

/**
 * El orden de la clasificación general **sin esta jornada** (sus puntos de
 * puesto no cuentan para desempatarla a ella misma). Sin `matchdayId`, la de
 * ahora entera.
 */
async function ordenGeneral(competitionId: string, sinLaJornada: string | null) {
  const [filas, deEsta] = await Promise.all([
    getStandings(competitionId),
    sinLaJornada
      ? prisma.pointEntry.groupBy({
          by: ["participantId"],
          where: { competitionId, sourceMatchdayId: sinLaJornada },
          _sum: { delta: true },
        })
      : [],
  ]);
  const quitar = new Map(deEsta.map((r) => [r.participantId, r._sum.delta ?? 0]));
  return ordenarClasificacion(filas.map((f) => ({ ...f, points: f.points - (quitar.get(f.participantId) ?? 0) })))
    .filter((f) => !f.retirado)
    .map((f) => f.participantId);
}

export async function getTablaDeLaJornada(matchdayId: string): Promise<TablaDeJornada | null> {
  const jornada = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: {
      competitionId: true,
      position: true,
      competition: { select: { puntosPorPuesto: true, premiosPorPuesto: true, retoPorJornada: true, retoDesde: true } },
      matches: {
        select: {
          participantAId: true,
          participantBId: true,
          winnerId: true,
          pokemonDiff: true,
          replayUrl: true,
          estadisticas: true,
          estadisticasDe: true,
        },
      },
    },
  });
  const puntos = leerPuntosPorPuesto(jornada?.competition.puntosPorPuesto);
  if (!jornada || !puntos) return null;
  // El reto obligatorio cuenta desde la jornada en la que se encendió: las de antes se jugaron sin él
  const desde = jornada.competition.retoDesde
    ? await prisma.matchday.findUnique({ where: { id: jornada.competition.retoDesde }, select: { position: true } })
    : null;
  const miraElReto = jornada.competition.retoPorJornada && jornada.position >= (desde?.position ?? -Infinity);
  const [orden, fuera, retos] = await Promise.all([
    ordenGeneral(jornada.competitionId, matchdayId),
    prisma.participant.findMany({
      where: { competitionId: jornada.competitionId, retiredAt: { not: null } },
      select: { id: true },
    }),
    miraElReto
      ? prisma.challengeMatch.findMany({
          where: { matchdayId, winnerId: { not: null } },
          select: { participantAId: true, participantBId: true },
        })
      : [],
  ]);
  const filas = tablaDeLaJornada({
    combates: jornada.matches,
    criticos: criticosDe(jornada.matches),
    ordenGeneral: orden,
    puntosPorPuesto: puntos,
    fuera: new Set(fuera.map((p) => p.id)),
  });
  const conReto = new Set(retos.flatMap((r) => [r.participantAId, r.participantBId]));
  return {
    competitionId: jornada.competitionId,
    jugada: jornada.matches.length > 0 && jornada.matches.every((m) => m.winnerId),
    filas,
    sinReto: miraElReto ? filas.map((f) => f.participantId).filter((id) => !conReto.has(id)) : [],
    premios: leerPremiosPorPuesto(jornada.competition.premiosPorPuesto),
  };
}

// ---------------------------------------------------------------------------
// Dar y quitar premios
// ---------------------------------------------------------------------------

type Entregado = { tipo: "objeto"; itemId: string } | { tipo: "ruleta"; ticketId: string };

async function dar(
  competitionId: string,
  participantId: string,
  premio: PremioDeUnPuesto | undefined,
  motivo: string,
): Promise<Entregado[]> {
  if (!premio) return [];
  const entregado: Entregado[] = [];
  for (const itemId of premio.objetos) {
    const existe = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!existe) continue;
    await prisma.bagEntry.upsert({
      where: { participantId_itemId: { participantId, itemId } },
      create: { participantId, itemId, quantity: 1, note: motivo },
      update: { quantity: { increment: 1 } },
    });
    entregado.push({ tipo: "objeto", itemId });
  }
  if (premio.ruleta) {
    const ruleta = await prisma.roulette.findFirst({ where: { id: premio.ruleta, competitionId }, select: { id: true } });
    if (ruleta) {
      const ticket = await prisma.rouletteTicket.create({
        data: { competitionId, participantId, rouletteId: ruleta.id, delta: 1, reason: motivo },
        select: { id: true },
      });
      entregado.push({ tipo: "ruleta", ticketId: ticket.id });
    }
  }
  return entregado;
}

/**
 * Quitar lo que se dio: el objeto, si aún lo tiene (si ya lo gastó, se queda
 * gastado), y la tirada de ruleta (si ya tiró, se le queda una de menos).
 */
async function quitar(participantId: string, entregado: Prisma.JsonValue) {
  for (const e of (Array.isArray(entregado) ? entregado : []) as Entregado[]) {
    if (e?.tipo === "objeto") {
      const fila = await prisma.bagEntry.findUnique({
        where: { participantId_itemId: { participantId, itemId: e.itemId } },
      });
      if (!fila) continue;
      if (fila.quantity > 1) await prisma.bagEntry.update({ where: { id: fila.id }, data: { quantity: { decrement: 1 } } });
      else await prisma.bagEntry.delete({ where: { id: fila.id } });
    } else if (e?.tipo === "ruleta") {
      await prisma.rouletteTicket.deleteMany({ where: { id: e.ticketId } });
    }
  }
}

/**
 * Deja los premios de una jornada (o de la final, con `matchdayId` null) como
 * dice la tabla: a quien sigue en el mismo puesto no se le toca nada; a quien
 * ha cambiado, se le quita lo de antes y se le da lo nuevo.
 */
async function ponerPremios(
  competitionId: string,
  matchdayId: string | null,
  filas: { participantId: string; puesto: number }[],
  premios: PremioDeUnPuesto[],
  motivo: (puesto: number) => string,
) {
  const antes = await prisma.premioDePuesto.findMany({ where: { competitionId, matchdayId } });
  const ahora = new Map(filas.map((f) => [f.participantId, f.puesto]));
  for (const p of antes) {
    if (ahora.get(p.participantId) === p.puesto) {
      ahora.delete(p.participantId);
      continue;
    }
    await quitar(p.participantId, p.entregado);
    await prisma.premioDePuesto.delete({ where: { id: p.id } });
  }
  for (const [participantId, puesto] of ahora) {
    const entregado = await dar(competitionId, participantId, premios[puesto - 1], motivo(puesto));
    await prisma.premioDePuesto.create({
      data: { competitionId, matchdayId, participantId, puesto, entregado: entregado as Prisma.InputJsonValue },
    });
  }
}

/**
 * **Pone al día los puntos y los premios de una jornada.** Se llama cada vez
 * que cambia algo de ella (un resultado, un combate de más o de menos, su
 * repetición leída). Mientras le quede un combate sin resultado no da nada; en
 * cuanto se cierra, los da, y si luego se corrige algo, se rehacen.
 */
export async function recalcularPuestosDeLaJornada(matchdayId: string) {
  const tabla = await getTablaDeLaJornada(matchdayId);
  if (!tabla) return;
  const jornada = await prisma.matchday.findUniqueOrThrow({ where: { id: matchdayId }, select: { label: true } });
  const filas = tabla.jugada ? tabla.filas : [];
  await prisma.$transaction([
    prisma.pointEntry.deleteMany({ where: { sourceMatchdayId: matchdayId } }),
    prisma.pointEntry.createMany({
      data: filas
        .filter((f) => f.puntos !== 0)
        .map((f) => ({
          competitionId: tabla.competitionId,
          participantId: f.participantId,
          delta: f.puntos,
          reason: `${jornada.label}: ${f.puesto}º puesto`,
          sourceMatchdayId: matchdayId,
        })),
    }),
  ]);
  await ponerPremios(tabla.competitionId, matchdayId, filas, tabla.premios, (puesto) => `${jornada.label}: ${puesto}º puesto`);
}

/** Antes de borrar una jornada: fuera sus puntos y sus premios */
export async function deshacerPuestosDeLaJornada(competitionId: string, matchdayId: string) {
  await prisma.pointEntry.deleteMany({ where: { sourceMatchdayId: matchdayId } });
  await ponerPremios(competitionId, matchdayId, [], [], () => "");
}

/** Los premios de la clasificación final, por el puesto de cada uno en la general de ahora */
export async function repartirPremiosFinales(competitionId: string) {
  const competicion = await prisma.competition.findUniqueOrThrow({
    where: { id: competitionId },
    select: { premiosPorPuesto: true },
  });
  const orden = await ordenGeneral(competitionId, null);
  await ponerPremios(
    competitionId,
    null,
    orden.map((participantId, i) => ({ participantId, puesto: i + 1 })),
    leerPremiosPorPuesto(competicion.premiosPorPuesto),
    (puesto) => `Clasificación final: ${puesto}º puesto`,
  );
}

/** La jornada en la que cae un reto nuevo: la primera sin acabar (o la última, si están todas) */
export async function jornadaDelReto(competitionId: string) {
  const jornadas = await prisma.matchday.findMany({
    where: { competitionId },
    orderBy: { position: "asc" },
    select: { id: true, matches: { select: { winnerId: true } } },
  });
  const abierta = jornadas.find((j) => !j.matches.length || j.matches.some((m) => !m.winnerId));
  return (abierta ?? jornadas.at(-1))?.id ?? null;
}

/**
 * Lo que da una victoria de jornada: lo de siempre, o **nada** en un locke por
 * puestos (ahí los puntos salen de la tabla de la jornada).
 */
export async function puntosPorVictoria(competitionId: string, pointsForWin: number) {
  const locke = await prisma.competition.findUnique({ where: { id: competitionId }, select: { puntosPorPuesto: true } });
  return leerPuntosPorPuesto(locke?.puntosPorPuesto) ? 0 : pointsForWin;
}
