import "server-only";
import { prisma } from "@/lib/db";

/**
 * Las peticiones para abrir un locke en solitario.
 *
 * Crear ediciones sigue siendo cosa de administradores —si no, el selector de
 * competiciones acabaría lleno de pruebas a medias—, pero un locke de una
 * persona no le quita el sitio a nadie. Así que cualquiera lo pide desde la
 * aplicación y el administrador lo acepta o lo rechaza con un botón, en vez de
 * ir a buscarle por WhatsApp.
 */

export const ESTADOS_DE_SOLICITUD = {
  PENDIENTE: "PENDIENTE",
  ACEPTADA: "ACEPTADA",
  RECHAZADA: "RECHAZADA",
} as const;

/** Las que están esperando respuesta, para el panel del administrador. */
export async function getSolicitudesPendientes() {
  return prisma.lockeRequest.findMany({
    where: { estado: ESTADOS_DE_SOLICITUD.PENDIENTE },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, displayName: true, username: true } },
    },
  });
}

/** Cuántas hay esperando. Es lo único que hace falta para el punto de aviso. */
export async function cuantasSolicitudesPendientes() {
  return prisma.lockeRequest.count({
    where: { estado: ESTADOS_DE_SOLICITUD.PENDIENTE },
  });
}

/**
 * Las de una persona, para que vea en qué quedaron las suyas. Se enseñan
 * también las rechazadas con el motivo: enterarse de que te han dicho que no
 * es parte de haberlo pedido.
 */
export async function getMisSolicitudes(userId: string) {
  return prisma.lockeRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
