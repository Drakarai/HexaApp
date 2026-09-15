/**
 * Cómo se juega el final del locke según cuántos sigan jugando.
 *
 * Un locke no siempre son seis. Si alguien se raja a mitad —o si la edición
 * empieza con menos gente— el cuadro de la Final Four deja de tener sentido:
 * con cinco sobra una plaza y con dos no hay cuadro que valga. Aquí está cada
 * formato acordado, y el resto de la aplicación se limita a dibujar lo que diga
 * esta tabla.
 *
 * **Todas las llaves se juegan al mejor de tres**, de los cruces a la final.
 * Por eso lo que hay aquí son *llaves* y no combates sueltos: cada una son tres
 * filas de `FinalMatch` (`SEMI_A#1`, `SEMI_A#2`, `SEMI_A#3`) y la gana quien se
 * lleve dos. El tercero solo se juega si hace falta.
 *
 * **El formato se congela al generar el cuadro** (`FinalFour.jugadores`): si
 * alguien se retira con la final ya empezada, el cuadro no se rehace solo.
 *
 * Va en su propio módulo, sin `server-only`, porque lo necesitan tanto el
 * servidor —para sembrar y validar— como la pantalla que lo pinta.
 */

/** Cuántos combates tiene una llave como mucho. */
export const AL_MEJOR_DE = 3;

/** Y cuántos hay que ganar para llevársela. */
export const PARA_GANAR_LA_LLAVE = Math.floor(AL_MEJOR_DE / 2) + 1;

/** De dónde sale cada lado de una llave. */
export type LadoDelCombate =
  /** El que quedó en ese puesto de la clasificación (0 = el primero) */
  | { puesto: number }
  /** El que gane otra llave del cuadro */
  | { ganadorDe: string };

export type PlantillaDeLlave = {
  key: string;
  /** La columna en la que sale */
  ronda: string;
  /** El rótulo de la llave: "3º contra 6º" */
  titulo: string;
  a: LadoDelCombate;
  b: LadoDelCombate;
  /** Texto del hueco mientras no se sepa quién lo ocupa */
  aPendiente?: string;
  bPendiente?: string;
};

export type FormatoFinal = {
  /** Cuántos jugadores activos lo usan */
  jugadores: number;
  /** "Final Four" de cuatro para arriba, "Jornada Final" de tres para abajo */
  nombre: string;
  /** Cómo se explica en la cabecera de la pantalla */
  explicacion: string;
  /** Las columnas, en orden */
  rondas: string[];
  llaves: PlantillaDeLlave[];
  /**
   * Cuántos esperan sin jugar la primera ronda. Es lo que se marca con medalla
   * en la clasificación: los que ya tienen plaza sin pelearla.
   */
  esperan: number;
  /** La llave que decide el locke: quien la gane es el campeón. */
  campeon: string;
};

/** El de siempre: los dos primeros esperan en semifinales. */
const SEIS: FormatoFinal = {
  jugadores: 6,
  nombre: "Final Four",
  explicacion:
    "Los dos primeros esperan en semifinales. Del 3º al 6º se juegan las otras dos plazas. Cada llave es al mejor de tres, y quien gane la final es el campeón oficial del locke.",
  rondas: ["Cruces", "Semifinales", "Final"],
  esperan: 2,
  llaves: [
    { key: "CROSS_A", ronda: "Cruces", titulo: "3º contra 6º", a: { puesto: 2 }, b: { puesto: 5 } },
    { key: "CROSS_B", ronda: "Cruces", titulo: "4º contra 5º", a: { puesto: 3 }, b: { puesto: 4 } },
    {
      key: "SEMI_A",
      ronda: "Semifinales",
      titulo: "El 1º espera",
      a: { puesto: 0 },
      b: { ganadorDe: "CROSS_A" },
      bPendiente: "Ganador de 3º-6º",
    },
    {
      key: "SEMI_B",
      ronda: "Semifinales",
      titulo: "El 2º espera",
      a: { puesto: 1 },
      b: { ganadorDe: "CROSS_B" },
      bPendiente: "Ganador de 4º-5º",
    },
    {
      key: "FINAL",
      ronda: "Final",
      titulo: "Por el locke",
      a: { ganadorDe: "SEMI_A" },
      b: { ganadorDe: "SEMI_B" },
      aPendiente: "Ganador de la 1ª semifinal",
      bPendiente: "Ganador de la 2ª semifinal",
    },
  ],
  campeon: "FINAL",
};

