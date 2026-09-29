import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getParticipants } from "@/lib/competition";
import { JORNADAS_DEL_DUALOCKE, jornadasParaGanar } from "@/lib/perfiles-de-locke";

/**
 * El marcador de un locke que se decide **por jornadas ganadas** y no por
 * puntos: hoy, el dualocke.
 *
 * Con dos jugadores la tabla de clasificación no dice nada —un punto por
 * combate ganado y siempre a un puñado de distancia—, así que lo que cuenta es
 * quién se lleva cada jornada, que ahí es un combate al mejor de tres. Gana el
 * locke en combates el primero que se lleve **la mayoría de las jornadas**: con
 * las seis de siempre, cuatro.
 *
 * Ganar el locke en combates no es lo mismo que superar la Liga Pokémon (ver
 * `lib/liga.ts`): son dos victorias distintas y las dos cuentan.
 */

export type JornadaDelMarcador = {
  id: string;
  label: string;
  milestone: string | null;
  /** Quién se llevó la jornada, si ya está decidida */
  ganadorId: string | null;
  /** Combates ganados por cada uno dentro de la jornada */
  porJugador: Record<string, number>;
  /** Combates de la jornada que todavía no se han jugado */
  faltan: number;
};

export type Marcador = {
  jugadores: Array<{
    participantId: string;
    displayName: string;
    color: string;
    avatarImage: string | null;
    ganadas: number;
    /** Cuántas jornadas más necesita para llevarse el locke */
    leFaltan: number;
  }>;
  jornadas: JornadaDelMarcador[];
  /** Jornadas que hacen falta para ganar: la mayoría de las que hay */
  hacenFalta: number;
  /** Quien ya ha ganado el locke: el primero en llegar a la mayoría de jornadas */
  campeonId: string | null;
  /**
   * A quién le vale ganar la siguiente jornada para llevarse el locke.
   *
   * Vacío si ya hay campeón o si no quedan jornadas por decidir: con seis
   * jornadas y cuatro para ganar se puede acabar 3-3, y ahí decir "bola de
   * partido" sería mentira porque no queda nada que jugar.
   */
  bolaDePartido: Array<{ participantId: string; displayName: string }>;
  /** De cuántas jornadas va el locke */
  previstas: number;
  /** Las que todavía pueden cambiar el marcador */
  quedanPorDecidir: number;
  /**
   * Jugadas todas y nadie ha llegado a la mayoría (un 3-3 de seis): el locke
   * lo decide la Jornada Final, que para eso es el desempate.
   */
  empate: boolean;
};

/**
 * Quién se lleva una jornada de dualocke: el que tenga más combates **y nadie
 * pueda alcanzarle** con los que quedan. En un mejor de tres, el 2-0 ya la
 * cierra sin jugar el tercero, igual que en la serie de la Jornada Final.
 * Suelta para que el palmarés cuente igual sin traerse el marcador entero.
 */
export function ganadorDeLaJornada(combates: { winnerId: string | null }[]) {
  const porJugador: Record<string, number> = {};
  let faltan = 0;
  for (const combate of combates) {
    if (!combate.winnerId) {
      faltan += 1;
      continue;
    }
    porJugador[combate.winnerId] = (porJugador[combate.winnerId] ?? 0) + 1;
  }
  const marcadores = Object.entries(porJugador).sort((a, b) => b[1] - a[1]);
  const [lider, suyas] = marcadores[0] ?? [null, 0];
  const segundas = marcadores[1]?.[1] ?? 0;
  return {
    ganadorId: lider && suyas > segundas + faltan ? lider : null,
    porJugador,
    faltan,
  };
}

/** De cuántas jornadas va un dualocke: las previstas o, sin ellas, las de siempre. */
export function jornadasDelDualocke(previstas: number | null, creadas: number) {
  return previstas ?? Math.max(creadas, JORNADAS_DEL_DUALOCKE);
}

/** Va con `cache()`: lo piden la portada y el campeón del locke en la misma visita. */
export const getMarcador = cache(async function getMarcador(
  competitionId: string,
): Promise<Marcador> {
  const [competition, participantes, jornadas] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { jornadasPrevistas: true },
    }),
    getParticipants(competitionId),
    prisma.matchday.findMany({
      where: { competitionId },
      orderBy: { position: "asc" },
      include: {
        matches: {
          select: {
            winnerId: true,
            participantAId: true,
            participantBId: true,
          },
        },
      },
    }),
  ]);

  return calcularMarcador(
    participantes.map((participante) => ({
      id: participante.id,
      displayName: participante.displayName,
      color: participante.color,
      avatarImage: participante.user.avatarImage,
    })),
    jornadas,
    competition?.jornadasPrevistas ?? null,
  );
});

