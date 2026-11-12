"use server";

import { requireUser } from "@/lib/auth";
import { mensajeDeError } from "@/lib/permiso";
import { getActiveCompetition, requireCompetitionManager } from "@/lib/competition";
import { prisma } from "@/lib/db";
import { esPokemonAnil } from "@/lib/anil";
import { registroDeLaRepeticion } from "@/lib/repeticion-servidor";
import {
  leerRepeticion,
  leerShowdown,
  quienEsQuien,
  resultadoDeLaRepeticion,
  type JugadorDeLaRepeticion,
  type PokemonDeShowdown,
} from "@/lib/showdown";

/**
 * Lee un equipo exportado de Showdown y lo devuelve ya traducido a lo de la
 * aplicación. No guarda nada: quien lo llama lo pone en su formulario y se
 * guarda con el botón de siempre, con sus permisos de siempre.
 *
 * Va en el servidor para no mandar al navegador la lista de nombres de
 * Showdown ni la de movimientos solo por si alguien pega un equipo.
 */
export async function leerShowdownAction(
  texto: string,
): Promise<{ equipo?: PokemonDeShowdown[]; error?: string }> {
  await requireUser();
  const limpio = String(texto ?? "").slice(0, 20_000);
  if (!limpio.trim()) return { error: "Pega primero el equipo." };
  // Se pega siempre en el locke que se está mirando: si es de Añil, también lo suyo
  const competicion = await getActiveCompetition();
  const equipo = leerShowdown(limpio, Boolean(competicion && esPokemonAnil(competicion)));
  if (!equipo.length) return { error: "Eso no parece un equipo de Showdown." };
  return { equipo };
}

/** "AAAA-MM-DD" en hora de Madrid: el formato que entiende el campo de fecha */
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });


type RepeticionLeida = { jugadores?: JugadorDeLaRepeticion[]; formato?: string; error?: string };

/**
 * Los equipos de una repetición de Showdown, a partir de su enlace. Se pide
 * desde el servidor, como lo de pegar, para traducirla con los mismos datos, y
 * solo a dos sitios: replay.pokemonshowdown.com (ver `datosDeLaRepeticion`) y,
 * en los lockes de Añil, las páginas de repeticiones que publica el mod de
 * Showdown de Añil (ver `paginaDeRepeticionDeAnil`). Esas son el plan B para
 * cuando el servidor de Añil no sube sus combates al de Showdown.
 */
export async function leerRepeticionAction(enlace: string): Promise<RepeticionLeida> {
  await requireUser();
  const competicion = await getActiveCompetition();
  const conAnil = Boolean(competicion && esPokemonAnil(competicion));
  const leido = await registroDeLaRepeticion(String(enlace ?? ""), conAnil);
  if ("error" in leido) return { error: leido.error };
  return conEquipos(leido.log, conAnil, leido.formato);
}

export type ResultadoLeido = {
  error?: string;
  ganadorId?: string | null;
  diferencia?: number | null;
  /** "AAAA-MM-DD", para el campo de la fecha */
  fecha?: string | null;
  /** Quién es quién: el nombre de Showdown de cada uno de aquí */
  enShowdown?: Record<string, string>;
  enPie?: Record<string, number>;
  /** De dónde se ha sacado quién es quién: si es «orden», hay que mirarlo */
  por?: "nombre" | "equipo" | "orden";
};

/**
 * El resultado de un combate de jornada a partir de su repetición: quién ganó,
 * la diferencia de pokémon y el día. **No guarda nada**: rellena el
 * formulario, y se guarda con el botón de siempre, que es donde se comprueba
 * todo lo demás (retiradas, series, puntos).
 *
 * Solo para quien puede apuntar resultados, como el formulario en el que vive.
 */
export async function leerResultadoDeRepeticionAction(matchId: string, enlace: string): Promise<ResultadoLeido> {
  const match = await prisma.match.findUnique({
    where: { id: String(matchId ?? "") },
    select: {
      participantA: { select: { id: true, displayName: true } },
      participantB: { select: { id: true, displayName: true } },
      team: { select: { participantId: true, species: true, nickname: true } },
      matchday: { select: { competitionId: true, competition: { select: { game: true, gameId: true, juegoNoOficial: true } } } },
    },
  });
  if (!match) return { error: "Ese combate ya no existe." };
  try {
    await requireCompetitionManager(match.matchday.competitionId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
  const conAnil = esPokemonAnil(match.matchday.competition);
  const leido = await registroDeLaRepeticion(String(enlace ?? ""), conAnil);
  if ("error" in leido) return { error: leido.error };

  const jugadores = leerRepeticion(leido.log, conAnil);
  if (jugadores.length !== 2) return { error: "Esa repetición no es de un combate de dos." };
  const resultado = resultadoDeLaRepeticion(leido.log);
  if (!resultado.ganador && !resultado.empate) {
    return { error: "En esa repetición el combate no se acaba: no hay ganador." };
  }

  // Las pistas de quién es quién: el equipo apuntado en el combate y, por si no lo hay, lo capturado
  const { participantA: a, participantB: b } = match;
  const capturas = await prisma.capture.findMany({
    where: { participantId: { in: [a.id, b.id] }, failed: false },
    select: { participantId: true, species: true, nickname: true },
  });
  const pokemonDe = (id: string) =>
    [...match.team, ...capturas]
      .filter((p) => p.participantId === id)
      .map((p) => ({ especie: p.species, mote: p.nickname }));
  const { ids, por } = quienEsQuien(
    jugadores.map((j) => ({ nombre: j.nombre, equipo: j.equipo })),
    [
      { id: a.id, nombre: a.displayName, pokemon: pokemonDe(a.id) },
      { id: b.id, nombre: b.displayName, pokemon: pokemonDe(b.id) },
    ],
  );

  const enShowdown: Record<string, string> = {};
  const enPie: Record<string, number> = {};
  jugadores.forEach((jugador, i) => {
    enShowdown[ids[i]] = jugador.nombre;
    enPie[ids[i]] = resultado.enPie[jugador.lado] ?? 0;
  });
  const indiceDelGanador = jugadores.findIndex((j) => j.lado === resultado.ganador);
  const ganadorId = indiceDelGanador >= 0 ? ids[indiceDelGanador] : null;
  const perdedorId = ganadorId ? ids.find((id) => id !== ganadorId)! : null;
  return {
    ganadorId,
    // Lo de la tabla: los que le quedaban al ganador menos los del otro (cero, salvo rendición)
    diferencia: ganadorId && perdedorId ? Math.max(0, enPie[ganadorId] - enPie[perdedorId]) : null,
    // El día en España, como todo en la aplicación: a las once de la noche ya es otro en UTC
    fecha: resultado.jugadoEl ? DIA.format(resultado.jugadoEl) : null,
    enShowdown,
    enPie,
    por,
  };
}

function conEquipos(log: string, conAnil: boolean, formato: string | undefined): RepeticionLeida {
  const jugadores = leerRepeticion(log, conAnil).filter((j) => j.equipo.length);
  if (!jugadores.length) return { error: "No he encontrado ningún pokémon en esa repetición." };
  return { jugadores, formato };
}
