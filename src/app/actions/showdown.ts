"use server";

import { requireUser } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/competition";
import { esPokemonAnil } from "@/lib/anil";
import {
  datosDeLaRepeticion,
  leerRepeticion,
  leerShowdown,
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

/**
 * Los equipos de una repetición de Showdown, a partir de su enlace. Se pide
 * desde el servidor, como lo de pegar, para traducirla con los mismos datos, y
 * solo a replay.pokemonshowdown.com: ver `datosDeLaRepeticion`.
 */
export async function leerRepeticionAction(
  enlace: string,
): Promise<{ jugadores?: JugadorDeLaRepeticion[]; formato?: string; error?: string }> {
  await requireUser();
  const datos = datosDeLaRepeticion(String(enlace ?? ""));
  if (!datos) {
    return { error: "Eso no es un enlace de repetición de Showdown (replay.pokemonshowdown.com/…)." };
  }
  let repeticion: { log?: unknown; format?: unknown };
  try {
    const respuesta = await fetch(datos, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (respuesta.status === 404) return { error: "Showdown dice que esa repetición no existe." };
    if (!respuesta.ok) return { error: `Showdown no ha contestado bien (${respuesta.status}). Prueba en un rato.` };
    repeticion = await respuesta.json();
  } catch {
    return { error: "No se ha podido hablar con Showdown. Prueba en un rato." };
  }
  if (typeof repeticion.log !== "string") return { error: "Esa repetición no trae el combate." };
  const jugadores = leerRepeticion(repeticion.log).filter((j) => j.equipo.length);
  if (!jugadores.length) return { error: "No he encontrado ningún pokémon en esa repetición." };
  return { jugadores, formato: typeof repeticion.format === "string" ? repeticion.format : undefined };
}
