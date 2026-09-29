import "server-only";
import { prisma } from "@/lib/db";
import { LEVEL_CAP_KINDS } from "@/lib/constants";
import { esCreador, getCurrentUser } from "@/lib/auth";
import { urlsDeImagen } from "@/lib/imagenes";
import {
  campeonYSubcampeon,
  formatoParaJugadores,
} from "@/lib/formatos-finales";
import { ganadorDeLaJornada, jornadasDelDualocke } from "@/lib/marcador";
import { jornadasParaGanar, perfilDeLocke } from "@/lib/perfiles-de-locke";

/**
 * El histórico de todos los lockes juntos: quién ha ganado más, quién ha
 * enterrado más pokémon y cómo acabó cada edición.
 *
 * Hasta ahora cada locke vivía en su burbuja y no había ninguna pantalla que
 * juntara varios. Archivar una edición no servía de nada más que para quitarla
 * de en medio.
 *
 * **La gente es la de sus lockes, y sus números son de todos los suyos** (ver
 * `getPalmares`). Quién de toda esa gente sale lo elige cada uno (ver
 * `User.palmaresOcultos`); eso lo aplica la página, aquí se cuenta todo.
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
  categoria: Categoria;
  /** El logo de la edición, si tiene */
  logo: string | null;
  /** La descripción de la edición; los de antes llevan sus notas en `notas` */
  descripcion: string | null;
  /**
   * Un locke en el que tú no estás, que sale porque lo ganó alguien de tu
   * palmarés. No se puede abrir, y de su gente solo se nombra a la tuya.
   */
  deFuera: boolean;
  /** Las cuentas del campeón y del subcampeón, para saber si son de tu gente */
  campeonUserId: string | null;
  subcampeonUserId: string | null;
  /** Un locke de antes, con lo que hace falta para editarlo (solo si puede) */
  paraEditar?: DatosDeLockeDeAntes;
};

export type DatosDeLockeDeAntes = {
  nombre: string;
  juego: string | null;
  /** "2024-05-01", como lo pide un campo de fecha */
  cuando: string;
  notas: string | null;
  jugadoresIds: string[];
  sinCuenta: string[];
  /** "u:<id>" o "n:<nombre>", como los desplegables */
  ganador: string;
  subcampeon: string;
};

/**
 * Las categorías del palmarés, por tamaño del locke: ganar un Hexalocke de seis
 * no es lo mismo que ganar un dualocke, y así se cuentan por separado.
 */
export type Categoria = "grupo" | "dual" | "solitario";
export const CATEGORIAS: Categoria[] = ["grupo", "dual", "solitario"];

export function categoriaDelLocke(jugadores: number): Categoria {
  return jugadores <= 1 ? "solitario" : jugadores === 2 ? "dual" : "grupo";
}

export type Cuenta = {
  lockes: number;
  ganados: number;
  victorias: number;
  derrotas: number;
  bajas: number;
};

const cuentaVacia = (): Cuenta => ({ lockes: 0, ganados: 0, victorias: 0, derrotas: 0, bajas: 0 });

/** Un locke ganado, para la vitrina de cada persona */
export type Titulo = {
  id: string;
  nombre: string;
  /** El logo de la edición, si tiene; los de antes no tienen */
  logo: string | null;
  categoria: Categoria;
  anio: number;
  /** Cuándo empezó, en milisegundos: para ordenarlos dentro del mismo año */
  cuando: number;
  deAntes: boolean;
};

export type FilaDelPalmares = {
  userId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** Todo junto */
  total: Cuenta;
  porCategoria: Record<Categoria, Cuenta>;
  /** Los lockes que ha ganado, del más nuevo al más viejo */
  titulos: Titulo[];
};

export type Palmares = {
  ediciones: CampeonDeUnLocke[];
  gente: FilaDelPalmares[];
};

