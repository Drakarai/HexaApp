import letras from "./letras.json";
import {
  PartidaOficialNoValida,
  descifrar16,
  desordenar,
  fecha,
  textoUtf16,
  u16,
  u32,
  vacios,
  type Familia,
  type PartidaOficial,
  type PokemonOficial,
} from "./comun";
import type { DondeEnLaPartida } from "../essentials";

/**
 * 3ª, 4ª y 5ª generación. Las de GBA son el `.sav` de 128 KB (Rubí, Zafiro,
 * Esmeralda, Rojo Fuego y Verde Hoja); las de DS, el `.sav` de 512 KB
 * (Diamante, Perla, Platino, HeartGold, SoulSilver, Negro y Blanco, y sus
 * segundas partes). Posiciones de PKHeX (`SAV3`, `SAV4*`, `SAV5*`).
 *
 * Las de GBA y las de la 4ª guardan **dos copias** de la partida y la buena es
 * la del contador más alto: la otra es la del guardado anterior.
 */

const L = letras as unknown as { g3: string[]; g4: string[]; especiesG3: Record<string, number> };

const nacionalG3 = (interno: number) => (interno < 252 ? interno : (L.especiesG3[String(interno)] ?? 0));

/** El texto de la 3ª: un byte por letra, con su tabla, hasta el 0xFF */
function textoG3(b: Uint8Array, desde: number, largo: number) {
  let salida = "";
  for (let i = 0; i < largo; i++) {
    const c = b[desde + i];
    if (c === 0xff) break;
    salida += L.g3[c] ?? "";
  }
  return salida.trim();
}

/** El de la 4ª: dos bytes por letra, con su tabla, hasta el 0xFFFF */
function textoG4(b: Uint8Array, desde: number, largo: number) {
  let salida = "";
  for (let p = desde; p + 1 < desde + largo; p += 2) {
    const c = u16(b, p);
    if (c === 0xffff) break;
    salida += c === 0x246d ? "♂" : c === 0x246e ? "♀" : (L.g4[c] ?? "");
  }
  return salida.trim();
}

const esShiny = (pid: number, tid: number, sid: number, umbral: number) =>
  ((tid ^ sid ^ (pid >>> 16) ^ (pid & 0xffff)) & 0xffff) < umbral;

// ---------------------------------------------------------------------------
// 3ª
// ---------------------------------------------------------------------------

const SECTOR = 0x1000;
const SECTOR_USADO = 0xf80;

/** Las 14 piezas de una copia, en su orden; null si falta alguna */
function copiaG3(datos: Uint8Array, copia: number): { piezas: Uint8Array[]; contador: number } | null {
  const piezas: Uint8Array[] = [];
  let contador = 0;
  for (let s = 0; s < 14; s++) {
    const desde = copia * 14 * SECTOR + s * SECTOR;
    const id = u16(datos, desde + 0xff4);
    if (id >= 14 || piezas[id]) return null;
    piezas[id] = datos.subarray(desde, desde + SECTOR_USADO);
    if (id === 0) contador = u32(datos, desde + 0xffc);
  }
  return piezas.length === 14 && piezas.every(Boolean) ? { piezas, contador } : null;
}

export function esPartidaG3(datos: Uint8Array) {
  return datos.length >= 0x20000 && Boolean(copiaG3(datos, 0) ?? copiaG3(datos, 1));
}

function leerPk3(pk: Uint8Array, donde: DondeEnLaPartida): PokemonOficial | null {
  const pid = u32(pk, 0);
  const otid = u32(pk, 4);
  if (!pid && !otid) return null;
  const datos = pk.slice(0, 80);
  const llave = (pid ^ otid) >>> 0;
  for (let p = 0x20; p < 0x50; p += 4) {
    const v = (u32(datos, p) ^ llave) >>> 0;
    datos[p] = v & 0xff;
    datos[p + 1] = (v >>> 8) & 0xff;
    datos[p + 2] = (v >>> 16) & 0xff;
    datos[p + 3] = v >>> 24;
  }
  desordenar(datos, 0x20, 12, pid % 24);
  let suma = 0;
  for (let p = 0x20; p < 0x50; p += 2) suma = (suma + u16(datos, p)) & 0xffff;
  if (suma !== u16(datos, 0x1c)) return null;
  const especie = nacionalG3(u16(datos, 0x20));
  const ivs = u32(datos, 0x48);
  if (!especie || (ivs >>> 30) & 1 || datos[0x13] & 4) return null;
  return {
    especie,
    forma: 0,
    // La 3ª no dice si se le puso mote: se compara con la especie al traducirlo
    mote: datos[0x12] === 1 ? null : textoG3(datos, 0x08, 10) || null,
    shiny: esShiny(pid, otid & 0xffff, otid >>> 16, 8),
    naturaleza: pid % 25,
    habilidad: null,
    ranuraDeHabilidad: ivs >>> 31,
    objeto: u16(datos, 0x22) || null,
    movimientos: vacios([u16(datos, 0x2c), u16(datos, 0x2e), u16(datos, 0x30), u16(datos, 0x32)]),
    lugar: datos[0x45] || null,
    fecha: null,
    donde,
  };
}

