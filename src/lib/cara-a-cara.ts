import "server-only";
import { prisma } from "@/lib/db";
import { getParticipants } from "@/lib/competition";

export type CaraACara = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** Veces que el jugador mirado le ha ganado */
  wins: number;
  /** Veces que ese rival le ha ganado al jugador mirado */
  losses: number;
};

export type ResumenDeCombates = {
  wins: number;
  losses: number;
  rivales: CaraACara[];
  /** A quien más veces ha ganado. "Varios" si hay empate arriba. */
  presa: { nombre: string; veces: number; varios: boolean } | null;
  /** Quien más veces le ha ganado. "Varios" si hay empate arriba. */
  bestiaNegra: { nombre: string; veces: number; varios: boolean } | null;
};

/**
 * Cómo le va a un jugador contra cada uno de los demás, juntando los combates
 * de jornada y los de reto: los dos son combates y los dos cuentan para el
 * historial de victorias y derrotas (los puntos son otra cosa).
 */
export async function getResumenDeCombates(
  competitionId: string,
  participantId: string,
): Promise<ResumenDeCombates> {
  const [jugadores, jornadas, retos] = await Promise.all([
    getParticipants(competitionId),
    prisma.match.findMany({
      where: {
        matchday: { competitionId },
        winnerId: { not: null },
        OR: [{ participantAId: participantId }, { participantBId: participantId }],
      },
      select: { participantAId: true, participantBId: true, winnerId: true },
    }),
    prisma.challengeMatch.findMany({
      where: {
        competitionId,
        winnerId: { not: null },
        OR: [{ participantAId: participantId }, { participantBId: participantId }],
      },
      select: { participantAId: true, participantBId: true, winnerId: true },
    }),
  ]);

  const marcador = new Map<string, { wins: number; losses: number }>();
  for (const rival of jugadores) {
    if (rival.id === participantId) continue;
    marcador.set(rival.id, { wins: 0, losses: 0 });
  }

  for (const combate of [...jornadas, ...retos]) {
    const rivalId =
      combate.participantAId === participantId
        ? combate.participantBId
        : combate.participantAId;
    const contra = marcador.get(rivalId);
    if (!contra) continue;
    if (combate.winnerId === participantId) contra.wins += 1;
    else contra.losses += 1;
  }

  const rivales: CaraACara[] = jugadores
    .filter((rival) => rival.id !== participantId)
    .map((rival) => ({
      participantId: rival.id,
      displayName: rival.displayName,
      color: rival.color,
      avatarImage: rival.user.avatarImage,
      wins: marcador.get(rival.id)?.wins ?? 0,
      losses: marcador.get(rival.id)?.losses ?? 0,
    }))
    // Primero contra quien más se ha jugado, que es lo interesante
    .sort(
      (a, b) =>
        b.wins + b.losses - (a.wins + a.losses) ||
        b.wins - a.wins ||
        a.displayName.localeCompare(b.displayName, "es"),
    );

  /** El mejor en una cuenta, o "Varios" si hay empate y no es cero. */
  const destacado = (valor: (r: CaraACara) => number) => {
    const veces = Math.max(0, ...rivales.map(valor));
    if (veces === 0) return null;
    const empatados = rivales.filter((rival) => valor(rival) === veces);
    return {
      nombre: empatados.length === 1 ? empatados[0].displayName : "Varios",
      veces,
      varios: empatados.length > 1,
    };
  };

  return {
    wins: rivales.reduce((suma, rival) => suma + rival.wins, 0),
    losses: rivales.reduce((suma, rival) => suma + rival.losses, 0),
    rivales,
    presa: destacado((rival) => rival.wins),
    bestiaNegra: destacado((rival) => rival.losses),
  };
}
