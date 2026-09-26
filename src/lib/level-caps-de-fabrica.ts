import type { Region } from "@/lib/juegos";
import { LEVEL_CAP_KINDS, type LevelCapKind } from "@/lib/constants";

/**
 * Los hitos de cada región, para no tener que escribirlos a mano en cada locke.
 *
 * Funciona igual que `lib/mapas-de-fabrica.ts`: esto es **solo la semilla**. Se
 * copia con un botón a la plantilla del juego (Administración → Level caps), y
 * a partir de ahí manda lo que haya guardado. Nada de esto vuelve a tocar nada
 * por su cuenta.
 *
 * **Los niveles son un punto de partida, no una verdad revelada.** Están
 * escritos a mano a partir de los juegos, cambian de una versión a otra de la
 * misma región (Amarillo no es Rojo, Platino no es Diamante, Esmeralda no es
 * Rubí) y cada grupo suele ajustarlos a su gusto de todas formas. Por eso se
 * editan en dos clics: es la misma decisión que con los nombres de las zonas
 * del mapa.
 */

export type ItemDeFabrica = {
  /** Cómo se llama el hito: el líder, el dominante, el Alto Mando… */
  label: string;
  cap: number;
  kind: LevelCapKind;
  /** Dónde es y de qué tipo, para reconocerlo de un vistazo */
  notes?: string;
};

const { GYM, ELITE_FOUR, CHAMPION, OTHER } = LEVEL_CAP_KINDS;

const KANTO: ItemDeFabrica[] = [
  { label: "Brock", cap: 12, kind: GYM, notes: "Ciudad Plateada · Roca" },
  { label: "Misty", cap: 21, kind: GYM, notes: "Ciudad Celeste · Agua" },
  { label: "Teniente Surge", cap: 24, kind: GYM, notes: "Ciudad Carmín · Eléctrico" },
  { label: "Erika", cap: 29, kind: GYM, notes: "Ciudad Azulona · Planta" },
  { label: "Koga", cap: 43, kind: GYM, notes: "Ciudad Fucsia · Veneno" },
  { label: "Sabrina", cap: 43, kind: GYM, notes: "Ciudad Azafrán · Psíquico" },
  { label: "Blaine", cap: 47, kind: GYM, notes: "Isla Canela · Fuego" },
  { label: "Giovanni", cap: 50, kind: GYM, notes: "Ciudad Verde · Tierra" },
  { label: "Alto Mando", cap: 59, kind: ELITE_FOUR, notes: "Lorelei, Bruno, Agatha y Lance" },
  { label: "Campeón", cap: 65, kind: CHAMPION, notes: "Tu rival" },
];

/**
 * Johto sale de las reglas del Hexalocke que se jugó en HeartGold, así que
 * estos niveles son los que el grupo usó de verdad.
 */
const JOHTO: ItemDeFabrica[] = [
  { label: "Pegaso", cap: 13, kind: GYM, notes: "Ciudad Malva · Volador" },
  { label: "Antón", cap: 17, kind: GYM, notes: "Pueblo Azalea · Bicho" },
  { label: "Blanca", cap: 19, kind: GYM, notes: "Ciudad Trigal · Normal" },
  { label: "Morti", cap: 25, kind: GYM, notes: "Ciudad Iris · Fantasma" },
  { label: "Aníbal", cap: 31, kind: GYM, notes: "Ciudad Orquídea · Lucha" },
  { label: "Yasmina", cap: 35, kind: GYM, notes: "Ciudad Olivo · Acero" },
  { label: "Fredo", cap: 36, kind: GYM, notes: "Pueblo Caoba · Hielo" },
  { label: "Débora", cap: 41, kind: GYM, notes: "Ciudad Endrino · Dragón" },
  { label: "Alto Mando", cap: 50, kind: ELITE_FOUR, notes: "Mento, Koga, Bruno y Karen" },
  { label: "Liga Pokémon", cap: 50, kind: CHAMPION, notes: "Lance" },
];

const HOENN: ItemDeFabrica[] = [
  { label: "Petra", cap: 15, kind: GYM, notes: "Ciudad Férrica · Roca" },
  { label: "Marcial", cap: 16, kind: GYM, notes: "Pueblo Azuliza · Lucha" },
  { label: "Erico", cap: 23, kind: GYM, notes: "Ciudad Malvalona · Eléctrico" },
  { label: "Candela", cap: 26, kind: GYM, notes: "Pueblo Lavacalda · Fuego" },
  { label: "Norman", cap: 31, kind: GYM, notes: "Ciudad Petalia · Normal" },
  { label: "Alana", cap: 33, kind: GYM, notes: "Ciudad Arborada · Volador" },
  { label: "Vito y Leti", cap: 42, kind: GYM, notes: "Ciudad Algaria · Psíquico" },
  { label: "Plubio", cap: 43, kind: GYM, notes: "Arrecípolis · Agua (Galano en Esmeralda)" },
  { label: "Alto Mando", cap: 55, kind: ELITE_FOUR, notes: "Sixto, Fátima, Nívea y Dracón" },
  { label: "Campeón", cap: 58, kind: CHAMPION, notes: "Máximo" },
];

