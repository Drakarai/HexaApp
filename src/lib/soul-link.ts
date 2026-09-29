import "server-only";
import { prisma } from "@/lib/db";
import { LEVEL_CAP_KINDS } from "@/lib/constants";
import { urlsDeImagen } from "@/lib/imagenes";
import { generacionDelJuego } from "@/lib/juegos";
import { evolucionesDe, queEs, type OpcionDeEvolucion } from "@/lib/evoluciones";
import { GENERACION_POR_DEFECTO, colorDeTipo, tipoPorId, tiposDePokemon } from "@/lib/tipos";
import { colocar, vinculoAlCapturar, vinculosDe } from "@/lib/equipo-y-caja";

/**
 * El equipo y la caja de todos los de un locke, para la pantalla de Equipo y
 * PC. Las capturas son las del mapa de siempre (`Capture`): en un Soul Link
 * **se enseñan a todos**, que es la gracia —ver lo que lleva el otro y cómo
 * van vuestras parejas—. El mapa de capturas sigue siendo privado; lo que se
 * comparte es el pokémon, no el mapa.
 */

export type PokemonDelTablero = {
  id: string;
  participantId: string;
  species: string;
  nickname: string | null;
  pokemonId: number | null;
  imagen: string | null;
  tipos: { slug: string; nombre: string; color: string }[];
  /** Dónde se capturó: la zona del mapa o lo escrito a mano */
  sitio: string | null;
  lugar: string;
  hueco: number;
  creado: number;
  vinculo: string | null;
  muerta: boolean;
  causa: string | null;
  evoluciones: OpcionDeEvolucion[];
};

export type TableroDeJugador = {
  participantId: string;
  userId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  fuera: boolean;
  /** Si quien mira puede mover sus pokémon: el propio jugador o quien administra */
  editable: boolean;
  vivos: PokemonDelTablero[];
  caidos: PokemonDelTablero[];
  /** Lo que haría el botón de deshacer, si hay algo */
  deshacer: string | null;
};

export type EquiposDelLocke = {
  tableros: TableroDeJugador[];
  /** Los vínculos de verdad, cada uno con sus pokémon, del más antiguo al más nuevo */
  vinculos: { clave: string; sitio: string | null; miembros: PokemonDelTablero[] }[];
  /** Si el juego tiene mapa: entonces las capturas se apuntan también allí */
  generacion: number;
};

export async function getEquiposDelLocke(
  competicion: { id: string; gameId: string | null; juegoNoOficial: boolean },
  quienMira: { userId: string; gestiona: boolean; soloLectura: boolean },
  /**
   * Solo el tablero de este jugador. Es lo que se usa fuera del Soul Link,
   * donde la caja es privada: lo de los demás **ni se lee**, que es la forma
   * de que no se pueda colar en la página.
   */
  soloDe?: string,
): Promise<EquiposDelLocke> {
  /**
   * La generación manda en los tipos (Clefairy es Normal en Johto) y en qué
   * evoluciones existen. En un fangame los tipos son los de su base, pero las
   * evoluciones se ofrecen todas: meten pokémon de cualquier época.
   */
  const generacionDelJuegoBase = generacionDelJuego(competicion.gameId);
  const generacion = generacionDelJuegoBase ?? GENERACION_POR_DEFECTO;
  const generacionDeEvoluciones = competicion.juegoNoOficial ? null : generacionDelJuegoBase;

  const [jugadores, capturas, cambios] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId: competicion.id, ...(soloDe ? { id: soloDe } : {}) },
      orderBy: { joinedAt: "asc" },
      select: { id: true, userId: true, displayName: true, color: true, retiredAt: true },
    }),
    prisma.capture.findMany({
      where: {
        participant: { competitionId: competicion.id },
        failed: false,
        ...(soloDe ? { participantId: soloDe } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        participantId: true,
        species: true,
        nickname: true,
        pokemonId: true,
        zoneId: true,
        sitio: true,
        lugar: true,
        hueco: true,
        vinculo: true,
        deathId: true,
        createdAt: true,
        zone: { select: { name: true } },
        muerte: { select: { cause: true } },
      },
    }),
    // El último cambio de cada uno, para el rótulo del botón de deshacer
    prisma.cambioDeCaja.findMany({
      where: {
        participant: { competitionId: competicion.id },
        ...(soloDe ? { participantId: soloDe } : {}),
      },
      orderBy: { createdAt: "desc" },
      distinct: ["participantId"],
      select: { participantId: true, descripcion: true },
    }),
  ]);

  const [imagenes, avatares] = await Promise.all([
    urlsDeImagen("captura", capturas.map((c) => c.id)),
    urlsDeImagen("avatar", jugadores.map((j) => j.userId)),
  ]);

  const pokemon: PokemonDelTablero[] = capturas.map((c) => {
    const quien = queEs(c.pokemonId, c.species);
    return {
      id: c.id,
      participantId: c.participantId,
      species: c.species,
      nickname: c.nickname,
      pokemonId: quien?.pokemonId ?? null,
      imagen: imagenes(c.id),
      tipos: quien
        ? tiposDePokemon(quien.pokemonId, generacion)
            .map((id) => tipoPorId(id))
            .filter((t) => t !== undefined)
            .map((t) => ({ slug: t.slug, nombre: t.nombre, color: colorDeTipo(t.slug) }))
        : [],
      sitio: c.zone?.name ?? c.sitio,
      lugar: c.lugar,
      hueco: c.hueco,
      creado: c.createdAt.getTime(),
      vinculo: c.vinculo,
      muerta: Boolean(c.deathId),
      causa: c.muerte?.cause ?? null,
      evoluciones: c.deathId ? [] : evolucionesDe(quien?.pokemonId, c.species, generacionDeEvoluciones),
    };
  });

  const ultimo = new Map(cambios.map((c) => [c.participantId, c.descripcion]));
  const tableros = jugadores.map((j) => {
    const suyos = pokemon.filter((p) => p.participantId === j.id);
    const editable =
      !quienMira.soloLectura && (quienMira.gestiona || j.userId === quienMira.userId);
    return {
      participantId: j.id,
      userId: j.userId,
      displayName: j.displayName,
      color: j.color,
      avatarImage: avatares(j.userId),
      fuera: Boolean(j.retiredAt),
      editable,
      vivos: suyos.filter((p) => !p.muerta),
      caidos: suyos.filter((p) => p.muerta),
      deshacer: editable ? (ultimo.get(j.id) ?? null) : null,
    };
  });

  const vinculos = [
    ...vinculosDe(
      pokemon.map((p) => ({ ...p, zoneId: null })),
    ).entries(),
  ]
    .map(([clave, miembros]) => ({
      clave,
      sitio: miembros.find((m) => m.sitio)?.sitio ?? null,
      // En el orden de los jugadores, para que las columnas cuadren
      miembros: [...miembros].sort(
        (a, b) =>
          jugadores.findIndex((j) => j.id === a.participantId) -
          jugadores.findIndex((j) => j.id === b.participantId),
      ),
    }))
    .sort(
      (a, b) =>
        Math.min(...a.miembros.map((m) => m.creado)) - Math.min(...b.miembros.map((m) => m.creado)),
    );

  return { tableros, vinculos, generacion };
}

