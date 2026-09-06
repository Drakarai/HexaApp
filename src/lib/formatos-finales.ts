/**
 * Cómo se juega el final del locke según cuántos sigan jugando.
 *
 * Un locke no siempre son seis. Si alguien se raja a mitad —o si la edición
 * empieza con menos gente— el cuadro de la Final Four deja de tener sentido:
 * con cinco sobra una plaza y con dos no hay cuadro que valga. Aquí está cada
 * formato acordado, y el resto de la aplicación se limita a dibujar lo que diga
 * esta tabla.
 *
 * **El formato se congela al generar el cuadro** (`FinalFour.jugadores`): si
 * alguien se retira con la final ya empezada, el cuadro no se rehace solo.
 *
 * Va en su propio módulo, sin `server-only`, porque lo necesitan tanto el
 * servidor —para sembrar y validar— como la pantalla que lo pinta.
 */

/** De dónde sale cada lado de un combate. */
export type LadoDelCombate =
  /** El que quedó en ese puesto de la clasificación (0 = el primero) */
  | { puesto: number }
  /** El que gane otra llave del cuadro */
  | { ganadorDe: string };

export type PlantillaDeCombate = {
  key: string;
  /** La columna en la que sale */
  ronda: string;
  /** El rótulo del combate: "3º contra 6º" */
  titulo: string;
  a: LadoDelCombate;
  b: LadoDelCombate;
  /** Texto del hueco mientras no se sepa quién lo ocupa */
  aPendiente?: string;
  bPendiente?: string;
  /**
   * Solo se juega si hace falta: el tercero del mejor de tres, que sobra si
   * alguien gana los dos primeros.
   */
  soloSiEmpate?: boolean;
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
  combates: PlantillaDeCombate[];
  /**
   * Cuántos esperan sin jugar la primera ronda. Es lo que se marca con medalla
   * en la clasificación: los que ya tienen plaza sin pelearla.
   */
  esperan: number;
  /**
   * Cómo se decide el campeón: quien gane una llave, o quien gane más
   * combates de una serie.
   */
  campeon:
    | { tipo: "llave"; key: string }
    | { tipo: "serie"; keys: string[]; hacenFalta: number };
};

/** El de siempre: los dos primeros esperan en semifinales. */
const SEIS: FormatoFinal = {
  jugadores: 6,
  nombre: "Final Four",
  explicacion:
    "Los dos primeros esperan en semifinales. Del 3º al 6º se juegan las otras dos plazas. Quien gane la final es el campeón oficial del locke.",
  rondas: ["Cruces", "Semifinales", "Final"],
  esperan: 2,
  combates: [
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
  campeon: { tipo: "llave", key: "FINAL" },
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
    "El primero espera directamente en la final. Del 2º al 5º se juegan la otra plaza: primero los cruces y luego la semifinal entre los que ganen.",
  rondas: ["Cruces", "Semifinal", "Final"],
  esperan: 1,
  combates: [
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
  campeon: { tipo: "llave", key: "FINAL" },
};

/** Con cuatro, torneo normal entre ellos: nadie espera. */
const CUATRO: FormatoFinal = {
  jugadores: 4,
  nombre: "Final Four",
  explicacion:
    "Torneo entre los cuatro: el 1º contra el 4º y el 2º contra el 3º. Quien gane la final es el campeón oficial del locke.",
  rondas: ["Semifinales", "Final"],
  esperan: 0,
  combates: [
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
  campeon: { tipo: "llave", key: "FINAL" },
};

/** Con tres ya no hay cuadro que valga: el primero espera y los otros dos se lo juegan. */
const TRES: FormatoFinal = {
  jugadores: 3,
  nombre: "Jornada Final",
  explicacion:
    "El primero pasa directo a la final. El 2º y el 3º se juegan la otra plaza.",
  rondas: ["Semifinal", "Final"],
  esperan: 1,
  combates: [
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
  campeon: { tipo: "llave", key: "FINAL" },
};

/**
 * Con dos no hay a quién eliminar: se juegan el locke al mejor de tres. El
 * tercero solo se juega si hace falta.
 */
const DOS: FormatoFinal = {
  jugadores: 2,
  nombre: "Jornada Final",
  explicacion:
    "Cara a cara al mejor de tres. Gana el locke el primero que se lleve dos combates; el tercero solo se juega si hace falta.",
  rondas: ["Al mejor de tres"],
  esperan: 0,
  combates: [
    { key: "BO3_1", ronda: "Al mejor de tres", titulo: "Primer combate", a: { puesto: 0 }, b: { puesto: 1 } },
    { key: "BO3_2", ronda: "Al mejor de tres", titulo: "Segundo combate", a: { puesto: 0 }, b: { puesto: 1 } },
    {
      key: "BO3_3",
      ronda: "Al mejor de tres",
      titulo: "Tercero, si hace falta",
      a: { puesto: 0 },
      b: { puesto: 1 },
      soloSiEmpate: true,
    },
  ],
  campeon: { tipo: "serie", keys: ["BO3_1", "BO3_2", "BO3_3"], hacenFalta: 2 },
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

/** Todas las llaves de un formato, para crearlas al sembrar el cuadro. */
export function clavesDelFormato(formato: FormatoFinal) {
  return formato.combates.map((combate) => combate.key);
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
    for (const combate of formato.combates) {
      if (afectadas.has(combate.key)) continue;
      const depende = [combate.a, combate.b].some(
        (lado) =>
          "ganadorDe" in lado &&
          (lado.ganadorDe === key || afectadas.has(lado.ganadorDe)),
      );
      if (depende) {
        afectadas.add(combate.key);
        cambio = true;
      }
    }
  }

  // En una serie al mejor de tres no hay dependencias, pero cambiar un
  // resultado sí puede sobrar el tercero: se deja como está y lo decide la
  // pantalla, que sabe si sigue haciendo falta.
  return [...afectadas];
}
