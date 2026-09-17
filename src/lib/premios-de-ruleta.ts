import "server-only";
import { prisma } from "@/lib/db";
import { ponerEnLaBolsa, quitarDeLaBolsa } from "@/lib/bolsa-entregas";

/**
 * Las casillas de la ruleta que reparten algo de verdad.
 *
 * Una ruleta servía para sortear texto ("monotipo la próxima ruta") y eso se
 * queda: hay sorteos que no son un premio. Encima de eso, una casilla puede
 * llevar **un objeto del catálogo de la bolsa** o **tickets de una ruleta**, y
 * entonces sale sola de la rueda a la bolsa o al saldo, como los premios de un
 * reto. Lo que no se hace solo se olvida.
 *
 * Quién se lo lleva depende de quién gira, y es la única regla que hay que
 * tener en la cabeza:
 *
 * - **Gira un jugador**: está gastando *su* ticket, así que la tirada es suya y
 *   el premio también. Cae solo.
 * - **Gira quien administra**: no gasta ticket de nadie, así que la tirada no
 *   es de nadie todavía. El premio queda **pendiente** y se elige a quién
 *   dárselo en el historial, que también sirve para corregirlo después.
 */

/** Lo que hay que saber de un giro para repartir su premio */
type GiroConPremio = {
  premioItemId: string | null;
  premioTicketsDeId: string | null;
  premioCantidad: number;
};

export function llevaPremio(giro: GiroConPremio) {
  return Boolean(giro.premioItemId || giro.premioTicketsDeId);
}

/**
 * Dicho en palabras, para el aviso del giro y para el historial.
 * `objeto` es el nombre del objeto y `ruleta` el de la ruleta de los tickets.
 */
export function describirPremio(
  giro: GiroConPremio & { objeto?: string | null; ruleta?: string | null },
) {
  const cuantos = Math.max(1, giro.premioCantidad);
  if (giro.premioItemId) {
    const nombre = giro.objeto ?? "un objeto";
    return cuantos > 1 ? `${cuantos} × ${nombre}` : nombre;
  }
  if (giro.premioTicketsDeId) {
    const donde = giro.ruleta ? ` de ${giro.ruleta}` : "";
    return `${cuantos} ${cuantos === 1 ? "ticket" : "tickets"}${donde}`;
  }
  return null;
}

/**
 * Le da el premio de un giro a alguien, y si ya se lo había llevado otro, se
 * lo quita primero. Es la misma idea que `sincronizarPremios` de los retos:
 * cambiar de dueño tiene que poder deshacerse, porque el caso que pasa de
 * verdad es darle a la persona equivocada y darse cuenta al momento.
 *
 * Con los tickets no se borra nada: el saldo es un historial de sumas y restas,
 * así que devolver uno es **otra fila en negativo** y queda dicho por qué.
 */
export async function entregarPremioDelGiro(
  spinId: string,
  /** A quién. `null` lo deja pendiente otra vez. */
  participantId: string | null,
  /** Quién lo está entregando, para el apunte del ticket */
  porQuienId: string | null,
) {
  const giro = await prisma.rouletteSpin.findUnique({
    where: { id: spinId },
    include: { roulette: { select: { name: true, competitionId: true } } },
  });
  if (!giro || !llevaPremio(giro)) return;
  if (giro.entregadoA === participantId) return;

  const cuantos = Math.max(1, giro.premioCantidad);
  const deDonde = `Premio de la ruleta ${giro.roulette.name}`;

  if (giro.entregadoA) {
    if (giro.premioItemId) {
      await quitarDeLaBolsa(giro.entregadoA, giro.premioItemId, cuantos);
    }
    if (giro.premioTicketsDeId) {
      await prisma.rouletteTicket.create({
        data: {
          competitionId: giro.roulette.competitionId,
          participantId: giro.entregadoA,
          delta: -cuantos,
          reason: `${deDonde}, que era de otro`,
          rouletteId: giro.premioTicketsDeId,
          createdById: porQuienId,
        },
      });
    }
  }

  if (participantId) {
    if (giro.premioItemId) {
      await ponerEnLaBolsa(participantId, giro.premioItemId, cuantos, deDonde);
    }
    if (giro.premioTicketsDeId) {
      await prisma.rouletteTicket.create({
        data: {
          competitionId: giro.roulette.competitionId,
          participantId,
          delta: cuantos,
          reason: deDonde,
          rouletteId: giro.premioTicketsDeId,
          createdById: porQuienId,
        },
      });
    }
  }

  await prisma.rouletteSpin.update({
    where: { id: spinId },
    data: { entregadoA: participantId },
  });
}
