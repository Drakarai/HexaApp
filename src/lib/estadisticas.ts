import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFinalFourState } from "@/lib/final-four";
import { esPokemonAnil } from "@/lib/anil";
import { registroDeLaRepeticion } from "@/lib/repeticion-servidor";
import {
  estadisticasDeLaRepeticion,
  leerRepeticion,
  quienEsQuien,
  type EstadisticasDePokemon,
} from "@/lib/showdown";
import { esElMismo, normalizarMote } from "@/lib/historia";
import { raizDeLaFamilia } from "@/lib/evoluciones";
import { urlsDeImagen } from "@/lib/imagenes";
import { lockeTerminado } from "@/lib/campeon";
import { findSpecies } from "@/lib/pokedex";

/**
 * **Las estadísticas de los pokémon del locke**, sacadas de las repeticiones
 * de Showdown de los combates de jornada.
 *
 * - Cada repetición **se lee una vez** y lo sacado se guarda en el combate
 *   (`Match.estadisticas`), con el enlace del que salió: si se cambia el
 *   enlace, se vuelve a leer. Así las pantallas no dependen de Showdown.
 * - Se juntan **por pokémon de verdad**, el de la caja de su entrenador, aunque
 *   haya evolucionado: se reconoce por el mote y la familia (`esElMismo`), o
 *   por lo que eligió su dueño cuando hay dos iguales sin mote
 *   (`MatchPokemon.captureId`).
 * - **La forma que se enseña**: a los demás, la última con la que combatió (la
 *   caja es privada, y la de ahora podría chivar una evolución que aún no ha
 *   salido a combatir); a su dueño, la de ahora; y al acabar el locke, la de
 *   ahora para todos.
 */

/** De dónde sale un combate: los de jornada (con sus series), los retos y la final */
export type TipoDeCombate = "jornada" | "reto" | "final";
export type RefCombate = { tipo: TipoDeCombate; id: string };
export const claveDeRef = (r: RefCombate) => `${r.tipo}:${r.id}`;

/**
 * Cambia cuando se lee algo nuevo de las repeticiones: lo guardado con otra
 * versión se vuelve a leer, como si hubiera cambiado el enlace.
 */
const VERSION = 2;

/** Lo que se guarda en `estadisticas` de cada combate */
export type GuardadoDelCombate = {
  version?: number;
  /** "p1" → el participante que jugaba con ese lado */
  lados: Record<string, string>;
  pokemon: EstadisticasDePokemon[];
};

type Miembro = { id: string; participantId: string; species: string; nickname: string | null; captureId: string | null };
const MIEMBRO = { id: true, participantId: true, species: true, nickname: true, captureId: true } as const;
const LADO = { select: { id: true, displayName: true } } as const;

/** Un combate de cualquier tipo, con lo que hace falta para sus estadísticas */
export type CombateConEquipos = {
  ref: RefCombate;
  competitionId: string;
  replayUrl: string | null;
  /** Lo guardado, si sigue valiendo para su enlace */
  guardado: GuardadoDelCombate | null;
  /** Se jugó de verdad: tiene ganador y no fue por retirada */
  jugado: boolean;
  /** Los dos que lo juegan; vacío si aún no se sabe (una llave sin decidir) */
  lados: { id: string; nombre: string }[];
  /** Los pokémon apuntados de los dos */
  equipo: Miembro[];
};

function valido(estadisticas: unknown, de: string | null, replayUrl: string | null) {
  const g = estadisticas as GuardadoDelCombate | null;
  return g && replayUrl && de === replayUrl && g.version === VERSION ? g : null;
}

const mismaPareja = (a: { participantAId: string; participantBId: string }, b: typeof a) =>
  (a.participantAId === b.participantAId && a.participantBId === b.participantBId) ||
  (a.participantAId === b.participantBId && a.participantBId === b.participantAId);

/**
 * Los de jornada. En una **serie al mejor de tres** el equipo se apunta una vez
 * para toda la serie y va colgado de uno de sus combates: los demás lo toman
 * de ahí.
 */
