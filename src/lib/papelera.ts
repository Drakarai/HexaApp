import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { borrarPuntosHuerfanos } from "@/lib/puntos-huerfanos";

/**
 * La papelera de jornadas. Al borrar una jornada se guarda **todo lo que se
 * lleva** —sus combates con sus equipos, sus royales con sus puestos, los votos
 * del MVP y los puntos que dio— y durante unos días se puede devolver tal cual,
 * con los mismos ids: así lo que apuntaba a ella (el desempate del MVP, los
 * puntos de cada combate) vuelve a cuadrar solo.
 */

export const DIAS_EN_LA_PAPELERA = 14;

type Copia = {
  jornada: Prisma.MatchdayGetPayload<object>;
  combates: Prisma.MatchGetPayload<object>[];
  royales: Prisma.RoyaleGetPayload<object>[];
  puestos: Prisma.RoyalePuestoGetPayload<object>[];
  equipos: Prisma.MatchPokemonGetPayload<object>[];
  votos: Prisma.MvpVoteGetPayload<object>[];
  puntos: Prisma.PointEntryGetPayload<object>[];
};

/** Borra una jornada guardándola antes en la papelera. Quien llama ya ha mirado los permisos. */
export async function borrarJornadaALaPapelera(matchdayId: string, quien: string) {
  const jornada = await prisma.matchday.findUnique({ where: { id: matchdayId } });
  if (!jornada) return null;

  const [combates, royales] = await Promise.all([
    // Con lo leído de las repeticiones, para no tener que volver a pedirlas
    prisma.match.findMany({ where: { matchdayId }, omit: { estadisticas: false } }),
    prisma.royale.findMany({ where: { matchdayId } }),
  ]);
  const idsCombates = combates.map((c) => c.id);
  const idsRoyales = royales.map((r) => r.id);
  const [puestos, equipos, votos, puntos] = await Promise.all([
    prisma.royalePuesto.findMany({ where: { royaleId: { in: idsRoyales } } }),
    prisma.matchPokemon.findMany({
      where: { OR: [{ matchId: { in: idsCombates } }, { royaleId: { in: idsRoyales } }] },
      // Las imágenes se omiten siempre (ver lib/db.ts), y aquí son justo lo que
      // no se puede perder: sin esto la jornada volvería con los equipos sin sprites
      omit: { boxImage: false, detailImage: false },
    }),
    prisma.mvpVote.findMany({ where: { matchdayId } }),
    prisma.pointEntry.findMany({
      where: { OR: [{ sourceMatchId: { in: idsCombates } }, { sourceRoyaleId: { in: idsRoyales } }] },
    }),
  ]);

  const copia: Copia = { jornada, combates, royales, puestos, equipos, votos, puntos };
  await prisma.$transaction([
    prisma.jornadaBorrada.create({
      data: {
        competitionId: jornada.competitionId,
        label: jornada.label,
        quien,
        // Las fechas viajan como texto y Prisma las vuelve a aceptar así al restaurar
        datos: JSON.parse(JSON.stringify(copia)) as Prisma.InputJsonValue,
      },
    }),
    prisma.matchday.delete({ where: { id: matchdayId } }),
  ]);
  // Los puntos de sus combates no se van solos con ellos: ver lib/puntos-huerfanos
  await borrarPuntosHuerfanos(jornada.competitionId);
  await vaciarLoCaducado();
  return jornada;
}

/** Lo que lleva más de DIAS_EN_LA_PAPELERA días, fuera */
export async function vaciarLoCaducado() {
  await prisma.jornadaBorrada.deleteMany({
    where: { borradaAt: { lt: new Date(Date.now() - DIAS_EN_LA_PAPELERA * 86_400_000) } },
  });
}

export async function getPapelera(competitionId: string) {
  return prisma.jornadaBorrada.findMany({
    where: {
      competitionId,
      borradaAt: { gte: new Date(Date.now() - DIAS_EN_LA_PAPELERA * 86_400_000) },
    },
    orderBy: { borradaAt: "desc" },
    select: { id: true, label: true, borradaAt: true, quien: true },
  });
}

/**
 * Devuelve una jornada de la papelera. Si alguien de los que jugaban ya no está
 * en el locke, no se puede: sus combates apuntarían a nadie. Se dice quién.
 */
export async function restaurarJornada(id: string): Promise<{ error?: string; label?: string }> {
  const borrada = await prisma.jornadaBorrada.findUnique({ where: { id } });
  if (!borrada) return { error: "Esa jornada ya no está en la papelera." };
  const c = borrada.datos as unknown as Copia;

  const implicados = new Set<string>([
    ...c.combates.flatMap((m) => [m.participantAId, m.participantBId]),
    ...c.puestos.map((p) => p.participantId),
    ...c.equipos.map((e) => e.participantId),
    ...c.votos.map((v) => v.voterId),
    ...c.puntos.map((p) => p.participantId),
  ]);
  const siguen = new Set(
    (
      await prisma.participant.findMany({
        where: { id: { in: [...implicados] }, competitionId: borrada.competitionId },
        select: { id: true },
      })
    ).map((p) => p.id),
  );
  if ([...implicados].some((p) => !siguen.has(p))) {
    return { error: "No se puede devolver: alguien que jugaba esa jornada ya no está en el locke." };
  }
  // Quien apuntó un punto puede haber borrado su cuenta: el punto se queda sin autor
  const autores = new Set(
    (
      await prisma.user.findMany({
        where: { id: { in: c.puntos.map((p) => p.createdById).filter((x): x is string => Boolean(x)) } },
        select: { id: true },
      })
    ).map((u) => u.id),
  );
  const { mvpTiebreakId, ...jornada } = c.jornada;
  // A qué pokémon de la caja apuntaba cada uno del equipo: si se borró mientras tanto, a ninguno
  const capturasQueSiguen = new Set(
    (
      await prisma.capture.findMany({
        where: { id: { in: c.equipos.map((e) => e.captureId).filter((x): x is string => Boolean(x)) } },
        select: { id: true },
      })
    ).map((x) => x.id),
  );

  await prisma.$transaction([
    prisma.matchday.create({ data: jornada }),
    // Lo leído de la repetición vuelve con el combate (un Json vacío se dice así en Prisma)
    prisma.match.createMany({
      data: c.combates.map((m) => ({ ...m, estadisticas: m.estadisticas ?? Prisma.JsonNull })),
    }),
    prisma.royale.createMany({ data: c.royales }),
    prisma.royalePuesto.createMany({ data: c.puestos }),
    prisma.matchPokemon.createMany({
      data: c.equipos.map((e) => ({ ...e, captureId: e.captureId && capturasQueSiguen.has(e.captureId) ? e.captureId : null })),
    }),
    prisma.mvpVote.createMany({ data: c.votos }),
    prisma.pointEntry.createMany({
      data: c.puntos.map((p) => ({ ...p, createdById: p.createdById && autores.has(p.createdById) ? p.createdById : null })),
      skipDuplicates: true,
    }),
    // El desempate del MVP apunta a un pokémon de la propia jornada: va al final
    ...(mvpTiebreakId
      ? [prisma.matchday.update({ where: { id: jornada.id }, data: { mvpTiebreakId } })]
      : []),
    prisma.jornadaBorrada.delete({ where: { id } }),
  ]);
  return { label: borrada.label };
}
