import "server-only";
import { prisma } from "@/lib/db";

/**
 * El punto de "hay algo nuevo aquí" de las pestañas.
 *
 * No hay tabla de novedades ni nada marcado como leído pieza a pieza: se
 * guarda **cuándo miraste cada pestaña por última vez** (`TabSeen`) y lo nuevo
 * se deduce comparando esa fecha con la de lo que ha pasado. Así no puede
 * desincronizarse de los datos de verdad y no hay nada que limpiar.
 *
 * Todo se resuelve en **una sola consulta** con `EXISTS`: esto corre en el
 * layout, o sea en cada página que se abre, y contra una base de datos en
 * internet cada viaje de ida y vuelta se nota. Aquí no interesa cuánto hay
 * nuevo, solo si hay algo, y `EXISTS` para en cuanto encuentra la primera fila.
 */

/** Los grupos del menú que pueden llevar aviso. Los demás no tienen novedades. */
export const PESTANAS_CON_AVISO = ["Combates", "La edición", "Lo mío"] as const;
export type PestanaConAviso = (typeof PESTANAS_CON_AVISO)[number];

export type Avisos = Record<string, boolean>;

/**
 * Cuando alguien no ha mirado nunca una pestaña se cuenta desde el principio
 * de los tiempos: la primera vez, todo lo que haya es nuevo para él.
 */
const EPOCA = new Date(0);

export async function getAvisos({
  userId,
  competitionId,
  participantId,
}: {
  userId: string;
  competitionId: string;
  /** Su participante en esta edición, o null si no la juega */
  participantId: string | null;
}): Promise<Avisos> {
  const marcas = await prisma.tabSeen.findMany({
    where: { userId, competitionId },
    select: { tab: true, seenAt: true },
  });
  const desde = (tab: PestanaConAviso) =>
    marcas.find((marca) => marca.tab === tab)?.seenAt ?? EPOCA;

  const combatesDesde = desde("Combates");
  const edicionDesde = desde("La edición");
  const loMioDesde = desde("Lo mío");
  // En SQL no hay "sin participante": se usa un id que no existe y las
  // subconsultas suyas se quedan vacías solas.
  const yo = participantId ?? "";

  const [fila] = await prisma.$queryRaw<
    { combates: boolean; edicion: boolean; lomio: boolean }[]
  >`
    SELECT
      (
        -- Jornada o reto nuevos
        EXISTS (SELECT 1 FROM "Matchday"
                 WHERE "competitionId" = ${competitionId}
                   AND "createdAt" > ${combatesDesde})
        OR EXISTS (SELECT 1 FROM "ChallengeMatch"
                    WHERE "competitionId" = ${competitionId}
                      AND "createdAt" > ${combatesDesde})
        -- Un combate resuelto: el punto que reparte deja su rastro con fecha
        OR EXISTS (SELECT 1 FROM "PointEntry"
                    WHERE "competitionId" = ${competitionId}
                      AND "sourceMatchId" IS NOT NULL
                      AND "createdAt" > ${combatesDesde})
        -- Un MVP que te toca votar. Este no se va por mirar: es algo que
        -- tienes que hacer, y se apaga cuando votas.
        OR EXISTS (
          SELECT 1 FROM "Matchday" md
           WHERE md."competitionId" = ${competitionId}
             AND ${yo} <> ''
             AND EXISTS (SELECT 1 FROM "Match" mt
                          JOIN "MatchPokemon" mp ON mp."matchId" = mt.id
                         WHERE mt."matchdayId" = md.id)
             AND NOT EXISTS (SELECT 1 FROM "MvpVote" v
                              WHERE v."matchdayId" = md.id
                                AND v."voterId" = ${yo})
        )
      ) AS combates,
      (
        -- Lo que han hecho **los demás**: de lo tuyo ya te has enterado tú
        EXISTS (SELECT 1 FROM "Death" d
                  JOIN "Participant" p ON p.id = d."participantId"
                 WHERE p."competitionId" = ${competitionId}
                   AND p."userId" <> ${userId}
                   AND d."createdAt" > ${edicionDesde})
        OR EXISTS (SELECT 1 FROM "PointEntry" pe
                     JOIN "Participant" p ON p.id = pe."participantId"
                    WHERE pe."competitionId" = ${competitionId}
                      AND p."userId" <> ${userId}
                      AND pe."createdAt" > ${edicionDesde})
        OR EXISTS (SELECT 1 FROM "GymClear" g
                     JOIN "Participant" p ON p.id = g."participantId"
                    WHERE p."competitionId" = ${competitionId}
                      AND p."userId" <> ${userId}
                      AND g."clearedAt" > ${edicionDesde})
      ) AS edicion,
      (
        -- Lo único de "Lo mío" que cambia sin que lo toques tú: la bolsa, que
        -- la llena la organización
        EXISTS (SELECT 1 FROM "BagEntry"
                 WHERE "participantId" = ${yo}
                   AND "updatedAt" > ${loMioDesde})
      ) AS lomio
  `;

  return {
    Combates: Boolean(fila?.combates),
    "La edición": Boolean(fila?.edicion),
    "Lo mío": Boolean(fila?.lomio),
  };
}

/** Apunta que alguien acaba de mirar una pestaña. */
export async function marcarVista(
  userId: string,
  competitionId: string,
  tab: string,
) {
  if (!PESTANAS_CON_AVISO.includes(tab as PestanaConAviso)) return;
  const ahora = new Date();
  await prisma.tabSeen.upsert({
    where: { userId_competitionId_tab: { userId, competitionId, tab } },
    create: { userId, competitionId, tab, seenAt: ahora },
    update: { seenAt: ahora },
  });
}
