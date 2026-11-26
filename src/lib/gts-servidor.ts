import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkpointsDelLocke, getJornadasParaCheckpoints, jornadaJugada } from "@/lib/checkpoints";
import {
  OFERTA_QUE_GASTA,
  boletosQueQuedan,
  ventanaDeLaGts,
  type FichaDeGts,
  type VentanaDeLaGts,
} from "@/lib/gts";
import { esElMismo, leerHistoria } from "@/lib/historia";
import { soltarAs } from "@/lib/as-servidor";
import { formatoDePartida } from "@/lib/partida/formato";
import { GENERACION_DE, type Familia } from "@/lib/partida/oficial/comun";
import { fichaCompleta67 } from "@/lib/partida/oficial/ficha-gen67";
import { traducirOficial } from "@/lib/partida/traducir-oficial";
import { esPokemonAnil } from "@/lib/anil-basico";
import { urlDeContenido } from "@/lib/imagen-url";
import { movimientoPorSlug, naturalezaPorSlug } from "@/lib/movimientos";
import { habilidadPorSlug } from "@/lib/habilidades";
import { objetoPorSlug } from "@/lib/objetos";
import { findSpecies } from "@/lib/pokedex";

/**
 * Las consultas de la GTS (las reglas, en `lib/gts.ts`). Lo que hace un
 * intercambio va aquí y no en la acción: un fichero `"use server"` convierte
 * en acción todo lo que exporta, y esto no comprueba permisos.
 */

/** Los juegos en los que la GTS va con la partida: los de 6ª y 7ª, que es lo que se sabe leer entero */
const FAMILIAS_CON_FICHA: Familia[] = ["xy", "oras", "sm", "usum"];

export function partidaDeLaGts(locke: { game?: string | null; gameId?: string | null; juegoNoOficial?: boolean }) {
  const formato = formatoDePartida(locke);
  return formato?.tipo === "oficial" && FAMILIAS_CON_FICHA.includes(formato.familia) ? formato.familia : null;
}

/**
 * Dónde está la GTS del locke: los checkpoints, quién ha pasado cada level cap
 * y cuántas jornadas se han acabado (que son los boletos que se han ganado).
 */
export const getMomentoDeLaGts = cache(async (competitionId: string) => {
  const [hitos, jornadas, pasados] = await Promise.all([
    prisma.levelCap.findMany({
      where: { competitionId },
      orderBy: { position: "asc" },
      select: { id: true, label: true, jornadaDespues: true },
    }),
    getJornadasParaCheckpoints(competitionId),
    prisma.gymClear.findMany({
      where: { levelCap: { competitionId } },
      select: { participantId: true, levelCapId: true },
    }),
  ]);
  const checkpoints = checkpointsDelLocke(hitos, jornadas);
  const porJugador = new Map<string, Set<string>>();
  for (const p of pasados) {
    porJugador.set(p.participantId, (porJugador.get(p.participantId) ?? new Set()).add(p.levelCapId));
  }
  const actual = checkpoints.find((c) => !c.jugada)?.numero ?? null;
  return {
    /** El número del checkpoint cuya ventana está en marcha, o null */
    actual,
    jornadasAcabadas: jornadas.filter(jornadaJugada).length,
    hayCheckpoints: checkpoints.length > 0,
    ventanaDe: (participantId: string | null): VentanaDeLaGts =>
      ventanaDeLaGts(checkpoints, porJugador.get(participantId ?? "") ?? new Set()),
  };
});

/**
 * Lo que caducó: lo abierto de un checkpoint cuya jornada ya se acabó vuelve a
 * su dueño. Se hace al mirar y al tocar, que no hay nada que corra solo; lo que
 * espera a la organización no caduca, eso lo decide ella.
 */
export async function caducarLaGts(competitionId: string, actual: number | null) {
  const viejos = await prisma.gtsDeposito.findMany({
    where: { competitionId, estado: "abierto", ...(actual === null ? {} : { checkpoint: { not: actual } }) },
    select: { id: true },
  });
  if (!viejos.length) return;
  const ids = viejos.map((d) => d.id);
  await prisma.$transaction([
    prisma.gtsDeposito.updateMany({ where: { id: { in: ids }, estado: "abierto" }, data: { estado: "caducado" } }),
    prisma.gtsOferta.updateMany({
      where: { depositoId: { in: ids }, estado: "pendiente" },
      data: { estado: "caducada", resueltaEl: new Date() },
    }),
  ]);
}

