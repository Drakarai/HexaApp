"use server";

import { requireUser } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/competition";
import { esPokemonAnil } from "@/lib/anil";
import {
  datosDeLaRepeticion,
  formatoDelLog,
  leerRepeticion,
  leerShowdown,
  logDeLaPagina,
  paginaDeRepeticionDeAnil,
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

/** Lo que se espera a quien sirve la repetición antes de darlo por caído */
const TIEMPO_LIMITE = 10_000;
/** Una página de repetición de un combate largo no llega ni a 1 MB: esto ya no lo es */
const TAMANO_MAXIMO = 5_000_000;

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
  const texto = String(enlace ?? "");
  const competicion = await getActiveCompetition();
  const conAnil = Boolean(competicion && esPokemonAnil(competicion));

  const deAnil = paginaDeRepeticionDeAnil(texto);
  if (deAnil) {
    if (!conAnil) return { error: "Las repeticiones del servidor de Añil solo se leen en lockes de Añil." };
    return leerPaginaDeAnil(deAnil);
  }

  const datos = datosDeLaRepeticion(texto);
  if (!datos) {
    return {
      error: conAnil
        ? "Eso no es un enlace de repetición: vale el de Showdown (replay.pokemonshowdown.com/…) o el del servidor de Añil (….pages.dev/replays/…)."
        : "Eso no es un enlace de repetición de Showdown (replay.pokemonshowdown.com/…).",
    };
  }
  let repeticion: { log?: unknown; format?: unknown };
  try {
    const respuesta = await fetch(datos, { cache: "no-store", signal: AbortSignal.timeout(TIEMPO_LIMITE) });
    if (respuesta.status === 404) return { error: "Showdown dice que esa repetición no existe." };
    if (!respuesta.ok) return { error: `Showdown no ha contestado bien (${respuesta.status}). Prueba en un rato.` };
    repeticion = await respuesta.json();
  } catch {
    return { error: "No se ha podido hablar con Showdown. Prueba en un rato." };
  }
  if (typeof repeticion.log !== "string") return { error: "Esa repetición no trae el combate." };
  return conEquipos(
    repeticion.log,
    conAnil,
    typeof repeticion.format === "string" ? repeticion.format : undefined,
  );
}

/** La repetición de Añil es una página HTML con el registro dentro, no un JSON */
async function leerPaginaDeAnil(pagina: string): Promise<RepeticionLeida> {
  let html: string;
  try {
    const respuesta = await fetch(pagina, { cache: "no-store", signal: AbortSignal.timeout(TIEMPO_LIMITE) });
    // Pages redirige el «.html» a sin él; si acabara en otro sitio, no es lo que se pidió
    if (new URL(respuesta.url || pagina).hostname !== new URL(pagina).hostname) {
      return { error: "Ese enlace lleva a otro sitio, no a una repetición." };
    }
    if (respuesta.status === 404) return { error: "No hay ninguna repetición en ese enlace." };
    if (!respuesta.ok) return { error: `La web de las repeticiones no ha contestado bien (${respuesta.status}). Prueba en un rato.` };
    if (Number(respuesta.headers.get("content-length") ?? 0) > TAMANO_MAXIMO) {
      return { error: "Esa página es demasiado grande para ser una repetición." };
    }
    html = await respuesta.text();
  } catch {
    return { error: "No se ha podido abrir la web de las repeticiones. Prueba en un rato." };
  }
  if (html.length > TAMANO_MAXIMO) return { error: "Esa página es demasiado grande para ser una repetición." };
  const log = logDeLaPagina(html);
  if (!log) return { error: "En esa página no hay ningún combate." };
  return conEquipos(log, true, formatoDelLog(log));
}

function conEquipos(log: string, conAnil: boolean, formato: string | undefined): RepeticionLeida {
  const jugadores = leerRepeticion(log, conAnil).filter((j) => j.equipo.length);
  if (!jugadores.length) return { error: "No he encontrado ningún pokémon en esa repetición." };
  return { jugadores, formato };
}