async function combatesDeJornada(where: Prisma.MatchWhereInput): Promise<CombateConEquipos[]> {
  const combates = await prisma.match.findMany({
    where,
    orderBy: [{ matchday: { position: "asc" } }, { position: "asc" }],
    select: {
      id: true,
      matchdayId: true,
      participantAId: true,
      participantBId: true,
      winnerId: true,
      porRetirada: true,
      replayUrl: true,
      estadisticas: true,
      estadisticasDe: true,
      participantA: LADO,
      participantB: LADO,
      team: { select: MIEMBRO, orderBy: { position: "asc" } },
      matchday: { select: { competitionId: true } },
    },
  });
  const sinEquipo = combates.filter((c) => !c.team.length);
  const hermanos = sinEquipo.length
    ? await prisma.match.findMany({
        where: { matchdayId: { in: [...new Set(sinEquipo.map((c) => c.matchdayId))] }, team: { some: {} } },
        orderBy: { position: "asc" },
        select: {
          matchdayId: true,
          participantAId: true,
          participantBId: true,
          team: { select: MIEMBRO, orderBy: { position: "asc" } },
        },
      })
    : [];
  return combates.map((c) => ({
    ref: { tipo: "jornada", id: c.id },
    competitionId: c.matchday.competitionId,
    replayUrl: c.replayUrl,
    guardado: valido(c.estadisticas, c.estadisticasDe, c.replayUrl),
    jugado: Boolean(c.winnerId && !c.porRetirada),
    lados: [c.participantA, c.participantB].map((p) => ({ id: p.id, nombre: p.displayName })),
    equipo: c.team.length
      ? c.team
      : (hermanos.find((h) => h.matchdayId === c.matchdayId && mismaPareja(h, c))?.team ?? []),
  }));
}

async function combatesDeReto(where: Prisma.ChallengeMatchWhereInput): Promise<CombateConEquipos[]> {
  const retos = await prisma.challengeMatch.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      competitionId: true,
      winnerId: true,
      replayUrl: true,
      estadisticas: true,
      estadisticasDe: true,
      participantA: LADO,
      participantB: LADO,
      team: { select: MIEMBRO, orderBy: { position: "asc" } },
    },
  });
  return retos.map((r) => ({
    ref: { tipo: "reto", id: r.id },
    competitionId: r.competitionId,
    replayUrl: r.replayUrl,
    guardado: valido(r.estadisticas, r.estadisticasDe, r.replayUrl),
    jugado: Boolean(r.winnerId),
    lados: [r.participantA, r.participantB].map((p) => ({ id: p.id, nombre: p.displayName })),
    equipo: r.team,
  }));
}

/**
 * Los de la final. Quién juega cada uno no se guarda, se deduce del cuadro
 * (ver lib/final-four.ts); el equipo es el de cada uno para toda la final.
 * Los que «no cuentan» porque la serie ya estaba decidida, fuera.
 */
async function combatesDeLaFinal(competitionId: string, soloId?: string): Promise<CombateConEquipos[]> {
  const estado = await getFinalFourState(competitionId);
  if (!("llaves" in estado)) return [];
  const [guardados, equipos] = await Promise.all([
    prisma.finalMatch.findMany({
      where: { finalFourId: estado.finalFourId, ...(soloId ? { id: soloId } : {}) },
      select: { id: true, key: true, winnerId: true, replayUrl: true, estadisticas: true, estadisticasDe: true },
    }),
    prisma.matchPokemon.findMany({
      where: { finalFourId: estado.finalFourId },
      orderBy: { position: "asc" },
      select: MIEMBRO,
    }),
  ]);
  const combates: CombateConEquipos[] = [];
  for (const llave of estado.llaves) {
    for (const enLaLlave of llave.combates) {
      const g = guardados.find((x) => x.key === enLaLlave.key);
      if (!g || enLaLlave.sobra) continue;
      const lados = llave.a && llave.b
        ? [llave.a, llave.b].map((p) => ({ id: p.participantId, nombre: p.displayName }))
        : [];
      combates.push({
        ref: { tipo: "final", id: g.id },
        competitionId,
        replayUrl: g.replayUrl,
        guardado: valido(g.estadisticas, g.estadisticasDe, g.replayUrl),
        jugado: Boolean(g.winnerId),
        lados,
        equipo: equipos.filter((e) => lados.some((l) => l.id === e.participantId)),
      });
    }
  }
  return combates;
}

