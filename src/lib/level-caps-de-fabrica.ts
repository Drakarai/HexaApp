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
  { label: "Antón", cap: 17, kind: GYM, notes: "Ciudad Azalea · Bicho" },
  { label: "Blanca", cap: 19, kind: GYM, notes: "Ciudad Trigal · Normal" },
  { label: "Morti", cap: 25, kind: GYM, notes: "Pueblo Ecruteak · Fantasma" },
  { label: "Aníbal", cap: 31, kind: GYM, notes: "Ciudad Olivo · Lucha" },
  { label: "Yasmina", cap: 35, kind: GYM, notes: "Ciudad Olivo · Acero" },
  { label: "Fredo", cap: 36, kind: GYM, notes: "Pueblo Caña · Hielo" },
  { label: "Débora", cap: 41, kind: GYM, notes: "Ciudad Endrino · Dragón" },
  { label: "Alto Mando", cap: 50, kind: ELITE_FOUR, notes: "Bruno, Karen, Aaron y Fátima" },
  { label: "Liga Pokémon", cap: 50, kind: CHAMPION, notes: "Lance" },
];

const HOENN: ItemDeFabrica[] = [
  { label: "Petra", cap: 15, kind: GYM, notes: "Ciudad Petalia · Roca" },
  { label: "Marcial", cap: 16, kind: GYM, notes: "Ciudad Férrica · Lucha" },
  { label: "Erico", cap: 23, kind: GYM, notes: "Ciudad Malvalona · Eléctrico" },
  { label: "Candela", cap: 26, kind: GYM, notes: "Pueblo Lavacalda · Fuego" },
  { label: "Norman", cap: 31, kind: GYM, notes: "Ciudad Petalia · Normal" },
  { label: "Alana", cap: 33, kind: GYM, notes: "Ciudad Arrecípolis · Volador" },
  { label: "Vito y Leti", cap: 42, kind: GYM, notes: "Ciudad Calagua · Psíquico" },
  { label: "Plubio", cap: 43, kind: GYM, notes: "Ciudad Algaria · Agua" },
  { label: "Alto Mando", cap: 55, kind: ELITE_FOUR, notes: "Sixto, Fátima, Nívea y Dracoy" },
  { label: "Campeón", cap: 58, kind: CHAMPION, notes: "Máximo" },
];

const SINNOH: ItemDeFabrica[] = [
  { label: "Roco", cap: 14, kind: GYM, notes: "Ciudad Pirita · Roca" },
  { label: "Gardenia", cap: 22, kind: GYM, notes: "Ciudad Vetusta · Planta" },
  { label: "Mento", cap: 30, kind: GYM, notes: "Ciudad Pradera · Lucha" },
  { label: "Fantina", cap: 36, kind: GYM, notes: "Ciudad Corazón · Fantasma" },
  { label: "Fausto", cap: 30, kind: GYM, notes: "Ciudad Canal · Agua" },
  { label: "Acerón", cap: 39, kind: GYM, notes: "Ciudad Rocavelo · Acero" },
  { label: "Inverna", cap: 42, kind: GYM, notes: "Ciudad Puntaneva · Hielo" },
  { label: "Lectro", cap: 49, kind: GYM, notes: "Ciudad Marina · Eléctrico" },
  { label: "Alto Mando", cap: 63, kind: ELITE_FOUR, notes: "Alecrán, Fausto, Fátima y Lucio" },
  { label: "Campeona", cap: 66, kind: CHAMPION, notes: "Cintia" },
];

const TESELIA: ItemDeFabrica[] = [
  { label: "Millo, Zeo y Maíz", cap: 14, kind: GYM, notes: "Ciudad Gres · Planta, Fuego o Agua" },
  { label: "Aloe", cap: 20, kind: GYM, notes: "Ciudad Esmalte · Normal" },
  { label: "Camus", cap: 23, kind: GYM, notes: "Ciudad Porcelana · Bicho" },
  { label: "Camila", cap: 27, kind: GYM, notes: "Ciudad Mayólica · Eléctrico" },
  { label: "Ciprián", cap: 31, kind: GYM, notes: "Ciudad Rombo · Tierra" },
  { label: "Gerania", cap: 35, kind: GYM, notes: "Ciudad Fayenza · Volador" },
  { label: "Junco", cap: 39, kind: GYM, notes: "Ciudad Loza · Hielo" },
  { label: "Lirio", cap: 43, kind: GYM, notes: "Ciudad Ónice · Dragón" },
  { label: "Alto Mando", cap: 50, kind: ELITE_FOUR, notes: "Aza, Aguacil, Lotto y Zenón" },
  { label: "Campeón", cap: 54, kind: CHAMPION, notes: "N y Ghechis" },
];

