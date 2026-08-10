import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin, type CurrentUser } from "@/lib/auth";
import { urlsDeImagen } from "@/lib/imagenes";
import { COMPETITION_STATUS } from "@/lib/constants";

export const COMPETITION_COOKIE = "hexaapp_competition";

export type StandingRow = {
  participantId: string;
  userId: string;
  displayName: string;
  gameVersion: string | null;
  color: string;
  avatarImage: string | null;
  isAdmin: boolean;
  ace: {
    species: string | null;
    nickname: string | null;
    reason: string | null;
    /** Direcciones, no imágenes: ver lib/imagen-url.ts */
    image: string | null;
    detailImage: string | null;
  };
  points: number;
  deaths: number;
  wins: number;
  losses: number;
  played: number;
  pokemonDiff: number;
  position: number;
};

/**
 * Competición sobre la que se está trabajando: la guardada en cookie si sigue
 * existiendo, si no la última activa, y como último recurso la más reciente.
 */
export const getActiveCompetition = cache(async () => {
  const store = await cookies();
  const preferredId = store.get(COMPETITION_COOKIE)?.value;

  if (preferredId) {
    const preferred = await prisma.competition.findUnique({
      where: { id: preferredId },
    });
    if (preferred) return preferred;
  }

  return (
    (await prisma.competition.findFirst({
      where: { status: COMPETITION_STATUS.ACTIVE },
      orderBy: { startedAt: "desc" },
    })) ??
    (await prisma.competition.findFirst({ orderBy: { createdAt: "desc" } }))
  );
});

export const listCompetitions = cache(async () =>
  prisma.competition.findMany({
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    include: { _count: { select: { participants: true } } },
  }),
);

/**
 * Participantes con las **direcciones** de sus imágenes, no las imágenes: los
 * bytes se quedan en la base de datos y el navegador se los pide aparte una
 * sola vez. Ver lib/imagen-url.ts.
 */
export const getParticipants = cache(async (competitionId: string) => {
  const participantes = await prisma.participant.findMany({
    where: { competitionId },
    orderBy: { displayName: "asc" },
    include: {
      user: { select: { id: true, username: true, role: true } },
    },
  });

  const [avatares, ases] = await Promise.all([
    urlsDeImagen(
      "avatar",
      participantes.map((p) => p.userId),
    ),
    urlsDeImagen(
      "as",
      participantes.map((p) => p.id),
    ),
  ]);

  return participantes.map((participante) => ({
    ...participante,
    aceImage: ases(participante.id),
    user: { ...participante.user, avatarImage: avatares(participante.userId) },
  }));
});

/**
 * Participante del usuario actual dentro de una competición (null si sólo mira).
 */
export const getMyParticipant = cache(
  async (competitionId: string, userId: string) =>
    prisma.participant.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
    }),
);

/**
 * Puede gestionar quien sea admin global o admin de esa competición concreta.
 */
export async function canManageCompetition(
  competitionId: string,
  user: CurrentUser | null,
) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const participant = await getMyParticipant(competitionId, user.id);
  return Boolean(participant?.isAdmin);
}

export async function requireCompetitionManager(competitionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tienes que iniciar sesión.");
  const allowed = await canManageCompetition(competitionId, user);
  if (!allowed) {
    throw new Error("Solo los administradores pueden hacer esto.");
  }
  return user;
}

/**
 * Saldo de tickets por jugador y ruleta: un ticket vale solo para la ruleta
 * para la que se dio. Se devuelve todo junto para poder pintar de una vez el
 * saldo de cada ruleta en la lista.
 */
export async function getTicketBalances(competitionId: string) {
  const sums = await prisma.rouletteTicket.groupBy({
    by: ["participantId", "rouletteId"],
    where: { competitionId, rouletteId: { not: null } },
    _sum: { delta: true },
  });

  const byRoulette = new Map<string, Map<string, number>>();
  for (const row of sums) {
    if (!row.rouletteId) continue;
    const forThis = byRoulette.get(row.rouletteId) ?? new Map<string, number>();
    forThis.set(row.participantId, row._sum.delta ?? 0);
    byRoulette.set(row.rouletteId, forThis);
  }

  return {
    /** Saldo de un jugador en una ruleta concreta */
    get: (participantId: string, rouletteId: string) =>
      byRoulette.get(rouletteId)?.get(participantId) ?? 0,
    /** Saldos de todos los jugadores en una ruleta */
    forRoulette: (rouletteId: string) =>
      byRoulette.get(rouletteId) ?? new Map<string, number>(),
  };
}

