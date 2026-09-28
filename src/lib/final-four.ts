import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getStandings, type StandingRow } from "@/lib/competition";
import {
  combatesDeLaLlave,
  comoVaLaSerie,
  ganadoresDeLaLlave,
  formatoParaJugadores,
  MINIMO_DE_JUGADORES,
  PARA_GANAR_LA_LLAVE,
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
 *
 * **Cada llave es una serie al mejor de tres**, así que lo que se pinta son
 * llaves con sus tres combates dentro, no combates sueltos.
 */

export type BracketPlayer = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** Puesto en la clasificación con el que entró al cuadro */
  seed: number;
};

/** Uno de los tres combates de una llave. */
export type CombateDeLaLlave = {
  /** "SEMI_A#2" */
  key: string;
  /** 1, 2 o 3 */
  numero: number;
  winnerId: string | null;
  pokemonDiff: number | null;
  playedAt: Date | null;
  notes: string | null;
  replayUrl: string | null;
  /** Ya no hace falta jugarlo: la serie está decidida antes de llegar aquí */
  sobra: boolean;
};

export type LlaveDelCuadro = {
  key: string;
  round: string;
  title: string;
  a: BracketPlayer | null;
  b: BracketPlayer | null;
  /** Texto para el hueco que todavía no se sabe quién ocupará */
  aPending?: string;
  bPending?: string;
  /** Quién se llevó la llave, si ya está decidida */
  winnerId: string | null;
  /** Cuántos combates lleva ganados cada lado */
  ganadasA: number;
  ganadasB: number;
  combates: CombateDeLaLlave[];
  /** Se puede anotar resultado: ya se conocen los dos contendientes */
  ready: boolean;
};

export type FinalFourState =
  | { status: "SIN_JORNADAS"; formato: FormatoFinal | null }
  | { status: "POCA_GENTE"; activos: number }
  /**
   * Solo queda uno en pie: los demás se retiraron o perdieron el locke. No hay
   * final que jugar, y aun así el locke tiene ganador; si no, el hall de la
   * fama se quedaba cerrado para siempre. Pasa en cuanto alguien deja un
   * dualocke.
   */
  | { status: "POR_ABANDONO"; champion: BracketPlayer }
  | {
      status: "BLOQUEADA";
      jugados: number;
      total: number;
      formato: FormatoFinal;
      /** Jornadas previstas que todavía no se han creado */
      faltanPorCrear: number;
    }
  | { status: "SIN_CUADRO"; standings: StandingRow[]; formato: FormatoFinal }
  | {
      status: "EN_JUEGO" | "TERMINADA";
      /** El cuadro del que cuelgan los equipos de la final */
      finalFourId: string;
      formato: FormatoFinal;
      llaves: LlaveDelCuadro[];
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
  /**
   * La clasificación va en la misma tanda que lo demás: casi siempre hace
   * falta, y las páginas que preguntan esto ya la han pedido (`getStandings`
   * va con `cache()`), así que no cuesta otro viaje.
   */
  const [combates, cuadro, activos, competition, standings] = await Promise.all([
    prisma.match.findMany({
      where: { matchday: { competitionId } },
      select: { winnerId: true, matchdayId: true },
    }),
    prisma.finalFour.findUnique({
      where: { competitionId },
      include: { matches: true },
    }),
    prisma.participant.count({ where: { competitionId, retiredAt: null } }),
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { jornadasPrevistas: true, _count: { select: { participants: true } } },
    }),
    getStandings(competitionId),
  ]);

  return calcularEstadoDeLaFinal({
    combates,
    cuadro,
    activos,
    participantes: competition?._count.participants ?? 0,
    jornadasPrevistas: competition?.jornadasPrevistas ?? null,
    standings,
  });
}

/**
 * La cuenta de `getFinalFourState`, sin tocar la base de datos: en qué punto
 * está la final y, con cuadro, quién va ganando cada llave. Suelta para poder
 * probarla.
 */
