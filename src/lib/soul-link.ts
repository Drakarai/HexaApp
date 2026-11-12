import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LEVEL_CAP_KINDS } from "@/lib/constants";
import { firmaDeColumna } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { generacionDeTipos } from "@/lib/juegos";
import { GENERACION_ANIL } from "@/lib/anil";
import { habilidadParaVer, type HabilidadParaVer } from "@/lib/habilidades";
import { megaPorPiedra } from "@/lib/megas";
import { evolucionesDe, queEs, type OpcionDeEvolucion } from "@/lib/evoluciones";
import { leerHistoria } from "@/lib/historia";
import { debilidadesDe, GENERACION_POR_DEFECTO, tiposParaVer } from "@/lib/tipos";
import { colocar, vinculoAlCapturar, vinculosDe } from "@/lib/equipo-y-caja";
import { leerFondos, leerNombresDeCaja, type FondoDeCaja } from "@/lib/fondos-de-caja";
import { leerMovimientos, movimientoParaVer, naturalezaPorSlug, type MovimientoParaVer } from "@/lib/movimientos";
import { objetoPorSlug, spriteDeObjeto } from "@/lib/objetos";

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
  /**
   * Si lleva **su megapiedra**: la mega que se enseña (sprite, tipos y
   * debilidades son los suyos). `pokemonId` sigue siendo el de siempre, que es
   * el que evoluciona y el que grita. Ver lib/megas.ts.
   */
  mega: { pokemonId: number; rotulo: string } | null;
  imagen: string | null;
  /** Variocolor: capturado así o vuelto shiny con un premio */
  shiny: boolean;
  tipos: { slug: string; nombre: string }[];
  /**
   * Lo que le hace cada tipo, sin los neutros (ver `debilidadesDe`), con la
   * tabla de la generación del locke; las otras las calcula la ficha si se piden
   */
  debilidades: { generacion: number; lista: Debilidad[] };
  /** Dónde se capturó: la zona del mapa o lo escrito a mano */
  sitio: string | null;
  /** Lo que se apuntó al capturarlo: «2ª captura», «huevo de regalo»… */
  apunte: string | null;
  /** Si llegó cambiándolo a un entrenador: la especie que se dio a cambio */
  llegoPorIntercambio: string | null;
  lugar: string;
  hueco: number;
  creado: number;
  vinculo: string | null;
  muerta: boolean;
  /** Su baja del cementerio, si está caído: para revivirlo */
  bajaId: string | null;
  causa: string | null;
  evoluciones: OpcionDeEvolucion[];
  /** La ficha completa, ya con nombres y tipos para enseñarla */
  combate: FichaDeCombate;
};

export type Debilidad = { slug: string; nombre: string; x: number };

export type FichaDeCombate = {
  naturaleza: { slug: string; nombre: string; sube: string | null; baja: string | null } | null;
  objeto: { slug: string; nombre: string; imagen: string } | null;
  /** La de la forma que se enseña: con la megapiedra puesta, la de la mega */
  habilidad: HabilidadParaVer | null;
  /** Si la habilidad es la de la mega */
  conMega: boolean;
  /** Las dos guardadas, para editarlas: la de siempre y la de su mega */
  habilidades: { normal: string | null; mega: string | null };
  /** Su número de siempre, para saber en el editor si una piedra es la suya */
  base: number | null;
  movimientos: MovimientoParaVer[];
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
  /** El fondo elegido para cada caja; vacío donde va el de fábrica */
  fondos: (FondoDeCaja | null)[];
  /** El nombre puesto a cada caja; null donde se llama «Caja N» */
  nombres: (string | null)[];
  /** La captura que es su pokémon as (ver lib/as.ts), si lo ha elegido de la caja */
  asId: string | null;
  /** Por qué es su as, lo escrito al elegirlo */
  asPorque: string | null;
};

export type EquiposDelLocke = {
  tableros: TableroDeJugador[];
  /** Los vínculos de verdad, cada uno con sus pokémon, del más antiguo al más nuevo */
  vinculos: { clave: string; sitio: string | null; miembros: PokemonDelTablero[] }[];
  /** Si el juego tiene mapa: entonces las capturas se apuntan también allí */
  generacion: number;
};