const SINNOH: ItemDeFabrica[] = [
  { label: "Roco", cap: 14, kind: GYM, notes: "Ciudad Pirita · Roca" },
  { label: "Gardenia", cap: 22, kind: GYM, notes: "Ciudad Vetusta · Planta" },
  { label: "Brega", cap: 30, kind: GYM, notes: "Ciudad Rocavelo · Lucha" },
  { label: "Mananti", cap: 30, kind: GYM, notes: "Ciudad Pradera · Agua" },
  { label: "Fantina", cap: 36, kind: GYM, notes: "Ciudad Corazón · Fantasma" },
  { label: "Acerón", cap: 39, kind: GYM, notes: "Ciudad Canal · Acero" },
  { label: "Inverna", cap: 42, kind: GYM, notes: "Ciudad Puntaneva · Hielo" },
  { label: "Lectro", cap: 49, kind: GYM, notes: "Ciudad Marina · Eléctrico" },
  { label: "Alto Mando", cap: 63, kind: ELITE_FOUR, notes: "Alecrán, Gaia, Fausto y Delos" },
  { label: "Campeona", cap: 66, kind: CHAMPION, notes: "Cintia" },
];

const TESELIA: ItemDeFabrica[] = [
  { label: "Millo, Zeo y Maíz", cap: 14, kind: GYM, notes: "Ciudad Gres · Planta, Fuego o Agua" },
  { label: "Aloe", cap: 20, kind: GYM, notes: "Ciudad Esmalte · Normal" },
  { label: "Camus", cap: 23, kind: GYM, notes: "Ciudad Porcelana · Bicho" },
  { label: "Camila", cap: 27, kind: GYM, notes: "Ciudad Mayólica · Eléctrico" },
  { label: "Yakón", cap: 31, kind: GYM, notes: "Ciudad Fayenza · Tierra" },
  { label: "Gerania", cap: 35, kind: GYM, notes: "Ciudad Loza · Volador" },
  { label: "Junco", cap: 39, kind: GYM, notes: "Ciudad Teja · Hielo" },
  { label: "Lirio", cap: 43, kind: GYM, notes: "Ciudad Caolín · Dragón (Iris en Blanco)" },
  { label: "Alto Mando", cap: 50, kind: ELITE_FOUR, notes: "Anís, Aza, Catleya y Lotto" },
  { label: "Campeón", cap: 54, kind: CHAMPION, notes: "N y Ghechis" },
];

const KALOS: ItemDeFabrica[] = [
  { label: "Violeta", cap: 12, kind: GYM, notes: "Ciudad Novarte · Bicho" },
  { label: "Lino", cap: 25, kind: GYM, notes: "Ciudad Relieve · Roca" },
  { label: "Corelia", cap: 32, kind: GYM, notes: "Ciudad Yantra · Lucha" },
  { label: "Amaro", cap: 34, kind: GYM, notes: "Ciudad Témpera · Planta" },
  { label: "Lem", cap: 37, kind: GYM, notes: "Ciudad Luminalia · Eléctrico" },
  { label: "Valeria", cap: 42, kind: GYM, notes: "Ciudad Romantis · Hada" },
  { label: "Ástrid", cap: 48, kind: GYM, notes: "Ciudad Fluxus · Psíquico" },
  { label: "Édel", cap: 59, kind: GYM, notes: "Ciudad Fractal · Hielo" },
  { label: "Alto Mando", cap: 65, kind: ELITE_FOUR, notes: "Tileo, Drácena, Malva y Narciso" },
  { label: "Campeona", cap: 68, kind: CHAMPION, notes: "Dianta" },
];

/**
 * Alola no tiene gimnasios: tiene **pruebas**, y cada una acaba contra un
 * **pokémon dominante**. Por eso aquí van las pruebas con su dominante y
 * aparte las grandes pruebas de los kahunas, que es como se juega de verdad;
 * poner solo a los kahunas dejaba fuera la mitad del recorrido.
 *
 * Sol/Luna y Ultrasol/Ultraluna **no comparten lista**: cambian tres
 * dominantes y Ultrasol/Ultraluna añaden la prueba de Rika, así que cada par
 * tiene la suya.
 */