/**
 * El equipo que lleva ahora alguien, en el orden de sus huecos. Es lo que el
 * hall de la fama se trae en un Soul Link, donde no hay combates de jornada de
 * los que sacarlo.
 */
export async function getEquipoActual(participantId: string) {
  const capturas = await prisma.capture.findMany({
    where: { participantId, failed: false, deathId: null },
    select: {
      id: true,
      species: true,
      nickname: true,
      lugar: true,
      hueco: true,
      createdAt: true,
      // La imagen hace falta aquí: se copia la referencia al equipo del hall
      image: true,
    },
  });
  const { equipo } = colocar(capturas.map((c) => ({ ...c, creado: c.createdAt.getTime() })));
  return equipo.filter((c) => c !== null);
}

/**
 * Si un locke cooperativo está superado: cuando **todos los que siguen** se han
 * pasado la Liga (el hito de tipo Campeón marcado). Es el final de un Soul
 * Link, igual que en solitario, pero entre todos. Devuelve también cuándo, que
 * es cuando la pasó el último.
 */
export async function getLigaEnCooperativo(competitionId: string) {
  const [jugadores, marcas] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId, retiredAt: null },
      select: { id: true, displayName: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.gymClear.findMany({
      where: { levelCap: { competitionId, kind: LEVEL_CAP_KINDS.CHAMPION } },
      select: { participantId: true, clearedAt: true },
    }),
  ]);
  const cuando = new Map<string, Date>();
  for (const marca of marcas) {
    const antes = cuando.get(marca.participantId);
    if (!antes || marca.clearedAt < antes) cuando.set(marca.participantId, marca.clearedAt);
  }
  const superada = jugadores.length > 0 && jugadores.every((j) => cuando.has(j.id));
  return {
    superada,
    cuando: superada
      ? new Date(Math.max(...jugadores.map((j) => cuando.get(j.id)!.getTime())))
      : null,
    jugadores: jugadores.map((j) => ({ ...j, ligaPasada: cuando.has(j.id) })),
  };
}

/**
 * Vincula una captura recién apuntada **por su ruta** (ver
 * `vinculoAlCapturar`). La llaman las dos puertas por las que entra una
 * captura: el mapa y el formulario de Equipo y PC. Solo en un Soul Link; en
 * cualquier otro locke no hace nada. Devuelve con quién se vinculó, para
 * decirlo al guardar.
 */
export async function vincularCapturaNueva(captureId: string): Promise<string[]> {
  const nueva = await prisma.capture.findUnique({
    where: { id: captureId },
    select: {
      id: true,
      participantId: true,
      zoneId: true,
      sitio: true,
      failed: true,
      participant: { select: { competition: { select: { id: true, estilo: true } } } },
    },
  });
  if (!nueva || nueva.failed || nueva.participant.competition.estilo !== "soullink") return [];

  const otras = await capturasParaVincular(nueva.participant.competition.id, captureId);
  const decision = vinculoAlCapturar(nueva, otras);
  if (!decision) return [];

  if ("unirseA" in decision) {
    await prisma.capture.update({ where: { id: captureId }, data: { vinculo: decision.unirseA } });
    return otras.filter((c) => c.vinculo === decision.unirseA).map((c) => c.id);
  }
  const clave = crypto.randomUUID();
  await prisma.capture.updateMany({
    where: { id: { in: [captureId, ...decision.juntarCon] } },
    data: { vinculo: clave },
  });
  return decision.juntarCon;
}

/** Las capturas de un locke con lo que hace falta para vincularlas */
export async function capturasParaVincular(competitionId: string, sin?: string) {
  const filas = await prisma.capture.findMany({
    where: {
      participant: { competitionId },
      failed: false,
      ...(sin ? { id: { not: sin } } : {}),
    },
    select: {
      id: true,
      participantId: true,
      vinculo: true,
      zoneId: true,
      sitio: true,
      deathId: true,
      createdAt: true,
    },
  });
  return filas.map((c) => ({
    id: c.id,
    participantId: c.participantId,
    vinculo: c.vinculo,
    zoneId: c.zoneId,
    sitio: c.sitio,
    muerta: Boolean(c.deathId),
    creado: c.createdAt.getTime(),
  }));
}
