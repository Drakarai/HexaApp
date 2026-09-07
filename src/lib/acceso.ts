import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin, type CurrentUser } from "@/lib/auth";

/**
 * Quién puede abrir un locke y quién puede tocarlo.
 *
 * La regla es que **una edición no se ve por defecto**: hasta ahora cualquier
 * cuenta nueva entraba y se leía los Hexalockes de los demás enteros —muertes,
 * puntos, perfiles—, y eso no es lo que se quiere de un grupo privado. Un locke
 * lo ven:
 *
 * - sus **jugadores**, los de ahora y los de antes (basta con tener ficha de
 *   participante, aunque esté retirado: lo que jugó sigue siendo suyo),
 * - los **administradores globales**,
 * - y los **espectadores** a los que un administrador les haya dado ese locke
 *   en concreto (`Spectator`), que miran y no tocan nada.
 *
 * El filtro se aplica en `getActiveCompetition` y `listCompetitions`, que son
 * por donde pasan todas las páginas: así una sección nueva nace protegida sin
 * tener que acordarse de nada.
 */

/** Qué es alguien dentro de un locke concreto. */
export type Acceso = "ADMIN" | "JUGADOR" | "ESPECTADOR" | "NADA";

/**
 * Trozo de `where` que deja solo los lockes que esa persona puede abrir.
 *
 * Se devuelve como filtro y no como lista de identificadores para que la base
 * de datos haga el cruce en la misma consulta: traerse antes "sus lockes" sería
 * un viaje de ida y vuelta más en cada página, y de eso ya se habló.
 */
export function filtroDeLockesVisibles(
  user: CurrentUser | null,
): Prisma.CompetitionWhereInput {
  if (!user) return { id: { in: [] } };
  // Un administrador global los ve todos: no hace falta filtrar nada
  if (isAdmin(user)) return {};
  return {
    OR: [
      { participants: { some: { userId: user.id } } },
      { espectadores: { some: { userId: user.id } } },
    ],
  };
}

/**
 * Qué es el usuario actual dentro de un locke. Cacheada por petición porque la
 * preguntan varias piezas de la misma página (el menú, la cabecera, la propia
 * sección).
 */
export const getAcceso = cache(async (competitionId: string): Promise<Acceso> => {
  const user = await getCurrentUser();
  if (!user) return "NADA";
  if (isAdmin(user)) return "ADMIN";

  const [participante, espectador] = await Promise.all([
    prisma.participant.count({
      where: { competitionId, userId: user.id },
    }),
    prisma.spectator.count({ where: { competitionId, userId: user.id } }),
  ]);

  if (participante) return "JUGADOR";
  if (espectador) return "ESPECTADOR";
  return "NADA";
});

/** ¿Puede al menos mirar este locke? */
export async function puedeVerLocke(competitionId: string) {
  return (await getAcceso(competitionId)) !== "NADA";
}

/**
 * Para las **acciones** que escriben algo de un locke: hay que jugarlo o
 * administrarlo. Un espectador no pasa de aquí, y quien no tiene nada que ver
 * con la edición tampoco.
 *
 * No sustituye a los permisos de cada cosa —seguir comprobando que una nota es
 * tuya o que solo un administrador crea jornadas—, es el portero de la puerta.
 */
export async function assertPuedeTocarLocke(competitionId: string) {
  const acceso = await getAcceso(competitionId);
  if (acceso === "ADMIN" || acceso === "JUGADOR") return acceso;
  if (acceso === "ESPECTADOR") {
    throw new Error("Estás como espectador en este locke: solo puedes mirar.");
  }
  throw new Error("No tienes acceso a esta competición.");
}
