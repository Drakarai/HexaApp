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
 * 6ª y 7ª generación: X/Y, Rubí Omega/Zafiro Alfa, Sol/Luna y Ultrasol/
 * Ultraluna. El fichero es el `main` de la tarjeta (sacado con Checkpoint o
 * JKSM), sin cifrar; cada pokémon va cifrado con su constante de cifrado.
 * Posiciones de PKHeX (`SAV6XY`, `SAV6AO`, `SAV7SM`, `SAV7USUM`).
 */

type Disposicion = { equipo: number; cajas: number; nombres: number; numeroDeCajas: number; abiertas: number };

const DISPOSICION: Partial<Record<Familia, Disposicion>> = {
  xy: { equipo: 0x14200, cajas: 0x22600, nombres: 0x4400, numeroDeCajas: 31, abiertas: 0x4400 + 0x43e },
  oras: { equipo: 0x14200, cajas: 0x33000, nombres: 0x4400, numeroDeCajas: 31, abiertas: 0x4400 + 0x43e },
  sm: { equipo: 0x1400, cajas: 0x4e00, nombres: 0x4800, numeroDeCajas: 32, abiertas: 0x4800 + 0x5e1 },
  usum: { equipo: 0x1600, cajas: 0x5200, nombres: 0x4c00, numeroDeCajas: 32, abiertas: 0x4c00 + 0x5e1 },
};

const TAMANOS: Partial<Record<Familia, number>> = { xy: 0x65600, oras: 0x76000, sm: 0x6be00, usum: 0x6cc00 };

export function familiaGen67(tamano: number): Familia | null {
  return (Object.entries(TAMANOS).find(([, t]) => t === tamano)?.[0] as Familia | undefined) ?? null;
}

const TAMANO_EN_CAJA = 0xe8;
const TAMANO_EN_EQUIPO = 0x104;
const NOMBRE_DE_CAJA = 0x22;

/** Un pokémon de 6ª o 7ª, descifrado; null si el hueco está vacío o es un huevo */
export function leerPk67(
  datos: Uint8Array,
  desde: number,
  generacion: 6 | 7,
  donde: DondeEnLaPartida,
  conMod = false,
): PokemonOficial | null {
  const pk = datos.slice(desde, desde + TAMANO_EN_CAJA);
  const ec = u32(pk, 0);
  if (pk.every((b) => b === 0)) return null;
  descifrar16(pk, 8, TAMANO_EN_CAJA, ec);
  desordenar(pk, 8, 56, (ec >>> 13) & 31);
  // La suma de comprobación dice si lo leído tiene sentido (si no, es basura)
  let suma = 0;
  for (let p = 8; p < TAMANO_EN_CAJA; p += 2) suma = (suma + u16(pk, p)) & 0xffff;
  if (suma !== u16(pk, 6)) return null;
  const especie = u16(pk, 0x08);
  const ivs = u32(pk, 0x74);
  if (!especie || (ivs >>> 30) & 1) return null;
  const pid = u32(pk, 0x18);
  const tsv = u16(pk, 0x0c) ^ u16(pk, 0x0e);
  const psv = (pid >>> 16) ^ (pid & 0xffff);
  const conMote = (ivs >>> 31) === 1;
  return {
    especie,
    forma: pk[0x1d] >>> 3,
    mote: conMote ? textoUtf16(pk, 0x40, 0x1a) || null : null,
    shiny: (tsv ^ psv) < 16,
    naturaleza: pk[0x1c],
    habilidad: habilidadDe(pk, generacion, conMod) || null,
    ranuraDeHabilidad: null,
    objeto: u16(pk, 0x0a) || null,
    movimientos: vacios([u16(pk, 0x5a), u16(pk, 0x5c), u16(pk, 0x5e), u16(pk, 0x60)]),
    lugar: u16(pk, 0xda) || null,
    fecha: fecha(pk[0xd4], pk[0xd5], pk[0xd6]),
    donde,
  };
}

