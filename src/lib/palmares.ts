import "server-only";
import { prisma } from "@/lib/db";
import { listCompetitions } from "@/lib/competition";
import { esCreador, getCurrentUser } from "@/lib/auth";
import { urlsDeImagen } from "@/lib/imagenes";
import {
  campeonYSubcampeon,
  formatoParaJugadores,
} from "@/lib/formatos-finales";

/**
 * El histórico de todos los lockes juntos: quién ha ganado más, quién ha
 * enterrado más pokémon y cómo acabó cada edición.
 *
 * Hasta ahora cada locke vivía en su burbuja y no había ninguna pantalla que
 * juntara varios. Archivar una edición no servía de nada más que para quitarla
 * de en medio.
 *
 * **Solo entran los lockes que esa persona puede abrir.** Sale de
 * `listCompetitions`, que ya lleva el filtro de visibilidad: quien no juega una
 * edición ni la mira de espectador, tampoco la ve en el palmarés.
 *
 * Se cuenta al mirarlo y no se guarda nada, como el resto de números de la
 * aplicación. Son **cinco consultas para todas las ediciones a la vez**, no
 * cinco por edición: lo que se pide se pide con `in`.
 */

export type CampeonDeUnLocke = {
  /** El identificador de la edición, o del apunte si es un locke de antes */
  competitionId: string;
  /** Se jugó antes de que existiera la aplicación y está apuntado a mano */
  deAntes: boolean;
  /** Si quien mira puede quitar ese apunte */
  puedeBorrar: boolean;
  notas: string | null;
  nombre: string;
  game: string | null;
  startedAt: Date;
  terminado: boolean;
  campeon: { displayName: string; color: string; avatarImage: string | null } | null;
  subcampeon: { displayName: string; color: string } | null;
};

export type FilaDelPalmares = {
  userId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  lockes: number;
  ganados: number;
  victorias: number;
  derrotas: number;
  bajas: number;
};

export type Palmares = {
  ediciones: CampeonDeUnLocke[];
  gente: FilaDelPalmares[];
};

