import "server-only";
import { prisma } from "@/lib/db";
import { getStandings, type StandingRow } from "@/lib/competition";
import {
  formatoParaJugadores,
  MINIMO_DE_JUGADORES,
  type FormatoFinal,
} from "@/lib/formatos-finales";

/**
 * El final del locke: la Final Four de siempre cuando hay gente de sobra, y
 * los formatos más cortos cuando quedan pocos.
 *
 * Qué cuadro toca lo decide `lib/formatos-finales.ts` a partir del número de
 * jugadores **activos** —los retirados no cuentan—, y este módulo solo lo
 * rellena con quién va ganando. Los emparejamientos no se guardan: se deducen
 * de la siembra y de los resultados, así que no pueden quedar incoherentes.
 */

export type BracketPlayer = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** Puesto en la clasificación con el que entró al cuadro */
  seed: number;
};

export type BracketMatch = {
  key: string;
  round: string;
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
  /** El tercero del mejor de tres cuando ya no hace falta jugarlo */
  sobra?: boolean;
};

export type FinalFourState =
  | { status: "SIN_JORNADAS"; formato: FormatoFinal | null }
  | { status: "POCA_GENTE"; activos: number }
  | { status: "BLOQUEADA"; jugados: number; total: number; formato: FormatoFinal }
  | { status: "SIN_CUADRO"; standings: StandingRow[]; formato: FormatoFinal }
  | {
      status: "EN_JUEGO" | "TERMINADA";
      formato: FormatoFinal;
      matches: BracketMatch[];
      seeds: BracketPlayer[];
      champion: BracketPlayer | null;
      runnerUp: BracketPlayer | null;
    };

/**
 * Estado de la final. Se desbloquea solo cuando todos los combates de todas
 * las jornadas tienen ganador: hasta entonces no se sabe cómo queda la tabla,
 * y sembrar el cuadro antes no tendría sentido.
 */
export async function getFinalFourState(
  competitionId: string,
): Promise<FinalFourState> {
  const [matches, finalFour, activos] = await Promise.all([
    prisma.match.findMany({
      where: { matchday: { competitionId } },
      select: { winnerId: true },
    }),
    prisma.finalFour.findUnique({
      where: { competitionId },
      include: { matches: true },
    }),
    prisma.participant.count({ where: { competitionId, retiredAt: null } }),
  ]);

  /**
   * Con el cuadro ya sembrado manda el formato con el que se sembró: si
   * alguien se retira a mitad de la final, los combates jugados tienen que
   * seguir significando lo mismo.
   */
  const formato = formatoParaJugadores(finalFour?.jugadores ?? activos);
  if (!formato) return { status: "POCA_GENTE", activos };

  if (!matches.length) return { status: "SIN_JORNADAS", formato };

  const jugados = matches.filter((match) => match.winnerId).length;
  if (jugados < matches.length && !finalFour) {
    return { status: "BLOQUEADA", jugados, total: matches.length, formato };
  }

  const standings = await getStandings(competitionId);
  if (!finalFour) return { status: "SIN_CUADRO", standings, formato };

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

  const guardados = new Map(finalFour.matches.map((match) => [match.key, match]));
  const ganadorDe = (key: string) => {
    const winnerId = guardados.get(key)?.winnerId;
    return winnerId
      ? (seeds.find((jugador) => jugador.participantId === winnerId) ?? null)
      : null;
  };

  // En una variable aparte para que TypeScript pueda distinguir los dos casos
  const comoSeDecide = formato.campeon;

  /** Cuántos combates de la serie lleva ganados cada uno, para el mejor de tres */
  const victoriasEnSerie = new Map<string, number>();
  if (comoSeDecide.tipo === "serie") {
    for (const key of comoSeDecide.keys) {
      const winnerId = guardados.get(key)?.winnerId;
      if (winnerId) {
        victoriasEnSerie.set(winnerId, (victoriasEnSerie.get(winnerId) ?? 0) + 1);
      }
    }
  }
  const serieDecidida =
    comoSeDecide.tipo === "serie" &&
    [...victoriasEnSerie.values()].some(
      (ganados) => ganados >= comoSeDecide.hacenFalta,
    );

  const bracket: BracketMatch[] = formato.combates.map((plantilla) => {
    const lado = (posicion: "a" | "b") => {
      const desde = plantilla[posicion];
      return "puesto" in desde ? (seeds[desde.puesto] ?? null) : ganadorDe(desde.ganadorDe);
    };
    const a = lado("a");
    const b = lado("b");
    const guardado = guardados.get(plantilla.key);

    // El tercero del mejor de tres sobra en cuanto alguien gana los dos
    // primeros: se enseña apagado en vez de invitando a jugarlo
    const sobra = Boolean(plantilla.soloSiEmpate && serieDecidida);

    return {
      key: plantilla.key,
      round: plantilla.ronda,
      title: plantilla.titulo,
      a,
      b,
      aPending: a ? undefined : plantilla.aPendiente,
      bPending: b ? undefined : plantilla.bPendiente,
      winnerId: guardado?.winnerId ?? null,
      pokemonDiff: guardado?.pokemonDiff ?? null,
      playedAt: guardado?.playedAt ?? null,
      notes: guardado?.notes ?? null,
      ready: Boolean(a && b) && !sobra,
      sobra: sobra || undefined,
    };
  });

  let champion: BracketPlayer | null = null;
  let runnerUp: BracketPlayer | null = null;

  if (comoSeDecide.tipo === "llave") {
    const laLlave = comoSeDecide.key;
    champion = ganadorDe(laLlave);
    const laFinal = bracket.find((combate) => combate.key === laLlave);
    runnerUp = champion
      ? ([laFinal?.a ?? null, laFinal?.b ?? null].find(
          (jugador) => jugador && jugador.participantId !== champion!.participantId,
        ) ?? null)
      : null;
  } else {
    const [ganadorId] =
      [...victoriasEnSerie.entries()].find(
        ([, ganados]) => ganados >= comoSeDecide.hacenFalta,
      ) ?? [];
    champion = ganadorId
      ? (seeds.find((jugador) => jugador.participantId === ganadorId) ?? null)
      : null;
    runnerUp = champion
      ? (seeds.find(
          (jugador) => jugador.participantId !== champion!.participantId,
        ) ?? null)
      : null;
  }

  return {
    status: champion ? "TERMINADA" : "EN_JUEGO",
    formato,
    matches: bracket,
    seeds,
    champion,
    runnerUp,
  };
}

/**
 * Cómo se llama el final de este locke y cuántos esperan sin jugar la primera
 * ronda, para la clasificación y el menú. Es una consulta chica a propósito:
 * la usa el layout, que corre en cada página.
 */
export async function getFormatoFinal(competitionId: string) {
  const [finalFour, activos] = await Promise.all([
    prisma.finalFour.findUnique({
      where: { competitionId },
      select: { jugadores: true },
    }),
    prisma.participant.count({ where: { competitionId, retiredAt: null } }),
  ]);
  return formatoParaJugadores(finalFour?.jugadores ?? activos);
}

/** El nombre que le toca al final del locke, para rótulos y menús. */
export const NOMBRE_POR_DEFECTO = "Final Four";

/** ¿Se puede ya rellenar el hall de la fama? */
export async function isLockeFinished(competitionId: string) {
  const state = await getFinalFourState(competitionId);
  return state.status === "TERMINADA" ? state : null;
}

export { MINIMO_DE_JUGADORES };