/** Los intercambios en los que ha estado cada uno (hechos o esperando a la organización) */
export async function intercambiosDe(competitionId: string, participantIds: string[]) {
  const ofertas = await prisma.gtsOferta.findMany({
    where: {
      estado: { in: [...OFERTA_QUE_GASTA] },
      deposito: { competitionId },
      OR: [{ participantId: { in: participantIds } }, { deposito: { participantId: { in: participantIds } } }],
    },
    select: { participantId: true, deposito: { select: { participantId: true } } },
  });
  const cuenta = new Map(participantIds.map((id) => [id, 0]));
  for (const o of ofertas) {
    for (const id of new Set([o.participantId, o.deposito.participantId])) {
      if (cuenta.has(id)) cuenta.set(id, cuenta.get(id)! + 1);
    }
  }
  return cuenta;
}

export async function boletosDe(competitionId: string, participantId: string) {
  const [momento, hechos] = await Promise.all([
    getMomentoDeLaGts(competitionId),
    intercambiosDe(competitionId, [participantId]),
  ]);
  return boletosQueQuedan(momento.jornadasAcabadas, hechos.get(participantId) ?? 0);
}

/** Las capturas que ya están en juego en la GTS: en un depósito o en una oferta sin resolver */
export async function capturasEnLaGts(competitionId: string) {
  const [depositos, ofertas] = await Promise.all([
    prisma.gtsDeposito.findMany({
      where: { competitionId, estado: { in: ["abierto", "reservado"] } },
      select: { captureId: true },
    }),
    prisma.gtsOferta.findMany({
      where: { estado: { in: ["pendiente", "porAprobar"] }, deposito: { competitionId } },
      select: { captureId: true },
    }),
  ]);
  return new Set([...depositos, ...ofertas].map((x) => x.captureId));
}

const CAMPOS_DE_LA_CAPTURA = {
  id: true,
  participantId: true,
  species: true,
  pokemonId: true,
  nickname: true,
  shiny: true,
  image: true,
  naturaleza: true,
  habilidad: true,
  objeto: true,
  movimientos: true,
  failed: true,
  deathId: true,
} as const;

type CapturaParaGts = Prisma.CaptureGetPayload<{ select: typeof CAMPOS_DE_LA_CAPTURA }>;

export function getCapturaParaGts(captureId: string) {
  return prisma.capture.findUnique({ where: { id: captureId }, select: CAMPOS_DE_LA_CAPTURA });
}

/** Solo las imágenes del almacén: una antigua metida entera haría pesar cada fila de la GTS */
const imagenDe = (image: string | null) => (image?.startsWith("ref:") ? image : null);

/** La ficha con lo que sabe la app (en los juegos cuya partida no se lee entera) */
export function fichaDeLaApp(c: CapturaParaGts): FichaDeGts {
  return {
    especie: c.species,
    pokemonId: c.pokemonId,
    mote: c.nickname,
    shiny: c.shiny,
    imagen: imagenDe(c.image),
    nivel: null,
    sexo: null,
    naturaleza: c.naturaleza,
    habilidad: c.habilidad,
    objeto: c.objeto,
    movimientos: Array.isArray(c.movimientos) ? c.movimientos.filter((m): m is string => typeof m === "string") : [],
    ivs: null,
    evs: null,
    entrenador: null,
    ball: null,
    dePartida: false,
  };
}

/**
 * La ficha sacada de la partida: el servidor lee los bytes del hueco él mismo.
 * Tiene que ser **el mismo pokémon** que el elegido de la caja de la app (por
 * mote y familia, como en todo lo demás); la especie, el mote y el sprite son
 * los de la app, y lo demás, lo del juego.
 */
