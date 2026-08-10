import "server-only";
import { prisma } from "@/lib/db";
import { getStandings, type StandingRow } from "@/lib/competition";

/** Las cinco llaves del cuadro, en el orden en que se juegan. */
export const BRACKET_KEYS = [
  "CROSS_A",
  "CROSS_B",
  "SEMI_A",
  "SEMI_B",
  "FINAL",
] as const;
export type BracketKey = (typeof BRACKET_KEYS)[number];

export type BracketPlayer = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** Puesto en la clasificación con el que entró al cuadro */
  seed: number;
};

export type BracketMatch = {
  key: BracketKey;
  round: "Cruces" | "Semifinales" | "Final";
  title: string;
  a: BracketPlayer | null;
  b: BracketPlayer | null;
  /** Texto para el hueco que todavía no se sabe quién ocupará */
  aPending?: string;
  bPending?: string;
  winnerId: string | null;
  pokemonDiff: number | null;
  playedAt: Date | null;
  notes: string | null;
  /** Se puede anotar resultado: ya se conocen los dos contendientes */
  ready: boolean;
};

export type FinalFourState =
  | { status: "SIN_JORNADAS" }
  | { status: "BLOQUEADA"; jugados: number; total: number }
  | { status: "SIN_CUADRO"; standings: StandingRow[] }
  | {
      status: "EN_JUEGO" | "TERMINADA";
      matches: BracketMatch[];
      seeds: BracketPlayer[];
      champion: BracketPlayer | null;
      runnerUp: BracketPlayer | null;
    };

/**
 * Estado de la Final Four. Se desbloquea solo cuando todos los combates de
 * todas las jornadas tienen ganador: hasta entonces no se sabe cómo queda la
 * tabla, y sembrar el cuadro antes no tendría sentido.
 */
export async function getFinalFourState(
  competitionId: string,
): Promise<FinalFourState> {
  const [matches, finalFour] = await Promise.all([
    prisma.match.findMany({
      where: { matchday: { competitionId } },
      select: { winnerId: true },
    }),
    prisma.finalFour.findUnique({
      where: { competitionId },
      include: { matches: true },
    }),
  ]);

  if (!matches.length) return { status: "SIN_JORNADAS" };

  const jugados = matches.filter((match) => match.winnerId).length;
  if (jugados < matches.length && !finalFour) {
    return { status: "BLOQUEADA", jugados, total: matches.length };
  }

  const standings = await getStandings(competitionId);
  if (!finalFour) return { status: "SIN_CUADRO", standings };

  const byId = new Map(standings.map((row) => [row.participantId, row]));
  const seeds: BracketPlayer[] = finalFour.seeds
    .map((participantId, index) => {
      const row = byId.get(participantId);
      if (!row) return null;
      return {
        participantId,
        displayName: row.displayName,
        color: row.color,
        avatarImage: row.avatarImage,
        seed: index + 1,
      };
    })
    .filter((player): player is BracketPlayer => player !== null);

  const results = new Map(finalFour.matches.map((match) => [match.key, match]));
  const seed = (index: number) => seeds[index] ?? null;
  const winnerOf = (key: BracketKey) => {
    const winnerId = results.get(key)?.winnerId;
    return winnerId ? (seeds.find((s) => s.participantId === winnerId) ?? null) : null;
  };

  const build = (
    key: BracketKey,
    round: BracketMatch["round"],
    title: string,
    a: BracketPlayer | null,
    b: BracketPlayer | null,
    aPending?: string,
    bPending?: string,
  ): BracketMatch => {
    const stored = results.get(key);
    return {
      key,
      round,
      title,
      a,
      b,
      aPending: a ? undefined : aPending,
      bPending: b ? undefined : bPending,
      winnerId: stored?.winnerId ?? null,
      pokemonDiff: stored?.pokemonDiff ?? null,
      playedAt: stored?.playedAt ?? null,
      notes: stored?.notes ?? null,
      ready: Boolean(a && b),
    };
  };

  const bracket: BracketMatch[] = [
    build("CROSS_A", "Cruces", "3º contra 6º", seed(2), seed(5)),
    build("CROSS_B", "Cruces", "4º contra 5º", seed(3), seed(4)),
    build(
      "SEMI_A",
      "Semifinales",
      "El 1º espera",
      seed(0),
      winnerOf("CROSS_A"),
      undefined,
      "Ganador de 3º-6º",
    ),
    build(
      "SEMI_B",
      "Semifinales",
      "El 2º espera",
      seed(1),
      winnerOf("CROSS_B"),
      undefined,
      "Ganador de 4º-5º",
    ),
    build(
      "FINAL",
      "Final",
      "Por el Hexalocke",
      winnerOf("SEMI_A"),
      winnerOf("SEMI_B"),
      "Ganador de la 1ª semifinal",
      "Ganador de la 2ª semifinal",
    ),
  ];

  const champion = winnerOf("FINAL");
  const finalMatch = bracket[4];
  const runnerUp = champion
    ? ([finalMatch.a, finalMatch.b].find(
        (player) => player && player.participantId !== champion.participantId,
      ) ?? null)
    : null;

  return {
    status: champion ? "TERMINADA" : "EN_JUEGO",
    matches: bracket,
    seeds,
    champion,
    runnerUp,
  };
}

/** ¿Se puede ya rellenar el hall de la fama? */
export async function isLockeFinished(competitionId: string) {
  const state = await getFinalFourState(competitionId);
  return state.status === "TERMINADA" ? state : null;
}
