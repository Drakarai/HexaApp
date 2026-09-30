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
  /**
   * Un locke **cooperativo** (Soul Link): se juega juntos, no unos contra
   * otros. No hay jornadas, ni puntos, ni final; hay un equipo y una caja de
   * cada uno a la vista de todos, con las capturas vinculadas. Los retos se
   * quedan, por si se quiere echar alguno de risas, pero no deciden nada.
   */
  cooperativo: boolean;
  /**
   * Sin jornadas ni checkpoints ni final: en solitario y en cooperativo. Es la
   * pregunta que se hacen casi todas las pantallas, mejor que saberse los dos.
   */
  sinJornadas: boolean;
  estilo: EstiloDeJuego;
};

/**
 * Los estilos de juego. El de siempre es competir; el Soul Link es jugar a la
 * vez y vinculados. Se guarda en `Competition.estilo` y **se puede cambiar**
 * después de crear el locke: el grupo que lo pidió ya lo había montado como
 * dualocke antes de que existiera.
 */
export const ESTILOS = {
  competitivo: {
    nombre: "Competitivo",
    explicacion: "Unos contra otros: jornadas, puntos y final.",
  },
  soullink: {
    nombre: "Soul Link",
    explicacion:
      "Cooperativo: las capturas de cada ruta van vinculadas y, si cae una, caen todas. Sin jornadas ni puntos.",
  },
} as const;
export type EstiloDeJuego = keyof typeof ESTILOS;

export function leerEstilo(valor: string | null | undefined): EstiloDeJuego {
  return valor === "soullink" ? "soullink" : "competitivo";
}

/**
 * De cuántos puede ser un Soul Link. Lo normal son dos; con más ya es una
 * locura, y de cuatro para arriba la pantalla de los equipos no se podría ni
 * leer.
 */
export const JUGADORES_DEL_SOUL_LINK = { minimo: 2, maximo: 4 };

/**
 * El menos que puede tener un locke.
 *
 * Es **uno**: un nuzlocke en solitario es un locke perfectamente válido, solo
 * que no es una competición. Lo que no puede haber es un locke de cero.
 */
export const MINIMO_DE_JUGADORES = 1;

/**
 * El más que puede tener. No es un capricho: los formatos de la final llegan
 * hasta seis y de siete para arriba se juega el de seis dejando fuera a los
 * últimos, así que un locke de veinte tendría catorce que no pintan nada.
 * Ocho es lo que ya admitían las solicitudes; ahora vale igual al crearlo.
 */
export const JUGADORES_MAXIMOS = 8;

/**
 * Las jornadas de un dualocke cuando nadie ha dicho cuántas: las de siempre.
 * Sin número no se sabe a cuántas hay que llegar, y el marcador daba campeón
 * al que ganaba la primera.
 */
export const JORNADAS_DEL_DUALOCKE = 6;

export function perfilDeLocke(
  jugadores: number,
  estiloGuardado?: string | null,
): PerfilDeLocke {
  const cuantos = Math.max(MINIMO_DE_JUGADORES, Math.trunc(jugadores || 0));
  const solo = cuantos === 1;
  // Un Soul Link de uno no existe: sería un locke en solitario
  const estilo = solo ? "competitivo" : leerEstilo(estiloGuardado);
  if (estilo === "soullink") {
    return {
      jugadores: cuantos,
      nombre: "Soul Link",
      liguillaEntera: false,
      serieAlMejorDe: null,
      /**
       * Se gana como en solitario, **pasándose la Liga**, pero entre todos: el
       * locke está superado cuando la han pasado todos los que siguen.
       */
      victoria: "liga",
      rotuloDeLaTabla: "Equipo y PC",
      enSolitario: false,
      cooperativo: true,
      sinJornadas: true,
      estilo,
    };
  }
  const esDual = cuantos === 2;
  return {
    jugadores: cuantos,
    nombre: NOMBRES[cuantos] ?? `Locke de ${cuantos}`,
    liguillaEntera: !solo && cuantos <= 3,
    serieAlMejorDe: esDual ? 3 : null,
    victoria: solo ? "liga" : esDual ? "jornadas" : "puntos",
    rotuloDeLaTabla: solo ? "Mi partida" : esDual ? "Marcador" : "Puntos",
    enSolitario: solo,
    cooperativo: false,
    sinJornadas: solo,
    estilo,
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