const KALOS: ItemDeFabrica[] = [
  { label: "Violeta", cap: 12, kind: GYM, notes: "Ciudad Novarte · Bicho" },
  { label: "Amaro", cap: 25, kind: GYM, notes: "Ciudad Relieve · Roca" },
  { label: "Corelia", cap: 32, kind: GYM, notes: "Ciudad Yantra · Lucha" },
  { label: "Ramos", cap: 34, kind: GYM, notes: "Ciudad Fractal · Planta" },
  { label: "Lem", cap: 37, kind: GYM, notes: "Ciudad Luminalia · Eléctrico" },
  { label: "Valeria", cap: 42, kind: GYM, notes: "Ciudad Romantis · Hada" },
  { label: "Ástrid", cap: 48, kind: GYM, notes: "Ciudad Fluxus · Psíquico" },
  { label: "Édel", cap: 59, kind: GYM, notes: "Ciudad Nimbasa · Hielo" },
  { label: "Alto Mando", cap: 65, kind: ELITE_FOUR, notes: "Ástrid, Mestra, Narciso y Dracón" },
  { label: "Campeona", cap: 68, kind: CHAMPION, notes: "Dianta" },
];

/**
 * Alola no tiene gimnasios: tiene **pruebas**, y cada una acaba contra un
 * **pokémon dominante**. Por eso aquí van las pruebas con su dominante y
 * aparte las grandes pruebas de los kahunas, que es como se juega de verdad;
 * poner solo los kahunas se dejaba fuera la mitad del recorrido.
 *
 * Sol/Luna y Ultrasol/Ultraluna no traen exactamente las mismas pruebas ni los
 * mismos dominantes: esto es la de Sol/Luna, y lo que sobre o falte se ajusta
 * en la plantilla de cada juego.
 */
const ALOLA: ItemDeFabrica[] = [
  { label: "Prueba de Iliman", cap: 12, kind: OTHER, notes: "Melemele · dominante Gumshoos o Raticate de Alola" },
  { label: "Gran prueba de Hala", cap: 16, kind: GYM, notes: "Melemele · Lucha" },
  { label: "Prueba de Mayla", cap: 20, kind: OTHER, notes: "Akala · dominante Araquanid" },
  { label: "Prueba de Kiawe", cap: 22, kind: OTHER, notes: "Akala · dominante Marowak de Alola" },
  { label: "Prueba de Lulú", cap: 24, kind: OTHER, notes: "Akala · dominante Lurantis" },
  { label: "Gran prueba de Olivia", cap: 27, kind: GYM, notes: "Akala · Roca" },
  { label: "Prueba de Chris", cap: 29, kind: OTHER, notes: "Ula-Ula · dominante Vikavolt" },
  { label: "Prueba de Acerola", cap: 33, kind: OTHER, notes: "Ula-Ula · dominante Mimikyu" },
  { label: "Gran prueba de Nanu", cap: 38, kind: GYM, notes: "Ula-Ula · Siniestro" },
  { label: "Prueba del Cañón de Poni", cap: 45, kind: OTHER, notes: "Poni · dominante Kommo-o" },
  { label: "Gran prueba de Hapu", cap: 49, kind: GYM, notes: "Poni · Tierra" },
  { label: "Alto Mando", cap: 56, kind: ELITE_FOUR, notes: "Los cuatro de la Liga de Alola" },
  { label: "Campeón", cap: 60, kind: CHAMPION, notes: "El primer campeón de Alola" },
];

export const LEVEL_CAPS_DE_FABRICA: Record<Region, ItemDeFabrica[]> = {
  kanto: KANTO,
  johto: JOHTO,
  hoenn: HOENN,
  sinnoh: SINNOH,
  teselia: TESELIA,
  kalos: KALOS,
  alola: ALOLA,
};
