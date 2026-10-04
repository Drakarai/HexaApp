"use server";

import { requireUser } from "@/lib/auth";
import { leerShowdown, type PokemonDeShowdown } from "@/lib/showdown";

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
  const equipo = leerShowdown(limpio);
  if (!equipo.length) return { error: "Eso no parece un equipo de Showdown." };
  return { equipo };
}