/**
 * Con cinco, el primero se salta el cuadro entero y espera en la final. Los
 * otros cuatro se pelean la otra plaza. Premia mucho quedar primero, que es lo
 * suyo cuando hay una plaza menos que repartir.
 */
const CINCO: FormatoFinal = {
  jugadores: 5,
  nombre: "Final Four",
  explicacion:
    "El primero espera directamente en la final. Del 2º al 5º se juegan la otra plaza: primero los cruces y luego la semifinal entre los que ganen. Cada llave, al mejor de tres.",
  rondas: ["Cruces", "Semifinal", "Final"],
  esperan: 1,
  llaves: [
    { key: "CROSS_A", ronda: "Cruces", titulo: "2º contra 5º", a: { puesto: 1 }, b: { puesto: 4 } },
    { key: "CROSS_B", ronda: "Cruces", titulo: "3º contra 4º", a: { puesto: 2 }, b: { puesto: 3 } },
    {
      key: "SEMI_A",
      ronda: "Semifinal",
      titulo: "Por la otra plaza",
      a: { ganadorDe: "CROSS_A" },
      b: { ganadorDe: "CROSS_B" },
      aPendiente: "Ganador de 2º-5º",
      bPendiente: "Ganador de 3º-4º",
    },
    {
      key: "FINAL",
      ronda: "Final",
      titulo: "Por el locke",
      a: { puesto: 0 },
      b: { ganadorDe: "SEMI_A" },
      bPendiente: "Ganador de la semifinal",
    },
  ],
  campeon: "FINAL",
};

/** Con cuatro, torneo normal entre ellos: nadie espera. */
const CUATRO: FormatoFinal = {
  jugadores: 4,
  nombre: "Final Four",
  explicacion:
    "Torneo entre los cuatro: el 1º contra el 4º y el 2º contra el 3º. Cada llave es al mejor de tres, y quien gane la final es el campeón oficial del locke.",
  rondas: ["Semifinales", "Final"],
  esperan: 0,
  llaves: [
    { key: "SEMI_A", ronda: "Semifinales", titulo: "1º contra 4º", a: { puesto: 0 }, b: { puesto: 3 } },
    { key: "SEMI_B", ronda: "Semifinales", titulo: "2º contra 3º", a: { puesto: 1 }, b: { puesto: 2 } },
    {
      key: "FINAL",
      ronda: "Final",
      titulo: "Por el locke",
      a: { ganadorDe: "SEMI_A" },
      b: { ganadorDe: "SEMI_B" },
      aPendiente: "Ganador de 1º-4º",
      bPendiente: "Ganador de 2º-3º",
    },
  ],
  campeon: "FINAL",
};

/** Con tres ya no hay cuadro que valga: el primero espera y los otros dos se lo juegan. */
const TRES: FormatoFinal = {
  jugadores: 3,
  nombre: "Jornada Final",
  explicacion:
    "El primero pasa directo a la final. El 2º y el 3º se juegan la otra plaza. Las dos llaves, al mejor de tres.",
  rondas: ["Semifinal", "Final"],
  esperan: 1,
  llaves: [
    { key: "SEMI_A", ronda: "Semifinal", titulo: "2º contra 3º", a: { puesto: 1 }, b: { puesto: 2 } },
    {
      key: "FINAL",
      ronda: "Final",
      titulo: "Por el locke",
      a: { puesto: 0 },
      b: { ganadorDe: "SEMI_A" },
      bPendiente: "Ganador de 2º-3º",
    },
  ],
  campeon: "FINAL",
};