type QuienMiraLaCaja = { userId: string; gestiona: boolean; soloLectura: boolean };

export async function getEquiposDelLocke(
  competicion: { id: string; game?: string | null; gameId: string | null; juegoNoOficial: boolean; tipos: string | null },
  /**
   * Puede llegar sin resolver: solo hace falta al final, para saber qué
   * tableros puede tocar, así que no tiene por qué retrasar las consultas.
   */
  quienMiraPedido:
    | QuienMiraLaCaja
    | Promise<QuienMiraLaCaja>,
  /**
   * Solo el tablero de este jugador: su participante, o su cuenta (que en un
   * locke es lo mismo y no obliga a esperar a saber qué participante es). Es lo
   * que se usa fuera del Soul Link, donde la caja es privada: lo de los demás
   * **ni se lee**, que es la forma de que no se pueda colar en la página.
   */
  soloDe?: string | { userId: string },
): Promise<EquiposDelLocke> {
  /**
   * La generación manda en los tipos (Clefairy es Normal en Johto), y cada
   * locke elige si usa la de su juego o la de ahora (ver `generacionDeTipos`). Las evoluciones no dependen de ella: se ofrecen
   * todas (ver lib/evoluciones.ts).
   */
  const generacion = generacionDeTipos(competicion) ?? GENERACION_POR_DEFECTO;
  // En Añil, Eevee también evoluciona a Royaleon y Cefireon
  const enAnil = generacion === GENERACION_ANIL;

  /**
   * Todo a la vez, también las firmas de las imágenes (las capturas y las
   * fotos de los jugadores): se buscan por el locke, no por los ids de lo que
   * salga, que era otra ida y vuelta después de esta.
   */
  const jugador = !soloDe ? {} : typeof soloDe === "string" ? { id: soloDe } : { userId: soloDe.userId };
  const deQuien = { competitionId: competicion.id, ...jugador };
  const soloDeSql = !soloDe
    ? Prisma.empty
    : typeof soloDe === "string"
      ? Prisma.sql` and p."id" = ${soloDe}`
      : Prisma.sql` and p."userId" = ${soloDe.userId}`;
  const [jugadores, capturas, cambios, firmasCaptura, firmasAvatar, quienMira] = await Promise.all([
    prisma.participant.findMany({
      where: deQuien,
      orderBy: { joinedAt: "asc" },
      select: {
        id: true,
        userId: true,
        displayName: true,
        color: true,
        retiredAt: true,
        fondosDeCaja: true,
        nombresDeCaja: true,
        aceCaptureId: true,
        aceReason: true,
      },
    }),
    prisma.capture.findMany({
      where: { participant: deQuien, failed: false },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        participantId: true,
        species: true,
        nickname: true,
        pokemonId: true,
        zoneId: true,
        sitio: true,
        notes: true,
        historia: true,
        lugar: true,
        hueco: true,
        vinculo: true,
        deathId: true,
        shiny: true,
        naturaleza: true,
        objeto: true,
        movimientos: true,
        habilidad: true,
        habilidadMega: true,
        createdAt: true,
        zone: { select: { name: true } },
        muerte: { select: { cause: true } },
      },
    }),
    // El último cambio de cada uno, para el rótulo del botón de deshacer
    prisma.cambioDeCaja.findMany({
      where: { participant: deQuien },
      orderBy: { createdAt: "desc" },
      distinct: ["participantId"],
      select: { participantId: true, descripcion: true },
    }),
    prisma.$queryRaw<{ id: string; v: string | null }[]>`
      select c."id", ${firmaDeColumna(`c."image"`)} as v
      from "Capture" c join "Participant" p on p."id" = c."participantId"
      where p."competitionId" = ${competicion.id}${soloDeSql}
    `,
    prisma.$queryRaw<{ id: string; v: string | null }[]>`
      select u."id", ${firmaDeColumna(`u."avatarImage"`)} as v
      from "User" u join "Participant" p on p."userId" = u."id"
      where p."competitionId" = ${competicion.id}${soloDeSql}
    `,
    quienMiraPedido,
  ]);

  const firmaDeCaptura = new Map(firmasCaptura.map((fila) => [fila.id, fila.v]));
  const firmaDeAvatar = new Map(firmasAvatar.map((fila) => [fila.id, fila.v]));
  const imagenes = (id: string) => urlDeImagen("captura", id, firmaDeCaptura.get(id));
  const avatares = (id: string) => urlDeImagen("avatar", id, firmaDeAvatar.get(id));

  const pokemon: PokemonDelTablero[] = capturas.map((c) => {
    const quien = queEs(c.pokemonId, c.species);
    // Con su megapiedra se enseña su mega; caído, ya no lleva nada encima que valga
    const mega = c.deathId ? null : megaPorPiedra(quien?.pokemonId, c.species, c.objeto, enAnil);
    const mostrado = mega ?? quien?.pokemonId ?? null;
    return {
      id: c.id,
      participantId: c.participantId,
      species: c.species,
      nickname: c.nickname,
      pokemonId: quien?.pokemonId ?? null,
      mega: mega ? { pokemonId: mega, rotulo: rotuloDeMega(queEs(mega, c.species)?.etiqueta, c.species) } : null,
      imagen: imagenes(c.id),
      shiny: c.shiny,
      tipos: tiposParaVer(mostrado, generacion),
      debilidades: { generacion, lista: debilidadesDe(mostrado, generacion) },
      sitio: c.zone?.name ?? c.sitio,
      apunte: c.notes,
      // El último intercambio: a cambio de quién llegó, para su ficha
      llegoPorIntercambio:
        leerHistoria(c.historia).findLast((s) => s.tipo === "intercambio")?.de ?? null,
      lugar: c.lugar,
      hueco: c.hueco,
      creado: c.createdAt.getTime(),
      vinculo: c.vinculo,
      muerta: Boolean(c.deathId),
      bajaId: c.deathId,
      causa: c.muerte?.cause ?? null,
      evoluciones: c.deathId ? [] : evolucionesDe(quien?.pokemonId, c.species, enAnil),
      combate: fichaDeCombate(c, generacion, quien?.pokemonId ?? null, mega !== null),
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
      fondos: leerFondos(j.fondosDeCaja),
      nombres: leerNombresDeCaja(j.nombresDeCaja),
      asId: j.aceCaptureId,
      asPorque: j.aceReason,
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
      // Y con su número y si es shiny se le pone al hall la ilustración grande
      pokemonId: true,
      shiny: true,
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

/** La ficha completa de una captura, lista para pintar */
/** «Mega-Charizard X» → «Mega X»: la especie ya se dice al lado */
export function rotuloDeMega(etiqueta: string | undefined, especie: string) {
  if (!etiqueta) return "Mega";
  const sinEspecie = etiqueta.replace(new RegExp(especie.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "");
  return sinEspecie.replace(/-/g, " ").replace(/\s+/g, " ").trim() || "Mega";
}

export function fichaDeCombate(
  c: {
    naturaleza: string | null;
    objeto: string | null;
    movimientos: unknown;
    habilidad?: string | null;
    habilidadMega?: string | null;
  },
  generacion: number,
  base: number | null = null,
  conMega = false,
): FichaDeCombate {
  const naturaleza = naturalezaPorSlug(c.naturaleza);
  const objeto = c.objeto ? objetoPorSlug(c.objeto) : undefined;
  return {
    naturaleza: naturaleza
      ? { slug: naturaleza.s, nombre: naturaleza.n, sube: naturaleza.sube, baja: naturaleza.baja }
      : null,
    objeto: objeto ? { slug: objeto.slug, nombre: objeto.nombre, imagen: spriteDeObjeto(objeto.slug) } : null,
    // La de la mega empieza vacía: no hereda la de siempre
    habilidad: habilidadParaVer(conMega ? c.habilidadMega : c.habilidad, generacion === GENERACION_ANIL),
    conMega,
    habilidades: { normal: c.habilidad ?? null, mega: c.habilidadMega ?? null },
    base,
    movimientos: leerMovimientos(c.movimientos).flatMap((m) => movimientoParaVer(m, generacion) ?? []),
  };
}
