import "server-only";
import { prisma } from "@/lib/db";
import { getMyParticipant } from "@/lib/competition";
import { puedeVotarElMvp } from "@/lib/wipeos";

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
   * El participante se pide **aquí dentro y a la vez** que las marcas de
   * visita. Antes lo pasaba el layout ya resuelto, así que esto no empezaba
   * hasta que aquello volvía: una ida y vuelta de más en todas las pantallas.
   * `getMyParticipant` va con `cache()`, así que pedirlo otra vez no es otro
   * viaje —es el mismo que ya está en el aire—.
   */
  const [yo, marcas] = await Promise.all([
    getMyParticipant(competitionId, userId),
    prisma.tabSeen.findMany({
      where: { userId, competitionId },
      select: { tab: true, seenAt: true },
    }),
  ]);

  const participantId = yo?.id ?? null;
  /**
   * Si le toca votar al MVP. El que se retiró no vota, y sin esto se quedaría
   * con el punto ámbar de "tienes algo que hacer" encendido **para siempre**,
   * porque lo que lo apaga es justamente votar. Ver `lib/wipeos.ts`.
   */
  const puedeVotar = yo ? puedeVotarElMvp(yo) : false;
  const desde = (tab: PestanaConAviso) =>
    marcas.find((marca) => marca.tab === tab)?.seenAt ?? EPOCA;

  const combatesDesde = desde("Combates");
  const edicionDesde = desde("La edición");
  const loMioDesde = desde("Lo mío");
  const reglasDesde = desde("Reglas");
  // En SQL no hay "sin participante": se usa un id que no existe y las
  // subconsultas suyas se quedan vacías solas.
  const miId = participantId ?? "";
  /** El mismo truco para el voto: si no votas, la subconsulta se queda vacía */
  const votante = puedeVotar ? miId : "";

  const [fila] = await prisma.$queryRaw<
    { combates: boolean; edicion: boolean; lomio: boolean; reglas: boolean }[]
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
             AND ${votante} <> ''
             AND EXISTS (SELECT 1 FROM "Match" mt
                          JOIN "MatchPokemon" mp ON mp."matchId" = mt.id
                         WHERE mt."matchdayId" = md.id)
             AND NOT EXISTS (SELECT 1 FROM "MvpVote" v
                              WHERE v."matchdayId" = md.id
                                AND v."voterId" = ${votante})
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
                 WHERE "participantId" = ${miId}
                   AND "updatedAt" > ${loMioDesde})
      ) AS lomio,
      (
        -- Una regla que ha cambiado con el locke en marcha. La de quien la
        -- cambió no cuenta: ya sabe lo que ha escrito.
        EXISTS (SELECT 1 FROM "RuleSection"
                 WHERE "competitionId" = ${competitionId}
                   AND "cambiadaAt" > ${reglasDesde}
                   AND "cambiadaPorId" IS DISTINCT FROM ${userId})
      ) AS reglas
  `;

  /**
   * Las peticiones de locke en solitario sin responder avisan al administrador
   * en "La edición", que es donde vive Administración.
   *
   * **Este punto no se apaga por mirar la pestaña**, igual que el del MVP por
   * votar: no es algo que ver, es algo que hacer. Se va cuando la petición se
   * acepta o se rechaza, que es cuando de verdad está resuelta. Va aparte de la
   * consulta grande porque solo le hace falta a los administradores y es un
   * `count` de nada.
   */
  const peticiones =
    esAdmin &&
    (await prisma.lockeRequest.count({ where: { estado: "PENDIENTE" } })) > 0;

  const reglas = Boolean(fila?.reglas);
  return {
    Combates: Boolean(fila?.combates),
    // Reglas vive en "La edición": su punto enciende también el del grupo, o
    // desde fuera no habría forma de enterarse
    "La edición": Boolean(fila?.edicion) || peticiones || reglas,
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