/** Un combate suelto, de donde sea */
export async function cargarCombate(ref: RefCombate): Promise<CombateConEquipos | null> {
  const id = String(ref?.id ?? "");
  if (ref?.tipo === "jornada") return (await combatesDeJornada({ id }))[0] ?? null;
  if (ref?.tipo === "reto") return (await combatesDeReto({ id }))[0] ?? null;
  if (ref?.tipo === "final") {
    const fila = await prisma.finalMatch.findUnique({
      where: { id },
      select: { finalFour: { select: { competitionId: true } } },
    });
    return fila ? ((await combatesDeLaFinal(fila.finalFour.competitionId, id))[0] ?? null) : null;
  }
  return null;
}

/**
 * Varios a la vez, en el orden pedido: de cada sitio, una sola consulta. La
 * final se calcula una vez, que sacar quién juega cada llave cuesta.
 */
export async function cargarCombates(refs: RefCombate[]): Promise<(CombateConEquipos | null)[]> {
  const de = (tipo: TipoDeCombate) => refs.filter((r) => r.tipo === tipo).map((r) => String(r.id));
  const [jornadas, retos, finales] = await Promise.all([
    de("jornada").length ? combatesDeJornada({ id: { in: de("jornada") } }) : [],
    de("reto").length ? combatesDeReto({ id: { in: de("reto") } }) : [],
    (async () => {
      const ids = de("final");
      if (!ids.length) return [];
      const fila = await prisma.finalMatch.findFirst({
        where: { id: { in: ids } },
        select: { finalFour: { select: { competitionId: true } } },
      });
      return fila ? combatesDeLaFinal(fila.finalFour.competitionId) : [];
    })(),
  ]);
  const todos = new Map([...jornadas, ...retos, ...finales].map((c) => [claveDeRef(c.ref), c]));
  return refs.map((r) => todos.get(claveDeRef(r)) ?? null);
}

/** Todos los combates del locke, de los tres sitios */
export async function combatesDelLocke(competitionId: string) {
  const [jornadas, retos, final] = await Promise.all([
    combatesDeJornada({ matchday: { competitionId } }),
    combatesDeReto({ competitionId }),
    combatesDeLaFinal(competitionId),
  ]);
  return [...jornadas, ...retos, ...final];
}

async function guardar(ref: RefCombate, guardado: GuardadoDelCombate, replayUrl: string) {
  const data = { estadisticas: guardado as unknown as Prisma.InputJsonValue, estadisticasDe: replayUrl };
  if (ref.tipo === "jornada") await prisma.match.update({ where: { id: ref.id }, data });
  else if (ref.tipo === "reto") await prisma.challengeMatch.update({ where: { id: ref.id }, data });
  else await prisma.finalMatch.update({ where: { id: ref.id }, data });
}

/**
 * Lo de un combate: lo guardado si sigue valiendo, y si no, se lee la
 * repetición y se guarda. Null si no tiene repetición.
 */
export async function estadisticasDeUnCombate(
  ref: RefCombate,
  yaCargado?: CombateConEquipos | null,
): Promise<{ guardado: GuardadoDelCombate | null; combate: CombateConEquipos | null; error?: string }> {
  const combate = yaCargado ?? (await cargarCombate(ref));
  if (!combate?.replayUrl) return { guardado: null, combate };
  if (combate.guardado) return { guardado: combate.guardado, combate };
  if (combate.lados.length !== 2) return { guardado: null, combate, error: "Todavía no se sabe quién juega este combate." };

  const competicion = await prisma.competition.findUnique({
    where: { id: combate.competitionId },
    select: { game: true, gameId: true, juegoNoOficial: true },
  });
  const conAnil = Boolean(competicion && esPokemonAnil(competicion));
  const leido = await registroDeLaRepeticion(combate.replayUrl, conAnil);
  if ("error" in leido) return { guardado: null, combate, error: leido.error };

  const { pokemon } = estadisticasDeLaRepeticion(leido.log, conAnil);
  const jugadores = leerRepeticion(leido.log, conAnil);
  if (jugadores.length !== 2) return { guardado: null, combate, error: "Esa repetición no es de un combate de dos." };
  const deAqui = combate.lados.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    pokemon: combate.equipo
      .filter((t) => t.participantId === p.id)
      .map((t) => ({ especie: t.species, mote: t.nickname })),
  }));
  const { ids } = quienEsQuien(
    jugadores.map((j) => ({ nombre: j.nombre, equipo: j.equipo.map((p) => ({ especie: p.especie, mote: p.mote })) })),
    deAqui,
  );
  const guardado: GuardadoDelCombate = {
    version: VERSION,
    lados: { [jugadores[0].lado]: ids[0], [jugadores[1].lado]: ids[1] },
    pokemon,
  };
  await guardar(combate.ref, guardado, combate.replayUrl);
  return { guardado, combate: { ...combate, guardado } };
}

