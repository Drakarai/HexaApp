import "server-only";
import { prisma } from "@/lib/db";
import { getZonasMasMortiferas } from "@/lib/mapas";
import { getMvpStates } from "@/lib/mvp";

/**
 * Las cifras de un locke entero, para cerrarlo en el hall de la fama.
 *
 * Todo esto ya estaba guardado y no se enseñaba junto en ningún sitio: cuánto
 * duró, cuántos cayeron, dónde se cebó y quién se llevó más MVPs. No se guarda
 * nada nuevo, se cuenta al mirarlo.
 *
 * Es una consulta **cara y de una sola pantalla**: se pide entera, con los MVPs
 * de todas las jornadas. Se puede porque el hall se abre una vez, al final; no
 * vale para la portada.
 */

export type ResumenDelLocke = {
  /** Cuándo empezó y cuándo se jugó lo último */
  desde: Date;
  hasta: Date | null;
  /** Días que duró, si se sabe cuándo acabó */
  dias: number | null;
  jornadas: number;
  combates: number;
  retos: number;
  bajas: number;
  /** Dónde se cebó el locke */
  zonaMasMortifera: { name: string; bajas: number } | null;
  /** Quién perdió más pokémon, que es un título por sí solo */
  masBajas: { displayName: string; color: string; cuantas: number } | null;
  /** Quién menos, de los que jugaron */
  menosBajas: { displayName: string; color: string; cuantas: number } | null;
  /** Quién se llevó más MVPs de jornada */
  masMvps: { displayName: string; color: string; cuantas: number } | null;
  /** Cuántos wipeos se comieron entre todos */
  wipeos: number;
};

export async function getResumenDelLocke(
  competitionId: string,
): Promise<ResumenDelLocke> {
  const [competition, jornadas, combates, retos, bajasPorJugador, wipeos, zonas] =
    await Promise.all([
      prisma.competition.findUnique({
        where: { id: competitionId },
        select: { startedAt: true, endedAt: true },
      }),
      prisma.matchday.findMany({
        where: { competitionId },
        select: { id: true },
        orderBy: { position: "asc" },
      }),
      prisma.match.findMany({
        where: { matchday: { competitionId } },
        select: { playedAt: true },
      }),
      prisma.challengeMatch.count({ where: { competitionId } }),
      prisma.death.groupBy({
        by: ["participantId"],
        where: { participant: { competitionId } },
        _count: { _all: true },
      }),
      prisma.wipeo.count({ where: { participant: { competitionId } } }),
      getZonasMasMortiferas(competitionId, 1),
    ]);

  const participantes = await prisma.participant.findMany({
    where: { competitionId },
    select: { id: true, displayName: true, color: true },
  });
  const porId = new Map(participantes.map((p) => [p.id, p]));

  /**
   * Los MVPs se calculan, no se guardan (ver `lib/mvp.ts`), así que hay que
   * pedir el estado de todas las jornadas y contar los ganadores.
   */
  const mvps = await getMvpStates(
    competitionId,
    jornadas.map((jornada) => jornada.id),
    null,
  );
  const mvpsPorJugador = new Map<string, number>();
  for (const estado of mvps.values()) {
    if (!estado.winner) continue;
    const dueno = estado.winner.ownerId;
    mvpsPorJugador.set(dueno, (mvpsPorJugador.get(dueno) ?? 0) + 1);
  }

  /** El que más de una cuenta, con su ficha. Null si no hay nada que contar. */
  const elQueMas = (
    cuentas: Map<string, number>,
    comparar: (a: number, b: number) => number,
  ) => {
    const ordenadas = [...cuentas.entries()]
      .filter(([id]) => porId.has(id))
      .sort((a, b) => comparar(a[1], b[1]));
    const primera = ordenadas[0];
    if (!primera) return null;
    const jugador = porId.get(primera[0])!;
    return {
      displayName: jugador.displayName,
      color: jugador.color,
      cuantas: primera[1],
    };
  };

  const bajas = new Map(
    bajasPorJugador.map((fila) => [fila.participantId, fila._count._all]),
  );
  // Los que no perdieron a nadie no salen del groupBy, y para "quien menos"
  // cuentan como cero: sin esto, el que acabó intacto no podría ganarlo
  for (const p of participantes) if (!bajas.has(p.id)) bajas.set(p.id, 0);

  const mas = elQueMas(bajas, (a, b) => b - a);
  const menos = elQueMas(bajas, (a, b) => a - b);
  const mvp = elQueMas(mvpsPorJugador, (a, b) => b - a);

  /**
   * Cuándo se jugó lo último. Manda la fecha de cierre si la hay; si no, el
   * último combate, que es lo que de verdad pasó.
   */
  const jugados = combates
    .map((combate) => combate.playedAt)
    .filter((fecha): fecha is Date => fecha !== null);
  const ultimo = jugados.length
    ? new Date(Math.max(...jugados.map((fecha) => fecha.getTime())))
    : null;
  const desde = competition?.startedAt ?? new Date();
  const hasta = competition?.endedAt ?? ultimo;

  return {
    desde,
    hasta,
    dias: hasta
      ? Math.max(
          1,
          Math.round((hasta.getTime() - desde.getTime()) / 86_400_000),
        )
      : null,
    jornadas: jornadas.length,
    combates: combates.length,
    retos,
    bajas: [...bajas.values()].reduce((suma, cuantas) => suma + cuantas, 0),
    zonaMasMortifera: zonas[0]
      ? { name: zonas[0].name, bajas: zonas[0].bajas }
      : null,
    masBajas: mas,
    menosBajas: menos,
    masMvps: mvp && mvp.cuantas > 0 ? mvp : null,
    wipeos,
  };
}
