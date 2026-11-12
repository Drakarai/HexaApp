import "server-only";
import {
  datosDeLaRepeticion,
  formatoDelLog,
  logDeLaPagina,
  paginaDeRepeticionDeAnil,
} from "@/lib/showdown";

/**
 * Bajar el registro de una repetición de Showdown (o del servidor de Añil).
 * Vive aparte de las acciones porque lo usan también las estadísticas de los
 * combates (ver lib/estadisticas.ts), que no son una acción.
 */
/** Lo que se espera a quien sirve la repetición antes de darlo por caído */
const TIEMPO_LIMITE = 10_000;
/** Una página de repetición de un combate largo no llega ni a 1 MB: esto ya no lo es */
const TAMANO_MAXIMO = 5_000_000;

export type RegistroLeido = { log: string; formato?: string } | { error: string };

/**
 * El registro del combate de un enlace de repetición, venga de Showdown o del
 * servidor de Añil. Lo usan los equipos y el resultado.
 */
export async function registroDeLaRepeticion(texto: string, conAnil: boolean): Promise<RegistroLeido> {
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
  return { log: repeticion.log, formato: typeof repeticion.format === "string" ? repeticion.format : undefined };
}

/** La repetición de Añil es una página HTML con el registro dentro, no un JSON */
async function leerPaginaDeAnil(pagina: string): Promise<RegistroLeido> {
  let html: string;
  try {
    /**
     * Las redirecciones se siguen **a mano y solo dentro del mismo sitio**:
     * Pages redirige el «.html» a sin él, pero la página es de quien la
     * publica, y dejando que fetch las siguiera solo, una preparada podía
     * mandar al servidor a pedir cualquier otra dirección antes de que se
     * comprobara adónde había llegado.
     */
    const sitio = new URL(pagina).hostname;
    let direccion = pagina;
    let respuesta = await fetch(direccion, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(TIEMPO_LIMITE) });
    for (let saltos = 0; respuesta.status >= 300 && respuesta.status < 400 && saltos < 3; saltos++) {
      const destino = new URL(respuesta.headers.get("location") ?? "", direccion);
      if (destino.hostname !== sitio || destino.protocol !== "https:") {
        return { error: "Ese enlace lleva a otro sitio, no a una repetición." };
      }
      direccion = destino.href;
      respuesta = await fetch(direccion, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(TIEMPO_LIMITE) });
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
  return { log, formato: formatoDelLog(log) };
}