export function fichaDeLaPartida(
  c: CapturaParaGts,
  pkBase64: string,
  familia: Familia,
): { ficha: FichaDeGts; pk: string } | { error: string } {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(pkBase64, "base64"));
  } catch {
    return { error: "No entiendo lo que ha llegado de la partida. Vuelve a subirla." };
  }
  const generacion = GENERACION_DE[familia] === 6 ? 6 : 7;
  const leida = fichaCompleta67(bytes, generacion, familia === "usum");
  const traducido = leida ? traducirOficial(leida.pokemon, familia) : null;
  if (!leida || !traducido) return { error: "Ese hueco de la partida no tiene un pokémon que se pueda leer." };
  // El mote tal cual también: si se llama como su especie en español, el lector lo da por «sin mote»
  const mismo = (mote: string | null) =>
    esElMismo(c, { species: traducido.especie, nickname: mote, pokemonId: traducido.pokemonId });
  if (!mismo(traducido.mote) && !mismo(leida.pokemon.mote)) {
    const suNombre = traducido.mote ? `${traducido.mote} (${traducido.especie})` : traducido.especie;
    return { error: `El de la partida es ${suNombre}, y no es el mismo que el elegido de tu caja.` };
  }
  return {
    pk: Buffer.from(bytes).toString("base64"),
    ficha: {
      ...fichaDeLaApp(c),
      nivel: leida.nivel,
      sexo: leida.sexo,
      naturaleza: traducido.naturaleza,
      habilidad: traducido.habilidad,
      objeto: traducido.objeto,
      movimientos: traducido.movimientos,
      ivs: leida.ivs,
      evs: leida.evs,
      entrenador: leida.entrenador,
      ball: leida.ball,
      dePartida: true,
    },
  };
}

/**
 * **El intercambio**: cada pokémon pasa a la caja del otro y **ocupa el sitio
 * del que se va** —su hueco y su ruta, que es el encuentro que ya se gastó—,
 * como el intercambio con un entrenador del juego. La captura en sí viaja (su
 * historia, su ficha y lo que ha hecho en los combates van con él), y dónde se
 * capturó de verdad queda en su historia.
 *
 * Antes, cada uno suelta su as si era ese, y se borra lo que se podía deshacer
 * de esos dos pokémon: devolverlos a un hueco de una caja que ya no es la suya
 * los dejaría donde no deben.
 */
export async function hacerIntercambio(deposito: { captureId: string }, oferta: { captureId: string }) {
  const [a, b] = await Promise.all(
    [deposito.captureId, oferta.captureId].map((id) =>
      prisma.capture.findUnique({
        where: { id },
        select: {
          id: true,
          participantId: true,
          species: true,
          nickname: true,
          lugar: true,
          hueco: true,
          zoneId: true,
          sitio: true,
          historia: true,
          failed: true,
          deathId: true,
          zone: { select: { name: true } },
          participant: { select: { displayName: true } },
        },
      }),
    ),
  );
  if (!a || !b || a.failed || b.failed || a.deathId || b.deathId) {
    throw new Error("Uno de los dos pokémon ya no está o ha caído: el intercambio no se puede hacer.");
  }
  await Promise.all([soltarAs(a.id), soltarAs(b.id)]);

  const fecha = new Date().toISOString();
  const nombre = (c: { nickname: string | null; species: string }) => c.nickname ?? c.species;
  const historiaNueva = (de: typeof a, otro: typeof b) => [
    ...leerHistoria(de.historia),
    {
      tipo: "gts" as const,
      de: de.participant.displayName,
      a: otro.participant.displayName,
      por: nombre(otro),
      // Solo la primera vez cuenta: es donde se capturó de verdad
      sitio: de.zone?.name ?? de.sitio ?? null,
      fecha,
    },
  ];
  const sitioDe = (c: typeof a) => ({ lugar: c.lugar, hueco: c.hueco, zoneId: c.zoneId, sitio: c.sitio });

  const cambios = await prisma.cambioDeCaja.findMany({
    where: { participantId: { in: [a.participantId, b.participantId] } },
    select: { id: true, antes: true, capturas: true },
  });
  const tocan = cambios.filter((c) => {
    const ids = new Set([
      ...c.capturas,
      ...(Array.isArray(c.antes) ? c.antes.map((f) => (f as { id?: string } | null)?.id) : []),
    ]);
    return ids.has(a.id) || ids.has(b.id);
  });

  await prisma.$transaction([
    prisma.capture.update({
      where: { id: a.id },
      data: { participantId: b.participantId, ...sitioDe(b), vinculo: null, historia: historiaNueva(a, b) },
    }),
    prisma.capture.update({
      where: { id: b.id },
      data: { participantId: a.participantId, ...sitioDe(a), vinculo: null, historia: historiaNueva(b, a) },
    }),
    prisma.cambioDeCaja.deleteMany({ where: { id: { in: tocan.map((c) => c.id) } } }),
  ]);
}

// ---------------------------------------------------------------------------
// Lo que se enseña
// ---------------------------------------------------------------------------

/**
 * La ficha lista para pintar, con los nombres en español. **El modo oculto se
 * aplica aquí**, en el servidor: lo que no se puede ver ni siquiera viaja al
 * navegador.
 */