/** Los números que se suman de cada pokémon */
export type Numeros = {
  combates: number;
  kos: number;
  criticosHechos: number;
  criticosRecibidos: number;
  supereficaces: number;
  fallos: number;
  esquivados: number;
  danoHecho: number;
  danoRecibido: number;
  /** El daño recibido en los combates en que no cayó */
  aguantado: number;
  /** Los KOs del mejor combate */
  mejorBarrida: number;
  turnosPerdidos: number;
  /** Veces que ganó su lado siendo el único que quedaba */
  ultimoEnPie: number;
  caidas: number;
  /** Desde que se capturó hasta que cayó (o hasta hoy) */
  diasVivo: number | null;
};

export type PokemonConNumeros = {
  /** Quién es, para juntarlo: "c:<captura>" o, si no se sabe cuál, "g:<…>" */
  clave: string;
  participantId: string;
  captureId: string | null;
  especie: string;
  mote: string | null;
  pokemonId: number | null;
  imagen: string | null;
  numeros: Numeros;
};

const CERO: Omit<Numeros, "diasVivo"> = {
  combates: 0,
  kos: 0,
  criticosHechos: 0,
  criticosRecibidos: 0,
  supereficaces: 0,
  fallos: 0,
  esquivados: 0,
  danoHecho: 0,
  danoRecibido: 0,
  aguantado: 0,
  mejorBarrida: 0,
  turnosPerdidos: 0,
  ultimoEnPie: 0,
  caidas: 0,
};

const DIA = 24 * 60 * 60 * 1000;
const dexDe = (especie: string) => findSpecies(especie, true)?.dex ?? null;

/**
 * Todos los pokémon que han combatido en el locke —jornadas, series, retos y
 * final—, con sus números juntos. `quienMira` decide la forma que se enseña
 * (ver arriba).
 */
