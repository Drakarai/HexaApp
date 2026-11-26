import { descifrar16, desordenar, textoUtf16, u16, u32 } from "./comun";
import { leerPk67 } from "./gen67";
import type { PokemonOficial } from "./comun";

/**
 * **La ficha entera de un pokémon de 6ª o 7ª**, para la GTS: lo que el lector
 * de partidas no saca porque la app no lo apunta (nivel, sexo, IV, EV,
 * entrenador original, Poké Ball). Se lee de los bytes de su hueco tal cual
 * están en la partida, y **lo lee el servidor**: el navegador solo recorta el
 * hueco, así lo que se enseña en la GTS sale del pokémon y no de lo que diga
 * quien lo sube.
 *
 * Posiciones de PKHeX (`PK7`), como el resto de lectores; el código es nuestro.
 */

/** El grupo de crecimiento de cada especie (1 a 1025), con los números de PokéAPI */
export const CRECIMIENTO = "44444444422222244422222222224444443322332244422222222222211444444444444114442222222222222114442222222112222222113222222112222211111222222222211111111144444444442222333321123333224444332444434422222423222222423322414222211322311112222132222213111111114444444444222222222444444442211122661115554446632334311122112256466116622233344444555633226622555555243333134222444555131111111111111111444444444444224444444555522244222222236622343332222223421111441111221551114221222322241212322111111111111411444444444224442222222233444224442222344444422444444222224444422222222222222443344444422111222222222322224441112244411122222244222222111122111111111111111114444444442244422244222222222222222222222221122222222211113222222221111114444444442222222222222223222222222222224443112222311412222221111111111111111111111111111444444444224442223322222233444555222114422442211122222322222222211322211112111111111111111222421444444444225522222334444454441112244444422442223344444221112241444444431422222111111111111111111111111111111111125111111";

/** La experiencia que hace falta para tener el nivel `n` en cada grupo */
export function experienciaDelNivel(grupo: number, n: number): number {
  if (n <= 1) return 0;
  const c = n ** 3;
  switch (grupo) {
    case 1: // lento
      return Math.floor((5 * c) / 4);
    case 3: // rápido
      return Math.floor((4 * c) / 5);
    case 4: // parabólico
      return Math.floor((6 * c) / 5 - 15 * n * n + 100 * n - 140);
    case 5: // errático
      if (n < 50) return Math.floor((c * (100 - n)) / 50);
      if (n < 68) return Math.floor((c * (150 - n)) / 100);
      if (n < 98) return Math.floor((c * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((c * (160 - n)) / 100);
    case 6: // fluctuante
      if (n < 15) return Math.floor((c * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n < 36) return Math.floor((c * (n + 14)) / 50);
      return Math.floor((c * (Math.floor(n / 2) + 32)) / 50);
    default: // medio
      return c;
  }
}

/**
 * El nivel por la experiencia, que es lo que guarda la caja (el nivel solo va
 * escrito en los del equipo). Null si la especie no está en la tabla.
 */
export function nivelPorExperiencia(especie: number, experiencia: number): number | null {
  const grupo = Number(CRECIMIENTO[especie - 1]);
  if (!grupo) return null;
  let nivel = 1;
  while (nivel < 100 && experienciaDelNivel(grupo, nivel + 1) <= experiencia) nivel++;
  return nivel;
}

/** Las Poké Ball por su número en la 7ª */
const BALLS = [
  null, "Master Ball", "Ultra Ball", "Super Ball", "Poké Ball", "Safari Ball", "Malla Ball", "Buceo Ball",
  "Nido Ball", "Acopio Ball", "Turno Ball", "Lujo Ball", "Honor Ball", "Gloria Ball", "Sanaball", "Rápida Ball",
  "Ocaso Ball", "Veloz Ball", "Nivel Ball", "Cebo Ball", "Peso Ball", "Amor Ball", "Amigo Ball", "Luna Ball",
  "Competi Ball", "Ensueño Ball", "Ente Ball",
];

export type FichaCompleta67 = {
  pokemon: PokemonOficial;
  nivel: number | null;
  sexo: "M" | "F" | null;
  /** PS, Ataque, Defensa, Ataque especial, Defensa especial y Velocidad */
  ivs: number[];
  evs: number[];
  entrenador: { nombre: string; id: number };
  ball: string | null;
  /** Lo que lo distingue de cualquier otro: para encontrarlo luego en la partida */
  ec: number;
  pid: number;
};

/**
 * Lee un pokémon de los bytes cifrados de su hueco: 0x104 si es del equipo y
 * 0xE8 si es de la caja. Null si no es un pokémon (hueco vacío, huevo, basura).
 */
export function fichaCompleta67(bytes: Uint8Array, generacion: 6 | 7, conMod: boolean): FichaCompleta67 | null {
  if (bytes.length !== 0xe8 && bytes.length !== 0x104) return null;
  const pokemon = leerPk67(bytes, 0, generacion, { lugar: "caja", caja: 0, hueco: 0 }, conMod);
  if (!pokemon) return null;
  const ec = u32(bytes, 0);
  const pk = bytes.slice();
  descifrar16(pk, 8, 0xe8, ec);
  desordenar(pk, 8, 56, (ec >>> 13) & 31);
  let nivel: number | null = null;
  if (pk.length === 0x104) {
    // La parte del equipo va cifrada aparte, con la misma semilla desde el principio
    descifrar16(pk, 0xe8, 0x104, ec);
    nivel = pk[0xec] >= 1 && pk[0xec] <= 100 ? pk[0xec] : null;
  }
  nivel ??= nivelPorExperiencia(pokemon.especie, u32(pk, 0x10));
  const genero = (pk[0x1d] >>> 1) & 3;
  const ivs = u32(pk, 0x74);
  // En la partida van PS, Ataque, Defensa, Velocidad, At. Esp. y Def. Esp.
  const enOrden = (v: number[]) => [v[0], v[1], v[2], v[4], v[5], v[3]];
  const sid = u16(pk, 0x0e);
  const tid = u16(pk, 0x0c);
  return {
    pokemon,
    nivel,
    sexo: genero === 0 ? "M" : genero === 1 ? "F" : null,
    ivs: enOrden([0, 1, 2, 3, 4, 5].map((i) => (ivs >>> (5 * i)) & 31)),
    evs: enOrden([0, 1, 2, 3, 4, 5].map((i) => pk[0x1e + i])),
    entrenador: {
      nombre: textoUtf16(pk, 0xb0, 0x1a),
      // En la 7ª el número que sale en la ficha es el de seis cifras
      id: generacion === 7 ? ((tid | (sid << 16)) >>> 0) % 1000000 : tid,
    },
    ball: BALLS[pk[0xdc]] ?? null,
    ec,
    pid: u32(pk, 0x18),
  };
}
