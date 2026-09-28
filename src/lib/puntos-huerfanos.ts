import "server-only";
import { prisma } from "@/lib/db";

/**
 * Los puntos automáticos cuyo combate ya no existe.
 *
 * Un punto por ganar un combate apunta a él con `sourceMatchId` (y el de un
 * royale con `sourceRoyaleId`), pero **sin clave ajena**: añadirla ahora haría
 * que `prisma db push` avisara de pérdida de datos y el despliegue se parara.
 * Así que borrar el combate por otro camino —borrar la jornada entera, quitar a
 * un jugador del locke, borrar su cuenta— dejaba el punto vivo. Se veía en la
 * tabla: la victoria desaparecía del V-D pero el punto seguía sumando, y como es
 * automático ni siquiera salía el botón de borrarlo a mano.
 *
 * Se llama después de cada uno de esos borrados, y de paso limpia los que ya
 * hubieran quedado de antes.
 */
export async function borrarPuntosHuerfanos(competitionId: string) {
  return prisma.$executeRaw`
    DELETE FROM "PointEntry" p
    WHERE p."competitionId" = ${competitionId}
      AND (
        (p."sourceMatchId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Match" m WHERE m.id = p."sourceMatchId"))
        OR
        (p."sourceRoyaleId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Royale" r WHERE r.id = p."sourceRoyaleId"))
      )
  `;
}
