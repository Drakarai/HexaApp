import "server-only";
import { prisma } from "@/lib/db";
import { firmasDeEquiposDeJornadas } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { VOTANTES_DEL_MVP } from "@/lib/wipeos";

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
  /**
   * Las jornadas de las que se quiere el estado. Puede llegar **sin esperar**:
   * todo se pide por el locke, así que esto arranca a la vez que la consulta
   * que las trae, y solo se usa al final para repartir.
   */
  jornadasPedidas: string[] | Promise<string[]>,
  /**
   * Quién mira, para marcar lo que votó. Vale su cuenta: sus votos se buscan
   * por ella dentro del locke, así no hay que esperar a su participante.
   */
  quienMira: { participantId: string } | { userId: string } | null,
  /** Las firmas de los sprites, si quien llama ya las tiene pedidas */
  firmasPedidas?: Promise<[Map<string, string>, Map<string, string>]>,
): Promise<Map<string, MvpState>> {
  const states = new Map<string, MvpState>();
  const delLocke = { competitionId };

  const [pokemon, votes, matchdays, voterCount, myVotes, [firmasSprite, firmasIlustracion], matchdayIds] =
    await Promise.all([
      prisma.matchPokemon.findMany({
        // Solo los de jornada: los equipos de un reto no optan a MVP
        where: { matchId: { not: null }, match: { matchday: delLocke } },
        orderBy: { position: "asc" },
        include: {
          match: { select: { matchdayId: true } },
          participant: { select: { displayName: true, color: true } },
        },
      }),
      prisma.mvpVote.groupBy({
        by: ["matchdayId", "matchPokemonId"],
        where: { matchday: delLocke },
        _count: { _all: true },
      }),
      prisma.matchday.findMany({
        where: delLocke,
        select: { id: true, mvpTiebreakId: true },
      }),
      // Los que pueden votar: los que siguen y los que perdieron el locke. Si
      // contara un retirado, la votación nunca llegaría a estar completa; si no
      // contara un wipeado, estaría "completa" faltando su voto. Ver lib/wipeos.
      prisma.participant.count({
        where: { competitionId, ...VOTANTES_DEL_MVP },
      }),
      quienMira
        ? prisma.mvpVote.findMany({
            where: {
              matchday: delLocke,
              ...("participantId" in quienMira
                ? { voterId: quienMira.participantId }
                : { voter: { userId: quienMira.userId } }),
            },
            select: { matchdayId: true, matchPokemonId: true },
          })
        : [],
      firmasPedidas ?? firmasDeEquiposDeJornadas(competitionId),
      jornadasPedidas,
    ]);
  if (!matchdayIds.length) return states;
  const sprites = (id: string) => urlDeImagen("equipo", id, firmasSprite.get(id));
  const ilustraciones = (id: string) => urlDeImagen("equipo-ficha", id, firmasIlustracion.get(id));

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

    const votesCast = votes
      .filter((row) => row.matchdayId === matchdayId)
      .reduce((sum, row) => sum + row._count._all, 0);

    states.set(matchdayId, {
      matchdayId,
      candidates,
      winner,
      tied,
      myVoteId: myVoteByMatchday.get(matchdayId) ?? null,
      votesCast,
      // Alguien pudo votar y retirarse después: su voto se queda —es lo que
      // pasó— pero ya no cuenta como votante, y sin esto saldría "6/5 votos"
      voterCount: Math.max(voterCount, votesCast),
    });
  }

  return states;
}
