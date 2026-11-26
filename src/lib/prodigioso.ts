import datos from "@/lib/prodigioso-especies.json";
import tablas from "@/lib/partida/oficial-tablas.json";
import detalles from "@/lib/movimientos-detalle.json";
import { HABILIDADES_DEL_MOD } from "@/lib/partida/expansion-usum";
import { ORDEN, descifrar16, u16, u32 } from "@/lib/partida/oficial/comun";
import { CRECIMIENTO, experienciaDelNivel } from "@/lib/partida/oficial/ficha-gen67";

/**
 * **El Intercambio Prodigioso**: das un pokémon y te llega uno al azar. Las
 * cuentas, sin base de datos (lo prueban los tests). Así se acordó con el
 * grupo:
 *
 * - **Qué especie**: de toda la Pokédex de la generación del locke (Ultrasol y
 *   Ultraluna con el mod y Añil cuentan como 9ª), **al azar del todo** o
 *   **por BST**, parecida a la del que das (±10 %, y se abre si no hay
 *   ninguna). Sin legendarios, míticos ni Ultraentes salvo que el locke los
 *   permita, y **en la etapa que tendría a ese nivel** (a nivel 12, Gible; a
 *   50, Garchomp), también con opción de quitarlo.
 * - **Cómo llega**: al nivel del que das, con naturaleza e IV al azar, EV a 0,
 *   sin objeto, con 1 entre 4096 de ser shiny (lo de la 7ª), y en un locke
 *   random, con **movimientos y habilidad del todo al azar**. En uno sin
 *   randomizar haría falta lo que aprende cada uno a cada nivel: en obras.
 * - **Dónde**: en el hueco del que se va, del equipo o de la caja, con su
 *   mismo entrenador (el de la partida: así obedece) y en una Poké Ball.
 */

type Especie = [number, number, number, number, number, number, number, number, number, number, number, string];
const ESPECIES = (datos as unknown as { especies: Especie[] }).especies;

export const DE_LA_ESPECIE = (dex: number) => {
  const e = ESPECIES[dex - 1];
  if (!e) return null;
  const [ps, ataque, defensa, atEsp, defEsp, velocidad, legendario, sexo, amistad, de, nivelMinimo, nombre] = e;
  return {
    dex,
    base: { ps, ataque, defensa, atEsp, defEsp, velocidad },
    bst: ps + ataque + defensa + atEsp + defEsp + velocidad,
    legendario: legendario === 1,
    /** -1 sin sexo; si no, cuántos octavos son hembra */
    sexo,
    amistad,
    de: de || null,
    nivelMinimo,
    nombre,
  };
};

export type OpcionesDelProdigioso = {
  /** Parecido en BST al que se da; si no, al azar del todo */
  porBst: boolean;
  legendarios: boolean;
  /** Solo la etapa que tendría a ese nivel */
  etapaPorNivel: boolean;
};

/** La generación del locke: cuántas especies entran. USUM con el mod y Añil, como la 9ª */
export const ESPECIES_POR_GENERACION = [0, 151, 251, 386, 493, 649, 721, 809, 905, 1025];

/** Los hijos de cada especie, para saber si a un nivel ya habría evolucionado */
const HIJOS = new Map<number, number[]>();
ESPECIES.forEach((e, i) => {
  if (e[9]) HIJOS.set(e[9], [...(HIJOS.get(e[9]) ?? []), i + 1]);
});

/**
 * Las especies que pueden llegar a un nivel: con la etapa por nivel, las que
 * ya se pueden tener a ese nivel **y no habrían evolucionado todavía** (a
 * nivel 50 sale Garchomp, no Gible).
 */
export function candidatas(nivel: number, generacion: number, opciones: OpcionesDelProdigioso) {
  const hasta = ESPECIES_POR_GENERACION[Math.min(9, Math.max(1, generacion))];
  const lista: number[] = [];
  for (let dex = 1; dex <= hasta; dex++) {
    const e = DE_LA_ESPECIE(dex)!;
    if (!opciones.legendarios && e.legendario) continue;
    if (opciones.etapaPorNivel) {
      if (e.nivelMinimo > nivel) continue;
      const evolucionaria = (HIJOS.get(dex) ?? []).some((h) => h <= hasta && DE_LA_ESPECIE(h)!.nivelMinimo <= nivel);
      if (evolucionaria) continue;
    }
    lista.push(dex);
  }
  return lista;
}

/** La especie que llega. `azar` da números entre 0 y 1 (en el servidor, criptográficos) */
export function elegirEspecie(
  { nivel, generacion, bstDelQueSeVa, opciones }: { nivel: number; generacion: number; bstDelQueSeVa: number | null; opciones: OpcionesDelProdigioso },
  azar: () => number,
): number {
  let lista = candidatas(nivel, generacion, opciones);
  if (opciones.porBst && bstDelQueSeVa) {
    // ±10 %, y se abre de 5 en 5 hasta que haya alguna
    for (let margen = 0.1; margen <= 1; margen += 0.05) {
      const cerca = lista.filter((dex) => Math.abs(DE_LA_ESPECIE(dex)!.bst - bstDelQueSeVa) <= bstDelQueSeVa * margen);
      if (cerca.length) {
        lista = cerca;
        break;
      }
    }
  }
  if (!lista.length) lista = [1];
  return lista[Math.floor(azar() * lista.length)];
}

