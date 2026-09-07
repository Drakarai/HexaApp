import "server-only";
import { prisma } from "@/lib/db";
import { LEVEL_CAP_KINDS } from "@/lib/constants";

/**
 * Quién se ha pasado la Liga Pokémon entera.
 *
 * Es la **otra** forma de ganar un locke: ganar el juego. No tiene nada que ver
 * con ganar los combates —se puede terminar la Liga y haber perdido todas las
 * jornadas, y al revés— y pueden conseguirlo varios, así que no es un puesto
 * sino una lista.
 *
 * **No se guarda en ningún sitio nuevo**: se deduce de que esa persona tenga
 * marcado el level cap de tipo `CHAMPION`, que es el que ya representa la Liga.
 * Un dato calculado no se puede desincronizar de la marca de la que sale, que
 * es la misma razón por la que el MVP tampoco se guarda.
 */
export type CampeonDeLiga = {
  participantId: string;
  displayName: string;
  color: string;
  retirado: boolean;
  /** Cuándo la superó */
  cuando: Date;
};

export async function getCampeonesDeLiga(
  competitionId: string,
): Promise<CampeonDeLiga[]> {
  const marcas = await prisma.gymClear.findMany({
    where: {
      levelCap: { competitionId, kind: LEVEL_CAP_KINDS.CHAMPION },
      participant: { competitionId },
    },
    orderBy: { clearedAt: "asc" },
    include: {
      participant: {
        select: {
          id: true,
          displayName: true,
          color: true,
          retiredAt: true,
        },
      },
    },
  });

  // Una edición puede tener más de un hito de tipo "Campeón" (el Alto Mando y
  // la Liga, por ejemplo): vale con la primera vez que alguien pasa uno.
  const porJugador = new Map<string, CampeonDeLiga>();
  for (const marca of marcas) {
    if (porJugador.has(marca.participantId)) continue;
    porJugador.set(marca.participantId, {
      participantId: marca.participantId,
      displayName: marca.participant.displayName,
      color: marca.participant.color,
      retirado: marca.participant.retiredAt !== null,
      cuando: marca.clearedAt,
    });
  }

  return [...porJugador.values()];
}