export async function getPalmares(): Promise<Palmares> {
  const yo = await getCurrentUser();
  const competiciones = await listCompetitions();
  const ids = competiciones.map((competicion) => competicion.id);

  /**
   * Los lockes de antes que le tocan: **solo los que jugó**. El Creador los ve
   * todos, como en el resto de la aplicación.
   */
  const deAntes = yo
    ? await prisma.lockeDeAntes.findMany({
        where: esCreador(yo) ? {} : { jugadoresIds: { has: yo.id } },
        orderBy: { cuando: "desc" },
        include: {
          ganador: { select: { id: true, displayName: true, avatarColor: true } },
          subcampeon: {
            select: { id: true, displayName: true, avatarColor: true },
          },
        },
      })
    : [];

  if (!ids.length && !deAntes.length) return { ediciones: [], gente: [] };

  const [participantes, finales, bajas, combates] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId: { in: ids } },
      select: {
        id: true,
        userId: true,
        competitionId: true,
        displayName: true,
        color: true,
        retiredAt: true,
      },
    }),
    prisma.finalFour.findMany({
      where: { competitionId: { in: ids } },
      select: {
        competitionId: true,
        jugadores: true,
        seeds: true,
        matches: { select: { key: true, winnerId: true } },
      },
    }),
    prisma.death.groupBy({
      by: ["participantId"],
      where: { participant: { competitionId: { in: ids } } },
      _count: { _all: true },
    }),
    prisma.match.findMany({
      where: { matchday: { competitionId: { in: ids } } },
      select: { participantAId: true, participantBId: true, winnerId: true },
    }),
  ]);

  /**
   * Las fotos de perfil, como **dirección** y no como imagen. Se pidieron mal
   * la primera vez —con un `select` de `avatarImage`— y salían vacías: el
   * cliente de Prisma descarta las columnas de imagen por defecto (ver
   * `lib/db.ts`), justo para que no se cuelen enteras en el HTML. Lo que hace
   * falta es la dirección, y eso lo da `urlsDeImagen`.
   */
  const avatares = await urlsDeImagen("avatar", [
    ...participantes.map((p) => p.userId),
    // También los de los lockes de antes, que pueden ser gente que ya no juega
    ...deAntes.flatMap((locke) => locke.jugadoresIds),
  ]);

  const porParticipante = new Map(participantes.map((p) => [p.id, p]));
  const bajasPorParticipante = new Map(
    bajas.map((fila) => [fila.participantId, fila._count._all]),
  );

  /**
   * Quién ganó cada edición. Sale de la llave que decide el locke según su
   * formato, contando su serie: es lo mismo que hace la pantalla del cuadro,
   * pero sin traerse la clasificación entera de cada edición.
   */
  const ficha = (id: string | null) => {
    const p = id ? porParticipante.get(id) : null;
    return p
      ? {
          displayName: p.displayName,
          color: p.color,
          avatarImage: avatares(p.userId),
        }
      : null;
  };

  /** Qué cuenta ganó cada edición, para la tabla de personas de abajo */
  const campeonPorEdicion = new Map<string, string | null>();

  const ediciones: CampeonDeUnLocke[] = competiciones.map((competicion) => {
    const final = finales.find((fila) => fila.competitionId === competicion.id);
    const formato = final ? formatoParaJugadores(final.jugadores) : null;

    /**
     * Sin final puede haber campeón igual: el único que queda en pie cuando
     * los demás se han ido (ver `POR_ABANDONO` en lib/final-four.ts).
     */
    const suyos = participantes.filter((p) => p.competitionId === competicion.id);
    const enPie = suyos.filter((p) => !p.retiredAt);
    const { campeon, subcampeon } =
      final && formato
        ? campeonYSubcampeon(
            formato,
            final.seeds,
            new Map(final.matches.map((m) => [m.key, m.winnerId])),
          )
        : !final && suyos.length >= 2 && enPie.length === 1
          ? { campeon: enPie[0].id, subcampeon: null }
          : { campeon: null, subcampeon: null };

    campeonPorEdicion.set(
      competicion.id,
      campeon ? (porParticipante.get(campeon)?.userId ?? null) : null,
    );

    return {
      competitionId: competicion.id,
      nombre: competicion.name,
      game: competicion.game,
      startedAt: competicion.startedAt,
      deAntes: false,
      puedeBorrar: false,
      notas: null,
      terminado: Boolean(campeon),
      campeon: ficha(campeon),
      subcampeon: ficha(subcampeon),
    };
  });

  /**
   * Los lockes de antes: como no queda nada de aquello, solo aportan la línea
   * y el "ganado". Las bajas y las victorias se quedan a cero **a propósito**,
   * que es más honesto que inventárselas.
   */
  const puedeBorrar = (createdById: string | null) =>
    Boolean(yo) && (esCreador(yo!) || createdById === yo!.id);

  const apuntados: CampeonDeUnLocke[] = deAntes.map((locke) => ({
    competitionId: locke.id,
    deAntes: true,
    puedeBorrar: puedeBorrar(locke.createdById),
    notas: locke.notas,
    nombre: locke.nombre,
    game: locke.juego,
    startedAt: locke.cuando,
    terminado: true,
    campeon: {
      displayName: locke.ganador.displayName,
      color: locke.ganador.avatarColor,
      avatarImage: avatares(locke.ganador.id),
    },
    subcampeon: locke.subcampeon
      ? {
          displayName: locke.subcampeon.displayName,
          color: locke.subcampeon.avatarColor,
        }
      : null,
  }));

  /** Las cuentas van por **cuenta de usuario**, no por participante: el mote
   * cambia de una edición a otra y la persona es la misma. */
  const gente = new Map<string, FilaDelPalmares>();
  const deLaPersona = (quien: {
    userId: string;
    displayName: string;
    color: string;
  }) => {
    if (!gente.has(quien.userId)) {
      gente.set(quien.userId, {
        userId: quien.userId,
        displayName: quien.displayName,
        color: quien.color,
        avatarImage: avatares(quien.userId),
        lockes: 0,
        ganados: 0,
        victorias: 0,
        derrotas: 0,
        bajas: 0,
      });
    }
    return gente.get(quien.userId)!;
  };

  for (const p of participantes) {
    const fila = deLaPersona(p);
    fila.lockes += 1;
    fila.bajas += bajasPorParticipante.get(p.id) ?? 0;
    if (campeonPorEdicion.get(p.competitionId) === p.userId) fila.ganados += 1;
  }

  for (const combate of combates) {
    if (!combate.winnerId) continue;
    const ganador = porParticipante.get(combate.winnerId);
    const perdedorId =
      combate.winnerId === combate.participantAId
        ? combate.participantBId
        : combate.participantAId;
    const perdedor = porParticipante.get(perdedorId);
    if (ganador) deLaPersona(ganador).victorias += 1;
    if (perdedor) deLaPersona(perdedor).derrotas += 1;
  }

  /**
   * De los lockes de antes solo hay nombres de cuenta, no motes de edición: no
   * existió ninguna ficha de participante de aquello. Se piden de una vez, que
   * puede haber gente que ya no juegue nada y no salga por ningún otro lado.
   */
  const cuentas = deAntes.length
    ? await prisma.user.findMany({
        where: { id: { in: [...new Set(deAntes.flatMap((l) => l.jugadoresIds))] } },
        select: { id: true, displayName: true, avatarColor: true },
      })
    : [];
  const nombreDeCuenta = new Map(cuentas.map((quien) => [quien.id, quien]));

  for (const locke of deAntes) {
    for (const userId of locke.jugadoresIds) {
      const cuenta = nombreDeCuenta.get(userId);
      const fila = deLaPersona({
        userId,
        displayName: cuenta?.displayName ?? "Alguien",
        color: cuenta?.avatarColor ?? "#64748b",
      });
      fila.lockes += 1;
      if (userId === locke.ganadorId) fila.ganados += 1;
    }
  }

  return {
    ediciones: [...ediciones, ...apuntados].sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    ),
    gente: [...gente.values()].sort(
      (a, b) =>
        b.ganados - a.ganados ||
        b.victorias - a.victorias ||
        a.displayName.localeCompare(b.displayName, "es"),
    ),
  };
}