export function leerGen3(datos: Uint8Array, pista?: Familia): PartidaOficial {
  const a = copiaG3(datos, 0);
  const b = datos.length >= 0x1c000 ? copiaG3(datos, 1) : null;
  const buena = a && b ? (b.contador > a.contador && a.contador !== 0xffffffff ? b : a) : (a ?? b);
  if (!buena) throw new PartidaOficialNoValida("Esa partida de GBA está incompleta o no es de Pokémon.");
  const pequena = buena.piezas[0];
  const grande = new Uint8Array(4 * SECTOR_USADO);
  for (let i = 1; i <= 4; i++) grande.set(buena.piezas[i], (i - 1) * SECTOR_USADO);
  const pc = new Uint8Array(9 * SECTOR_USADO);
  for (let i = 5; i <= 13; i++) pc.set(buena.piezas[i], (i - 5) * SECTOR_USADO);

  // Qué juego es (como PKHeX): Rojo Fuego/Verde Hoja llevan un 1 fijo en 0xAC
  const marca = u32(pequena, 0xac);
  const familia: Familia =
    marca === 1 ? "frlg" : marca === 0 ? "rs" : pequena.subarray(0x890, 0xf2c).some((x) => x) ? "e" : "rs";
  const equipo = familia === "frlg" ? 0x34 : 0x234;
  const pokemon: PokemonOficial[] = [];
  const cuantos = Math.min(6, grande[equipo]);
  for (let i = 0; i < cuantos; i++) {
    const p = leerPk3(grande.subarray(equipo + 4 + i * 100, equipo + 4 + i * 100 + 80), { lugar: "equipo", hueco: i });
    if (p) pokemon.push(p);
  }
  const cajas: string[] = [];
  const nombres = 4 + 80 * 30 * 14;
  for (let caja = 0; caja < 14; caja++) {
    cajas.push(textoG3(pc, nombres + caja * 9, 9) || `Caja ${caja + 1}`);
    for (let hueco = 0; hueco < 30; hueco++) {
      const desde = 4 + (caja * 30 + hueco) * 80;
      const p = leerPk3(pc.subarray(desde, desde + 80), { lugar: "caja", caja, hueco });
      if (p) pokemon.push(p);
    }
  }
  void pista;
  return { tipo: "oficial", familia, jugador: textoG3(pequena, 0, 8) || null, pokemon, cajas };
}

// ---------------------------------------------------------------------------
// 4ª y 5ª
// ---------------------------------------------------------------------------

const PARTICION = 0x40000;

function leerPk45(datos: Uint8Array, desde: number, generacion: 4 | 5, donde: DondeEnLaPartida): PokemonOficial | null {
  const pk = datos.slice(desde, desde + 0x88);
  const pid = u32(pk, 0);
  const comprobacion = u16(pk, 6);
  if (!pid && !comprobacion) return null;
  descifrar16(pk, 8, 0x88, comprobacion);
  desordenar(pk, 8, 32, (pid >>> 13) & 31);
  let suma = 0;
  for (let p = 8; p < 0x88; p += 2) suma = (suma + u16(pk, p)) & 0xffff;
  if (suma !== comprobacion) return null;
  const especie = u16(pk, 0x08);
  const ivs = u32(pk, 0x38);
  if (!especie || (ivs >>> 30) & 1) return null;
  const conMote = ivs >>> 31 === 1;
  // En Platino y HeartGold el sitio de verdad va aparte; el de Diamante y Perla, si no
  const lugar = generacion === 4 ? u16(pk, 0x46) || u16(pk, 0x80) : u16(pk, 0x80);
  return {
    especie,
    forma: pk[0x40] >>> 3,
    mote: conMote ? (generacion === 4 ? textoG4(pk, 0x48, 22) : textoUtf16(pk, 0x48, 22, 0xffff)) || null : null,
    shiny: esShiny(pid, u16(pk, 0x0c), u16(pk, 0x0e), 8),
    naturaleza: generacion === 4 ? pid % 25 : pk[0x41] % 25,
    habilidad: pk[0x15] || null,
    ranuraDeHabilidad: null,
    objeto: u16(pk, 0x0a) || null,
    movimientos: vacios([u16(pk, 0x28), u16(pk, 0x2a), u16(pk, 0x2c), u16(pk, 0x2e)]),
    lugar: lugar || null,
    fecha: fecha(pk[0x7b], pk[0x7c], pk[0x7d]),
    donde,
  };
}

type Juego4 = { familia: Familia; general: number; almacen: number; tamanoAlmacen: number; equipo: number };
const JUEGOS4: Juego4[] = [
  { familia: "dp", general: 0xc100, almacen: 0xc100, tamanoAlmacen: 0x121e0, equipo: 0x98 },
  { familia: "pt", general: 0xcf2c, almacen: 0xcf2c, tamanoAlmacen: 0x121e4, equipo: 0xa0 },
  { familia: "hgss", general: 0xf628, almacen: 0xf700, tamanoAlmacen: 0x12310, equipo: 0x98 },
];

