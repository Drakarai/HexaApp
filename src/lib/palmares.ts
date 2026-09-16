import "server-only";
import { prisma } from "@/lib/db";
import { listCompetitions } from "@/lib/competition";
import {
  campeonYSubcampeon,
  formatoParaJugadores,
} from "@/lib/formatos-finales";

/**
 * El histórico de todos los lockes juntos: quién ha ganado más, quién ha
 * enterrado más pokémon y cómo acabó cada edición.
 *
 * Hasta ahora cada locke vivía en su burbuja y no había ninguna pantalla que
 * juntara varios. Archivar una edición no servía de nada más que para quitarla
 * de en medio.
 *
 * **Solo entran los lockes que esa persona puede abrir.** Sale de
 * `listCompetitions`, que ya lleva el filtro de visibilidad: quien no juega una
 * edición ni la mira de espectador, tampoco la ve en el palmarés.
 *
 * Se cuenta al mirarlo y no se guarda nada, como el resto de números de la
 * aplicación. Son **cinco consultas para todas las ediciones a la vez**, no
 * cinco por edición: lo que se pide se pide con `in`.
 */

export type CampeonDeUnLocke = {
  competitionId: string;
  nombre: string;
  game: string | null;
  startedAt: Date;
  terminado: boolean;
  campeon: { displayName: string; color: string; avatarImage: string | null } | null;
  subcampeon: { displayName: string; color: string } | null;
};

export type FilaDelPalmares = {
  userId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  lockes: number;
  ganados: number;
  victorias: number;
  derrotas: number;
  bajas: number;
};

export type Palmares = {
  ediciones: CampeonDeUnLocke[];
  gente: FilaDelPalmares[];
};

export async function getPalmares(): Promise<Palmares> {
  const competiciones = await listCompetitions();
  const ids = competiciones.map((competicion) => competicion.id);
  if (!ids.length) return { ediciones: [], gente: [] };

  const [participantes, finales, bajas, combates] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId: { in: ids } },
      select: {
        id: true,
        userId: true,
        competitionId: true,
        displayName: true,
        color: true,
        user: { select: { avatarImage: true } },
      },
    }),
    prisma.finalFour.findMany({
      where: { competitionId: { in: ids } },
      select: {
        competitionId: true,
        jugadores: true,
        seeds: true,
        matches: { select: { key: true, winnerId: true } },
      },
    }),
    prisma.death.groupBy({
      by: ["participantId"],
      where: { participant: { competitionId: { in: ids } } },
      _count: { _all: true },
    }),
    prisma.match.findMany({
      where: { matchday: { competitionId: { in: ids } } },
      select: { participantAId: true, participantBId: true, winnerId: true },
    }),
  ]);

  const porParticipante = new Map(participantes.map((p) => [p.id, p]));
  const bajasPorParticipante = new Map(
    bajas.map((fila) => [fila.participantId, fila._count._all]),
  );

  /**
   * Quién ganó cada edición. Sale de la llave que decide el locke según su
   * formato, contando su serie: es lo mismo que hace la pantalla del cuadro,
   * pero sin traerse la clasificación entera de cada edición.
   */
  const ficha = (id: string | null) => {
    const p = id ? porParticipante.get(id) : null;
    return p
      ? {
          displayName: p.displayName,
          color: p.color,
          avatarImage: p.user.avatarImage,
        }
      : null;
  };

  /** Qué cuenta ganó cada edición, para la tabla de personas de abajo */
  const campeonPorEdicion = new Map<string, string | null>();

  const ediciones: CampeonDeUnLocke[] = competiciones.map((competicion) => {
    const final = finales.find((fila) => fila.competitionId === competicion.id);
    const formato = final ? formatoParaJugadores(final.jugadores) : null;

    const { campeon, subcampeon } =
      final && formato
        ? campeonYSubcampeon(
            formato,
            final.seeds,
            new Map(final.matches.map((m) => [m.key, m.winnerId])),
          )
        : { campeon: null, subcampeon: null };

    campeonPorEdicion.set(
      competicion.id,
      campeon ? (porParticipante.get(campeon)?.userId ?? null) : null,
    );

    return {
      competitionId: competicion.id,
      nombre: competicion.name,
      game: competicion.game,
      startedAt: competicion.startedAt,
      terminado: Boolean(campeon),
      campeon: ficha(campeon),
      subcampeon: ficha(subcampeon),
    };
  });

  /** Las cuentas van por **cuenta de usuario**, no por participante: el mote
   * cambia de una edición a otra y la persona es la misma. */
  const gente = new Map<string, FilaDelPalmares>();
  const deLaPersona = (userId: string, p: (typeof participantes)[number]) => {
    if (!gente.has(userId)) {
      gente.set(userId, {
        userId,
        displayName: p.displayName,
        color: p.color,
        avatarImage: p.user.avatarImage,
        lockes: 0,
        ganados: 0,
        victorias: 0,
        derrotas: 0,
        bajas: 0,
      });
    }
    return gente.get(userId)!;
  };

  for (const p of participantes) {
    const fila = deLaPersona(p.userId, p);
    fila.lockes += 1;
    fila.bajas += bajasPorParticipante.get(p.id) ?? 0;
    if (campeonPorEdicion.get(p.competitionId) === p.userId) fila.ganados += 1;
  }

  for (const combate of combates) {
    if (!combate.winnerId) continue;
    const ganador = porParticipante.get(combate.winnerId);
    const perdedorId =
      combate.winnerId === combate.participantAId
        ? combate.participantBId
        : combate.participantAId;
    const perdedor = porParticipante.get(perdedorId);
    if (ganador) deLaPersona(ganador.userId, ganador).victorias += 1;
    if (perdedor) deLaPersona(perdedor.userId, perdedor).derrotas += 1;
  }

  return {
    ediciones: ediciones.sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    ),
    gente: [...gente.values()].sort(
      (a, b) =>
        b.ganados - a.ganados ||
        b.victorias - a.victorias ||
        a.displayName.localeCompare(b.displayName, "es"),
    ),
  };
}
