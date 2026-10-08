/**
 * Partidas de los juegos oficiales **montadas para las pruebas**: la forma de
 * cada juego (secciones, copias, pies, listas) con pokémon de verdad dentro,
 * los de las pruebas de PKHeX (`tests/partidas/pk`), cifrados como lo hace el
 * juego. Así se prueba el lector entero sin guardar partidas de nadie.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ORDEN, descifrar16, u16, u32 } from "@/lib/partida/oficial/comun";
import { crc16 } from "@/lib/partida/oficial/gen345";

export const pk = (nombre: string) => new Uint8Array(readFileSync(path.join(__dirname, "partidas", "pk", nombre)));

const pon16 = (b: Uint8Array, p: number, v: number) => {
  b[p] = v & 0xff;
  b[p + 1] = (v >>> 8) & 0xff;
};
const pon32 = (b: Uint8Array, p: number, v: number) => {
  pon16(b, p, v & 0xffff);
  pon16(b, p + 2, v >>> 16);
};

/** Lo contrario de `desordenar`: deja los bloques como los guarda el juego */
function ordenar(datos: Uint8Array, desde: number, tamano: number, orden: number) {
  const copia = datos.slice(desde, desde + tamano * 4);
  for (let i = 0; i < 4; i++) datos.set(copia.subarray(i * tamano, (i + 1) * tamano), desde + ORDEN[orden * 4 + i] * tamano);
}

export function cifrar3(claro: Uint8Array) {
  const d = claro.slice(0, 80);
  const pid = u32(d, 0);
  ordenar(d, 0x20, 12, pid % 24);
  const llave = (pid ^ u32(d, 4)) >>> 0;
  for (let p = 0x20; p < 0x50; p += 4) pon32(d, p, (u32(d, p) ^ llave) >>> 0);
  return d;
}

export function cifrar45(claro: Uint8Array) {
  const d = claro.slice(0, 0x88);
  ordenar(d, 8, 32, (u32(d, 0) >>> 13) & 31);
  descifrar16(d, 8, 0x88, u16(d, 6));
  return d;
}

export function cifrar67(claro: Uint8Array) {
  const d = claro.slice(0, 0xe8);
  const ec = u32(d, 0);
  ordenar(d, 8, 56, (ec >>> 13) & 31);
  descifrar16(d, 8, 0xe8, ec);
  return d;
}

/** Rojo Fuego: equipo con un pokémon, y otro en la caja 1 */
export function partidaG3(equipo: Uint8Array, caja: Uint8Array) {
  const sav = new Uint8Array(0x20000).fill(0xff);
  const grande = new Uint8Array(4 * 0xf80);
  grande[0x34] = 1;
  grande.set(cifrar3(equipo), 0x38);
  const pc = new Uint8Array(9 * 0xf80);
  pc.set(cifrar3(caja), 4 + 2 * 80); // caja 1, hueco 3
  const nombres = 4 + 80 * 30 * 14;
  pc.fill(0xff, nombres, nombres + 14 * 9);
  pc.set([0xc7, 0xbb, 0xc8, 0xbe, 0xcf, 0xc6, 0xc9, 0xcd, 0xff], nombres + 13 * 9); // «MANDULOS»… da igual: una caja con nombre
  for (let s = 0; s < 14; s++) {
    const desde = s * 0x1000;
    sav.fill(0, desde, desde + 0x1000);
    if (s === 0) pon32(sav, desde + 0xac, 1);
    else if (s <= 4) sav.set(grande.subarray((s - 1) * 0xf80, s * 0xf80), desde);
    else sav.set(pc.subarray((s - 5) * 0xf80, (s - 4) * 0xf80), desde);
    pon16(sav, desde + 0xff4, s);
    pon32(sav, desde + 0xffc, 7);
  }
  return sav;
}

/** Diamante: equipo con un pokémon y otro en la caja 2 */
export function partidaG4(equipo: Uint8Array, caja: Uint8Array) {
  const sav = new Uint8Array(0x80000);
  const general = 0xc100;
  const almacen = 0xc100;
  const tamanoAlmacen = 0x121e0;
  for (const particion of [0, 0x40000]) {
    // La copia buena es la primera: contador más alto
    pon32(sav, particion + general - 0x14, particion ? 1 : 2);
    pon32(sav, particion + general - 0xc, general);
    pon32(sav, particion + general - 0x8, 0x20060623);
    pon32(sav, particion + almacen + tamanoAlmacen - 0x14, particion ? 1 : 2);
  }
  sav[0x98 - 4] = 1;
  sav.set(cifrar45(equipo), 0x98);
  sav.set(cifrar45(caja), almacen + 4 + 1 * 0xff0 + 5 * 0x88); // caja 2, hueco 6
  return sav;
}

/** Negro: equipo con un pokémon y otro en la caja 1, y tres cajas abiertas */
export function partidaG5(equipo: Uint8Array, caja: Uint8Array) {
  const sav = new Uint8Array(0x80000);
  const pie = 0x24000 - 0x100;
  pon16(sav, pie + 0x8c + 0x10 - 2, crc16(sav.subarray(pie, pie + 0x8c)));
  sav[0x3dd] = 3;
  sav[0x18e00 + 4] = 1;
  sav.set(cifrar45(equipo), 0x18e00 + 8);
  sav.set(cifrar45(caja), 0x400);
  return sav;
}

/** X: equipo con un pokémon y otro en la caja 2 */
export function partidaG6(equipo: Uint8Array, caja: Uint8Array) {
  const sav = new Uint8Array(0x65600);
  sav[0x4400 + 0x43e] = 2;
  sav[0x14200 + 6 * 0x104] = 1;
  sav.set(cifrar67(equipo), 0x14200);
  sav.set(cifrar67(caja), 0x22600 + 30 * 0xe8);
  return sav;
}

/** Una lista de la 1ª o la 2ª con un pokémon sacado de su fichero (.pk1/.pk2, que ya es una lista de uno) */
function lista(fichero: Uint8Array, capacidad: number, cuerpo: number, guardado: number) {
  const salida = new Uint8Array(1 + capacidad + 1 + capacidad * guardado + capacidad * 22);
  salida[0] = 1;
  salida[1] = fichero[1];
  salida[2] = 0xff;
  salida.set(fichero.subarray(3, 3 + guardado), 1 + capacidad + 1);
  const nombres = 1 + capacidad + 1 + capacidad * guardado;
  salida.set(fichero.subarray(3 + cuerpo, 3 + cuerpo + 11), nombres);
  salida.set(fichero.subarray(3 + cuerpo + 11, 3 + cuerpo + 22), nombres + capacidad * 11);
  return salida;
}

/** Rojo: uno en el equipo y el mismo en la caja que se está usando */
export function partidaG1(fichero: Uint8Array) {
  const sav = new Uint8Array(0x8000);
  sav.set(lista(fichero, 6, 44, 44), 0x2f2c);
  sav.set(lista(fichero, 20, 44, 33), 0x30c0);
  return sav;
}

/** Cristal: uno en el equipo y otro en la caja 1 */
export function partidaG2(equipo: Uint8Array, caja: Uint8Array) {
  const sav = new Uint8Array(0x8000);
  sav.set(lista(equipo, 6, 48, 48), 0x2865);
  sav[0x2d10] = 0;
  sav[0x2d11] = 0xff;
  sav.set(lista(caja, 20, 48, 32), 0x4000);
  return sav;
}
