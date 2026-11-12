import "server-only";
import { prisma } from "@/lib/db";
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

/** Lo que se guarda en `Match.estadisticas` */
export type GuardadoDelCombate = {
  /** "p1" → el participante que jugaba con ese lado */
  lados: Record<string, string>;
  pokemon: EstadisticasDePokemon[];
};

const datosDelCombate = {
  id: true,
  replayUrl: true,
  estadisticas: true,
  estadisticasDe: true,
  participantA: { select: { id: true, displayName: true } },
  participantB: { select: { id: true, displayName: true } },
  team: { select: { participantId: true, species: true, nickname: true } },
  matchday: {
    select: { competition: { select: { id: true, game: true, gameId: true, juegoNoOficial: true } } },
  },
} as const;

/**
 * Lo de un combate: lo guardado si sigue valiendo, y si no, se lee la
 * repetición y se guarda. Null si el combate no tiene repetición.
 */
export async function estadisticasDeUnCombate(
  matchId: string,
): Promise<{ guardado: GuardadoDelCombate | null; error?: string }> {
  const combate = await prisma.match.findUnique({ where: { id: matchId }, select: datosDelCombate });
  if (!combate?.replayUrl) return { guardado: null };
  if (combate.estadisticas && combate.estadisticasDe === combate.replayUrl) {
    return { guardado: combate.estadisticas as unknown as GuardadoDelCombate };
  }

  const conAnil = esPokemonAnil(combate.matchday.competition);
  const leido = await registroDeLaRepeticion(combate.replayUrl, conAnil);
  if ("error" in leido) return { guardado: null, error: leido.error };

  const { pokemon } = estadisticasDeLaRepeticion(leido.log, conAnil);
  const jugadores = leerRepeticion(leido.log, conAnil);
  if (jugadores.length !== 2) return { guardado: null, error: "Esa repetición no es de un combate de dos." };
  const deAqui = [combate.participantA, combate.participantB].map((p) => ({
    id: p.id,
    nombre: p.displayName,
    pokemon: combate.team
      .filter((t) => t.participantId === p.id)
      .map((t) => ({ especie: t.species, mote: t.nickname })),
  }));
  const { ids } = quienEsQuien(
    jugadores.map((j) => ({ nombre: j.nombre, equipo: j.equipo.map((p) => ({ especie: p.especie, mote: p.mote })) })),
    deAqui,
  );
  const guardado: GuardadoDelCombate = {
    lados: { [jugadores[0].lado]: ids[0], [jugadores[1].lado]: ids[1] },
    pokemon,
  };
  await prisma.match.update({
    where: { id: matchId },
    data: { estadisticas: guardado as unknown as object, estadisticasDe: combate.replayUrl },
  });
  return { guardado };
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
  caidas: 0,
};

const DIA = 24 * 60 * 60 * 1000;

/**
 * Todos los pokémon que han combatido en el locke, con sus números juntos.
 * `quienMira` decide la forma que se enseña (ver arriba).
 */