/**
 * En la 7ª, el mod de expansión de USUM tiene más de 255 habilidades. La 1.42
 * guardaba el 9º bit en el 0x10 del byte de al lado (el de qué hueco de
 * habilidad es, que en el juego original solo usa 1, 2 y 4); la versión del
 * 19-11-2026 guarda el byte alto en el 0x3B y pasa a ese formato las que
 * encuentra a la antigua, así que en una partida pueden convivir los dos. Sin
 * ellos, Hospitalidad (299) se leía como Antiplanta (43). El 0x3B solo vale 1
 * (la mayor del mod es la 319): en una partida sin mod ese byte y el bit están
 * a 0, y cualquier otro valor no es una habilidad. El 0x3B solo se mira en
 * USUM (`conMod`), que es donde está el mod: en el juego original es un dato de
 * la 6ª (el superentrenamiento de distribución) que un pokémon traído con Bank
 * puede traer puesto. El bit, en cambio, el juego original nunca lo usa.
 */
function habilidadDe(pk: Uint8Array, generacion: 6 | 7, conMod: boolean) {
  if (generacion === 6) return pk[0x14];
  const alta = (pk[0x15] & 0x10) !== 0 || (conMod && pk[0x3b] === 1);
  return pk[0x14] | (alta ? 0x100 : 0);
}

export function leerGen67(datos: Uint8Array, familia: Familia): PartidaOficial {
  const d = DISPOSICION[familia];
  if (!d) throw new PartidaOficialNoValida("Esa partida no es de 6ª ni de 7ª generación.");
  const generacion = familia === "xy" || familia === "oras" ? 6 : 7;
  const pokemon: PokemonOficial[] = [];
  const enEquipo = datos[d.equipo + 6 * TAMANO_EN_EQUIPO];
  for (let i = 0; i < Math.min(6, enEquipo); i++) {
    const p = leerPk67(datos, d.equipo + i * TAMANO_EN_EQUIPO, generacion, { lugar: "equipo", hueco: i }, familia === "usum");
    if (p) pokemon.push(p);
  }
  const cajas: string[] = [];
  // Las que se han abierto; si el byte no tiene sentido, todas
  const abiertas = datos[d.abiertas] > 0 && datos[d.abiertas] <= d.numeroDeCajas ? datos[d.abiertas] : d.numeroDeCajas;
  for (let caja = 0; caja < abiertas; caja++) {
    cajas.push(textoUtf16(datos, d.nombres + caja * NOMBRE_DE_CAJA, NOMBRE_DE_CAJA) || `Caja ${caja + 1}`);
    for (let hueco = 0; hueco < 30; hueco++) {
      const p = leerPk67(datos, d.cajas + (caja * 30 + hueco) * TAMANO_EN_CAJA, generacion, { lugar: "caja", caja, hueco }, familia === "usum");
      if (p) pokemon.push(p);
    }
  }
  if (!pokemon.length && enEquipo > 6) throw new PartidaOficialNoValida("No encuentro ningún pokémon en esa partida.");
  return { tipo: "oficial", familia, jugador: null, pokemon, cajas };
}

/**
 * Los bytes de un hueco **tal cual están en la partida** (cifrados): los 0x104
 * de uno del equipo o los 0xE8 de uno de la caja. Es lo que se sube a la GTS,
 * para que el servidor lo lea él mismo y para poder meterlo después en la
 * partida de otro (ver `ficha-gen67.ts`).
 */
export function bytesDelHueco(datos: Uint8Array, familia: Familia, donde: DondeEnLaPartida): Uint8Array | null {
  const d = DISPOSICION[familia];
  if (!d) return null;
  const desde =
    donde.lugar === "equipo"
      ? d.equipo + donde.hueco * TAMANO_EN_EQUIPO
      : d.cajas + ((donde.caja) * 30 + donde.hueco) * TAMANO_EN_CAJA;
  const largo = donde.lugar === "equipo" ? TAMANO_EN_EQUIPO : TAMANO_EN_CAJA;
  if (desde + largo > datos.length) return null;
  return datos.slice(desde, desde + largo);
}

export { u32 };
