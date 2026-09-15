import "server-only";
import { prisma } from "@/lib/db";

/**
 * Los combates que se ganan porque el otro se retiró del locke.
 *
 * **No se dan todos de golpe al retirar a alguien.** Cada uno se resuelve
 * cuando el resto de su jornada ya está jugada, igual que si se hubiera jugado
 * el último. Repartir de una vez los puntos de cinco jornadas dejaría la
 * clasificación adelantada respecto a lo que ha pasado de verdad, y el gráfico
 * de puestos jornada a jornada —que se dibuja con la fecha de cada punto— daría
 * un salto que no se corresponde con ninguna jornada.
 *
 * Mientras tanto el combate se queda sin ganador y se enseña como "pendiente
 * por retirada", para que se vea que está esperando y no olvidado.
 */

/**
 * Da por ganados los combates por retirada de las jornadas que ya estén
 * terminadas. Se llama al retirar a alguien y cada vez que se apunta un
 * resultado, que son los dos momentos en que una jornada puede completarse.
 *
 * Devuelve cuántos ha resuelto, para poder avisar.
 */
export async function resolverRetiradas(
  competitionId: string,
  autorId: string | null,
): Promise<number> {
  const retirados = new Set(
    (
      await prisma.participant.findMany({
        where: { competitionId, retiredAt: { not: null } },
        select: { id: true },
      })
    ).map((participante) => participante.id),
  );
  if (!retirados.size) return 0;

  const jornadas = await prisma.matchday.findMany({
    where: { competitionId },
    include: { matches: true },
  });

  let resueltos = 0;

  for (const jornada of jornadas) {
    const sinJugar = jornada.matches.filter((combate) => !combate.winnerId);
    if (!sinJugar.length) continue;

    const seRetiroUno = (combate: (typeof sinJugar)[number]) =>
      retirados.has(combate.participantAId) !== retirados.has(combate.participantBId);
    const seRetiraronLosDos = (combate: (typeof sinJugar)[number]) =>
      retirados.has(combate.participantAId) && retirados.has(combate.participantBId);

    /**
     * Los de la excepción no se dan por ganados: la organización ha dicho que
     * ese se juega, aunque uno de los dos esté fuera del locke.
     */
    const porRetirada = sinJugar.filter(
      (combate) => !combate.excepcion && seRetiroUno(combate),
    );
    if (!porRetirada.length) continue;

    /**
     * Lo que falta por jugar de verdad. Un combate entre dos retirados no
     * cuenta: no lo va a jugar nadie, así que no puede bloquear a los demás
     * para siempre. Ese se queda sin ganador, que es lo justo.
     */
    const faltanDeVerdad = sinJugar.filter(
      (combate) =>
        // Uno con permiso sí falta de verdad: lo van a jugar
        combate.excepcion ||
        (!seRetiroUno(combate) && !seRetiraronLosDos(combate)),
    ).length;
    if (faltanDeVerdad > 0) continue;

    for (const combate of porRetirada) {
      const ganadorId = retirados.has(combate.participantAId)
        ? combate.participantBId
        : combate.participantAId;
      const [ganador, perdedor] = await Promise.all([
        prisma.participant.findUnique({
          where: { id: ganadorId },
          select: { displayName: true },
        }),
        prisma.participant.findUnique({
          where: {
            id: retirados.has(combate.participantAId)
              ? combate.participantAId
              : combate.participantBId,
          },
          select: { displayName: true },
        }),
      ]);

      await prisma.match.update({
        where: { id: combate.id },
        data: { winnerId: ganadorId, porRetirada: true, playedAt: new Date() },
      });

      // El mismo punto que una victoria normal, con el mismo enlace al
      // combate, para que corregir el resultado luego siga funcionando
      const datos = {
        competitionId,
        participantId: ganadorId,
        delta: jornada.pointsForWin,
        reason: `${jornada.label}: victoria de ${ganador?.displayName ?? "?"} por retirada de ${perdedor?.displayName ?? "?"}`,
        createdById: autorId,
        sourceMatchId: combate.id,
      };
      const existente = await prisma.pointEntry.findUnique({
        where: { sourceMatchId: combate.id },
      });
      if (existente) {
        await prisma.pointEntry.update({ where: { id: existente.id }, data: datos });
      } else {
        await prisma.pointEntry.create({ data: datos });
      }
      resueltos += 1;
    }
  }

  return resueltos;
}

/**
 * Los combates que están esperando a que acabe su jornada para darse por
 * retirada, para poder enseñarlos como tales. Devuelve sus identificadores.
 */
export async function combatesEsperandoRetirada(
  competitionId: string,
): Promise<Set<string>> {
  const retirados = new Set(
    (
      await prisma.participant.findMany({
        where: { competitionId, retiredAt: { not: null } },
        select: { id: true },
      })
    ).map((participante) => participante.id),
  );
  if (!retirados.size) return new Set();

  const combates = await prisma.match.findMany({
    // Los de la excepción no esperan nada: se juegan
    where: { winnerId: null, excepcion: false, matchday: { competitionId } },
    select: { id: true, participantAId: true, participantBId: true },
  });

  return new Set(
    combates
      .filter(
        (combate) =>
          retirados.has(combate.participantAId) !==
          retirados.has(combate.participantBId),
      )
      .map((combate) => combate.id),
  );
}
