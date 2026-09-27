import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getTitulosEquipados, type TituloPuesto } from "@/lib/titulos";
import { getCurrentUser, esCreador, type CurrentUser } from "@/lib/auth";
import { filtroDeLockesVisibles } from "@/lib/acceso";
import { firmasDeDosImagenes, urlsDeImagen } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { COMPETITION_STATUS } from "@/lib/constants";

export const COMPETITION_COOKIE = "hexaapp_competition";

export type StandingRow = {
  participantId: string;
  userId: string;
  displayName: string;
  gameVersion: string | null;
  color: string;
  avatarImage: string | null;
  isAdmin: boolean;
  ace: {
    species: string | null;
    nickname: string | null;
    reason: string | null;
    /** Direcciones, no imágenes: ver lib/imagen-url.ts */
    image: string | null;
    detailImage: string | null;
  };
  points: number;
  deaths: number;
  /** Cuántas veces le han barrido el equipo */
  wipeos: number;
  /** Por qué está fuera, si lo está: ver lib/wipeos.ts */
  motivoDeSalida: string | null;
  wins: number;
  losses: number;
  played: number;
  pokemonDiff: number;
  /** Su puesto entre los que siguen jugando; 0 si se retiró */
  position: number;
  /** Se retiró del locke: sale tachado y al final, y no ocupa puesto */
  retirado: boolean;
  /**
   * Cuándo se fue, si se fue. Hace falta para ordenar el hall de la fama: de
   * los que no llegaron al final, arriba el que aguantó más.
   */
  retiredAt: Date | null;
  /** El que lleva puesto, si lleva alguno. Es solo adorno. */
  title: TituloPuesto | null;
};

/**
 * Competición sobre la que se está trabajando: la guardada en cookie si sigue
 * existiendo, si no la última activa, y como último recurso la más reciente.
 *
 * **Solo entre las que esa persona puede ver** (`lib/acceso.ts`). Este es el
 * cuello de botella por el que pasan todas las páginas, así que filtrar aquí es
 * lo que hace que una edición ajena no se pueda abrir ni escribiendo su
 * identificador en la cookie a mano.
 */
export const getActiveCompetition = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const visibles = filtroDeLockesVisibles(user);

  const store = await cookies();
  const preferredId = store.get(COMPETITION_COOKIE)?.value;

  if (preferredId) {
    const preferred = await prisma.competition.findFirst({
      where: { AND: [{ id: preferredId }, visibles] },
    });
    if (preferred) return preferred;
  }

  return (
    (await prisma.competition.findFirst({
      where: { AND: [{ status: COMPETITION_STATUS.ACTIVE }, visibles] },
      orderBy: { startedAt: "desc" },
    })) ??
    (await prisma.competition.findFirst({
      where: visibles,
      orderBy: { createdAt: "desc" },
    }))
  );
});

/** Las ediciones que esa persona puede abrir, para el selector y el histórico. */
export const listCompetitions = cache(async () => {
  const user = await getCurrentUser();
  return prisma.competition.findMany({
    where: filtroDeLockesVisibles(user),
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    include: { _count: { select: { participants: true } } },
  });
});

/**
 * Participantes con las **direcciones** de sus imágenes, no las imágenes: los
 * bytes se quedan en la base de datos y el navegador se los pide aparte una
 * sola vez. Ver lib/imagen-url.ts.
 */
export const getParticipants = cache(async (competitionId: string) => {
  const participantes = await prisma.participant.findMany({
    where: { competitionId },
    orderBy: { displayName: "asc" },
    include: {
      user: { select: { id: true, username: true, role: true } },
    },
  });

  // Dos consultas en vez de tres: las dos imágenes del as salen juntas porque
  // son de la misma tabla. Cada consulta es un viaje a la base de datos.
  const [avatares, [firmasAs, firmasAsFicha]] = await Promise.all([
    urlsDeImagen(
      "avatar",
      participantes.map((p) => p.userId),
    ),
    firmasDeDosImagenes(
      "as",
      "as-ficha",
      participantes.map((p) => p.id),
    ),
  ]);

  return participantes.map((participante) => ({
    ...participante,
    aceImage: urlDeImagen("as", participante.id, firmasAs.get(participante.id)),
    /** La ilustración grande del as, para su ficha */
    aceDetailImage: urlDeImagen(
      "as-ficha",
      participante.id,
      firmasAsFicha.get(participante.id),
    ),
    user: { ...participante.user, avatarImage: avatares(participante.userId) },
  }));
});