export type FichaVista = {
  especie: string;
  pokemonId: number | null;
  mote: string | null;
  shiny: boolean;
  imagen: string | null;
  nivel: number | null;
  sexo: "M" | "F" | null;
  oculta: boolean;
  naturaleza: string | null;
  habilidad: string | null;
  objeto: string | null;
  movimientos: string[];
  ivs: number[] | null;
  evs: number[] | null;
  entrenador: { nombre: string; id: number } | null;
  ball: string | null;
  dePartida: boolean;
};

/** Lo guardado lo escribe solo el servidor, pero por si algún campo faltara en una antigua */
function leerFicha(valor: unknown): FichaDeGts {
  const f = (valor ?? {}) as Partial<FichaDeGts>;
  return {
    especie: f.especie ?? "?",
    pokemonId: f.pokemonId ?? null,
    mote: f.mote ?? null,
    shiny: f.shiny === true,
    imagen: f.imagen ?? null,
    nivel: f.nivel ?? null,
    sexo: f.sexo ?? null,
    naturaleza: f.naturaleza ?? null,
    habilidad: f.habilidad ?? null,
    objeto: f.objeto ?? null,
    movimientos: Array.isArray(f.movimientos) ? f.movimientos : [],
    ivs: f.ivs ?? null,
    evs: f.evs ?? null,
    entrenador: f.entrenador ?? null,
    ball: f.ball ?? null,
    dePartida: f.dePartida === true,
  };
}

export function fichaVista(
  valor: unknown,
  como: { aVista: boolean; esSuyo: boolean; hecho: boolean },
  conAnil: boolean,
): FichaVista {
  const f = leerFicha(valor);
  const base = {
    especie: f.especie,
    pokemonId: f.pokemonId,
    mote: f.mote,
    shiny: f.shiny,
    imagen: f.imagen ? urlDeContenido(f.imagen) : null,
    nivel: f.nivel,
    sexo: f.sexo,
  };
  if (!(como.aVista || como.esSuyo || como.hecho)) {
    return {
      ...base,
      oculta: true,
      naturaleza: null,
      habilidad: null,
      objeto: null,
      movimientos: [],
      ivs: null,
      evs: null,
      entrenador: null,
      ball: null,
      dePartida: f.dePartida,
    };
  }
  const naturaleza = naturalezaPorSlug(f.naturaleza);
  return {
    ...base,
    oculta: false,
    naturaleza: naturaleza?.n ?? f.naturaleza,
    habilidad: f.habilidad ? (habilidadPorSlug(f.habilidad, conAnil)?.n ?? f.habilidad) : null,
    objeto: f.objeto ? (objetoPorSlug(f.objeto)?.nombre ?? f.objeto) : null,
    movimientos: f.movimientos.map((m) => movimientoPorSlug(m)?.n ?? m),
    ivs: f.ivs,
    evs: f.evs,
    entrenador: f.entrenador,
    ball: f.ball,
    dePartida: f.dePartida,
  };
}

type Jugador = { participantId: string; nombre: string; color: string };

export type OfertaVista = {
  id: string;
  de: Jugador;
  ficha: FichaVista;
  estado: string;
  esMia: boolean;
  fecha: string;
};

export type DepositoVisto = {
  id: string;
  dueno: Jugador;
  ficha: FichaVista;
  busco: string | null;
  estado: string;
  esMio: boolean;
  /** Si es tuyo, todas las que te han hecho; si no, solo la tuya */
  ofertas: OfertaVista[];
};

export type IntercambioVisto = {
  ofertaId: string;
  estado: "porAprobar" | "aceptada";
  fecha: string;
  a: { jugador: Jugador; ficha: FichaVista };
  b: { jugador: Jugador; ficha: FichaVista };
  /** Qué lado es quien mira, si es uno de los dos */
  mio: "a" | "b" | null;
  /** Cuándo se bajó su partida con el del otro dentro, quien mira */
  metido: string | null;
};

export type CapturaParaElegir = {
  id: string;
  especie: string;
  mote: string | null;
  pokemonId: number | null;
  /** El número nacional, para encontrarlo en la partida */
  dex: number | null;
  shiny: boolean;
  imagen: string | null;
  enElEquipo: boolean;
};

/**
 * Todo lo de la pantalla de la GTS para quien mira. `yo` es su ficha de jugador
 * si juega este locke.
 */