function juegoG4(datos: Uint8Array): Juego4 | null {
  if (datos.length < 0x80000) return null;
  return (
    JUEGOS4.find((j) => {
      const fin = PARTICION + j.general;
      const magia = u32(datos, fin - 0x8);
      return u32(datos, fin - 0xc) === j.general && (magia === 0x20060623 || magia === 0x20070903);
    }) ?? null
  );
}

export const esPartidaG4 = (datos: Uint8Array) => Boolean(juegoG4(datos));

/** Cuál de las dos copias de un bloque es la nueva: la de los contadores más altos */
function copiaG4(datos: Uint8Array, desde: number, largo: number) {
  const pie = desde + largo - 0x14;
  const [ma, mb] = [u32(datos, pie), u32(datos, pie + PARTICION)];
  const [na, nb] = [u32(datos, pie + 4), u32(datos, pie + PARTICION + 4)];
  const vacio = 0xffffffff;
  if (ma === vacio && mb !== vacio) return desde + PARTICION;
  if (mb === vacio) return desde;
  if (ma !== mb) return ma > mb ? desde : desde + PARTICION;
  return nb > na ? desde + PARTICION : desde;
}

export function leerGen4(datos: Uint8Array): PartidaOficial {
  const j = juegoG4(datos);
  if (!j) throw new PartidaOficialNoValida("Esa partida no es de Diamante, Perla, Platino, HeartGold ni SoulSilver.");
  const general = copiaG4(datos, 0, j.general);
  const almacen = copiaG4(datos, j.almacen, j.tamanoAlmacen);
  const pokemon: PokemonOficial[] = [];
  const equipo = general + j.equipo;
  const cuantos = Math.min(6, datos[equipo - 4]);
  for (let i = 0; i < cuantos; i++) {
    const p = leerPk45(datos, equipo + i * 0xec, 4, { lugar: "equipo", hueco: i });
    if (p) pokemon.push(p);
  }
  const hgss = j.familia === "hgss";
  const cajas: string[] = [];
  for (let caja = 0; caja < 18; caja++) {
    const nombre = hgss ? almacen + 0x12008 + caja * 40 : almacen + 4 + 18 * 0xff0 + caja * 40;
    cajas.push(textoG4(datos, nombre, 40) || `Caja ${caja + 1}`);
    const inicio = hgss ? almacen + caja * 0x1000 : almacen + 4 + caja * 0xff0;
    for (let hueco = 0; hueco < 30; hueco++) {
      const p = leerPk45(datos, inicio + hueco * 0x88, 4, { lugar: "caja", caja, hueco });
      if (p) pokemon.push(p);
    }
  }
  return { tipo: "oficial", familia: j.familia, jugador: null, pokemon, cajas };
}

/** El CRC16-CCITT con el que la 5ª firma el pie de la partida */
export function crc16(b: Uint8Array) {
  let crc = 0xffff;
  for (const x of b) {
    crc ^= x << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function familiaG5(datos: Uint8Array): Familia | null {
  if (datos.length < 0x80000) return null;
  const vale = (tamano: number, largo: number) => {
    const pie = datos.subarray(tamano - 0x100, tamano - 0x100 + largo + 0x10);
    return u16(pie, pie.length - 2) === crc16(pie.subarray(0, largo));
  };
  if (vale(0x24000, 0x8c)) return "bw";
  if (vale(0x26000, 0x94)) return "b2w2";
  return null;
}

export const esPartidaG5 = (datos: Uint8Array) => Boolean(familiaG5(datos));

export function leerGen5(datos: Uint8Array): PartidaOficial {
  const familia = familiaG5(datos);
  if (!familia) throw new PartidaOficialNoValida("Esa partida no es de Negro, Blanco, Negro 2 ni Blanco 2.");
  const pokemon: PokemonOficial[] = [];
  const equipo = 0x18e00;
  const cuantos = Math.min(6, datos[equipo + 4]);
  for (let i = 0; i < cuantos; i++) {
    const p = leerPk45(datos, equipo + 8 + i * 0xdc, 5, { lugar: "equipo", hueco: i });
    if (p) pokemon.push(p);
  }
  const abiertas = datos[0x3dd] > 0 && datos[0x3dd] <= 24 ? datos[0x3dd] : 24;
  const cajas: string[] = [];
  for (let caja = 0; caja < abiertas; caja++) {
    cajas.push(textoUtf16(datos, 0x28 * caja + 4, 0x14, 0xffff) || `Caja ${caja + 1}`);
    const inicio = 0x400 + caja * (30 * 0x88 + 0x10);
    for (let hueco = 0; hueco < 30; hueco++) {
      const p = leerPk45(datos, inicio + hueco * 0x88, 5, { lugar: "caja", caja, hueco });
      if (p) pokemon.push(p);
    }
  }
  return { tipo: "oficial", familia, jugador: null, pokemon, cajas };
}
