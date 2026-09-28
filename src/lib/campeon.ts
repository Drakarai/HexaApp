import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getFinalFourState, type BracketPlayer, type FinalFourState } from "@/lib/final-four";
import { getMarcador, type Marcador } from "@/lib/marcador";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";

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
 */

export type CampeonDelLocke = {
  champion: BracketPlayer;
  runnerUp: BracketPlayer | null;
  como: "jornadas" | "abandono" | "final";
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
  estado?: FinalFourState,
): Promise<CampeonDelLocke | null> {
  const [state, competition] = await Promise.all([
    estado ?? getFinalFourState(competitionId),
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { maxPlayers: true },
    }),
  ]);

  const esDual =
    competition !== null && perfilDeLocke(competition.maxPlayers).victoria === "jornadas";
  return decidirCampeon(state, esDual ? await getMarcador(competitionId) : null);
});

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