export async function getPalmares(): Promise<Palmares> {
  const yo = await getCurrentUser();
  if (!yo) return { ediciones: [], gente: [] };

  /**
   * **Dos alcances distintos, a propósito.**
   *
   * - **La gente** que sale son los de *sus* lockes: los que juega o jugó y los
   *   que mira de espectador, y los lockes de antes que jugó o apuntó. Antes
   *   salía de `listCompetitions`, y al Creador, que puede abrirlo todo, se le
   *   llenaba el palmarés de desconocidos.
   * - **Los números** de esa gente cuentan **todos sus lockes**, también los que
   *   han jugado con otros. Así se lo pidió el grupo: para comparar entre amigos
   *   hace falta todo lo de cada uno. Solo se enseñan las cifras; la lista de
   *   ediciones de abajo sigue siendo solo de los lockes propios.
   */
  const mias = await prisma.competition.findMany({
    where: {
      OR: [
        { participants: { some: { userId: yo.id } } },
        { espectadores: { some: { userId: yo.id } } },
      ],
    },
    select: { id: true, participants: { select: { userId: true } } },
  });
  const misIds = new Set(mias.map((c) => c.id));

  /** Los lockes de antes que le tocan: los que jugó y los que apuntó él. */
  const deAntesMios = await prisma.lockeDeAntes.findMany({
    where: { OR: [{ jugadoresIds: { has: yo.id } }, { createdById: yo.id }] },
    select: { id: true, jugadoresIds: true },
  });
  const misDeAntes = new Set(deAntesMios.map((l) => l.id));

  const genteIds = new Set<string>([
    yo.id,
    ...mias.flatMap((c) => c.participants.map((p) => p.userId)),
    ...deAntesMios.flatMap((l) => l.jugadoresIds),
  ]);
  const deLaGente = [...genteIds];

  // Sus lockes y todos los de su gente, para contar lo de cada uno entero
  const competiciones = await prisma.competition.findMany({
    where: {
      OR: [{ id: { in: [...misIds] } }, { participants: { some: { userId: { in: deLaGente } } } }],
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      name: true,
      game: true,
      description: true,
      startedAt: true,
      maxPlayers: true,
      jornadasPrevistas: true,
    },
  });
  const ids = competiciones.map((competicion) => competicion.id);
  const categoriaDe = new Map(
    competiciones.map((c) => [c.id, categoriaDelLocke(c.maxPlayers)]),
  );

  const deAntes = await prisma.lockeDeAntes.findMany({
    where: {
      OR: [{ id: { in: [...misDeAntes] } }, { jugadoresIds: { hasSome: deLaGente } }],
    },
    orderBy: { cuando: "desc" },
    include: {
      ganador: { select: { id: true, displayName: true, avatarColor: true } },
      subcampeon: {
        select: { id: true, displayName: true, avatarColor: true },
      },
    },
  });

  if (!ids.length && !deAntes.length) return { ediciones: [], gente: [] };

  const enSolitario = competiciones
    .filter((c) => categoriaDelLocke(c.maxPlayers) === "solitario")
    .map((c) => c.id);

  const [participantes, finales, bajas, combates, ligas] = await Promise.all([
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
      select: { participantAId: true, participantBId: true, winnerId: true, matchdayId: true },
    }),
    /**
     * En solitario se gana **pasándose la Liga** (ver lib/solitario.ts): el hito
     * de tipo Campeón marcado. Antes esos lockes sumaban como jugados y nunca
     * como ganados.
     */
    enSolitario.length
      ? prisma.gymClear.findMany({
          where: {
            levelCap: { competitionId: { in: enSolitario }, kind: LEVEL_CAP_KINDS.CHAMPION },
          },
          select: { participantId: true, levelCap: { select: { competitionId: true } } },
        })
      : [],
  ]);
  const ligaPasadaEn = new Map(ligas.map((marca) => [marca.levelCap.competitionId, marca.participantId]));

  /**
   * Las fotos de perfil, como **dirección** y no como imagen. Se pidieron mal
   * la primera vez —con un `select` de `avatarImage`— y salían vacías: el
   * cliente de Prisma descarta las columnas de imagen por defecto (ver
   * `lib/db.ts`), justo para que no se cuelen enteras en el HTML. Lo que hace
   * falta es la dirección, y eso lo da `urlsDeImagen`.
   */
  const [avatares, logos] = await Promise.all([
    urlsDeImagen("avatar", [
      ...participantes.map((p) => p.userId),
      // También los de los lockes de antes, que pueden ser gente que ya no juega
      ...deAntes.flatMap((locke) => locke.jugadoresIds),
    ]),
    // Los logos de las ediciones, para la vitrina de títulos de cada uno
    urlsDeImagen("logo", ids),
  ]);
  const porId = new Map(competiciones.map((c) => [c.id, c]));

  const porParticipante = new Map(participantes.map((p) => [p.id, p]));
  // De qué edición es cada jornada, para repartir los combates
  const jornadasDe = new Map(
    (
      await prisma.matchday.findMany({
        where: { competitionId: { in: ids } },
        select: { id: true, competitionId: true },
      })
    ).map((j) => [j.id, j.competitionId]),
  );
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
    /**
     * En el dualocke manda la mayoría de jornadas y la final solo desempata
     * (ver lib/campeon.ts). Se cuenta aquí con las mismas piezas que el
     * marcador, sin traérselo entero por cada edición.
     */
    const porJornadas =
      perfilDeLocke(competicion.maxPlayers).victoria === "jornadas"
        ? campeonPorJornadas(
            combates.filter((c) => c.matchdayId && jornadasDe.get(c.matchdayId) === competicion.id),
            competicion.jornadasPrevistas,
          )
        : null;
    const { campeon, subcampeon } = categoriaDe.get(competicion.id) === "solitario"
      ? { campeon: ligaPasadaEn.get(competicion.id) ?? null, subcampeon: null }
      : porJornadas
      ? {
          campeon: porJornadas,
          subcampeon: suyos.find((p) => p.id !== porJornadas)?.id ?? null,
        }
      : final && formato
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
      categoria: categoriaDe.get(competicion.id) ?? "grupo",
      logo: logos(competicion.id),
      descripcion: competicion.description,
      deFuera: !misIds.has(competicion.id),
      campeonUserId: campeon ? (porParticipante.get(campeon)?.userId ?? null) : null,
      subcampeonUserId: subcampeon ? (porParticipante.get(subcampeon)?.userId ?? null) : null,
    };
  });

  /**
   * Los lockes de antes: como no queda nada de aquello, solo aportan la línea
   * y el "ganado". Las bajas y las victorias se quedan a cero **a propósito**,
   * que es más honesto que inventárselas.
   */
  const puedeBorrar = (createdById: string | null) =>
    Boolean(yo) && (esCreador(yo!) || createdById === yo!.id);

  // Quien no tiene cuenta sale con su nombre y en gris: no hay más de él
  const SIN_CUENTA = "#64748b";
  const apuntados: CampeonDeUnLocke[] = deAntes.map((locke) => ({
    competitionId: locke.id,
    deAntes: true,
    puedeBorrar: puedeBorrar(locke.createdById),
    notas: locke.notas,
    nombre: locke.nombre,
    game: locke.juego,
    startedAt: locke.cuando,
    terminado: true,
    campeon: locke.ganador
      ? {
          displayName: locke.ganador.displayName,
          color: locke.ganador.avatarColor,
          avatarImage: avatares(locke.ganador.id),
        }
      : { displayName: locke.ganadorNombre ?? "Alguien", color: SIN_CUENTA, avatarImage: null },
    subcampeon: locke.subcampeon
      ? {
          displayName: locke.subcampeon.displayName,
          color: locke.subcampeon.avatarColor,
        }
      : locke.subcampeonNombre
        ? { displayName: locke.subcampeonNombre, color: SIN_CUENTA }
        : null,
    categoria: categoriaDelLocke(locke.jugadoresIds.length + locke.sinCuenta.length),
    logo: null,
    descripcion: null,
    deFuera: !misDeAntes.has(locke.id),
    campeonUserId: locke.ganadorId,
    subcampeonUserId: locke.subcampeonId,
    // Lo que hace falta para editarlo, solo a quien puede
    paraEditar: puedeBorrar(locke.createdById)
      ? {
          nombre: locke.nombre,
          juego: locke.juego,
          cuando: locke.cuando.toISOString().slice(0, 10),
          notas: locke.notas,
          jugadoresIds: locke.jugadoresIds,
          sinCuenta: locke.sinCuenta,
          ganador: locke.ganadorId ? `u:${locke.ganadorId}` : `n:${locke.ganadorNombre ?? ""}`,
          subcampeon: locke.subcampeonId
            ? `u:${locke.subcampeonId}`
            : locke.subcampeonNombre
              ? `n:${locke.subcampeonNombre}`
              : "",
        }
      : undefined,
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
        total: cuentaVacia(),
        porCategoria: { grupo: cuentaVacia(), dual: cuentaVacia(), solitario: cuentaVacia() },
        titulos: [],
      });
    }
    return gente.get(quien.userId)!;
  };
  /** Suma a la vez en el total y en su categoría, para que cuadren siempre */
  const sumar = (
    fila: FilaDelPalmares,
    categoria: Categoria,
    campo: keyof Cuenta,
    cuanto = 1,
  ) => {
    fila.total[campo] += cuanto;
    fila.porCategoria[categoria][campo] += cuanto;
  };

  for (const p of participantes) {
    const fila = deLaPersona(p);
    const categoria = categoriaDe.get(p.competitionId) ?? "grupo";
    sumar(fila, categoria, "lockes");
    sumar(fila, categoria, "bajas", bajasPorParticipante.get(p.id) ?? 0);
    if (campeonPorEdicion.get(p.competitionId) === p.userId) {
      sumar(fila, categoria, "ganados");
      const edicion = porId.get(p.competitionId);
      if (edicion) {
        /**
         * El nombre y el logo de lo que ganó, **también de lockes en los que tú
         * no estás**: es lo que se enseña para presumir entre amigos. Solo eso,
         * como las cifras; de quién jugó o cómo fue no se cuenta nada.
         */
        fila.titulos.push({
          id: edicion.id,
          nombre: edicion.name,
          logo: logos(edicion.id),
          categoria,
          anio: edicion.startedAt.getFullYear(),
          cuando: edicion.startedAt.getTime(),
          deAntes: false,
        });
      }
    }
  }

  for (const combate of combates) {
    if (!combate.winnerId) continue;
    const ganador = porParticipante.get(combate.winnerId);
    const perdedorId =
      combate.winnerId === combate.participantAId
        ? combate.participantBId
        : combate.participantAId;
    const perdedor = porParticipante.get(perdedorId);
    const categoria = categoriaDe.get(jornadasDe.get(combate.matchdayId) ?? "") ?? "grupo";
    if (ganador) sumar(deLaPersona(ganador), categoria, "victorias");
    if (perdedor) sumar(deLaPersona(perdedor), categoria, "derrotas");
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
      const categoria = categoriaDelLocke(locke.jugadoresIds.length + locke.sinCuenta.length);
      sumar(fila, categoria, "lockes");
      if (userId === locke.ganadorId) {
        sumar(fila, categoria, "ganados");
        fila.titulos.push({
          id: locke.id,
          nombre: locke.nombre,
          logo: null,
          categoria,
          anio: locke.cuando.getFullYear(),
          cuando: locke.cuando.getTime(),
          deAntes: true,
        });
      }
    }
  }

  /**
   * Un locke de fuera entra en el historial **solo si lo ganó alguien de tu
   * gente**: es su título, y es lo que se quiere ver. Si lo ganó un
   * desconocido, no sale, que la victoria es de alguien que no pinta nada en
   * tu palmarés. Y del subcampeón (o del rival en un dual) solo se dice el
   * nombre si también es de los tuyos; si no, ni aparece.
   */
  const deTuGente = (userId: string | null) => Boolean(userId && genteIds.has(userId));
  const historial = [...ediciones, ...apuntados]
    .filter((e) => !e.deFuera || (e.terminado && deTuGente(e.campeonUserId)))
    .map((e) =>
      e.deFuera && !deTuGente(e.subcampeonUserId)
        ? { ...e, subcampeon: null, subcampeonUserId: null }
        : e,
    );

  return {
    ediciones: historial.sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    ),
    gente: [...gente.values()]
      .filter((fila) => genteIds.has(fila.userId))
      .map((fila) => ({ ...fila, titulos: fila.titulos.sort((a, b) => b.cuando - a.cuando) }))
      .sort(
      (a, b) =>
        b.total.ganados - a.total.ganados ||
        b.total.victorias - a.total.victorias ||
        a.displayName.localeCompare(b.displayName, "es"),
    ),
  };
}

/** Quién llegó a la mayoría de jornadas de un dualocke, si alguien llegó. */
function campeonPorJornadas(
  combates: { matchdayId: string; winnerId: string | null }[],
  previstas: number | null,
) {
  const porJornada = new Map<string, { winnerId: string | null }[]>();
  for (const combate of combates) {
    porJornada.set(combate.matchdayId, [...(porJornada.get(combate.matchdayId) ?? []), combate]);
  }
  const hacenFalta = jornadasParaGanar(jornadasDelDualocke(previstas, porJornada.size));
  const ganadas = new Map<string, number>();
  for (const suyos of porJornada.values()) {
    const { ganadorId } = ganadorDeLaJornada(suyos);
    if (ganadorId) ganadas.set(ganadorId, (ganadas.get(ganadorId) ?? 0) + 1);
  }
  return [...ganadas].find(([, cuantas]) => cuantas >= hacenFalta)?.[0] ?? null;
}