/**
 * La cuenta de `getMarcador`, sin tocar la base de datos. Suelta para poder
 * probarla: es la que decide quién gana un dualocke.
 */
export function calcularMarcador(
  participantes: {
    id: string;
    displayName: string;
    color: string;
    avatarImage: string | null;
  }[],
  jornadas: {
    id: string;
    label: string;
    milestone: string | null;
    matches: { winnerId: string | null }[];
  }[],
  jornadasPrevistas: number | null,
): Marcador {
  // Las previstas mandan sobre las creadas: si no, el primero que gane la
  // primera jornada saldría campeón, porque de una la mayoría es una. Un
  // dualocke de antes que no las tenga puestas cuenta con las de siempre.
  const previstas = jornadasDelDualocke(jornadasPrevistas, jornadas.length);
  const hacenFalta = jornadasParaGanar(previstas);
  const ganadas = new Map<string, number>();

  const filas: JornadaDelMarcador[] = jornadas.map((jornada) => {
    const { ganadorId, porJugador, faltan } = ganadorDeLaJornada(jornada.matches);

    if (ganadorId) ganadas.set(ganadorId, (ganadas.get(ganadorId) ?? 0) + 1);

    return {
      id: jornada.id,
      label: jornada.label,
      milestone: jornada.milestone,
      ganadorId,
      porJugador,
      faltan,
    };
  });

  const jugadores = participantes
    .map((participante) => {
      const suyas = ganadas.get(participante.id) ?? 0;
      return {
        participantId: participante.id,
        displayName: participante.displayName,
        color: participante.color,
        avatarImage: participante.avatarImage,
        ganadas: suyas,
        leFaltan: Math.max(0, hacenFalta - suyas),
      };
    })
    .sort((a, b) => b.ganadas - a.ganadas || a.displayName.localeCompare(b.displayName, "es"));

  const campeon = jugadores.find((jugador) => jugador.ganadas >= hacenFalta);

  /**
   * Cuántas jornadas pueden todavía cambiar el marcador. Se cuenta sobre las
   * previstas y no sobre las creadas, porque el calendario se va montando sobre
   * la marcha y las que faltan por crear también se van a jugar.
   */
  const decididas = filas.filter((jornada) => jornada.ganadorId).length;
  const quedanPorDecidir =
    Math.max(previstas, filas.length) - decididas;

  return {
    jugadores,
    jornadas: filas,
    hacenFalta,
    campeonId: campeon?.participantId ?? null,
    bolaDePartido:
      campeon || quedanPorDecidir < 1
        ? []
        : jugadores
            .filter((jugador) => jugador.leFaltan === 1)
            .map(({ participantId, displayName }) => ({
              participantId,
              displayName,
            })),
    previstas,
    quedanPorDecidir: Math.max(0, quedanPorDecidir),
    empate: !campeon && quedanPorDecidir < 1,
  };
}

/**
 * Cuándo se ganó un dualocke por mayoría: el momento en que el campeón se
 * llevó la jornada que le dio la mayoría. Cada jornada se decide con su último
 * combate jugado (los que sobran tras un 2-0 se borran, ver `lib/series.ts`).
 * Sin base de datos, para poder probarlo.
 */
export function cuandoSeGanoPorJornadas(
  jornadas: { matches: { winnerId: string | null; playedAt: Date | null }[] }[],
  campeonId: string,
  hacenFalta: number,
): Date | null {
  const decididas = jornadas
    .map((jornada) => {
      const { ganadorId } = ganadorDeLaJornada(jornada.matches);
      const fechas = jornada.matches
        .map((combate) => combate.playedAt?.getTime())
        .filter((t): t is number => t !== undefined);
      return { ganadorId, cuando: fechas.length ? Math.max(...fechas) : null };
    })
    .filter((j) => j.ganadorId && j.cuando !== null)
    .sort((a, b) => a.cuando! - b.cuando!);

  let suyas = 0;
  for (const jornada of decididas) {
    if (jornada.ganadorId !== campeonId) continue;
    suyas += 1;
    if (suyas >= hacenFalta) return new Date(jornada.cuando!);
  }
  return null;
}
