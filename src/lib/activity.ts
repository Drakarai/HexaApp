import "server-only";
import { prisma } from "@/lib/db";
import { urlsDeImagen } from "@/lib/imagenes";
import { getParticipants } from "@/lib/competition";

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

  /**
   * Los jugadores se piden **una vez** y de aquí salen los nombres y colores.
   *
   * Antes cada fuente los traía con un `include` anidado, y Prisma resuelve
   * cada nivel de relación con una consulta aparte: seis fuentes × (la tabla +
   * el participante + el usuario) eran 18 viajes a la base de datos en vez de
   * 6. Contra una base de datos en internet cada viaje cuesta su ida y vuelta,
   * así que esto se notaba de verdad.
   */
  const jugadores = await getParticipants(competitionId);
  const porId = new Map(jugadores.map((jugador) => [jugador.id, jugador]));
  const quien = (participantId: string) => porId.get(participantId);

  // prettier-ignore
  const [deaths, points, clears, spins, tickets, matches, usos] = await Promise.all([
    prisma.death.findMany({
      where: { participant: { competitionId } },
      orderBy: { diedAt: "desc" },
      take,
    }),
    prisma.pointEntry.findMany({
      where: { competitionId },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.gymClear.findMany({
      where: { participant: { competitionId } },
      orderBy: { clearedAt: "desc" },
      take,
      include: {
        levelCap: { select: { label: true, cap: true } },
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
    }),
    prisma.match.findMany({
      where: { matchday: { competitionId }, winnerId: { not: null } },
      orderBy: { playedAt: "desc" },
      take,
      include: {
        matchday: { select: { label: true } },
      },
    }),
    /**
     * Gastar un objeto sí se cuenta, aunque la bolsa sea privada: el resto
     * tiene que enterarse de que alguien ha tirado de su captura extra.
     */
    prisma.bagUse.findMany({
      where: { participant: { competitionId } },
      orderBy: { usedAt: "desc" },
      take,
    }),
  ]);

  // Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts. Antes
  // el muro incrustaba el sprite de cada baja y la foto de cada jugador.
  const usuarios = jugadores.map((jugador) => jugador.userId);

  const [avatares, sprites, objetos, opciones] = await Promise.all([
    urlsDeImagen("avatar", usuarios),
    urlsDeImagen(
      "baja",
      deaths.map((death) => death.id),
    ),
    urlsDeImagen(
      "objeto",
      usos.map((uso) => uso.itemId).filter((id): id is string => Boolean(id)),
    ),
    urlsDeImagen(
      "objeto-opcion",
      usos.map((uso) => uso.optionId).filter((id): id is string => Boolean(id)),
    ),
  ]);

  const entries: ActivityEntry[] = [];

  for (const death of deaths) {
    const jugador = quien(death.participantId);
    if (!jugador) continue;
    entries.push({
      id: `death-${death.id}`,
      at: death.diedAt,
      icon: "💀",
      color: jugador.color,
      title: `${jugador.displayName} ha perdido a ${death.nickname ?? death.species}`,
      detail: [death.nickname ? death.species : null, death.cause]
        .filter(Boolean)
        .join(" · "),
      image: sprites(death.id),
      who: jugador.displayName,
      whoImage: avatares(jugador.userId),
    });
  }

  for (const entry of points) {
    // Los puntos de una victoria ya se cuentan con el combate
    if (entry.sourceMatchId) continue;
    const jugador = quien(entry.participantId);
    if (!jugador) continue;
    entries.push({
      id: `point-${entry.id}`,
      at: entry.createdAt,
      icon: entry.delta > 0 ? "➕" : "➖",
      color: jugador.color,
      title: `${jugador.displayName} ${entry.delta > 0 ? "gana" : "pierde"} ${Math.abs(entry.delta)} ${Math.abs(entry.delta) === 1 ? "punto" : "puntos"}`,
      detail: entry.reason,
      who: jugador.displayName,
      whoImage: avatares(jugador.userId),
    });
  }

  for (const clear of clears) {
    const jugador = quien(clear.participantId);
    if (!jugador) continue;
    entries.push({
      id: `clear-${clear.id}`,
      at: clear.clearedAt,
      icon: "🎯",
      color: jugador.color,
      title: `${jugador.displayName} ha superado a ${clear.levelCap.label}`,
      detail: `Level cap ${clear.levelCap.cap}`,
      who: jugador.displayName,
      whoImage: avatares(jugador.userId),
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
    const jugador = quien(ticket.participantId);
    if (!jugador) continue;
    entries.push({
      id: `ticket-${ticket.id}`,
      at: ticket.createdAt,
      icon: "🎟️",
      color: jugador.color,
      title: `${jugador.displayName} recibe ${ticket.delta} ${ticket.delta === 1 ? "ticket" : "tickets"} de ruleta`,
      detail: ticket.reason ?? undefined,
      who: jugador.displayName,
      whoImage: avatares(jugador.userId),
    });
  }

  for (const match of matches) {
    const ganador = match.winnerId ? quien(match.winnerId) : undefined;
    const perdedor = quien(
      match.winnerId === match.participantAId
        ? match.participantBId
        : match.participantAId,
    );
    if (!ganador || !perdedor) continue;
    entries.push({
      id: `match-${match.id}`,
      at: match.playedAt ?? new Date(0),
      icon: "⚔️",
      color: ganador.color,
      title: `${ganador.displayName} gana a ${perdedor.displayName}`,
      detail: [
        match.matchday.label,
        match.pokemonDiff !== null
          ? `diferencia de ${match.pokemonDiff}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      who: ganador.displayName,
      whoImage: avatares(ganador.userId),
    });
  }

  for (const uso of usos) {
    const jugador = quien(uso.participantId);
    if (!jugador) continue;
    entries.push({
      id: `uso-${uso.id}`,
      at: uso.usedAt,
      icon: "🎒",
      color: jugador.color,
      title: `${jugador.displayName} ha usado ${uso.itemName}`,
      detail: uso.optionName ? `Se queda con ${uso.optionName}` : undefined,
      // La de lo elegido manda: es lo que de verdad se ha llevado
      image:
        (uso.optionId ? opciones(uso.optionId) : null) ??
        (uso.itemId ? objetos(uso.itemId) : null),
      who: jugador.displayName,
      whoImage: avatares(jugador.userId),
    });
  }

  return entries
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}
