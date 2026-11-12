import "server-only";
import { prisma } from "@/lib/db";
import { getZonasMasMortiferas } from "@/lib/mapas";
import { getMvpStates } from "@/lib/mvp";
import { primerosEnPasar } from "@/lib/coronas";
import { getCampeonDelLocke } from "@/lib/campeon";
import { cuandoSeGanoPorJornadas, getMarcador } from "@/lib/marcador";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getLigaEnCooperativo } from "@/lib/soul-link";
import { LEVEL_CAP_KINDS } from "@/lib/constants";

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
  /** Quién llegó primero a más gimnasios (la corona de los level caps) */
  masCoronas: { displayName: string; color: string; cuantas: number } | null;
  /**
   * La causa de muerte que más se repite, tal y como se escribió la primera
   * vez. Solo si se repite de verdad: una causa suelta no es una tendencia.
   */
  causaMasRepetida: { texto: string; veces: number } | null;
  /** Cuánta gente jugó: con uno solo, "el que más" no compite con nadie */
  jugadores: number;
};

export async function getResumenDelLocke(
  competitionId: string,
): Promise<ResumenDelLocke> {
  const [competition, jornadas, combates, retos, bajasPorJugador, wipeos, zonas, marcas, causas] =
    await Promise.all([
      prisma.competition.findUnique({
        where: { id: competitionId },
        select: { startedAt: true },
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
      prisma.gymClear.findMany({
        where: { levelCap: { competitionId } },
        select: { participantId: true, levelCapId: true, clearedAt: true },
      }),
      prisma.death.findMany({
        where: { participant: { competitionId }, cause: { not: null } },
        select: { cause: true },
        orderBy: { createdAt: "asc" },
      }),
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

  // Coronas: cuántos gimnasios pasó cada uno antes que nadie
  const coronasPorJugador = new Map<string, number>();
  for (const quienes of primerosEnPasar(marcas).values()) {
    for (const id of quienes) {
      coronasPorJugador.set(id, (coronasPorJugador.get(id) ?? 0) + 1);
    }
  }
  const coronas = elQueMas(coronasPorJugador, (a, b) => b - a);

  /**
   * La causa más repetida. Se compara sin mayúsculas ni espacios de más
   * ("Crítico de Scyther" y "crítico de scyther " son la misma), pero se
   * enseña como la escribió el primero.
   */
  const porCausa = new Map<string, { texto: string; veces: number }>();
  for (const { cause } of causas) {
    const texto = cause!.trim();
    if (!texto) continue;
    const clave = texto.toLocaleLowerCase("es").replace(/\s+/g, " ");
    const cuenta = porCausa.get(clave) ?? { texto, veces: 0 };
    cuenta.veces += 1;
    porCausa.set(clave, cuenta);
  }
  const causa = [...porCausa.values()].sort((a, b) => b.veces - a.veces)[0];

  const mas = elQueMas(bajas, (a, b) => b - a);
  const menos = elQueMas(bajas, (a, b) => a - b);
  const mvp = elQueMas(mvpsPorJugador, (a, b) => b - a);

  /**
   * Cuándo se jugó lo último. Manda la fecha de cierre si la hay; si no, el
   * último combate o el último gimnasio, que es lo que de verdad pasó. Los
   * gimnasios cuentan porque en solitario no hay combates: sin ellos, un locke
   * de una persona no sabía cuánto había durado.
   */
  const jugados = [
    ...combates.map((combate) => combate.playedAt),
    ...marcas.map((marca) => marca.clearedAt),
  ].filter((fecha): fecha is Date => fecha !== null);
  const ultimo = jugados.length
    ? new Date(Math.max(...jugados.map((fecha) => fecha.getTime())))
    : null;
  const desde = competition?.startedAt ?? new Date();
  /**
   * **Un locke dura hasta que tiene ganador**, no hasta que se archiva: antes
   * mandaba la fecha de archivarlo, y reabrirlo y volver a cerrarlo lo alargaba
   * hasta ese día. Sin ganador todavía, hasta lo último que se jugó.
   */
  const hasta = (await cuandoSeDecidio(competitionId)) ?? ultimo;

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
    masCoronas: coronas && coronas.cuantas > 0 ? coronas : null,
    causaMasRepetida: causa && causa.veces >= 2 ? causa : null,
    jugadores: participantes.length,
  };
}

/**
 * Cuándo se decidió quién ganaba el locke, según cómo se ganó (ver
 * `lib/campeon.ts`): el último combate de la final, la jornada que dio la
 * mayoría en un dualocke, la marcha del penúltimo que quedaba o, en solitario,
 * el día que se pasó la Liga. Null si todavía no hay ganador.
 */
async function cuandoSeDecidio(competitionId: string): Promise<Date | null> {
  const competicion = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { maxPlayers: true, estilo: true },
  });
  if (!competicion) return null;

  const perfil = perfilDeLocke(competicion.maxPlayers, competicion.estilo);
  // En un Soul Link, el día que se la pasó el último de los que siguen
  if (perfil.cooperativo) return (await getLigaEnCooperativo(competitionId)).cuando;
  if (perfil.enSolitario) {
    const liga = await prisma.gymClear.findFirst({
      where: { levelCap: { competitionId, kind: LEVEL_CAP_KINDS.CHAMPION } },
      orderBy: { clearedAt: "asc" },
      select: { clearedAt: true },
    });
    return liga?.clearedAt ?? null;
  }

  const ganador = await getCampeonDelLocke(competitionId);
  if (!ganador) return null;

  if (ganador.como === "final") {
    const ultimo = await prisma.finalMatch.findFirst({
      where: { finalFour: { competitionId }, winnerId: { not: null }, playedAt: { not: null } },
      orderBy: { playedAt: "desc" },
      select: { playedAt: true },
    });
    return ultimo?.playedAt ?? null;
  }

  if (ganador.como === "abandono") {
    const ultimoEnIrse = await prisma.participant.findFirst({
      where: { competitionId, retiredAt: { not: null } },
      orderBy: { retiredAt: "desc" },
      select: { retiredAt: true },
    });
    return ultimoEnIrse?.retiredAt ?? null;
  }

  // Pasándose el juego: cuando se pasó la Liga el último de los dos que la tienen
  if (ganador.como === "juego") {
    const liga = await prisma.gymClear.findFirst({
      where: { levelCap: { competitionId, kind: LEVEL_CAP_KINDS.CHAMPION } },
      orderBy: { clearedAt: "desc" },
      select: { clearedAt: true },
    });
    return liga?.clearedAt ?? null;
  }

  // Por mayoría de jornadas, en el dualocke
  const [marcador, jornadas] = await Promise.all([
    getMarcador(competitionId),
    prisma.matchday.findMany({
      where: { competitionId },
      select: { matches: { select: { winnerId: true, playedAt: true } } },
    }),
  ]);
  return cuandoSeGanoPorJornadas(jornadas, ganador.champion.participantId, marcador.hacenFalta);
}
