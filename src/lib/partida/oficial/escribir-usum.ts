import { descifrar16, desordenar, u16, u32 } from "./comun";

/**
 * **Escribir en una partida de Ultrasol/Ultraluna** (el `main`), para la GTS:
 * quitar el pokémon que se va y poner el que llega, y dejarla como la deja el
 * juego —las comprobaciones de cada bloque y la firma— para que la acepte.
 *
 * Cómo lo guarda el juego está sacado de PKHeX (las posiciones de los 39
 * bloques de `SaveBlockAccessor7USUM`, y cómo se firma, de `MemeCrypto`); el
 * código es nuestro. Se probó con una partida de verdad en Citra: volver a
 * firmar la original sin tocarla da su misma firma byte a byte.
 *
 * Sin `server-only` y sin `node:crypto`: lo de aquí son cuentas, y lo prueban
 * los tests. La firma, que necesita la clave, va en `firma-usum.ts`.
 */

export const TAMANO_USUM = 0x6cc00;
const EQUIPO = 0x1600;
const CAJAS = 0x5200;
const CAJAS_ABIERTAS = 0x4c00 + 0x5e1;
const NUMERO_DE_CAJAS = 32;
const EN_EQUIPO = 0x104;
const EN_CAJA = 0xe8;
const TABLA_DE_BLOQUES = TAMANO_USUM - 0x200;
export const FIRMA = 0x6c000 + 0x100;
export const LARGO_DE_LA_FIRMA = 0x80;

/** [desde, largo] de los 39 bloques de USUM */
const BLOQUES: [number, number][] = [
  [0x00000, 0x00e28], [0x01000, 0x0007c], [0x01200, 0x00014], [0x01400, 0x000c0], [0x01600, 0x0061c],
  [0x01e00, 0x00e00], [0x02c00, 0x00f78], [0x03c00, 0x00228], [0x04000, 0x0030c], [0x04400, 0x001fc],
  [0x04600, 0x0004c], [0x04800, 0x00004], [0x04a00, 0x00058], [0x04c00, 0x005e6], [0x05200, 0x36600],
  [0x3b800, 0x0572c], [0x41000, 0x00008], [0x41200, 0x01218], [0x42600, 0x01a08], [0x44200, 0x06408],
  [0x4a800, 0x06408], [0x50e00, 0x03998], [0x54800, 0x00100], [0x54a00, 0x00100], [0x54c00, 0x10528],
  [0x65200, 0x00204], [0x65600, 0x00b60], [0x66200, 0x03f50], [0x6a200, 0x00358], [0x6a600, 0x00728],
  [0x6ae00, 0x00200], [0x6b000, 0x00718], [0x6b800, 0x001fc], [0x6ba00, 0x00200], [0x6bc00, 0x00120],
  [0x6be00, 0x001c8], [0x6c000, 0x00200], [0x6c200, 0x0039c], [0x6c600, 0x00400],
];
const sitioDeLaComprobacion = (i: number) => TABLA_DE_BLOQUES + 0x14 + i * 8 + 6;

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1;
  return c;
});

/** El CRC16 de los bloques: el reflejado de siempre, empezando en 0xFFFF e invertido al final */
export function crc16Invertido(datos: Uint8Array) {
  let c = 0xffff;
  for (const b of datos) c = TABLA_CRC[(b ^ c) & 0xff] ^ (c >>> 8);
  return ~c & 0xffff;
}

/** Las comprobaciones de los bloques **con la firma a cero**, que es como las calcula el juego */
function comprobaciones(datos: Uint8Array) {
  const copia = datos.slice();
  copia.fill(0, FIRMA, FIRMA + LARGO_DE_LA_FIRMA);
  return BLOQUES.map(([desde, largo]) => crc16Invertido(copia.subarray(desde, desde + largo)));
}

/** Si las comprobaciones guardadas cuadran: una partida rota (o de otro juego) no se toca */
export function comprobacionesCuadran(datos: Uint8Array) {
  if (datos.length !== TAMANO_USUM) return false;
  return comprobaciones(datos).every((c, i) => c === u16(datos, sitioDeLaComprobacion(i)));
}

