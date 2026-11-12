import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getFinalFourState, type BracketPlayer, type FinalFourState } from "@/lib/final-four";
import { getMarcador, type Marcador } from "@/lib/marcador";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getLigaEnCooperativo } from "@/lib/soul-link";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { LEVEL_CAP_KINDS } from "@/lib/constants";
import { campeonPorElJuego, type JugadorDelDual } from "@/lib/campeon-por-el-juego";

/**
 * Quién ha ganado el locke. **Todas las pantallas lo preguntan aquí** —portada,
 * hall, cuadro, imagen del resumen y las acciones del hall— para que ninguna
 * diga un campeón distinto de las demás.
 *
 * Sale de tres sitios, en este orden:
 *
 * 1. **Por jornadas**, en el dualocke: gana el primero que se lleve la mayoría
 *    de las jornadas previstas (4 de 6, 4 de 7). Así lo quiso el grupo: la
 *    Jornada Final es **el desempate**, no la que decide. Si hay mayoría, la
 *    final se puede jugar igual —por el honor—, pero no cambia el campeón.
 * 2. **Por abandono**: solo queda uno en pie (ver `POR_ABANDONO`).
 * 3. **Por la final**: el ganador del cuadro. En el dualocke solo cuenta
 *    cuando las jornadas acabaron empatadas, que es cuando se llega a ella sin
 *    campeón.
 *
 * Salvo en un dualocke con **«las jornadas dan el título» apagado** en
 * Ajustes: ahí manda pasarse el juego (ver lib/campeon-por-el-juego.ts) y las
 * jornadas solo desempatan.
 */

export type CampeonDelLocke = {
  champion: BracketPlayer;
  runnerUp: BracketPlayer | null;
  como: "jornadas" | "abandono" | "final" | "juego";
  /** Ganado pasándose el juego (`como: "juego"`): los wipeos de cada uno y qué desempató */
  porElJuego?: { wipeos: number; wipeosDelOtro: number; desempate: "wipeos" | "jornadas" };
  /** Ganado por jornadas: el marcador, "4-2" */
  jornadas?: { ganadas: number; perdidas: number };
  /**
   * Ya hay campeón, pero el locke sigue: en el dualocke ganado por mayoría
   * quedan jornadas o la final por jugar. La portada no lo da por terminado.
   */
  quedaPorJugar: boolean;
};

export const getCampeonDelLocke = cache(async function getCampeonDelLocke(
  competitionId: string,
  /** El estado del final, si ya se tiene o ya se ha pedido (puede no haber llegado) */
  estado?: FinalFourState | Promise<FinalFourState>,
): Promise<CampeonDelLocke | null> {
  const [state, competition] = await Promise.all([
    estado ?? getFinalFourState(competitionId),
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { maxPlayers: true, estilo: true, jornadasDanTitulo: true },
    }),
  ]);

  const perfil = competition ? perfilDeLocke(competition.maxPlayers, competition.estilo) : null;
  // En un Soul Link no hay campeón: se gana entre todos (ver lib/soul-link.ts)
  if (perfil?.cooperativo) return null;
  const esDual = perfil?.victoria === "jornadas";
  if (esDual && competition && !competition.jornadasDanTitulo) {
    return campeonDelDualPorElJuego(competitionId, state);
  }
  return decidirCampeon(state, esDual ? await getMarcador(competitionId) : null);
});

