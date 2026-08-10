import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin, type CurrentUser } from "@/lib/auth";
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
    image: string | null;
    hasDetailImage: boolean;
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

export const getParticipants = cache(async (competitionId: string) =>
  prisma.participant.findMany({
    where: { competitionId },
    orderBy: { displayName: "asc" },
    omit: { aceDetailImage: true },
    include: {
      user: {
        select: { id: true, username: true, role: true, avatarImage: true },
      },
    },
  }),
);

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

  const [participants, withAceArt, pointSums, deathCounts, matches] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId },
      // La ilustración grande del as se pide solo al abrir su ficha
      omit: { aceDetailImage: true },
      include: { user: { select: { avatarImage: true } } },
    }),
    prisma.participant.findMany({
      where: { competitionId, aceDetailImage: { not: null } },
      select: { id: true },
    }),
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

  const aceDetailIds = new Set(withAceArt.map((row) => row.id));

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
        hasDetailImage: aceDetailIds.has(participant.id),
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
