import "server-only";
import { prisma } from "@/lib/db";
import { firmaDeColumna } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
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
  /**
   * Y se piden **a la vez que las fuentes**, no antes: ninguna de las siete
   * consultas de abajo necesita a los jugadores —todas filtran por la edición—,
   * así que esperarlos costaba dos idas y vueltas enteras de la portada.
   */
  /**
   * Y las firmas de las imágenes, **también a la vez**: se buscan por la
   * edición (las bajas) o de toda la tabla (los objetos, que son un catálogo
   * pequeño), no por los ids de lo que salga. Esperar a saberlos era otra ida
   * y vuelta; las fotos de los jugadores ya vienen con `getParticipants`.
   */
  // prettier-ignore
  const [jugadores, [deaths, points, clears, spins, tickets, matches, usos], [firmasBaja, firmasObjeto, firmasOpcion]] = await Promise.all([
    getParticipants(competitionId),
    Promise.all([
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
    ] as const),
    Promise.all([
      firmasDe(prisma.$queryRaw<FilaDeFirma[]>`
        select d."id", ${firmaDeColumna(`d."boxImage"`)} as v
        from "Death" d join "Participant" p on p."id" = d."participantId"
        where p."competitionId" = ${competitionId}
      `),
      firmasDe(prisma.$queryRaw<FilaDeFirma[]>`
        select "id", ${firmaDeColumna(`"image"`)} as v from "Item"
      `),
      firmasDe(prisma.$queryRaw<FilaDeFirma[]>`
        select "id", ${firmaDeColumna(`"image"`)} as v from "ItemOption"
      `),
    ]),
  ]);

  const porId = new Map(jugadores.map((jugador) => [jugador.id, jugador]));
  const quien = (participantId: string) => porId.get(participantId);

  // Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts. Antes
  // el muro incrustaba el sprite de cada baja y la foto de cada jugador.
  // La foto es la de los jugadores del locke: quien gira sin jugar no tiene
  const avatarDe = new Map(jugadores.map((jugador) => [jugador.userId, jugador.user.avatarImage]));
  const avatares = (userId: string) => avatarDe.get(userId) ?? null;
  const sprites = (id: string) => urlDeImagen("baja", id, firmasBaja.get(id));
  const objetos = (id: string) => urlDeImagen("objeto", id, firmasObjeto.get(id));
  const opciones = (id: string) => urlDeImagen("objeto-opcion", id, firmasOpcion.get(id));

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
      title: `${jugador.displayName} ha superado ${aQuienSeSupera(clear.levelCap.label)}`,
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

/**
 * "A Pegaso" sí, pero "a Liga Pokémon" y "a Alto Mando" no: un hito puede ser
 * una persona o una cosa, y las cosas llevan artículo. Se mira por cómo empieza
 * el nombre, que es lo que traen las plantillas de todas las regiones; un nombre
 * inventado que no encaje sale con "a", que es lo que salía siempre.
 */
function aQuienSeSupera(hito: string): string {
  const nombre = hito.trim();
  if (/^(alto mando|campeón)(?=\s|$)/i.test(nombre)) return `al ${nombre}`;
  if (/^campeona(?=\s|$)/i.test(nombre)) return `a la ${nombre}`;
  if (/^(liga|gran prueba|prueba)(?=\s|$)/i.test(nombre)) return `la ${nombre}`;
  return `a ${nombre}`;
}

type FilaDeFirma = { id: string; v: string | null };

async function firmasDe(filas: Promise<FilaDeFirma[]>) {
  return new Map((await filas).map((fila) => [fila.id, fila.v]));
}
