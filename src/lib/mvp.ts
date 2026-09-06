import "server-only";
import { prisma } from "@/lib/db";
import { urlsDeImagen } from "@/lib/imagenes";

export type MvpCandidate = {
  id: string;
  species: string;
  nickname: string | null;
  /** Direcciones, no imágenes: ver lib/imagen-url.ts */
  boxImage: string | null;
  detailImage: string | null;
  /** Sitio que ocupa en el equipo de su dueño */
  position: number;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  votes: number;
};

export type MvpState = {
  matchdayId: string;
  /** Todos los pokémon que jugaron esa jornada, de más a menos votados */
  candidates: MvpCandidate[];
  /** El MVP, si ya lo hay */
  winner: MvpCandidate | null;
  /** Empate arriba sin deshacer: hay que esperar votos o desempatar */
  tied: MvpCandidate[];
  /** A quién ha votado el que mira, si es jugador */
  myVoteId: string | null;
  votesCast: number;
  voterCount: number;
};

/**
 * Estado de la votación al MVP de varias jornadas.
 *
 * Sale por mayoría simple: gana el más votado aunque no pase de la mitad. Si
 * dos empatan arriba no hay MVP hasta que alguien cambie su voto o un
 * administrador desempate; el desempate solo vale mientras el empate siga.
 */
export async function getMvpStates(
  competitionId: string,
  matchdayIds: string[],
  myParticipantId: string | null,
): Promise<Map<string, MvpState>> {
  const states = new Map<string, MvpState>();
  if (!matchdayIds.length) return states;

  const [pokemon, votes, matchdays, voterCount] = await Promise.all([
    prisma.matchPokemon.findMany({
      // Solo los de jornada: los equipos de un reto no optan a MVP
      where: { matchId: { not: null }, match: { matchdayId: { in: matchdayIds } } },
      orderBy: { position: "asc" },
      include: {
        match: { select: { matchdayId: true } },
        participant: { select: { displayName: true, color: true } },
      },
    }),
    prisma.mvpVote.groupBy({
      by: ["matchdayId", "matchPokemonId"],
      where: { matchdayId: { in: matchdayIds } },
      _count: { _all: true },
    }),
    prisma.matchday.findMany({
      where: { id: { in: matchdayIds } },
      select: { id: true, mvpTiebreakId: true },
    }),
    // Solo los que siguen jugando: si un retirado contara como votante, la
    // votación nunca llegaría a estar completa
    prisma.participant.count({ where: { competitionId, retiredAt: null } }),
  ]);

  const ids = pokemon.map((row) => row.id);
  const [sprites, ilustraciones] = await Promise.all([
    urlsDeImagen("equipo", ids),
    urlsDeImagen("equipo-ficha", ids),
  ]);

  const myVotes = myParticipantId
    ? await prisma.mvpVote.findMany({
        where: { matchdayId: { in: matchdayIds }, voterId: myParticipantId },
        select: { matchdayId: true, matchPokemonId: true },
      })
    : [];
  const myVoteByMatchday = new Map(
    myVotes.map((vote) => [vote.matchdayId, vote.matchPokemonId]),
  );

  const votesByPokemon = new Map(
    votes.map((row) => [row.matchPokemonId, row._count._all]),
  );
  const tiebreakByMatchday = new Map(
    matchdays.map((row) => [row.id, row.mvpTiebreakId]),
  );

  const byMatchday = new Map<string, MvpCandidate[]>();
  for (const row of pokemon) {
    if (!row.match) continue;
    const list = byMatchday.get(row.match.matchdayId) ?? [];
    list.push({
      id: row.id,
      species: row.species,
      nickname: row.nickname,
      boxImage: sprites(row.id),
      detailImage: ilustraciones(row.id),
      position: row.position,
      ownerId: row.participantId,
      ownerName: row.participant.displayName,
      ownerColor: row.participant.color,
      votes: votesByPokemon.get(row.id) ?? 0,
    });
    byMatchday.set(row.match.matchdayId, list);
  }

  for (const matchdayId of matchdayIds) {
    const candidates = (byMatchday.get(matchdayId) ?? []).sort(
      (a, b) =>
        b.votes - a.votes ||
        a.ownerName.localeCompare(b.ownerName, "es") ||
        (a.nickname ?? a.species).localeCompare(b.nickname ?? b.species, "es"),
    );

    const top = candidates[0]?.votes ?? 0;
    const leaders = top > 0 ? candidates.filter((c) => c.votes === top) : [];

    let winner: MvpCandidate | null = null;
    let tied: MvpCandidate[] = [];
    if (leaders.length === 1) {
      winner = leaders[0];
    } else if (leaders.length > 1) {
      const tiebreakId = tiebreakByMatchday.get(matchdayId);
      winner = leaders.find((c) => c.id === tiebreakId) ?? null;
      if (!winner) tied = leaders;
    }

    states.set(matchdayId, {
      matchdayId,
      candidates,
      winner,
      tied,
      myVoteId: myVoteByMatchday.get(matchdayId) ?? null,
      votesCast: votes
        .filter((row) => row.matchdayId === matchdayId)
        .reduce((sum, row) => sum + row._count._all, 0),
      voterCount,
    });
  }

  return states;
}