// ---------------------------------------------------------------------------
// Movimientos y habilidades al azar (en un locke random)
// ---------------------------------------------------------------------------

const T = tablas as unknown as { movimientos: Record<string, string>; habilidades: Record<string, string> };
const PP = detalles as Record<string, { pp?: number }>;
/** Combate (165) y el cañón de Eternatus (744) no son movimientos que se puedan tener */
const NO_SE_PUEDEN = new Set([165, 744]);

/** Los movimientos que hay en el juego del locke (en el mod, hasta los de la 9ª) */
export const MOVIMIENTOS_AL_AZAR = Object.keys(T.movimientos)
  .map(Number)
  .filter((n) => n > 0 && !NO_SE_PUEDEN.has(n));

/** Las habilidades: las de siempre hasta la 298 y, desde la 299, las del mod con su número */
export const HABILIDADES_AL_AZAR = [
  ...Object.keys(T.habilidades)
    .map(Number)
    .filter((n) => n > 0 && n < 299),
  ...Object.keys(HABILIDADES_DEL_MOD).map(Number),
];

export function ppDe(movimiento: number) {
  const slug = T.movimientos[String(movimiento)];
  return (slug && PP[slug]?.pp) || 10;
}

// ---------------------------------------------------------------------------
// El pokémon, como lo guarda el juego (7ª generación)
// ---------------------------------------------------------------------------

const EN_CAJA = 0xe8;
const EN_EQUIPO = 0x104;

export type PokemonGenerado = {
  especie: number;
  nivel: number;
  naturaleza: number;
  sexo: "M" | "F" | null;
  shiny: boolean;
  habilidad: number;
  movimientos: number[];
  ivs: number[];
};

/**
 * **Fabrica el pokémon** sobre el que se va (`plantilla`, los bytes de su
 * hueco tal cual): se queda lo del entrenador (nombre, ID, idioma, juego,
 * región y dónde y cuándo se conoció) y se cambia todo lo demás. Devuelve los
 * bytes cifrados, listos para el hueco: 0x104 si `enEquipo` (con nivel y
 * estadísticas), 0xE8 si no.
 */