/**
 * Rehace las comprobaciones y pide la firma a `firmar`, que recibe los 0x80
 * bytes de su sitio y los 0x150 de la tabla de comprobaciones (lo que se
 * firma) y devuelve la región firmada.
 */
export function cerrarPartida(
  datos: Uint8Array,
  firmar: (region: Uint8Array, tabla: Uint8Array) => Uint8Array,
): Uint8Array {
  const fuera = datos.slice();
  fuera.fill(0, FIRMA, FIRMA + LARGO_DE_LA_FIRMA);
  comprobaciones(fuera).forEach((c, i) => {
    fuera[sitioDeLaComprobacion(i)] = c & 0xff;
    fuera[sitioDeLaComprobacion(i) + 1] = c >>> 8;
  });
  const firmada = firmar(fuera.slice(FIRMA, FIRMA + LARGO_DE_LA_FIRMA), fuera.slice(TABLA_DE_BLOQUES, TABLA_DE_BLOQUES + 0x150));
  fuera.set(firmada, FIRMA);
  return fuera;
}

/**
 * Lo que distingue a un pokémon: su constante de cifrado, su PID y su especie.
 * Con eso basta en una partida jugada; en una tocada con PKHeX puede haber
 * clones con los mismos, y entonces se miran los bytes enteros.
 */
export type Huella = { ec: number; pid: number; especie: number };

/** Descifrado y en orden (los 0xE8 de la caja); null si el hueco está vacío */
function descifrado(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < EN_CAJA || bytes.subarray(0, EN_CAJA).every((b) => b === 0)) return null;
  const pk = bytes.slice(0, EN_CAJA);
  const ec = u32(pk, 0);
  descifrar16(pk, 8, EN_CAJA, ec);
  desordenar(pk, 8, 56, (ec >>> 13) & 31);
  return pk;
}

export function huellaDe(bytes: Uint8Array): Huella | null {
  const pk = descifrado(bytes);
  return pk ? { ec: u32(pk, 0), pid: u32(pk, 0x18), especie: u16(pk, 0x08) } : null;
}

const mismaHuella = (a: Huella | null, b: Huella) =>
  a !== null && a.ec === b.ec && a.pid === b.pid && a.especie === b.especie;

const mismosBytes = (a: Uint8Array | null, b: Uint8Array | null) =>
  a !== null && b !== null && a.every((x, i) => x === b[i]);

type Hueco = { lugar: "equipo"; indice: number; desde: number } | { lugar: "caja"; caja: number; indice: number; desde: number };

function huecos(datos: Uint8Array): Hueco[] {
  const enEquipo = Math.min(6, datos[EQUIPO + 6 * EN_EQUIPO]);
  const abiertas =
    datos[CAJAS_ABIERTAS] > 0 && datos[CAJAS_ABIERTAS] <= NUMERO_DE_CAJAS ? datos[CAJAS_ABIERTAS] : NUMERO_DE_CAJAS;
  const lista: Hueco[] = [];
  for (let i = 0; i < enEquipo; i++) lista.push({ lugar: "equipo", indice: i, desde: EQUIPO + i * EN_EQUIPO });
  for (let caja = 0; caja < abiertas; caja++) {
    for (let i = 0; i < 30; i++) lista.push({ lugar: "caja", caja, indice: i, desde: CAJAS + (caja * 30 + i) * EN_CAJA });
  }
  return lista;
}

const nombreDelHueco = (h: Hueco) => (h.lugar === "equipo" ? `el ${h.indice + 1}º del equipo` : `la caja ${h.caja + 1}, hueco ${h.indice + 1}`);

export type ResultadoDelCambio =
  | { datos: Uint8Array; donde: string; alaCaja: boolean }
  | { error: string; yaEsta?: boolean };

/**
 * **El cambio**: el que se va (por su huella) deja su hueco al que llega. Si
 * el que se va estaba en el equipo y el que llega viene de una caja (sin sus
 * estadísticas de equipo, que solo calcula el juego), el que llega va al
 * primer hueco libre de las cajas y el equipo se corre, como al depositar uno
 * en el PC. Devuelve la partida **sin cerrar** (ver `cerrarPartida`).
 */