/**
 * Con dos no hay a quién eliminar: se juegan el locke cara a cara. Es una llave
 * y ya está, al mejor de tres como todas las demás.
 */
const DOS: FormatoFinal = {
  jugadores: 2,
  nombre: "Jornada Final",
  explicacion:
    "Cara a cara al mejor de tres. Gana el locke el primero que se lleve dos combates; el tercero solo se juega si hace falta.",
  rondas: ["Final"],
  esperan: 0,
  llaves: [
    {
      key: "FINAL",
      ronda: "Final",
      titulo: "Por el locke",
      a: { puesto: 0 },
      b: { puesto: 1 },
    },
  ],
  campeon: "FINAL",
};

const FORMATOS = [DOS, TRES, CUATRO, CINCO, SEIS];

/** Con menos de esto no hay final que jugar. */
export const MINIMO_DE_JUGADORES = 2;

/**
 * El formato que le toca a un número de jugadores. De seis en adelante se usa
 * el de seis: entran los seis primeros y el resto se queda fuera, que es como
 * funcionaba antes de que hubiera formatos.
 */
export function formatoParaJugadores(jugadores: number): FormatoFinal | null {
  if (jugadores < MINIMO_DE_JUGADORES) return null;
  return FORMATOS.find((formato) => formato.jugadores === jugadores) ?? SEIS;
}

/** Cómo se llama en la base de datos el combate `numero` de una llave. */
export function claveDelCombate(llave: string, numero: number) {
  return `${llave}#${numero}`;
}

/** Las claves de los tres combates de una llave, en orden. */
export function combatesDeLaLlave(llave: string) {
  return Array.from({ length: AL_MEJOR_DE }, (_, indice) =>
    claveDelCombate(llave, indice + 1),
  );
}

/** Todas las claves de un formato, para crearlas al sembrar el cuadro. */
export function clavesDelFormato(formato: FormatoFinal) {
  return formato.llaves.flatMap((llave) => combatesDeLaLlave(llave.key));
}

/**
 * Qué llaves dejan de valer al cambiar el resultado de una: las que dependen
 * de ella, directa o indirectamente. Se calcula del propio formato para que
 * añadir uno nuevo no obligue a mantener una lista a mano.
 */
export function llavesPosteriores(formato: FormatoFinal, key: string): string[] {
  const afectadas = new Set<string>();
  let cambio = true;

  while (cambio) {
    cambio = false;
    for (const llave of formato.llaves) {
      if (afectadas.has(llave.key)) continue;
      const depende = [llave.a, llave.b].some(
        (lado) =>
          "ganadorDe" in lado &&
          (lado.ganadorDe === key || afectadas.has(lado.ganadorDe)),
      );
      if (depende) {
        afectadas.add(llave.key);
        cambio = true;
      }
    }
  }

  return [...afectadas];
}

/**
 * Cómo va una serie: cuántos lleva cada uno y cuáles de los tres combates
 * sobran ya.
 *
 * Los combates se cuentan **en orden y hasta que alguien llega a dos**. Así, si
 * se corrige el primero y el tercero deja de hacer falta, su resultado viejo no
 * cuenta para nada en vez de tener que ir borrándolo: lo que decide la llave es
 * siempre lo que se jugó de verdad hasta decidirla.
 */
export function comoVaLaSerie(ganadores: (string | null)[]) {
  const ganadas = new Map<string, number>();
  const sobra: boolean[] = [];
  let decidida: string | null = null;

  for (const ganador of ganadores) {
    sobra.push(decidida !== null);
    if (decidida !== null) continue;
    if (!ganador) continue;
    const llevaba = (ganadas.get(ganador) ?? 0) + 1;
    ganadas.set(ganador, llevaba);
    if (llevaba >= PARA_GANAR_LA_LLAVE) decidida = ganador;
  }

  return { ganadas, sobra, ganador: decidida };
}