export function fabricarPokemon(
  plantilla: Uint8Array,
  { especie, nivel, enEquipo }: { especie: number; nivel: number; enEquipo: boolean },
  azar: () => number,
): { bytes: Uint8Array; generado: PokemonGenerado } {
  const e = DE_LA_ESPECIE(especie);
  if (!e) throw new Error("Esa especie no existe.");
  const n = Math.min(100, Math.max(1, Math.round(nivel)));
  const entero = (max: number) => Math.floor(azar() * max);
  const u32Azar = () => (entero(0x10000) | (entero(0x10000) << 16)) >>> 0;

  // Descifrado y en orden, para escribir en su sitio
  const pk = new Uint8Array(EN_EQUIPO);
  pk.set(plantilla.subarray(0, EN_CAJA));
  const ecViejo = u32(pk, 0);
  descifrar16(pk, 8, EN_CAJA, ecViejo);
  const copia = pk.slice(8, 8 + 56 * 4);
  const ordenViejo = (ecViejo >>> 13) & 31;
  for (let i = 0; i < 4; i++) {
    const origen = ORDEN[ordenViejo * 4 + i];
    pk.set(copia.subarray(origen * 56, (origen + 1) * 56), 8 + i * 56);
  }
  const v = new DataView(pk.buffer);
  const w16 = (o: number, x: number) => v.setUint16(o, x & 0xffff, true);
  const w32 = (o: number, x: number) => v.setUint32(o, x >>> 0, true);

  // Lo del entrenador se queda; lo del pokémon, todo de nuevo
  const tid = u16(pk, 0x0c);
  const sid = u16(pk, 0x0e);
  const ec = u32Azar();
  // Shiny 1 de cada 4096, como en la 7ª: el PID se elige para que lo sea o no lo sea
  const shiny = azar() < 1 / 4096;
  let pid = u32Azar();
  const xor = (p: number) => (tid ^ sid ^ (p >>> 16) ^ (p & 0xffff)) & 0xffff;
  if (shiny) pid = ((((tid ^ sid ^ (pid & 0xffff)) & 0xfff0) << 16) | (pid & 0xffff)) >>> 0;
  else while (xor(pid) < 16) pid = u32Azar();

  const naturaleza = entero(25);
  const sexo: PokemonGenerado["sexo"] = e.sexo < 0 ? null : entero(8) < e.sexo ? "F" : "M";
  const habilidad = HABILIDADES_AL_AZAR[entero(HABILIDADES_AL_AZAR.length)];
  const movimientos: number[] = [];
  while (movimientos.length < 4) {
    const m = MOVIMIENTOS_AL_AZAR[entero(MOVIMIENTOS_AL_AZAR.length)];
    if (!movimientos.includes(m)) movimientos.push(m);
  }
  // En el orden de la partida: PS, Ataque, Defensa, Velocidad, At. Esp., Def. Esp.
  const ivs = [0, 1, 2, 3, 4, 5].map(() => entero(32));

  w32(0x00, ec);
  w16(0x08, especie);
  w16(0x0a, 0); // sin objeto
  const grupo = Number(CRECIMIENTO[especie - 1]) || 2;
  w32(0x10, experienciaDelNivel(grupo, n));
  pk[0x14] = habilidad & 0xff;
  // El 9º bit a la antigua (0x10), que lo entienden las dos versiones del mod; hueco de habilidad 1
  pk[0x15] = 1 | (habilidad > 0xff ? 0x10 : 0);
  pk[0x16] = 0; // marcas
  pk[0x17] = 0;
  w32(0x18, pid);
  pk[0x1c] = naturaleza;
  // Forma 0, sexo (0 macho, 1 hembra, 2 sin sexo), sin encuentro fatídico
  pk[0x1d] = (sexo === "M" ? 0 : sexo === "F" ? 1 : 2) << 1;
  pk.fill(0, 0x1e, 0x40); // EV, concursos, Pokérus, superentrenamiento, cintas y el byte del mod
  // Su nombre (sin mote): el de la especie en español
  pk.fill(0, 0x40, 0x5a);
  [...e.nombre.slice(0, 12)].forEach((c, i) => w16(0x40 + 2 * i, c === "♀" ? 0xe08f : c === "♂" ? 0xe08e : c.charCodeAt(0)));
  movimientos.forEach((m, i) => {
    w16(0x5a + 2 * i, m);
    pk[0x62 + i] = ppDe(m);
  });
  pk.fill(0, 0x66, 0x74); // Más PP, movimientos para recordar y superentrenamiento
  w32(0x74, ivs.reduce((acc, iv, i) => acc | (iv << (5 * i)), 0) >>> 0); // sin huevo ni mote
  pk.fill(0, 0x78, 0xb0); // nada de otro entrenador ni recuerdos
  pk[0xca] = e.amistad;
  pk.fill(0, 0xcb, 0xd4); // cariño y recuerdos del entrenador, y la fecha de huevo
  pk.fill(0, 0xd8, 0xda); // sitio de huevo
  pk[0xdc] = 4; // Poké Ball
  pk[0xdd] = (pk[0xdd] & 0x80) | n; // el sexo del entrenador se queda; nivel al conocerlo
  pk[0xde] = 0; // sin entrenamiento extremo
  let suma = 0;
  for (let p = 8; p < EN_CAJA; p += 2) suma = (suma + u16(pk, p)) & 0xffff;
  w16(0x06, suma);

  if (enEquipo) {
    pk.fill(0, EN_CAJA, EN_EQUIPO);
    pk[0xec] = n;
    const b = e.base;
    // Naturaleza: sube la (n/5) y baja la (n%5) de Ataque, Defensa, Velocidad, At. Esp., Def. Esp.
    const mod = (i: number) => (Math.floor(naturaleza / 5) === Math.floor(naturaleza % 5) ? 1 : Math.floor(naturaleza / 5) === i ? 1.1 : naturaleza % 5 === i ? 0.9 : 1);
    const st = (base: number, iv: number, i: number) => Math.floor((Math.floor(((2 * base + iv) * n) / 100) + 5) * mod(i));
    const ps = especie === 292 ? 1 : Math.floor(((2 * b.ps + ivs[0]) * n) / 100) + n + 10;
    w16(0xf0, ps);
    w16(0xf2, ps);
    w16(0xf4, st(b.ataque, ivs[1], 0));
    w16(0xf6, st(b.defensa, ivs[2], 1));
    w16(0xf8, st(b.velocidad, ivs[3], 2));
    w16(0xfa, st(b.atEsp, ivs[4], 3));
    w16(0xfc, st(b.defEsp, ivs[5], 4));
  }

  // Barajado y cifrado con su constante nueva
  const orden = (ec >>> 13) & 31;
  const llano = pk.slice(8, 8 + 56 * 4);
  for (let i = 0; i < 4; i++) {
    const destino = ORDEN[orden * 4 + i];
    pk.set(llano.subarray(i * 56, (i + 1) * 56), 8 + destino * 56);
  }
  descifrar16(pk, 8, EN_CAJA, ec);
  descifrar16(pk, EN_CAJA, EN_EQUIPO, ec);

  return {
    bytes: enEquipo ? pk : pk.slice(0, EN_CAJA),
    generado: {
      especie,
      nivel: n,
      naturaleza,
      sexo,
      shiny,
      habilidad,
      movimientos,
      // En la app: PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad
      ivs: [ivs[0], ivs[1], ivs[2], ivs[4], ivs[5], ivs[3]],
    },
  };
}
