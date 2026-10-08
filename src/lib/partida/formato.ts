import { esPokemonAnil } from "@/lib/anil";
import type { Familia } from "./oficial/comun";

/**
 * Qué partida se puede leer en un locke: la de Pokémon Añil (Essentials) en
 * los de Añil, y en los de un juego oficial **la de su juego** (un locke de
 * HeartGold no lee una partida de Platino, que sería otro juego). Los demás
 * fangames no: cada uno guarda a su manera.
 *
 * Sin base de datos: lo usan la pantalla, para decir qué subir, y el servidor.
 */

const FAMILIA_DEL_JUEGO: Record<string, Familia> = {
  rojo: "rby",
  azul: "rby",
  amarillo: "rby",
  "rojo-azul": "rby",
  oro: "gs",
  plata: "gs",
  "oro-plata": "gs",
  cristal: "c",
  rubi: "rs",
  zafiro: "rs",
  "rubi-zafiro": "rs",
  esmeralda: "e",
  "rojo-fuego": "frlg",
  "verde-hoja": "frlg",
  "rojofuego-verdehoja": "frlg",
  diamante: "dp",
  perla: "dp",
  "diamante-perla": "dp",
  platino: "pt",
  heartgold: "hgss",
  soulsilver: "hgss",
  "heartgold-soulsilver": "hgss",
  negro: "bw",
  blanco: "bw",
  "negro-blanco": "bw",
  "negro-2": "b2w2",
  "blanco-2": "b2w2",
  "negro2-blanco2": "b2w2",
  x: "xy",
  y: "xy",
  "x-y": "xy",
  "rubi-omega": "oras",
  "zafiro-alfa": "oras",
  "rubiomega-zafiroalfa": "oras",
  sol: "sm",
  luna: "sm",
  "sol-luna": "sm",
  ultrasol: "usum",
  ultraluna: "usum",
  "ultrasol-ultraluna": "usum",
};

export type FormatoDePartida = { tipo: "anil" } | { tipo: "oficial"; familia: Familia } | null;

export function formatoDePartida(edicion: {
  game?: string | null;
  gameId?: string | null;
  juegoNoOficial?: boolean;
}): FormatoDePartida {
  if (esPokemonAnil(edicion)) return { tipo: "anil" };
  if (edicion.juegoNoOficial || !edicion.gameId) return null;
  const familia = FAMILIA_DEL_JUEGO[edicion.gameId];
  return familia ? { tipo: "oficial", familia } : null;
}

/** Qué fichero es, para decirlo en la pantalla */
export function queFicheroSubir(familia: Familia): string {
  if (familia === "xy" || familia === "oras" || familia === "sm" || familia === "usum") {
    return "el «main» de la partida (sacado de la 3DS con Checkpoint o JKSM, o de la carpeta del emulador)";
  }
  if (familia === "rby" || familia === "gs" || familia === "c") return "el .sav de la partida (el de la consola virtual o el del emulador)";
  return "el .sav de la partida (el del emulador o el sacado del cartucho)";
}
