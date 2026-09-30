import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getTitulosEquipadosDelLocke, type TituloPuesto } from "@/lib/titulos";
import { getCurrentUser, esCreador, type CurrentUser } from "@/lib/auth";
import { readSession } from "@/lib/session";
import { filtroDeLockesVisibles } from "@/lib/acceso";
import { firmaDeColumna } from "@/lib/imagenes";
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
  const store = await cookies();
  const preferredId = store.get(COMPETITION_COOKIE)?.value;
  const sesion = preferredId ? await readSession() : null;

  /**
   * La elegida se pide **a la vez que la cuenta**, y no después: es la
   * segunda ida y vuelta de todas las pantallas, y solo esperaba para saber
   * quién mira. El id viene en la propia sesión (sin base de datos), así que
   * se trae el locke con dos recuentos —si juega en él y si lo mira de
   * espectador— y cuando llega la cuenta se aplica **la misma regla** que
   * `filtroDeLockesVisibles`: el Creador lo ve todo, y los demás, si juegan o
   * miran. Si no puede verlo o no existe, se sigue como siempre.
   */
  const [user, preferida] = await Promise.all([
    getCurrentUser(),
    preferredId && sesion
      ? prisma.competition.findUnique({
          where: { id: preferredId },
          include: {
            _count: {
              select: {
                participants: { where: { userId: sesion.userId } },
                espectadores: { where: { userId: sesion.userId } },
              },
            },
          },
        })
      : null,
  ]);
  if (!user) return null;
  if (preferida && user.id === sesion?.userId) {
    const { _count, ...competicion } = preferida;
    if (esCreador(user) || _count.participants > 0 || _count.espectadores > 0) {
      return competicion;
    }
  }

  const visibles = filtroDeLockesVisibles(user);

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
  const sesion = await readSession();
  if (!sesion) return [];
  /**
   * Como `getActiveCompetition`: **a la vez que la cuenta**. Se traen todas con
   * dos marcas —si juega y si mira— y la regla de `filtroDeLockesVisibles` se
   * aplica al llegar la cuenta: el Creador las ve todas; los demás, las suyas.
   */
  const [user, todas] = await Promise.all([
    getCurrentUser(),
    prisma.competition.findMany({
      // El `id` desempata dos que empezaron a la vez, que si no Postgres los
      // devuelve en cualquier orden y el selector bailaría de una carga a otra.
      orderBy: [{ status: "asc" }, { startedAt: "desc" }, { id: "asc" }],
      include: {
        _count: { select: { participants: true } },
        participants: { where: { userId: sesion.userId }, select: { id: true }, take: 1 },
        espectadores: { where: { userId: sesion.userId }, select: { id: true }, take: 1 },
      },
    }),
  ]);
  if (!user || user.id !== sesion.userId) return [];
  const creador = esCreador(user);
  return todas
    .filter((c) => creador || c.participants.length > 0 || c.espectadores.length > 0)
    .map(({ participants: _juega, espectadores: _mira, ...competicion }) => competicion);
});

/**
 * Participantes con las **direcciones** de sus imágenes, no las imágenes: los
 * bytes se quedan en la base de datos y el navegador se los pide aparte una
 * sola vez. Ver lib/imagen-url.ts.
 */
export const getParticipants = cache(async (competitionId: string) => {
  /**
   * Los participantes y las firmas de sus tres imágenes (avatar, as y su
   * ilustración) **a la vez**. Antes las firmas se pedían después, con los ids
   * de los participantes: una ida y vuelta más en casi todas las pantallas,
   * porque casi todas pintan jugadores. Filtrando por el locke no hace falta
   * esperar a tener los ids.
   */
  const [participantes, firmas] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId },
      orderBy: { displayName: "asc" },
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
    }),
    prisma.$queryRaw<
      { id: string; avatar: string | null; as: string | null; asFicha: string | null }[]
    >`
      select p."id",
             ${firmaDeColumna(`u."avatarImage"`)} as "avatar",
             ${firmaDeColumna(`p."aceImage"`)} as "as",
             ${firmaDeColumna(`p."aceDetailImage"`)} as "asFicha"
      from "Participant" p
      join "User" u on u."id" = p."userId"
      where p."competitionId" = ${competitionId}
    `,
  ]);
  const firmaDe = new Map(firmas.map((fila) => [fila.id, fila]));

  return participantes.map((participante) => {
    const suyas = firmaDe.get(participante.id);
    return {
      ...participante,
      aceImage: urlDeImagen("as", participante.id, suyas?.as),
      /** La ilustración grande del as, para su ficha */
      aceDetailImage: urlDeImagen("as-ficha", participante.id, suyas?.asFicha),
      user: {
        ...participante.user,
        avatarImage: urlDeImagen("avatar", participante.userId, suyas?.avatar),
      },
    };
  });
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

/**
 * Para las pantallas: la edición está archivada y quien mira no la administra,
 * así que no se le enseñan los formularios de apuntar. Es solo la cara visible
 * de `assertEdicionAbierta`: la comprobación de verdad está en cada acción.
 */
export function soloLectura(competition: { status: string }, canManage: boolean) {
  return competition.status === COMPETITION_STATUS.ARCHIVED && !canManage;
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
  const [competition, participants, pointSums, deathCounts, wipeoCounts, matches, challenges, titulos] =
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
      // Los títulos que lleva puestos cada uno, por el locke: pedidos con los
      // ids de los participantes eran otra ida y vuelta después de esta
      getTitulosEquipadosDelLocke(competitionId),
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

  const stats = contarCombates(
    matches,
    challenges,
    competition?.challengeDiffCounts ?? false,
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

  return ordenarClasificacion(rows);
});

type CombateContado = {
  participantAId: string;
  participantBId: string;
  winnerId: string | null;
  pokemonDiff: number | null;
};

/**
 * Victorias, derrotas y diferencia de cada uno, de los combates de jornada y
 * de los retos. Suelta de `getStandings` para poder probarla sin base de datos.
 */
export function contarCombates(
  combates: CombateContado[],
  retos: CombateContado[],
  retosCuentanDiferencia: boolean,
) {
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

  for (const combate of combates) apuntar(combate, true);
  for (const reto of retos) apuntar(reto, retosCuentanDiferencia);
  return stats;
}

/**
 * El orden de la tabla y el puesto de cada uno.
 *
 * Los retirados van al final y **no ocupan puesto**. Si se quedaran en su
 * sitio, alguien que ya no juega saldría segundo y parecería clasificado
 * para la Final Four; el puesto tiene que decir algo de quien sigue.
 */
export function ordenarClasificacion<
  T extends {
    retirado: boolean;
    points: number;
    deaths: number;
    pokemonDiff: number;
    displayName: string;
  },
>(rows: T[]): (T & { position: number })[] {
  const ordenadas = [...rows].sort(
    (a, b) =>
      Number(a.retirado) - Number(b.retirado) ||
      b.points - a.points ||
      a.deaths - b.deaths ||
      b.pokemonDiff - a.pokemonDiff ||
      a.displayName.localeCompare(b.displayName, "es"),
  );

  let puesto = 0;
  return ordenadas.map((row) => ({
    ...row,
    position: row.retirado ? 0 : ++puesto,
  }));
}