const ALOLA: ItemDeFabrica[] = [
  { label: "Prueba de Liam", cap: 12, kind: OTHER, notes: "Melemele · dominante Gumshoos (Sol) o Raticate de Alola (Luna)" },
  { label: "Gran prueba de Kaudan", cap: 16, kind: GYM, notes: "Melemele · Lucha" },
  { label: "Prueba de Nereida", cap: 20, kind: OTHER, notes: "Akala · dominante Wishiwashi" },
  { label: "Prueba de Kiawe", cap: 22, kind: OTHER, notes: "Akala · dominante Salazzle" },
  { label: "Prueba de Lulú", cap: 24, kind: OTHER, notes: "Akala · dominante Lurantis" },
  { label: "Gran prueba de Mayla", cap: 27, kind: GYM, notes: "Akala · Roca" },
  { label: "Prueba de Chris", cap: 29, kind: OTHER, notes: "Ula-Ula · dominante Vikavolt" },
  { label: "Prueba de Zarala", cap: 33, kind: OTHER, notes: "Ula-Ula · dominante Mimikyu" },
  { label: "Gran prueba de Denio", cap: 38, kind: GYM, notes: "Ula-Ula · Siniestro" },
  { label: "Prueba del Cañón de Poni", cap: 45, kind: OTHER, notes: "Poni · dominante Kommo-o" },
  { label: "Gran prueba de Hela", cap: 49, kind: GYM, notes: "Poni · Tierra" },
  { label: "Alto Mando", cap: 56, kind: ELITE_FOUR, notes: "Los cuatro de la Liga de Alola" },
  { label: "Campeón", cap: 60, kind: CHAMPION, notes: "El primer campeón de Alola" },
];

/**
 * Ultrasol y Ultraluna. Cambian los dominantes de las pruebas de Nereida, Kiawe
 * y Chris, y aparece la **prueba de Rika**, que en Sol/Luna no se llega a
 * hacer. El orden del final de Poni conviene comprobarlo con el juego delante.
 */
const ALOLA_ULTRA: ItemDeFabrica[] = [
  { label: "Prueba de Liam", cap: 12, kind: OTHER, notes: "Melemele · dominante Gumshoos (Ultrasol) o Raticate de Alola (Ultraluna)" },
  { label: "Gran prueba de Kaudan", cap: 16, kind: GYM, notes: "Melemele · Lucha" },
  { label: "Prueba de Nereida", cap: 20, kind: OTHER, notes: "Akala · dominante Araquanid" },
  { label: "Prueba de Kiawe", cap: 22, kind: OTHER, notes: "Akala · dominante Marowak de Alola" },
  { label: "Prueba de Lulú", cap: 24, kind: OTHER, notes: "Akala · dominante Lurantis" },
  { label: "Gran prueba de Mayla", cap: 27, kind: GYM, notes: "Akala · Roca" },
  { label: "Prueba de Chris", cap: 29, kind: OTHER, notes: "Ula-Ula · dominante Togedemaru" },
  { label: "Prueba de Zarala", cap: 35, kind: OTHER, notes: "Ula-Ula · dominante Mimikyu" },
  { label: "Gran prueba de Denio", cap: 38, kind: GYM, notes: "Ula-Ula · Siniestro" },
  { label: "Gran prueba de Hela", cap: 49, kind: GYM, notes: "Poni · Tierra" },
  { label: "Prueba del Cañón de Poni", cap: 45, kind: OTHER, notes: "Poni · dominante Kommo-o" },
  { label: "Prueba de Rika", cap: 51, kind: OTHER, notes: "Poni · dominante Ribombee" },
  { label: "Alto Mando", cap: 60, kind: ELITE_FOUR, notes: "Los cuatro de la Liga de Alola" },
  { label: "Campeón", cap: 63, kind: CHAMPION, notes: "El combate que cierra la Liga" },
];

/**
 * La base de cada región, que es la que vale para casi todos los juegos.
 *
 * No están todas las de `Region`: ahí también viven las islas de Alola, que
 * son láminas del mapa y no regiones donde se juegue una liga entera.
 */
export const LEVEL_CAPS_DE_FABRICA: Partial<Record<Region, ItemDeFabrica[]>> = {
  kanto: KANTO,
  johto: JOHTO,
  hoenn: HOENN,
  sinnoh: SINNOH,
  teselia: TESELIA,
  kalos: KALOS,
  alola: ALOLA,
};

/**
 * Grupos que **no** se conforman con la lista de su región.
 *
 * Casi todos los grupos de una región comparten gimnasios y orden, y lo que
 * cambia son los niveles, que se ajustan luego en cada plantilla. Ultrasol y
 * Ultraluna no: cambian tres dominantes y añaden una prueba, así que traen su
 * propia lista de partida. Aquí caben más el día que hagan falta.
 */
const POR_GRUPO: Record<string, { desde: string; items: ItemDeFabrica[] }> = {
  "ultrasol-ultraluna": { desde: "Ultrasol y Ultraluna", items: ALOLA_ULTRA },
};

/**
 * Qué trae de fábrica un grupo de juegos y de dónde sale, para poder decirlo en
 * el botón: su propia lista si la tiene, y si no la de su región.
 */
export function baseDeFabrica(grupoId: string, region: Region, nombreRegion: string) {
  const propia = POR_GRUPO[grupoId];
  if (propia) return propia;
  return { desde: nombreRegion, items: LEVEL_CAPS_DE_FABRICA[region] ?? [] };
}
