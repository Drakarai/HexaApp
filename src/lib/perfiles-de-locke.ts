/**
 * Qué cambia en un locke según cuánta gente lo juega.
 *
 * La aplicación nació dando por hecho que un locke son seis personas. No lo es:
 * con dos, la clasificación por puntos no dice nada y lo que importa es quién
 * gana más jornadas; con tres, la liguilla entera cabe dentro de una jornada.
 * Aquí está escrito **como datos** lo que depende del número de jugadores, para
 * que las pantallas no tengan que saberse los casos.
 *
 * El tamaño sale de `Competition.maxPlayers`, que es justo eso: para cuánta
 * gente se montó la edición. Se decide **al crear el locke y no se recalcula**
 * con los que quedan activos, porque si no, retirarse a mitad le cambiaría los
 * menús y las reglas a una partida ya empezada. (El final del locke sí mira los
 * activos: eso es otra cosa y va en `lib/formatos-finales.ts`.)
 *
 * No lleva `server-only`: lo leen también componentes de cliente.
 */

/** Cómo se llama un locke de cada tamaño. Es solo el rótulo. */
const NOMBRES: Record<number, string> = {
  1: "Locke en solitario",
  2: "Dualocke",
  3: "Triolocke",
  4: "Tetralocke",
  5: "Pentalocke",
  6: "Hexalocke",
  7: "Heptalocke",
  8: "Octalocke",
};

export type PerfilDeLocke = {
  /** Para cuántos jugadores se montó */
  jugadores: number;
  nombre: string;
  /**
   * Si la liguilla entera cabe dentro de **una** jornada. Con tres o menos sí
   * —tres jugadores son tres combates: A-B, B-C y A-C—, y con cuatro o más cada
   * jornada es una ronda de la liguilla.
   */
  liguillaEntera: boolean;
  /**
   * Si cada jornada es una **serie** entre los mismos dos, al mejor de N. Solo
   * el dualocke: allí una jornada es un combate al mejor de tres.
   *
   * Se guarda el total de la serie (3) y no los combates que se juegan (2 o 3),
   * porque el tercero **depende de cómo vayan los dos primeros**: si alguien
   * gana los dos, no se juega. Ver `lib/series.ts`.
   */
  serieAlMejorDe: number | null;
  /**
   * Cómo se gana el locke.
   *
   * - `puntos`: la clasificación de siempre, de tres jugadores para arriba.
   * - `jornadas`: el dualocke, que va por jornadas ganadas.
   * - `liga`: en solitario **no hay contra quién**, así que el locke se gana
   *   pasándose la Liga Pokémon (`lib/liga.ts`). Es la misma victoria que en
   *   los demás lockes existe en paralelo a la de los combates; aquí es la
   *   única que hay.
   */
  victoria: "puntos" | "jornadas" | "liga";
  /** Cómo se llama la pantalla de la clasificación en este locke */
  rotuloDeLaTabla: string;
  /**
   * Un locke de una persona: ni jornadas, ni retos, ni clasificación, ni final.
   * Lo que queda —la caja, el mapa, los gimnasios, la bolsa y las notas— es
   * justo la mitad de la aplicación que no va de competir, y funciona igual
   * siendo uno. Es una marca aparte y no `jugadores === 1` para que las
   * pantallas no tengan que saberse el número.
   */
  enSolitario: boolean;
};

/**
 * El menos que puede tener un locke.
 *
 * Es **uno**: un nuzlocke en solitario es un locke perfectamente válido, solo
 * que no es una competición. Lo que no puede haber es un locke de cero.
 */
export const MINIMO_DE_JUGADORES = 1;

/** De cuántos hace falta ser para que haya combates entre jugadores. */
export const MINIMO_PARA_COMPETIR = 2;

export function perfilDeLocke(jugadores: number): PerfilDeLocke {
  const cuantos = Math.max(MINIMO_DE_JUGADORES, Math.trunc(jugadores || 0));
  const solo = cuantos === 1;
  const esDual = cuantos === 2;
  return {
    jugadores: cuantos,
    nombre: NOMBRES[cuantos] ?? `Locke de ${cuantos}`,
    liguillaEntera: !solo && cuantos <= 3,
    serieAlMejorDe: esDual ? 3 : null,
    victoria: solo ? "liga" : esDual ? "jornadas" : "puntos",
    rotuloDeLaTabla: solo ? "Mi partida" : esDual ? "Marcador" : "Puntos",
    enSolitario: solo,
  };
}

/**
 * Cuántas jornadas hay que ganar para llevarse el locke: la mayoría de las que
 * se hayan creado. Con las seis de siempre salen **cuatro**, que es la regla
 * que se acordó; si algún día se juegan ocho, saldrán cinco solas.
 */
export function jornadasParaGanar(cuantasJornadas: number) {
  return Math.floor(cuantasJornadas / 2) + 1;
}