/**
 * Los que siguen jugando: sin los retirados.
 *
 * Es lo que hay que usar para todo lo que hace avanzar al grupo —los gimnasios
 * que hay que superar, contra quién se puede emparejar—, porque esperar a
 * alguien que se ha ido bloquea al resto. Para enseñar lo que ya pasó se sigue
 * usando `getParticipants`, con todos.
 *
 * **Para votar el MVP no vale**: ahí sí votan los que perdieron el locke, y eso
 * se pregunta con `puedeVotarElMvp()` (ver `lib/wipeos.ts`).
 */
export function soloActivos<T extends { retiredAt: Date | null }>(
  participantes: T[],
) {
  return participantes.filter((participante) => !participante.retiredAt);
}

/**
 * Participante del usuario actual dentro de una competición (null si sólo mira).
 */
export const getMyParticipant = cache(
  async (competitionId: string, userId: string) =>
    prisma.participant.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
    }),
);

/**
 * Puede gestionar quien sea Creador o administrador de esa competición.
 *
 * **Estar fuera del locke no quita el mando**, ni por retirarse ni por perderlo
 * en un wipeo: se mira la ficha de participante y su marca de administrador, y
 * no `retiredAt`. Es a propósito —quien organiza suele jugar, y que un wipeo le
 * dejara sin poder emparejar la jornada siguiente sería absurdo—, así que si
 * algún día se filtra por "los que siguen jugando" aquí o en
 * `getMyParticipant`, esto se rompe sin que salte nada.
 */
export async function canManageCompetition(
  competitionId: string,
  user: CurrentUser | null,
) {
  if (!user) return false;
  if (esCreador(user)) return true;
  const participant = await getMyParticipant(competitionId, user.id);
  return Boolean(participant?.isAdmin);
}

export async function requireCompetitionManager(competitionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tienes que iniciar sesión.");
  const allowed = await canManageCompetition(competitionId, user);
  if (!allowed) {
    throw new Error("Solo los administradores pueden hacer esto.");
  }
  return user;
}

/**
 * Saldo de tickets por jugador y ruleta: un ticket vale solo para la ruleta
 * para la que se dio. Se devuelve todo junto para poder pintar de una vez el
 * saldo de cada ruleta en la lista.
 */
export async function getTicketBalances(competitionId: string) {
  const sums = await prisma.rouletteTicket.groupBy({
    by: ["participantId", "rouletteId"],
    where: { competitionId, rouletteId: { not: null } },
    _sum: { delta: true },
  });

  const byRoulette = new Map<string, Map<string, number>>();
  for (const row of sums) {
    if (!row.rouletteId) continue;
    const forThis = byRoulette.get(row.rouletteId) ?? new Map<string, number>();
    forThis.set(row.participantId, row._sum.delta ?? 0);
    byRoulette.set(row.rouletteId, forThis);
  }

  return {
    /** Saldo de un jugador en una ruleta concreta */
    get: (participantId: string, rouletteId: string) =>
      byRoulette.get(rouletteId)?.get(participantId) ?? 0,
    /** Saldos de todos los jugadores en una ruleta */
    forRoulette: (rouletteId: string) =>
      byRoulette.get(rouletteId) ?? new Map<string, number>(),
  };
}

/**
 * Comprueba que el usuario puede actuar en nombre de un participante:
 * o es él mismo, o es administrador (global o de la competición).
 */
