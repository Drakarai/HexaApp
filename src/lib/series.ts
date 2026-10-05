import "server-only";
import { prisma } from "@/lib/db";
import { alMejorDeDeLaJornada, perfilDeLocke } from "@/lib/perfiles-de-locke";

/**
 * El desempate de una jornada que es una serie al mejor de tres (el dualocke).
 *
 * Una serie al mejor de tres son **dos combates o tres**, según cómo vayan: si
 * alguien gana los dos primeros, el tercero no se juega. Por eso la jornada
 * nace con dos y el desempate se añade **solo cuando hace falta**, en vez de
 * crear los tres de entrada y dejar uno de adorno que la mitad de las veces se
 * queda sin jugar.
 *
 * Se llama después de tocar cualquier resultado de la jornada, y se ocupa de
 * los dos sentidos: crea el desempate si la serie está empatada y lo quita si
 * se corrige un resultado y deja de hacer falta. Nunca borra un combate que ya
 * se haya jugado.
 */
export async function ajustarDesempate(matchdayId: string) {
  const jornada = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: {
      id: true,
      alMejorDe: true,
      competition: { select: { maxPlayers: true } },
      matches: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          winnerId: true,
          participantAId: true,
          participantBId: true,
          position: true,
        },
      },
    },
  });
  if (!jornada) return;

  // La de esta jornada: en un dualocke se elige entre un combate y al mejor de tres
  const alMejorDe = alMejorDeDeLaJornada(jornada.alMejorDe, perfilDeLocke(jornada.competition.maxPlayers));
  if (alMejorDe <= 1) return;

  const { borrar, crear } = queHacerConElDesempate(jornada.matches, alMejorDe);

  // Sobra: alguien ya la tiene ganada y queda un combate sin jugar
  if (borrar.length) {
    await prisma.match.deleteMany({ where: { id: { in: borrar } } });
  }

  // Falta: están todos jugados, nadie la ha ganado y la serie da para más
  if (crear) {
    await prisma.match.create({ data: { matchdayId: jornada.id, ...crear } });
  }
}

/**
 * La cuenta de `ajustarDesempate`, sin tocar la base de datos: qué combates
 * sobran y si hace falta el siguiente. Suelta para poder probarla.
 */
export function queHacerConElDesempate(
  combates: {
    id: string;
    winnerId: string | null;
    participantAId: string;
    participantBId: string;
  }[],
  alMejorDe: number,
): {
  borrar: string[];
  crear: { participantAId: string; participantBId: string; position: number } | null;
} {
  const hacenFalta = Math.ceil(alMejorDe / 2);
  if (!combates.length) return { borrar: [], crear: null };

  const victorias = new Map<string, number>();
  let sinJugar = 0;
  for (const combate of combates) {
    if (!combate.winnerId) {
      sinJugar += 1;
      continue;
    }
    victorias.set(combate.winnerId, (victorias.get(combate.winnerId) ?? 0) + 1);
  }
  const decidida = [...victorias.values()].some((cuantas) => cuantas >= hacenFalta);

  if (decidida) {
    return {
      borrar: combates.filter((combate) => !combate.winnerId).map((combate) => combate.id),
      crear: null,
    };
  }

  if (sinJugar === 0 && combates.length < alMejorDe) {
    const primero = combates[0];
    return {
      borrar: [],
      crear: {
        participantAId: primero.participantAId,
        participantBId: primero.participantBId,
        position: combates.length,
      },
    };
  }
  return { borrar: [], crear: null };
}