export async function getEstadisticasDelLocke(competitionId: string, quienMira: string | null) {
  const [combates, capturas, participantes, terminado] = await Promise.all([
    combatesDelLocke(competitionId),
    prisma.capture.findMany({
      where: { participant: { competitionId }, failed: false },
      select: {
        id: true,
        participantId: true,
        species: true,
        nickname: true,
        pokemonId: true,
        createdAt: true,
        deathId: true,
      },
    }),
    prisma.participant.findMany({ where: { competitionId }, select: { id: true, userId: true } }),
    lockeTerminado(competitionId),
  ]);
  const deQuien = new Map(participantes.map((p) => [p.id, p.userId]));
  // Cuándo cayó cada uno, para los días que estuvo vivo
  const bajas = await prisma.death.findMany({
    where: { id: { in: capturas.map((c) => c.deathId).filter((id): id is string => Boolean(id)) } },
    select: { id: true, diedAt: true },
  });
  const cayoEl = new Map(bajas.map((b) => [b.id, b.diedAt.getTime()]));

  /** El pokémon de la caja que es, si se sabe sin dudar */
  const capturaDe = (participantId: string, quien: { species: string; nickname: string | null; pokemonId: number | null }) => {
    const candidatas = capturas.filter((c) => c.participantId === participantId && esElMismo(c, quien));
    return candidatas.length === 1 ? candidatas[0] : null;
  };
  const claveDeGrupo = (participantId: string, especie: string, mote: string | null, pokemonId: number | null) =>
    `g:${participantId}:${raizDeLaFamilia(pokemonId, especie) ?? normalizarMote(especie)}:${normalizarMote(mote)}`;

  type Acumulado = PokemonConNumeros & { ultimaEnCombate: { especie: string; pokemonId: number | null; teamId: string | null } };
  const porClave = new Map<string, Acumulado>();
  const acumulado = (clave: string, base: Omit<Acumulado, "numeros" | "clave" | "imagen">) => {
    let a = porClave.get(clave);
    if (!a) {
      a = { ...base, clave, imagen: null, numeros: { ...CERO, diasVivo: null } };
      porClave.set(clave, a);
    }
    return a;
  };

  let conRepeticion = 0;
  let jugados = 0;
  for (const combate of combates) {
    const { guardado } = combate;
    if (!combate.jugado && !guardado) continue;
    jugados++;
    if (guardado) conRepeticion++;
    const contados = new Set<string>();

    // Lo del equipo apuntado: cuenta como combate aunque no haya repetición
    const delEquipo = (t: Miembro) => {
      const pokemonId = dexDe(t.species);
      const captura = t.captureId
        ? (capturas.find((c) => c.id === t.captureId) ?? null)
        : capturaDe(t.participantId, { species: t.species, nickname: t.nickname, pokemonId });
      const clave = captura ? `c:${captura.id}` : claveDeGrupo(t.participantId, t.species, t.nickname, pokemonId);
      return { clave, captura, pokemonId };
    };
    for (const t of combate.equipo) {
      const { clave, captura, pokemonId } = delEquipo(t);
      const a = acumulado(clave, {
        participantId: t.participantId,
        captureId: captura?.id ?? null,
        especie: t.species,
        mote: t.nickname,
        pokemonId,
        ultimaEnCombate: { especie: t.species, pokemonId, teamId: t.id },
      });
      a.ultimaEnCombate = { especie: t.species, pokemonId, teamId: t.id };
      if (!contados.has(clave)) {
        a.numeros.combates++;
        contados.add(clave);
      }
    }

    if (!guardado) continue;
    const usados = new Set<string>();
    for (const e of guardado.pokemon) {
      const participantId = guardado.lados[e.lado];
      if (!participantId) continue;
      // Primero el del equipo apuntado (que puede llevar la captura elegida a mano)
      const enElEquipo = combate.equipo.find(
        (t) =>
          !usados.has(t.id) &&
          t.participantId === participantId &&
          esElMismo(
            { species: t.species, nickname: t.nickname, pokemonId: dexDe(t.species) },
            { species: e.especie, nickname: e.mote, pokemonId: e.pokemonId },
          ),
      );
      if (enElEquipo) usados.add(enElEquipo.id);
      const deEquipo = enElEquipo ? delEquipo(enElEquipo) : null;
      const captura =
        deEquipo?.captura ?? capturaDe(participantId, { species: e.especie, nickname: e.mote, pokemonId: e.pokemonId });
      const clave =
        deEquipo?.clave ?? (captura ? `c:${captura.id}` : claveDeGrupo(participantId, e.especie, e.mote, e.pokemonId));
      const a = acumulado(clave, {
        participantId,
        captureId: captura?.id ?? null,
        especie: e.especie,
        mote: e.mote,
        pokemonId: e.pokemonId,
        ultimaEnCombate: { especie: e.especie, pokemonId: e.pokemonId, teamId: enElEquipo?.id ?? null },
      });
      if (!contados.has(clave)) {
        a.numeros.combates++;
        contados.add(clave);
      }
      const n = a.numeros;
      n.kos += e.kos;
      n.criticosHechos += e.criticosHechos;
      n.criticosRecibidos += e.criticosRecibidos;
      n.supereficaces += e.supereficaces;
      n.fallos += e.fallos;
      n.esquivados += e.esquivados;
      n.danoHecho += e.danoHecho;
      n.danoRecibido += e.danoRecibido;
      n.turnosPerdidos += e.turnosPerdidos ?? 0;
      n.mejorBarrida = Math.max(n.mejorBarrida, e.kos);
      if (e.ultimoEnPie) n.ultimoEnPie++;
      if (e.cayo) n.caidas++;
      else n.aguantado += e.danoRecibido;
    }
  }

  // La forma que se enseña y su imagen
  const todos = [...porClave.values()];
  const conCaja = new Set(
    todos.filter((a) => a.captureId && (terminado || deQuien.get(a.participantId) === quienMira)).map((a) => a.clave),
  );
  const [imagenDeCaptura, imagenDeEquipo] = await Promise.all([
    urlsDeImagen("captura", todos.filter((a) => conCaja.has(a.clave)).map((a) => a.captureId!)),
    urlsDeImagen(
      "equipo",
      todos.map((a) => a.ultimaEnCombate.teamId).filter((id): id is string => Boolean(id)),
    ),
  ]);
  const ahora = Date.now();
  const pokemon: PokemonConNumeros[] = todos.map(({ ultimaEnCombate, ...a }) => {
    const captura = a.captureId ? capturas.find((c) => c.id === a.captureId) : null;
    const veLaDeAhora = Boolean(captura && conCaja.has(a.clave));
    const diasVivo = captura
      ? Math.max(0, Math.floor((((captura.deathId ? cayoEl.get(captura.deathId) : undefined) ?? ahora) - captura.createdAt.getTime()) / DIA))
      : null;
    return {
      ...a,
      especie: veLaDeAhora ? captura!.species : ultimaEnCombate.especie,
      pokemonId: veLaDeAhora ? captura!.pokemonId : ultimaEnCombate.pokemonId,
      mote: veLaDeAhora ? captura!.nickname : a.mote,
      imagen: veLaDeAhora
        ? imagenDeCaptura(captura!.id)
        : ultimaEnCombate.teamId
          ? imagenDeEquipo(ultimaEnCombate.teamId)
          : null,
      numeros: { ...a.numeros, diasVivo },
    };
  });

  return {
    pokemon,
    conRepeticion,
    jugados,
    sinLeer: combates.filter((c) => c.replayUrl && !c.guardado && c.lados.length === 2).map((c) => claveDeRef(c.ref)),
  };
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Los galardones: cada uno, el número que mira y cómo se dice. `minimo` es lo
 * que hace falta para llevárselo: una «barrida» de un solo KO no lo es.
 */
export const GALARDONES = [
  { id: "verdugo", titulo: "El Verdugo", icono: "🗡️", campo: "kos", minimo: 1, que: (n: number) => plural(n, "KO", "KOs") },
  { id: "barrendero", titulo: "Barrendero", icono: "🧹", campo: "mejorBarrida", minimo: 2, que: (n: number) => `${n} KOs en un combate` },
  { id: "dioses", titulo: "Tocado por los dioses", icono: "🎲", campo: "criticosHechos", minimo: 1, que: (n: number) => plural(n, "crítico", "críticos") },
  { id: "francotirador", titulo: "Francotirador", icono: "🎯", campo: "supereficaces", minimo: 1, que: (n: number) => plural(n, "golpe muy eficaz", "golpes muy eficaces") },
  { id: "muro", titulo: "El Muro", icono: "🛡️", campo: "aguantado", minimo: 1, que: (n: number) => `${Math.round(n)} % aguantado sin caer` },
  { id: "ultimo", titulo: "El último en pie", icono: "🧍", campo: "ultimoEnPie", minimo: 1, que: (n: number) => plural(n, "victoria a solas", "victorias a solas") },
  { id: "veterano", titulo: "Veterano", icono: "🏕️", campo: "combates", minimo: 1, que: (n: number) => plural(n, "combate", "combates") },
  { id: "superviviente", titulo: "Superviviente", icono: "🌱", campo: "diasVivo", minimo: 1, que: (n: number) => `${plural(n, "día", "días")} vivo` },
  { id: "iman", titulo: "Imán de críticos", icono: "🧲", campo: "criticosRecibidos", minimo: 1, que: (n: number) => plural(n, "crítico recibido", "críticos recibidos") },
  { id: "patoso", titulo: "Patoso", icono: "😵", campo: "fallos", minimo: 1, que: (n: number) => plural(n, "ataque fallado", "ataques fallados") },
  { id: "gafado", titulo: "Gafado", icono: "🐌", campo: "turnosPerdidos", minimo: 1, que: (n: number) => plural(n, "turno sin moverse", "turnos sin moverse") },
] as const satisfies readonly {
  id: string;
  titulo: string;
  icono: string;
  campo: keyof Numeros;
  minimo: number;
  que: (n: number) => string;
}[];

/** Quién lleva cada galardón: el de más; si nadie llega al mínimo, nadie */
export function galardonesDe(pokemon: PokemonConNumeros[]) {
  return GALARDONES.map((g) => {
    let mejor: PokemonConNumeros | null = null;
    for (const p of pokemon) {
      const n = p.numeros[g.campo] ?? 0;
      if (n >= g.minimo && (!mejor || n > (mejor.numeros[g.campo] ?? 0))) mejor = p;
    }
    return { ...g, pokemon: mejor, valor: mejor ? (mejor.numeros[g.campo] ?? 0) : 0 };
  });
}