export async function assertCanActForParticipant(participantId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tienes que iniciar sesión.");

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant) throw new Error("Participante no encontrado.");

  const mando = await canManageCompetition(participant.competitionId, user);
  if (participant.userId !== user.id && !mando) {
    throw new Error("No puedes modificar los datos de otro jugador.");
  }
  // Lo tuyo sí, pero no en una edición archivada, salvo que la lleves tú
  if (!mando) await assertEdicionAbierta(participant.competitionId);
  return { user, participant };
}

export const MENSAJE_EDICION_ARCHIVADA =
  "Esta edición está archivada: se puede mirar, pero ya no se apunta nada. Si hay que corregir algo, pídeselo a quien la administra.";

/**
 * Una edición archivada es **de solo lectura para los jugadores**. Se conserva
 * entera, que es lo que se decidió, pero antes se podía seguir tocando todo, y
 * quien cambiaba de edición sin fijarse acababa apuntando una baja o una
 * captura en la que no era. Quien la administra sí puede, para corregir algo
 * que se quedó mal al cerrarla.
 *
 * Se comprueba **en cada acción** de las que hace un jugador, no escondiendo
 * botones: la cola sin conexión y cualquier formulario viejo llegan igual.
 * Quien llama ya ha decidido que no administra; aquí solo se mira la edición.
 */
export async function assertEdicionAbierta(competitionId: string) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { status: true },
  });
  if (competition?.status === COMPETITION_STATUS.ARCHIVED) {
    throw new Error(MENSAJE_EDICION_ARCHIVADA);
  }
}

/**
 * Lo mismo pero con la comprobación de quién manda dentro, para las acciones
 * que no pasan por `assertCanActForParticipant`: si administra, puede.
 */
export async function assertPuedeApuntarEn(competitionId: string, user: CurrentUser) {
  if (await canManageCompetition(competitionId, user)) return;
  await assertEdicionAbierta(competitionId);
}

/**
 * Para las acciones que no devuelven nada y, si algo no cuadra, simplemente no
 * hacen nada: dice si la edición está cerrada para esta persona.
 */
export async function edicionCerradaPara(competitionId: string, user: CurrentUser) {
  try {
    await assertPuedeApuntarEn(competitionId, user);
    return false;
  } catch {
    return true;
  }
}

/**
 * Clasificación completa. Desempates según las reglas del locke:
 * 1) más puntos, 2) menos pokémon muertos, 3) mejor diferencia de pokémon
 * en los combates de jornada.
 *
 * Va con `cache()` porque **hay pantallas que la piden dos veces**: la del
 * final y el hall de la fama la usan ellas y además la pide por dentro
 * `getFinalFourState`. Son seis consultas cada vez, así que repetirla contra
 * una base de datos que está en internet se nota.
 */