export async function getEstadisticasDelLocke(competitionId: string, quienMira: string | null) {
  const [combates, capturas, participantes, terminado] = await Promise.all([
    prisma.match.findMany({
      where: { matchday: { competitionId } },
      orderBy: [{ matchday: { position: "asc" } }, { position: "asc" }],
      select: {
        id: true,
        winnerId: true,
        porRetirada: true,
        replayUrl: true,
        estadisticas: true,
        estadisticasDe: true,
        team: {
          select: { id: true, participantId: true, species: true, nickname: true, captureId: true },
        },
      },
    }),
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
  const capturaDe = (participantId: string, quien: { species: string; nickname: string | null; pokemonId?: number | null }) => {
    const candidatas = capturas.filter(
      (c) => c.participantId === participantId && esElMismo(c, { ...quien, pokemonId: quien.pokemonId ?? null }),
    );
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
    if (combate.winnerId && !combate.porRetirada) jugados++;
    const guardado =
      combate.estadisticas && combate.estadisticasDe === combate.replayUrl
        ? (combate.estadisticas as unknown as GuardadoDelCombate)
        : null;
    if (guardado) conRepeticion++;
    const contados = new Set<string>();

    // Lo del equipo apuntado: cuenta como combate aunque no haya repetición
    const delEquipo = (t: (typeof combate.team)[number]) => {
      const pokemonId = findSpecies(t.species, true)?.dex ?? null;
      const captura = t.captureId
        ? capturas.find((c) => c.id === t.captureId) ?? null
        : capturaDe(t.participantId, { species: t.species, nickname: t.nickname, pokemonId });
      const clave = captura ? `c:${captura.id}` : claveDeGrupo(t.participantId, t.species, t.nickname, pokemonId);
      return { clave, captura, pokemonId };
    };
    for (const t of combate.team) {
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
    for (const e of guardado.pokemon) {
      const participantId = guardado.lados[e.lado];
      if (!participantId) continue;
      // Primero el del equipo apuntado (que puede llevar la captura elegida a mano)
      const enElEquipo = combate.team.find(
        (t) =>
          t.participantId === participantId &&
          esElMismo({ species: t.species, nickname: t.nickname, pokemonId: findSpecies(t.species, true)?.dex ?? null }, {
            species: e.especie,
            nickname: e.mote,
            pokemonId: e.pokemonId,
          }),
      );
      const deEquipo = enElEquipo ? delEquipo(enElEquipo) : null;
      const captura = deEquipo?.captura ?? capturaDe(participantId, { species: e.especie, nickname: e.mote, pokemonId: e.pokemonId });
      const clave = deEquipo?.clave ?? (captura ? `c:${captura.id}` : claveDeGrupo(participantId, e.especie, e.mote, e.pokemonId));
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
      a.numeros.kos += e.kos;
      a.numeros.criticosHechos += e.criticosHechos;
      a.numeros.criticosRecibidos += e.criticosRecibidos;
      a.numeros.supereficaces += e.supereficaces;
      a.numeros.fallos += e.fallos;
      a.numeros.esquivados += e.esquivados;
      a.numeros.danoHecho += e.danoHecho;
      a.numeros.danoRecibido += e.danoRecibido;
      if (e.cayo) a.numeros.caidas++;
    }
  }

  // La forma que se enseña y su imagen
  const todos = [...porClave.values()];
  const conCaja = todos.filter((a) => a.captureId && (terminado || deQuien.get(a.participantId) === quienMira));
  const [imagenDeCaptura, imagenDeEquipo] = await Promise.all([
    urlsDeImagen("captura", conCaja.map((a) => a.captureId!)),
    urlsDeImagen(
      "equipo",
      todos.map((a) => a.ultimaEnCombate.teamId).filter((id): id is string => Boolean(id)),
    ),
  ]);
  const ahora = Date.now();
  const pokemon: PokemonConNumeros[] = todos.map(({ ultimaEnCombate, ...a }) => {
    const captura = a.captureId ? capturas.find((c) => c.id === a.captureId) : null;
    const veLaDeAhora = captura && conCaja.includes(porClave.get(a.clave)!);
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

  return { pokemon, conRepeticion, jugados, sinLeer: combates.filter((c) => c.replayUrl && c.estadisticasDe !== c.replayUrl).map((c) => c.id) };
}

/** Los galardones: cada uno, el número que mira y cómo se dice */
export const GALARDONES = [
  { id: "verdugo", titulo: "El Verdugo", icono: "🗡️", campo: "kos", que: (n: number) => `${n} ${n === 1 ? "KO" : "KOs"}` },
  { id: "dioses", titulo: "Tocado por los dioses", icono: "🎲", campo: "criticosHechos", que: (n: number) => `${n} ${n === 1 ? "crítico" : "críticos"}` },
  { id: "iman", titulo: "Imán de críticos", icono: "🧲", campo: "criticosRecibidos", que: (n: number) => `${n} ${n === 1 ? "crítico recibido" : "críticos recibidos"}` },
  { id: "francotirador", titulo: "Francotirador", icono: "🎯", campo: "supereficaces", que: (n: number) => `${n} ${n === 1 ? "golpe muy eficaz" : "golpes muy eficaces"}` },
  { id: "veterano", titulo: "Veterano", icono: "🏕️", campo: "combates", que: (n: number) => `${n} ${n === 1 ? "combate" : "combates"}` },
  { id: "superviviente", titulo: "Superviviente", icono: "🌱", campo: "diasVivo", que: (n: number) => `${n} ${n === 1 ? "día" : "días"} vivo` },
] as const satisfies readonly { id: string; titulo: string; icono: string; campo: keyof Numeros; que: (n: number) => string }[];

/** Quién lleva cada galardón: el de más; sin nadie por encima de cero, nadie */
export function galardonesDe(pokemon: PokemonConNumeros[]) {
  return GALARDONES.map((g) => {
    let mejor: PokemonConNumeros | null = null;
    for (const p of pokemon) {
      const n = p.numeros[g.campo] ?? 0;
      if (n > 0 && (!mejor || n > (mejor.numeros[g.campo] ?? 0))) mejor = p;
    }
    return { ...g, pokemon: mejor, valor: mejor ? (mejor.numeros[g.campo] ?? 0) : 0 };
  });
}
