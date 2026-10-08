import type { DondeEnLaPartida } from "../essentials";

/**
 * Lo que comparten los lectores de las partidas **de los juegos oficiales**
 * (1ª a 7ª generación): el pokémon tal y como sale de la partida, con **los
 * números del juego** (especie nacional, movimiento, objeto, habilidad, lugar),
 * y el descifrado de los datos de cada pokémon.
 *
 * Cómo guarda cada juego lo suyo está sacado de PKHeX (kwsch/PKHeX), que es la
 * referencia de todo esto; el código es nuestro. Como con Añil, se lee en el
 * navegador y al servidor va solo lo sacado; los números se traducen allí
 * (`traducir-oficial.ts`).
 */

/** Las familias de juegos, que es lo que decide las tablas de objetos y de lugares */
export type Familia =
  | "rby"
  | "gs"
  | "c"
  | "rs"
  | "e"
  | "frlg"
  | "dp"
  | "pt"
  | "hgss"
  | "bw"
  | "b2w2"
  | "xy"
  | "oras"
  | "sm"
  | "usum";

export const GENERACION_DE: Record<Familia, number> = {
  rby: 1,
  gs: 2,
  c: 2,
  rs: 3,
  e: 3,
  frlg: 3,
  dp: 4,
  pt: 4,
  hgss: 4,
  bw: 5,
  b2w2: 5,
  xy: 6,
  oras: 6,
  sm: 7,
  usum: 7,
};

export const NOMBRE_DE_FAMILIA: Record<Familia, string> = {
  rby: "Rojo, Azul o Amarillo",
  gs: "Oro o Plata",
  c: "Cristal",
  rs: "Rubí o Zafiro",
  e: "Esmeralda",
  frlg: "Rojo Fuego o Verde Hoja",
  dp: "Diamante o Perla",
  pt: "Platino",
  hgss: "HeartGold o SoulSilver",
  bw: "Negro o Blanco",
  b2w2: "Negro 2 o Blanco 2",
  xy: "X o Y",
  oras: "Rubí Omega o Zafiro Alfa",
  sm: "Sol o Luna",
  usum: "Ultrasol o Ultraluna",
};

export type PokemonOficial = {
  /** Número nacional */
  especie: number;
  forma: number;
  /** Solo si se le puso mote */
  mote: string | null;
  shiny: boolean;
  /** 0 a 24, en el orden de siempre (Fuerte, Huraña…); null en 1ª y 2ª */
  naturaleza: number | null;
  /** El número de la habilidad (4ª en adelante) */
  habilidad: number | null;
  /** En 3ª solo se guarda cuál de las dos de su especie: 0 o 1 */
  ranuraDeHabilidad: number | null;
  /** El número del objeto **en esa generación** (cambia de una a otra) */
  objeto: number | null;
  movimientos: number[];
  /** Dónde se capturó, con el número del juego */
  lugar: number | null;
  /** Cuándo (AAAA-MM-DD), de la 4ª en adelante */
  fecha: string | null;
  donde: DondeEnLaPartida;
};

export type PartidaOficial = {
  tipo: "oficial";
  familia: Familia;
  jugador: string | null;
  pokemon: PokemonOficial[];
  cajas: string[];
};

export class PartidaOficialNoValida extends Error {}

export const u16 = (b: Uint8Array, p: number) => b[p] | (b[p + 1] << 8);
export const u32 = (b: Uint8Array, p: number) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;

/** El orden de los cuatro bloques de cada pokémon, según su número (de PKHeX, `PokeCrypto.BlockPosition`) */
export const ORDEN = [
  0, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 0, 3, 2, 2, 0, 1, 3, 3, 0, 1, 2,
  2, 0, 3, 1, 3, 0, 2, 1, 1, 2, 0, 3, 1, 3, 0, 2, 2, 1, 0, 3, 3, 1, 0, 2, 2, 3, 0, 1, 3, 2, 0, 1, 1, 2, 3, 0, 1, 3, 2, 0,
  2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 0,
  // Repetidos los ocho primeros, para no tener que hacer el módulo 24 (32 → 24)
  0, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 0, 3, 2,
];

/** Pone en su sitio los cuatro bloques que el juego guarda revueltos */
export function desordenar(datos: Uint8Array, desde: number, tamanoDeBloque: number, orden: number) {
  const copia = datos.slice(desde, desde + tamanoDeBloque * 4);
  for (let i = 0; i < 4; i++) {
    const origen = ORDEN[orden * 4 + i];
    datos.set(copia.subarray(origen * tamanoDeBloque, (origen + 1) * tamanoDeBloque), desde + i * tamanoDeBloque);
  }
}

/** El cifrado de la 4ª a la 7ª: XOR de 16 en 16 bits con el generador de números de siempre */
export function descifrar16(datos: Uint8Array, desde: number, hasta: number, semilla: number) {
  let s = semilla >>> 0;
  for (let p = desde; p + 1 < hasta; p += 2) {
    s = (Math.imul(s, 0x41c64e6d) + 0x6073) >>> 0;
    const x = s >>> 16;
    datos[p] ^= x & 0xff;
    datos[p + 1] ^= x >>> 8;
  }
}

export function fecha(anio: number, mes: number, dia: number): string | null {
  if (!mes || !dia || mes > 12 || dia > 31) return null;
  return `${2000 + anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** UTF-16 hasta el terminador, con el ♂ y ♀ de los juegos a los de siempre */
export function textoUtf16(b: Uint8Array, desde: number, largo: number, terminador = 0): string {
  let salida = "";
  for (let p = desde; p + 1 < desde + largo; p += 2) {
    const c = u16(b, p);
    if (c === terminador || c === 0) break;
    salida += c === 0xe08e || c === 0x246e ? "♂" : c === 0xe08f || c === 0x246d ? "♀" : String.fromCharCode(c);
  }
  return salida;
}

export const vacios = (lista: number[]) => lista.filter((m) => m > 0);
