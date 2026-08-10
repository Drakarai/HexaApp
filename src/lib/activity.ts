import "server-only";
import { prisma } from "@/lib/db";
import { urlsDeImagen } from "@/lib/imagenes";

export type ActivityEntry = {
  id: string;
  at: Date;
  icon: string;
  /** Color del jugador implicado, para el punto de la línea de tiempo */
  color: string;
  title: string;
  detail?: string;
  /** Sprite del pokémon o foto del jugador */
  image?: string | null;
  /** Nombre del jugador, si la entrada va de alguien en concreto */
  who?: string;
  whoImage?: string | null;
};

const NEUTRAL = "#64748b";

/**
 * Junta en una sola cronología todo lo que ha ido pasando en la competición.
 * Cada fuente se consulta por separado y luego se mezclan por fecha: es más
 * simple que mantener una tabla de eventos y no puede desincronizarse de los
 * datos reales.
 */
export async function getActivity(competitionId: string, limit = 60) {
  const take = Math.min(limit, 50);

  const [deaths, points, clears, spins, tickets, matches] = await Promise.all([
    prisma.death.findMany({
      where: { participant: { competitionId } },
      orderBy: { diedAt: "desc" },
      take,
      include: {
        participant: {
          include: { user: { select: { id: true } } },
        },
      },
    }),
    prisma.pointEntry.findMany({
      where: { competitionId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        participant: {
          include: { user: { select: { id: true } } },
        },
      },
    }),
    prisma.gymClear.findMany({
      where: { participant: { competitionId } },
      orderBy: { clearedAt: "desc" },
      take,
      include: {
        levelCap: { select: { label: true, cap: true } },
        participant: {
          include: { user: { select: { id: true } } },
        },
      },
    }),
    prisma.rouletteSpin.findMany({
      where: { roulette: { competitionId } },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        roulette: { select: { name: true } },
        spunBy: { select: { id: true, displayName: true } },
      },
    }),
    prisma.rouletteTicket.findMany({
      // Solo los que concede un administrador: el gasto ya se ve en el giro
      where: { competitionId, delta: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        participant: {
          include: { user: { select: { id: true } } },
        },
      },
    }),
    prisma.match.findMany({
      where: { matchday: { competitionId }, winnerId: { not: null } },
      orderBy: { playedAt: "desc" },
      take,
      include: {
        matchday: { select: { label: true } },
        participantA: true,
        participantB: true,
        winner: {
          include: { user: { select: { id: true } } },
        },
      },
    }),
  ]);

  // Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts. Antes
  // el muro incrustaba el sprite de cada baja y la foto de cada jugador.
  const usuarios = [
    ...deaths.map((death) => death.participant.userId),
    ...points.map((punto) => punto.participant.userId),
    ...clears.map((clear) => clear.participant.userId),
    ...spins.flatMap((spin) => (spin.spunById ? [spin.spunById] : [])),
    ...tickets.map((ticket) => ticket.participant.userId),
    ...matches.flatMap((match) => (match.winner ? [match.winner.userId] : [])),
  ];

  const [avatares, sprites] = await Promise.all([
    urlsDeImagen("avatar", usuarios),
    urlsDeImagen(
      "baja",
      deaths.map((death) => death.id),
    ),
  ]);

  const entries: ActivityEntry[] = [];

  for (const death of deaths) {
    entries.push({
      id: `death-${death.id}`,
      at: death.diedAt,
      icon: "💀",
      color: death.participant.color,
      title: `${death.participant.displayName} ha perdido a ${death.nickname ?? death.species}`,
      detail: [death.nickname ? death.species : null, death.cause]
        .filter(Boolean)
        .join(" · "),
      image: sprites(death.id),
      who: death.participant.displayName,
      whoImage: avatares(death.participant.userId),
    });
  }

  for (const entry of points) {
    // Los puntos de una victoria ya se cuentan con el combate
    if (entry.sourceMatchId) continue;
    entries.push({
      id: `point-${entry.id}`,
      at: entry.createdAt,
      icon: entry.delta > 0 ? "➕" : "➖",
      color: entry.participant.color,
      title: `${entry.participant.displayName} ${entry.delta > 0 ? "gana" : "pierde"} ${Math.abs(entry.delta)} ${Math.abs(entry.delta) === 1 ? "punto" : "puntos"}`,
      detail: entry.reason,
      who: entry.participant.displayName,
      whoImage: avatares(entry.participant.userId),
    });
  }

  for (const clear of clears) {
    entries.push({
      id: `clear-${clear.id}`,
      at: clear.clearedAt,
      icon: "🎯",
      color: clear.participant.color,
      title: `${clear.participant.displayName} ha superado a ${clear.levelCap.label}`,
      detail: `Level cap ${clear.levelCap.cap}`,
      who: clear.participant.displayName,
      whoImage: avatares(clear.participant.userId),
    });
  }

  for (const spin of spins) {
    entries.push({
      id: `spin-${spin.id}`,
      at: spin.createdAt,
      icon: "🎡",
      color: NEUTRAL,
      title: `La ruleta dice: ${spin.optionLabel}`,
      detail: [spin.roulette.name, spin.spunBy?.displayName]
        .filter(Boolean)
        .join(" · "),
      who: spin.spunBy?.displayName,
      whoImage: spin.spunById ? avatares(spin.spunById) : null,
    });
  }

  for (const ticket of tickets) {
    entries.push({
      id: `ticket-${ticket.id}`,
      at: ticket.createdAt,
      icon: "🎟️",
      color: ticket.participant.color,
      title: `${ticket.participant.displayName} recibe ${ticket.delta} ${ticket.delta === 1 ? "ticket" : "tickets"} de ruleta`,
      detail: ticket.reason ?? undefined,
      who: ticket.participant.displayName,
      whoImage: avatares(ticket.participant.userId),
    });
  }

  for (const match of matches) {
    if (!match.winner) continue;
    const loser =
      match.winnerId === match.participantAId
        ? match.participantB
        : match.participantA;
    entries.push({
      id: `match-${match.id}`,
      at: match.playedAt ?? new Date(0),
      icon: "⚔️",
      color: match.winner.color,
      title: `${match.winner.displayName} gana a ${loser.displayName}`,
      detail: [
        match.matchday.label,
        match.pokemonDiff !== null
          ? `diferencia de ${match.pokemonDiff}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      who: match.winner.displayName,
      whoImage: avatares(match.winner.userId),
    });
  }

  return entries
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}
