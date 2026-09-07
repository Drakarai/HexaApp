import "server-only";
import { prisma } from "@/lib/db";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";

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

  const alMejorDe = perfilDeLocke(jornada.competition.maxPlayers).serieAlMejorDe;
  if (!alMejorDe) return;

  const hacenFalta = Math.ceil(alMejorDe / 2);
  const combates = jornada.matches;
  if (!combates.length) return;

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

  // Sobra: alguien ya la tiene ganada y queda un combate sin jugar
  if (decidida) {
    const deMas = combates.filter((combate) => !combate.winnerId);
    if (deMas.length) {
      await prisma.match.deleteMany({
        where: { id: { in: deMas.map((combate) => combate.id) } },
      });
    }
    return;
  }

  // Falta: están todos jugados, nadie la ha ganado y la serie da para más
  if (sinJugar === 0 && combates.length < alMejorDe) {
    const primero = combates[0];
    await prisma.match.create({
      data: {
        matchdayId: jornada.id,
        participantAId: primero.participantAId,
        participantBId: primero.participantBId,
        position: combates.length,
      },
    });
  }
}