/**
 * Comprueba que el usuario puede actuar en nombre de un participante:
 * o es él mismo, o es administrador (global o de la competición).
 */
export async function assertCanActForParticipant(participantId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tienes que iniciar sesión.");

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant) throw new Error("Participante no encontrado.");

  if (participant.userId === user.id) return { user, participant };
  if (await canManageCompetition(participant.competitionId, user)) {
    return { user, participant };
  }
  throw new Error("No puedes modificar los datos de otro jugador.");
}

/**
 * Clasificación completa. Desempates según las reglas del locke:
 * 1) más puntos, 2) menos pokémon muertos, 3) mejor diferencia de pokémon
 * en los combates de jornada.
 */
export async function getStandings(
  competitionId: string,
): Promise<StandingRow[]> {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { startingPoints: true },
  });
  const startingPoints = competition?.startingPoints ?? 0;

  const [participants, pointSums, deathCounts, matches] = await Promise.all([
    getParticipants(competitionId),
    prisma.pointEntry.groupBy({
      by: ["participantId"],
      where: { competitionId },
      _sum: { delta: true },
    }),
    prisma.death.groupBy({
      by: ["participantId"],
      where: { participant: { competitionId } },
      _count: { _all: true },
    }),
    prisma.match.findMany({
      where: { matchday: { competitionId } },
      select: {
        participantAId: true,
        participantBId: true,
        winnerId: true,
        pokemonDiff: true,
      },
    }),
  ]);

  // La ilustración grande del as: solo su dirección, se baja al abrir la ficha
  const aceArt = await urlsDeImagen(
    "as-ficha",
    participants.map((participant) => participant.id),
  );

  const deltaByParticipant = new Map(
    pointSums.map((row) => [row.participantId, row._sum.delta ?? 0]),
  );
  const deathsByParticipant = new Map(
    deathCounts.map((row) => [row.participantId, row._count._all]),
  );

  const stats = new Map<
    string,
    { wins: number; losses: number; played: number; diff: number }
  >();
  const bump = (id: string) => {
    if (!stats.has(id)) stats.set(id, { wins: 0, losses: 0, played: 0, diff: 0 });
    return stats.get(id)!;
  };

  for (const match of matches) {
    if (!match.winnerId) continue;
    const loserId =
      match.winnerId === match.participantAId
        ? match.participantBId
        : match.participantAId;
    const winner = bump(match.winnerId);
    const loser = bump(loserId);
    winner.wins += 1;
    winner.played += 1;
    loser.losses += 1;
    loser.played += 1;
    const diff = match.pokemonDiff ?? 0;
    winner.diff += diff;
    loser.diff -= diff;
  }

  const rows = participants.map((participant) => {
    const stat = stats.get(participant.id) ?? {
      wins: 0,
      losses: 0,
      played: 0,
      diff: 0,
    };
    return {
      participantId: participant.id,
      userId: participant.userId,
      displayName: participant.displayName,
      gameVersion: participant.gameVersion,
      color: participant.color,
      avatarImage: participant.user.avatarImage,
      isAdmin: participant.isAdmin,
      ace: {
        species: participant.aceSpecies,
        nickname: participant.aceNickname,
        reason: participant.aceReason,
        image: participant.aceImage,
        detailImage: aceArt(participant.id),
      },
      points: startingPoints + (deltaByParticipant.get(participant.id) ?? 0),
      deaths: deathsByParticipant.get(participant.id) ?? 0,
      wins: stat.wins,
      losses: stat.losses,
      played: stat.played,
      pokemonDiff: stat.diff,
      position: 0,
    };
  });

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      a.deaths - b.deaths ||
      b.pokemonDiff - a.pokemonDiff ||
      a.displayName.localeCompare(b.displayName, "es"),
  );

  return rows.map((row, index) => ({ ...row, position: index + 1 }));
}