/** El dualocke en el que manda pasarse el juego: junta lo que hace falta y decide */
async function campeonDelDualPorElJuego(
  competitionId: string,
  state: FinalFourState,
): Promise<CampeonDelLocke | null> {
  const [marcador, jugadores, ligas, wipeos] = await Promise.all([
    getMarcador(competitionId),
    prisma.participant.findMany({
      where: { competitionId },
      select: { id: true, retiredAt: true },
    }),
    prisma.gymClear.findMany({
      where: { levelCap: { competitionId, kind: LEVEL_CAP_KINDS.CHAMPION } },
      select: { participantId: true },
    }),
    prisma.wipeo.groupBy({
      by: ["participantId"],
      where: { participant: { competitionId } },
      _count: { _all: true },
    }),
  ]);
  const conLiga = new Set(ligas.map((l) => l.participantId));
  const cuantosWipeos = new Map(wipeos.map((w) => [w.participantId, w._count._all]));
  const delDual: JugadorDelDual[] = jugadores.map((j) => ({
    id: j.id,
    fuera: Boolean(j.retiredAt),
    ligaPasada: conLiga.has(j.id),
    wipeos: cuantosWipeos.get(j.id) ?? 0,
    jornadas: marcador.jugadores.find((m) => m.participantId === j.id)?.ganadas ?? 0,
  }));
  const resultado = campeonPorElJuego(delDual, marcador.campeonId);
  if (!resultado) return null;
  // Igualados en todo: la Jornada Final, como en cualquier dualocke
  if (resultado.tipo === "final") return decidirCampeon(state, null);

  const ficha = (id: string, seed: number): BracketPlayer | null => {
    const j = marcador.jugadores.find((m) => m.participantId === id);
    return j
      ? { participantId: j.participantId, displayName: j.displayName, color: j.color, avatarImage: j.avatarImage, seed }
      : null;
  };
  const champion = ficha(resultado.campeonId, 1);
  if (!champion) return null;
  const runnerUp = ficha(resultado.otroId, 2);
  if (resultado.tipo === "abandono") {
    // Como en cualquier abandono, el podio es solo él (ver `POR_ABANDONO`)
    return { champion, runnerUp: null, como: "abandono", quedaPorJugar: false };
  }
  return {
    champion,
    runnerUp,
    como: "juego",
    porElJuego: {
      wipeos: cuantosWipeos.get(resultado.campeonId) ?? 0,
      wipeosDelOtro: cuantosWipeos.get(resultado.otroId) ?? 0,
      desempate: resultado.desempate,
    },
    quedaPorJugar: false,
  };
}

/**
 * La cuenta de `getCampeonDelLocke`, sin tocar la base de datos. `marcador`
 * solo va en un dualocke: sin él, manda la final. Suelta para poder probarla.
 */
export function decidirCampeon(
  state: FinalFourState,
  marcador: Marcador | null,
): CampeonDelLocke | null {
  if (marcador) {
    const ganador = marcador.jugadores.find((j) => j.participantId === marcador.campeonId);
    if (ganador) {
      const otro = marcador.jugadores.find((j) => j.participantId !== ganador.participantId);
      const ficha = (j: typeof ganador, seed: number): BracketPlayer => ({
        participantId: j.participantId,
        displayName: j.displayName,
        color: j.color,
        avatarImage: j.avatarImage,
        seed,
      });
      return {
        champion: ficha(ganador, 1),
        runnerUp: otro ? ficha(otro, 2) : null,
        como: "jornadas",
        jornadas: { ganadas: ganador.ganadas, perdidas: otro?.ganadas ?? 0 },
        quedaPorJugar:
          state.status !== "TERMINADA" &&
          state.status !== "POR_ABANDONO" &&
          state.status !== "POCA_GENTE",
      };
    }
  }

  if (state.status === "POR_ABANDONO") {
    return { champion: state.champion, runnerUp: null, como: "abandono", quedaPorJugar: false };
  }
  if (state.status === "TERMINADA" && state.champion) {
    return {
      champion: state.champion,
      runnerUp: state.runnerUp,
      como: "final",
      quedaPorJugar: false,
    };
  }
  return null;
}

/**
 * Si el locke se ha acabado, que es cuando se abre el hall de la fama. No
 * siempre es tener campeón: en solitario es pasarse la Liga, y en un Soul Link
 * que se la pasen todos los que siguen. Las acciones del hall preguntaban solo
 * por el campeón y en esos dos no dejaban apuntar el equipo.
 */
export async function lockeTerminado(competitionId: string): Promise<boolean> {
  const competicion = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { maxPlayers: true, estilo: true },
  });
  if (!competicion) return false;
  const perfil = perfilDeLocke(competicion.maxPlayers, competicion.estilo);
  if (perfil.cooperativo) return (await getLigaEnCooperativo(competitionId)).superada;
  if (perfil.enSolitario) return Boolean((await getProgresoEnSolitario(competitionId))?.ligaSuperada);
  return Boolean(await getCampeonDelLocke(competitionId));
}