export const getStandings = cache(async (
  competitionId: string,
): Promise<StandingRow[]> => {
  /**
   * La competición va **dentro** del grupo y no antes: pidiéndola suelta, las
   * otras seis consultas esperaban a que volviera, y contra una base de datos
   * que está en internet eso es una ida y vuelta entera de más para leer dos
   * números. Ninguna de las demás la necesita.
   */
  const [competition, participants, pointSums, deathCounts, wipeoCounts, matches, challenges] =
    await Promise.all([
      prisma.competition.findUnique({
        where: { id: competitionId },
        select: { startingPoints: true, challengeDiffCounts: true },
      }),
      getParticipants(competitionId),
      prisma.pointEntry.groupBy({
        by: ["participantId"],
        where: { competitionId },
        _sum: { delta: true },
      }),
      prisma.death.groupBy({
        by: ["participantId"],
        where: { participant: { competitionId } },
        _count: { _all: true },
      }),
      prisma.wipeo.groupBy({
        by: ["participantId"],
        where: { participant: { competitionId } },
        _count: { _all: true },
      }),
      prisma.match.findMany({
        where: { matchday: { competitionId } },
        select: {
          participantAId: true,
          participantBId: true,
          winnerId: true,
          pokemonDiff: true,
        },
      }),
      prisma.challengeMatch.findMany({
        where: { competitionId, winnerId: { not: null } },
        select: {
          participantAId: true,
          participantBId: true,
          winnerId: true,
          pokemonDiff: true,
        },
      }),
    ]);

  const startingPoints = competition?.startingPoints ?? 0;

  const deltaByParticipant = new Map(
    pointSums.map((row) => [row.participantId, row._sum.delta ?? 0]),
  );
  const deathsByParticipant = new Map(
    deathCounts.map((row) => [row.participantId, row._count._all]),
  );
  const wipeosPorParticipante = new Map(
    wipeoCounts.map((row) => [row.participantId, row._count._all]),
  );

  const stats = new Map<
    string,
    { wins: number; losses: number; played: number; diff: number }
  >();
  const bump = (id: string) => {
    if (!stats.has(id)) stats.set(id, { wins: 0, losses: 0, played: 0, diff: 0 });
    return stats.get(id)!;
  };

  /**
   * Los retos suman victorias y derrotas igual que las jornadas, porque son
   * combates de verdad, pero **nunca dan puntos**. Su diferencia de pokémon
   * solo entra en el desempate si la edición lo tiene activado.
   */
  const apuntar = (
    combate: {
      participantAId: string;
      participantBId: string;
      winnerId: string | null;
      pokemonDiff: number | null;
    },
    cuentaLaDiferencia: boolean,
  ) => {
    if (!combate.winnerId) return;
    const perdedorId =
      combate.winnerId === combate.participantAId
        ? combate.participantBId
        : combate.participantAId;
    const ganador = bump(combate.winnerId);
    const perdedor = bump(perdedorId);
    ganador.wins += 1;
    ganador.played += 1;
    perdedor.losses += 1;
    perdedor.played += 1;
    if (!cuentaLaDiferencia) return;
    const diff = combate.pokemonDiff ?? 0;
    ganador.diff += diff;
    perdedor.diff -= diff;
  };

  for (const match of matches) apuntar(match, true);
  for (const reto of challenges) {
    apuntar(reto, competition?.challengeDiffCounts ?? false);
  }

  const titulos = await getTitulosEquipados(
    participants.map((participante) => participante.userId),
  );

  const rows = participants.map((participant) => {
    const stat = stats.get(participant.id) ?? {
      wins: 0,
      losses: 0,
      played: 0,
      diff: 0,
    };
    return {
      participantId: participant.id,
      userId: participant.userId,
      displayName: participant.displayName,
      gameVersion: participant.gameVersion,
      color: participant.color,
      avatarImage: participant.user.avatarImage,
      isAdmin: participant.isAdmin,
      ace: {
        species: participant.aceSpecies,
        nickname: participant.aceNickname,
        reason: participant.aceReason,
        image: participant.aceImage,
        detailImage: participant.aceDetailImage,
      },
      points: startingPoints + (deltaByParticipant.get(participant.id) ?? 0),
      deaths: deathsByParticipant.get(participant.id) ?? 0,
      wins: stat.wins,
      losses: stat.losses,
      played: stat.played,
      pokemonDiff: stat.diff,
      position: 0,
      retirado: participant.retiredAt !== null,
      retiredAt: participant.retiredAt,
      motivoDeSalida: participant.motivoDeSalida,
      wipeos: wipeosPorParticipante.get(participant.id) ?? 0,
      title: titulos.get(participant.userId) ?? null,
    };
  });

  /**
   * Los retirados van al final y **no ocupan puesto**. Si se quedaran en su
   * sitio, alguien que ya no juega saldría segundo y parecería clasificado
   * para la Final Four; el puesto tiene que decir algo de quien sigue.
   */
  rows.sort(
    (a, b) =>
      Number(a.retirado) - Number(b.retirado) ||
      b.points - a.points ||
      a.deaths - b.deaths ||
      b.pokemonDiff - a.pokemonDiff ||
      a.displayName.localeCompare(b.displayName, "es"),
  );

  let puesto = 0;
  return rows.map((row) => ({
    ...row,
    position: row.retirado ? 0 : ++puesto,
  }));
});