export function calcularEstadoDeLaFinal({
  combates: matches,
  cuadro: finalFour,
  activos,
  participantes,
  jornadasPrevistas,
  standings,
}: {
  combates: { winnerId: string | null; matchdayId: string }[];
  cuadro: {
    id: string;
    jugadores: number;
    seeds: string[];
    matches: {
      key: string;
      winnerId: string | null;
      pokemonDiff: number | null;
      playedAt: Date | null;
      notes: string | null;
      replayUrl: string | null;
    }[];
  } | null;
  activos: number;
  participantes: number;
  jornadasPrevistas: number | null;
  standings: StandingRow[];
}): FinalFourState {
  // Un locke de grupo en el que ya solo queda uno: ese lo ha ganado
  if (!finalFour && activos === 1 && participantes >= 2) {
    const quedaEnPie = standings.find((row) => !row.retirado);
    if (quedaEnPie) {
      return {
        status: "POR_ABANDONO",
        champion: {
          participantId: quedaEnPie.participantId,
          displayName: quedaEnPie.displayName,
          color: quedaEnPie.color,
          avatarImage: quedaEnPie.avatarImage,
          seed: 1,
        },
      };
    }
  }

  /**
   * Con el cuadro ya sembrado manda el formato con el que se sembró: si
   * alguien se retira a mitad de la final, los combates jugados tienen que
   * seguir significando lo mismo.
   */
  const formato = formatoParaJugadores(finalFour?.jugadores ?? activos);
  if (!formato) return { status: "POCA_GENTE", activos };

  if (!matches.length) return { status: "SIN_JORNADAS", formato };

  const jugados = matches.filter((match) => match.winnerId).length;
  /**
   * Las jornadas previstas también cuentan: con una de seis creada y jugada
   * la final se abría, porque "todos los combates jugados" era verdad. Si al
   * final se juegan menos, se bajan las previstas y listo.
   */
  const creadas = new Set(matches.map((match) => match.matchdayId)).size;
  const faltanPorCrear = Math.max(0, (jornadasPrevistas ?? 0) - creadas);
  if ((jugados < matches.length || faltanPorCrear > 0) && !finalFour) {
    return { status: "BLOQUEADA", jugados, total: matches.length, formato, faltanPorCrear };
  }

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

  /**
   * Quién ganó una llave. Se calcula de sus tres combates, no de una fila
   * "ganador de la llave" que habría que mantener a mano y podría mentir.
   */
  const ganadorPorClave = new Map(
    finalFour.matches.map((match) => [match.key, match.winnerId]),
  );
  const serieDe = (llave: string) =>
    comoVaLaSerie(ganadoresDeLaLlave(llave, ganadorPorClave));
  const ganadorDe = (llave: string) => {
    const { ganador } = serieDe(llave);
    return ganador
      ? (seeds.find((jugador) => jugador.participantId === ganador) ?? null)
      : null;
  };

  const llaves: LlaveDelCuadro[] = formato.llaves.map((plantilla) => {
    const lado = (posicion: "a" | "b") => {
      const desde = plantilla[posicion];
      return "puesto" in desde ? (seeds[desde.puesto] ?? null) : ganadorDe(desde.ganadorDe);
    };
    const a = lado("a");
    const b = lado("b");
    const { ganadas, sobra, ganador } = serieDe(plantilla.key);

    return {
      key: plantilla.key,
      round: plantilla.ronda,
      title: plantilla.titulo,
      a,
      b,
      aPending: a ? undefined : plantilla.aPendiente,
      bPending: b ? undefined : plantilla.bPendiente,
      winnerId: ganador,
      ganadasA: a ? (ganadas.get(a.participantId) ?? 0) : 0,
      ganadasB: b ? (ganadas.get(b.participantId) ?? 0) : 0,
      combates: combatesDeLaLlave(plantilla.key).map((clave, indice) => {
        const guardado = guardados.get(clave);
        return {
          key: clave,
          numero: indice + 1,
          winnerId: guardado?.winnerId ?? null,
          pokemonDiff: guardado?.pokemonDiff ?? null,
          playedAt: guardado?.playedAt ?? null,
          notes: guardado?.notes ?? null,
          replayUrl: guardado?.replayUrl ?? null,
          sobra: sobra[indice] ?? false,
        };
      }),
      ready: Boolean(a && b),
    };
  });

  const laFinal = llaves.find((llave) => llave.key === formato.campeon);
  const champion = ganadorDe(formato.campeon);
  const runnerUp = champion
    ? ([laFinal?.a ?? null, laFinal?.b ?? null].find(
        (jugador) => jugador && jugador.participantId !== champion.participantId,
      ) ?? null)
    : null;

  return {
    status: champion ? "TERMINADA" : "EN_JUEGO",
    finalFourId: finalFour.id,
    formato,
    llaves,
    seeds,
    champion,
    runnerUp,
  };
}

/**
 * Cómo se llama el final de este locke y cuántos esperan sin jugar la primera
 * ronda, para la clasificación y el menú. Es una consulta chica a propósito:
 * la usa el layout, que corre en cada página.
 *
 * Va con `cache()` porque **la piden el layout y la página a la vez** —la
 * portada y `/puntos` la necesitan igual—, y sin esto eran dos viajes a la
 * base de datos por cada visita para traerse lo mismo.
 */
export const getFormatoFinal = cache(async (competitionId: string) => {
  const [finalFour, activos] = await Promise.all([
    prisma.finalFour.findUnique({
      where: { competitionId },
      select: { jugadores: true },
    }),
    prisma.participant.count({ where: { competitionId, retiredAt: null } }),
  ]);
  return formatoParaJugadores(finalFour?.jugadores ?? activos);
});

/** El nombre que le toca al final del locke, para rótulos y menús. */
export const NOMBRE_POR_DEFECTO = "Final Four";

/** ¿Se puede ya rellenar el hall de la fama? */
export { MINIMO_DE_JUGADORES };
