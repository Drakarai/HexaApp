import letras from "./letras.json";
import { PartidaOficialNoValida, vacios, type Familia, type PartidaOficial, type PokemonOficial } from "./comun";
import type { DondeEnLaPartida } from "../essentials";

/**
 * 1ª y 2ª generación: el `.sav` de 32 KB de Rojo, Azul, Amarillo, Oro, Plata
 * y Cristal (versiones occidentales). No hay naturalezas, habilidades ni fecha
 * de captura; en la 1ª tampoco objetos ni shiny, y en la 2ª solo Cristal
 * guarda dónde se capturó. Posiciones de PKHeX (`SAV1`, `SAV2`, `SAV2Offsets`).
 *
 * Los pokémon van en **listas**: cuántos hay, sus especies, sus datos, los
 * nombres de sus entrenadores y sus motes.
 */

const L = letras as unknown as { g1: string[]; g2: string[]; especiesG1: number[] };

function texto(b: Uint8Array, desde: number, tabla: string[]) {
  let salida = "";
  for (let i = 0; i < 11; i++) {
    const c = b[desde + i];
    if (c === 0x50 || c === 0) break;
    salida += tabla[c] ?? "";
  }
  return salida.trim();
}

/** Una lista bien formada: no más de los que caben y la marca 0xFF detrás de las especies */
function esLista(b: Uint8Array, desde: number, capacidad: number) {
  const n = b[desde];
  return n <= capacidad && b[desde + 1 + n] === 0xff;
}

type Disposicion = { familia: Familia; equipo: number; cajaActual: number; indiceDeCaja: number; nombres: number | null };

const DE_LA_1 = { familia: "rby", equipo: 0x2f2c, cajaActual: 0x30c0, indiceDeCaja: 0x284c, nombres: null } as const;
const DE_LA_2: Disposicion[] = [
  { familia: "gs", equipo: 0x288a, cajaActual: 0x2d6c, indiceDeCaja: 0x2724, nombres: 0x2727 },
  { familia: "c", equipo: 0x2865, cajaActual: 0x2d10, indiceDeCaja: 0x2700, nombres: 0x2703 },
];

function disposicion(datos: Uint8Array): Disposicion | null {
  if (datos.length < 0x8000) return null;
  // Las de la 2ª primero: su comprobación es más exigente que la de la 1ª
  for (const d of DE_LA_2) if (esLista(datos, d.equipo, 6) && esLista(datos, d.cajaActual, 20)) return d;
  if (esLista(datos, DE_LA_1.equipo, 6) && esLista(datos, DE_LA_1.cajaActual, 20)) return DE_LA_1;
  return null;
}

export const esPartidaG12 = (datos: Uint8Array) => Boolean(disposicion(datos));

/** El shiny de Oro y Plata: sale de sus DV (defensa, velocidad y especial a 10, y un ataque concreto) */
function shinyGB(dv: number) {
  const ataque = dv >> 12;
  const defensa = (dv >> 8) & 0xf;
  const velocidad = (dv >> 4) & 0xf;
  const especial = dv & 0xf;
  return defensa === 10 && velocidad === 10 && especial === 10 && [2, 3, 6, 7, 10, 11, 14, 15].includes(ataque);
}

function leerLista(
  datos: Uint8Array,
  desde: number,
  capacidad: number,
  tamano: number,
  generacion: 1 | 2,
  lugarDe: (i: number) => DondeEnLaPartida,
  cristal: boolean,
): PokemonOficial[] {
  if (!esLista(datos, desde, capacidad)) return [];
  const n = datos[desde];
  const cuerpo = desde + 1 + capacidad + 1;
  const motes = cuerpo + capacidad * tamano + capacidad * 11;
  const tabla = generacion === 1 ? L.g1 : L.g2;
  const salida: PokemonOficial[] = [];
  for (let i = 0; i < n; i++) {
    const pk = cuerpo + i * tamano;
    const bruto = datos[pk];
    // En la 2ª, el 0xFD de la lista de especies es un huevo
    if (generacion === 2 && datos[desde + 1 + i] === 0xfd) continue;
    const especie = generacion === 1 ? (L.especiesG1[bruto] ?? 0) : bruto;
    if (!especie || especie > 251) continue;
    const dv = (datos[pk + (generacion === 1 ? 0x1b : 0x15)] << 8) | datos[pk + (generacion === 1 ? 0x1c : 0x16)];
    const movimientos = generacion === 1 ? [8, 9, 10, 11] : [2, 3, 4, 5];
    salida.push({
      especie,
      forma: 0,
      // Sin marca de mote: se compara con la especie al traducirlo
      mote: texto(datos, motes + i * 11, tabla) || null,
      shiny: generacion === 2 && shinyGB(dv),
      naturaleza: null,
      habilidad: null,
      ranuraDeHabilidad: null,
      objeto: generacion === 2 ? datos[pk + 1] || null : null,
      movimientos: vacios(movimientos.map((m) => datos[pk + m])),
      lugar: cristal ? datos[pk + 0x1e] & 0x7f || null : null,
      fecha: null,
      donde: lugarDe(i),
    });
  }
  return salida;
}

export function leerGen12(datos: Uint8Array): PartidaOficial {
  const d = disposicion(datos);
  if (!d) throw new PartidaOficialNoValida("Esa partida no es de Rojo, Azul, Amarillo, Oro, Plata ni Cristal.");
  const generacion = d.familia === "rby" ? 1 : 2;
  const cristal = d.familia === "c";
  const pokemon = leerLista(datos, d.equipo, 6, generacion === 1 ? 44 : 48, generacion, (hueco) => ({ lugar: "equipo", hueco }), cristal);

  const cajas: string[] = [];
  const numeroDeCajas = generacion === 1 ? 12 : 14;
  const actual = datos[d.indiceDeCaja] & 0x7f;
  const tamanoDeLista = generacion === 1 ? 0x462 : 0x44e;
  for (let caja = 0; caja < numeroDeCajas; caja++) {
    cajas.push((d.nombres !== null ? texto(datos, d.nombres + caja * 9, L.g2) : "") || `Caja ${caja + 1}`);
    let desde: number;
    if (generacion === 1) {
      // En la 1ª la caja que se está usando vive aparte; las demás, solo si el juego ya las ha guardado alguna vez
      if (caja === actual) desde = d.cajaActual;
      else if (datos[d.indiceDeCaja] & 0x80) desde = (caja < 6 ? 0x4000 : 0x6000) + (caja % 6) * tamanoDeLista;
      else continue;
    } else {
      // En la 2ª manda la copia de los bancos, que es la que está siempre al día
      desde = (caja < 7 ? 0x4000 : 0x6000) + (caja % 7) * (tamanoDeLista + 2);
    }
    pokemon.push(
      ...leerLista(datos, desde, 20, generacion === 1 ? 33 : 32, generacion, (hueco) => ({ lugar: "caja", caja, hueco }), cristal),
    );
  }
  return { tipo: "oficial", familia: d.familia, jugador: null, pokemon, cajas };
}