export function cambiarEnLaPartida(datos: Uint8Array, sale: Uint8Array, entra: Uint8Array): ResultadoDelCambio {
  if (entra.length !== EN_CAJA && entra.length !== EN_EQUIPO) return { error: "El pokémon que llega no se puede leer." };
  const llega = descifrado(entra);
  const seVa = descifrado(sale);
  const huellaDelQueSeVa = huellaDe(sale);
  if (!llega || !seVa || !huellaDelQueSeVa) return { error: "El pokémon que llega no se puede leer." };
  const todos = huecos(datos);
  const delHueco = (h: Hueco) => descifrado(datos.subarray(h.desde, h.desde + EN_CAJA));
  // Ya metido: el que llega está tal cual (así, volver a subir la partida nueva no lo mete dos veces)
  if (todos.some((h) => mismosBytes(delHueco(h), llega))) {
    return { error: "El que llega ya está en esta partida.", yaEsta: true };
  }
  const posibles = todos.filter((h) => mismaHuella(huellaDe(datos.subarray(h.desde, h.desde + EN_CAJA)), huellaDelQueSeVa));
  // Con clones, el que esté igual que cuando se puso
  const exactos = posibles.filter((h) => mismosBytes(delHueco(h), seVa));
  const suyo = posibles.length === 1 ? posibles[0] : exactos.length === 1 ? exactos[0] : null;
  if (!suyo) {
    return {
      error: posibles.length
        ? "En la partida hay varios iguales al que se va y no sé cuál es: deja solo ese y vuelve a subirla."
        : "No encuentro en la partida al que se va. ¿Es tu partida de ahora, sin haberlo soltado ni cambiado?",
    };
  }

  const nueva = datos.slice();
  if (suyo.lugar === "caja") {
    nueva.set(entra.subarray(0, EN_CAJA), suyo.desde);
    return { datos: nueva, donde: nombreDelHueco(suyo), alaCaja: false };
  }
  if (entra.length === EN_EQUIPO) {
    nueva.set(entra, suyo.desde);
    return { datos: nueva, donde: nombreDelHueco(suyo), alaCaja: false };
  }

  const enEquipo = Math.min(6, datos[EQUIPO + 6 * EN_EQUIPO]);
  if (enEquipo <= 1) {
    return { error: "Es el único de tu equipo: deja otro con él en el juego, guarda y vuelve a subir la partida." };
  }
  const libre = todos.find((h) => h.lugar === "caja" && datos.subarray(h.desde, h.desde + EN_CAJA).every((b) => b === 0));
  if (!libre) return { error: "No tienes ningún hueco libre en las cajas para el que llega." };
  nueva.set(entra.subarray(0, EN_CAJA), libre.desde);
  // El equipo se corre para tapar el hueco, y el último se vacía
  for (let i = suyo.indice; i < enEquipo - 1; i++) {
    nueva.set(datos.subarray(EQUIPO + (i + 1) * EN_EQUIPO, EQUIPO + (i + 2) * EN_EQUIPO), EQUIPO + i * EN_EQUIPO);
  }
  nueva.fill(0, EQUIPO + (enEquipo - 1) * EN_EQUIPO, EQUIPO + enEquipo * EN_EQUIPO);
  nueva[EQUIPO + 6 * EN_EQUIPO] = enEquipo - 1;
  return { datos: nueva, donde: nombreDelHueco(libre), alaCaja: true };
}

/** Si un pokémon está tal cual en la partida, para comprobar el resultado */
export function estaEnLaPartida(datos: Uint8Array, pk: Uint8Array) {
  const buscado = descifrado(pk);
  return huecos(datos).some((h) => mismosBytes(descifrado(datos.subarray(h.desde, h.desde + EN_CAJA)), buscado));
}

/**
 * El pokémon descifrado, como lo guarda PKHeX en un `.pk7` (o `.pk6`): para
 * los juegos cuya partida aún no se escribe, que se meta a mano.
 */
export function pkDescifrado(bytes: Uint8Array): Uint8Array | null {
  return descifrado(bytes);
}
