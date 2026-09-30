import "server-only";
import { prisma } from "@/lib/db";
import { MOTIVOS_DE_SALIDA } from "@/lib/wipeos";
import { ESTADOS_DE_SOLICITUD } from "@/lib/solicitudes";

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

/**
 * Los apartados que llevan **su propio** punto, además del de su grupo. Hasta
 * ahora el aviso era solo de grupo, y para una regla cambiada no basta: el
 * punto de "La edición" se apaga al entrar en la clasificación, y la regla se
 * quedaba sin leer. Cada uno apunta su visita aparte, con el rótulo del menú
 * como nombre, y se apaga solo al entrar en él.
 */
export const APARTADOS_CON_AVISO = { "/reglas": "Reglas" } as const;

type ApartadoConAviso = (typeof APARTADOS_CON_AVISO)[keyof typeof APARTADOS_CON_AVISO];
export type PestanaConAviso =
  | (typeof PESTANAS_CON_AVISO)[number]
  | ApartadoConAviso;

export type Avisos = Record<string, boolean>;

/**
 * Cuando alguien no ha mirado nunca una pestaña se cuenta desde el principio
 * de los tiempos: la primera vez, todo lo que haya es nuevo para él.
 */
const EPOCA = new Date(0);

export async function getAvisos({
  userId,
  competitionId,
  esAdmin = false,
}: {
  userId: string;
  competitionId: string;
  /** Administrador global: a él además le avisan las peticiones sin responder */
  esAdmin?: boolean;
}): Promise<Avisos> {
  /**
   * **Una sola ida y vuelta.** Antes eran tres en fila: el participante y las
   * marcas de visita, luego esta consulta con lo que devolvían, y luego el
   * recuento de peticiones para el administrador. Ahora las tres cosas van
   * dentro, como subconsultas: quién eres (`yo`), desde cuándo mirar cada
   * pestaña (`desde`) y si hay peticiones.
   *
   * Sin participante (quien administra sin jugar) `yo` sale vacía, y todo lo
   * que la compara se queda en falso solo, igual que antes con el id vacío.
   *
   * Si le toca votar al MVP: el que se retiró no vota, y sin esto se quedaría
   * con el punto ámbar de "tienes algo que hacer" encendido **para siempre**,
   * porque lo que lo apaga es justamente votar. Es `puedeVotarElMvp`, dicho en
   * SQL (ver `lib/wipeos.ts`).
   */
  const [fila] = await prisma.$queryRaw<
    { combates: boolean; edicion: boolean; lomio: boolean; reglas: boolean; peticiones: boolean }[]
  >`
    WITH yo AS (
      SELECT id,
             ("retiredAt" IS NULL OR "motivoDeSalida" = ${MOTIVOS_DE_SALIDA.WIPEO}) AS vota
        FROM "Participant"
       WHERE "competitionId" = ${competitionId} AND "userId" = ${userId}
       LIMIT 1
    ),
    desde AS (
      SELECT
        COALESCE(MAX("seenAt") FILTER (WHERE tab = 'Combates'), ${EPOCA}) AS combates,
        COALESCE(MAX("seenAt") FILTER (WHERE tab = 'La edición'), ${EPOCA}) AS edicion,
        COALESCE(MAX("seenAt") FILTER (WHERE tab = 'Lo mío'), ${EPOCA}) AS lomio,
        COALESCE(MAX("seenAt") FILTER (WHERE tab = 'Reglas'), ${EPOCA}) AS reglas
      FROM "TabSeen"
      WHERE "userId" = ${userId} AND "competitionId" = ${competitionId}
    )
    SELECT
      (
        -- Jornada o reto nuevos
        EXISTS (SELECT 1 FROM "Matchday"
                 WHERE "competitionId" = ${competitionId}
                   AND "createdAt" > (SELECT combates FROM desde))
        OR EXISTS (SELECT 1 FROM "ChallengeMatch"
                    WHERE "competitionId" = ${competitionId}
                      AND "createdAt" > (SELECT combates FROM desde))
        -- Un combate resuelto: el punto que reparte deja su rastro con fecha
        OR EXISTS (SELECT 1 FROM "PointEntry"
                    WHERE "competitionId" = ${competitionId}
                      AND "sourceMatchId" IS NOT NULL
                      AND "createdAt" > (SELECT combates FROM desde))
        -- Un MVP que te toca votar. Este no se va por mirar: es algo que
        -- tienes que hacer, y se apaga cuando votas.
        OR EXISTS (
          SELECT 1 FROM "Matchday" md, yo
           WHERE md."competitionId" = ${competitionId}
             AND yo.vota
             AND EXISTS (SELECT 1 FROM "Match" mt
                          JOIN "MatchPokemon" mp ON mp."matchId" = mt.id
                         WHERE mt."matchdayId" = md.id)
             AND NOT EXISTS (SELECT 1 FROM "MvpVote" v
                              WHERE v."matchdayId" = md.id
                                AND v."voterId" = yo.id)
        )
      ) AS combates,
      (
        -- Lo que han hecho **los demás**: de lo tuyo ya te has enterado tú
        EXISTS (SELECT 1 FROM "Death" d
                  JOIN "Participant" p ON p.id = d."participantId"
                 WHERE p."competitionId" = ${competitionId}
                   AND p."userId" <> ${userId}
                   AND d."createdAt" > (SELECT edicion FROM desde))
        OR EXISTS (SELECT 1 FROM "PointEntry" pe
                     JOIN "Participant" p ON p.id = pe."participantId"
                    WHERE pe."competitionId" = ${competitionId}
                      AND p."userId" <> ${userId}
                      AND pe."createdAt" > (SELECT edicion FROM desde))
        OR EXISTS (SELECT 1 FROM "GymClear" g
                     JOIN "Participant" p ON p.id = g."participantId"
                    WHERE p."competitionId" = ${competitionId}
                      AND p."userId" <> ${userId}
                      AND g."clearedAt" > (SELECT edicion FROM desde))
      ) AS edicion,
      (
        -- Lo único de "Lo mío" que cambia sin que lo toques tú: la bolsa, que
        -- la llena la organización
        EXISTS (SELECT 1 FROM "BagEntry" b, yo
                 WHERE b."participantId" = yo.id
                   AND b."updatedAt" > (SELECT lomio FROM desde))
      ) AS lomio,
      (
        -- Una regla que ha cambiado con el locke en marcha. La de quien la
        -- cambió no cuenta: ya sabe lo que ha escrito.
        EXISTS (SELECT 1 FROM "RuleSection"
                 WHERE "competitionId" = ${competitionId}
                   AND "cambiadaAt" > (SELECT reglas FROM desde)
                   AND "cambiadaPorId" IS DISTINCT FROM ${userId})
      ) AS reglas,
      (
        -- Las peticiones de locke sin responder, solo para el administrador
        ${esAdmin} AND EXISTS (SELECT 1 FROM "LockeRequest"
                                WHERE estado = ${ESTADOS_DE_SOLICITUD.PENDIENTE})
      ) AS peticiones
  `;

  /**
   * Las peticiones avisan al administrador en "La edición", que es donde vive
   * Administración. **Ese punto no se apaga por mirar la pestaña**, igual que el
   * del MVP por votar: no es algo que ver, es algo que hacer. Se va cuando la
   * petición se acepta o se rechaza, que es cuando de verdad está resuelta.
   */
  const reglas = Boolean(fila?.reglas);
  return {
    Combates: Boolean(fila?.combates),
    // Reglas vive en "La edición": su punto enciende también el del grupo, o
    // desde fuera no habría forma de enterarse
    "La edición": Boolean(fila?.edicion) || Boolean(fila?.peticiones) || reglas,
    "Lo mío": Boolean(fila?.lomio),
    Reglas: reglas,
  };
}

/** Apunta que alguien acaba de mirar una pestaña. */
export async function marcarVista(
  userId: string,
  competitionId: string,
  tab: string,
) {
  const validas: string[] = [
    ...PESTANAS_CON_AVISO,
    ...Object.values(APARTADOS_CON_AVISO),
  ];
  if (!validas.includes(tab)) return;
  const ahora = new Date();
  await prisma.tabSeen.upsert({
    where: { userId_competitionId_tab: { userId, competitionId, tab } },
    create: { userId, competitionId, tab, seenAt: ahora },
    update: { seenAt: ahora },
  });
}