export async function getGts(
  locke: { id: string; gtsAVista: boolean; game: string | null; gameId: string | null; juegoNoOficial: boolean },
  yo: string | null,
  jugadores: Jugador[],
) {
  const momento = await getMomentoDeLaGts(locke.id);
  await caducarLaGts(locke.id, momento.actual);
  const conAnil = esPokemonAnil(locke);
  const jugador = new Map(jugadores.map((j) => [j.participantId, j]));
  const quien = (id: string): Jugador => jugador.get(id) ?? { participantId: id, nombre: "Alguien", color: "#64748b" };

  const [abiertos, hechos, misCapturas, enJuego, cuentas] = await Promise.all([
    prisma.gtsDeposito.findMany({
      where: { competitionId: locke.id, estado: { in: ["abierto", "reservado"] } },
      orderBy: { createdAt: "desc" },
      include: { ofertas: { where: { estado: { in: ["pendiente", "porAprobar"] } }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.gtsOferta.findMany({
      where: { estado: { in: [...OFERTA_QUE_GASTA] }, deposito: { competitionId: locke.id } },
      orderBy: { resueltaEl: "desc" },
      take: 40,
      include: { deposito: true },
    }),
    yo
      ? prisma.capture.findMany({
          where: { participantId: yo, failed: false, deathId: null },
          orderBy: [{ lugar: "desc" }, { hueco: "asc" }],
          select: { id: true, species: true, nickname: true, pokemonId: true, shiny: true, image: true, lugar: true },
        })
      : [],
    capturasEnLaGts(locke.id),
    intercambiosDe(
      locke.id,
      jugadores.map((j) => j.participantId),
    ),
  ]);

  const ofertaVista = (o: (typeof abiertos)[number]["ofertas"][number], aVista: boolean): OfertaVista => ({
    id: o.id,
    de: quien(o.participantId),
    ficha: fichaVista(o.ficha, { aVista, esSuyo: o.participantId === yo, hecho: false }, conAnil),
    estado: o.estado,
    esMia: o.participantId === yo,
    fecha: o.createdAt.toISOString(),
  });

  const depositos: DepositoVisto[] = abiertos
    .filter((d) => d.estado === "abierto")
    .map((d) => {
      const esMio = d.participantId === yo;
      return {
        id: d.id,
        dueno: quien(d.participantId),
        ficha: fichaVista(d.ficha, { aVista: locke.gtsAVista, esSuyo: esMio, hecho: false }, conAnil),
        busco: d.busco,
        estado: d.estado,
        esMio,
        ofertas: d.ofertas
          .filter((o) => esMio || o.participantId === yo)
          .map((o) => ofertaVista(o, locke.gtsAVista)),
      };
    });

  const intercambio = (o: (typeof hechos)[number]): IntercambioVisto => {
    const hecho = o.estado === "aceptada";
    // Esperando al veto todavía no se ha recibido: lo de cada uno sigue siendo como en la GTS
    const como = (de: string) => ({ aVista: locke.gtsAVista, esSuyo: de === yo, hecho });
    return {
      ofertaId: o.id,
      estado: o.estado as IntercambioVisto["estado"],
      fecha: (o.resueltaEl ?? o.createdAt).toISOString(),
      a: { jugador: quien(o.deposito.participantId), ficha: fichaVista(o.deposito.ficha, como(o.deposito.participantId), conAnil) },
      b: { jugador: quien(o.participantId), ficha: fichaVista(o.ficha, como(o.participantId), conAnil) },
      mio: o.deposito.participantId === yo ? "a" : o.participantId === yo ? "b" : null,
      metido: (o.deposito.participantId === yo ? o.metidoAlQueLoPuso : o.participantId === yo ? o.metidoAlQueOfrecio : null)?.toISOString() ?? null,
    };
  };

  return {
    momento: { actual: momento.actual, hayCheckpoints: momento.hayCheckpoints, ventana: momento.ventanaDe(yo) },
    boletos: jugadores.map((j) => ({
      ...j,
      quedan: boletosQueQuedan(momento.jornadasAcabadas, cuentas.get(j.participantId) ?? 0),
    })),
    depositos,
    intercambios: hechos.map(intercambio),
    misCapturas: misCapturas
      .filter((c) => !enJuego.has(c.id))
      .map(
        (c): CapturaParaElegir => ({
          id: c.id,
          especie: c.species,
          mote: c.nickname,
          pokemonId: c.pokemonId,
          dex: findSpecies(c.species, conAnil)?.dex ?? null,
          shiny: c.shiny,
          imagen: c.image?.startsWith("ref:") ? urlDeContenido(c.image) : null,
          enElEquipo: c.lugar === "equipo",
        }),
      ),
  };
}
