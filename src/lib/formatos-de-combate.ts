/**
 * Los tipos de combate que puede tener una jornada, un combate suelto o un
 * reto.
 *
 * Es una **lista fija y escrita aquí** a propósito, no una tabla que se edite
 * desde Administración: cada formato no es solo un nombre y un color, sino que
 * cambia cómo se comporta la aplicación —cuántos huecos pide el editor de
 * equipos, cuáles son los que abren el combate, si son dos jugadores o
 * cuatro—, y eso no se puede rellenar en un formulario. Para las variaciones
 * que se inventan sobre la marcha ("monotipo agua", "sin objetos", "nivel 50")
 * está el campo **condiciones** de cada jornada, que es texto libre.
 *
 * Añadir uno nuevo es una ficha más aquí abajo.
 */

export type FormatoDeCombate = {
  id: string;
  nombre: string;
  /** Su icono, que es como se reconoce de un vistazo en las listas */
  icono: string;
  /** El color con el que se tiñe esa jornada. Hexadecimal, como las zonas */
  color: string;
  /** Cuántos pokémon puede apuntar cada jugador */
  equipo: number;
  /** Cuántos salen al terreno a la vez */
  aLaVez: number;
  /** Una línea explicando de qué va, para no tener que preguntar */
  resumen: string;
  /**
   * Que no son dos jugadores dándose, sino **todos contra todos en un mismo
   * combate**. Estos no se apuntan como los demás: tienen su propia pantalla,
   * porque no hay un ganador y un perdedor sino un orden de llegada.
   */
  multiple?: boolean;
};

/** El de siempre: el que tiene una jornada a la que no se le ha tocado nada. */
export const FORMATO_POR_DEFECTO = "singles";

export const FORMATOS: FormatoDeCombate[] = [
  {
    id: "singles",
    nombre: "Singles",
    icono: "⚔️",
    color: "#6366f1",
    equipo: 6,
    aLaVez: 1,
    resumen: "Uno contra uno de toda la vida, seis pokémon cada uno.",
  },
  {
    id: "dobles",
    nombre: "Dobles",
    icono: "🤼",
    color: "#0ea5e9",
    equipo: 6,
    aLaVez: 2,
    resumen: "Seis pokémon, pero salen de dos en dos.",
  },
  {
    id: "monotipo",
    nombre: "Monotipo",
    icono: "🎨",
    color: "#22c55e",
    equipo: 6,
    aLaVez: 1,
    resumen: "Todo el equipo del mismo tipo. Cuál, se dice en las condiciones.",
  },
  {
    id: "vgc",
    nombre: "VGC",
    icono: "🏆",
    color: "#f59e0b",
    equipo: 4,
    aLaVez: 2,
    resumen: "Dobles de campeonato: se eligen cuatro de los seis y salen dos a dos.",
  },
  {
    id: "prestamo",
    nombre: "Pokémon de Préstamo",
    icono: "🎁",
    color: "#a855f7",
    equipo: 6,
    aLaVez: 1,
    resumen: "Nadie juega con su equipo: se combate con uno prestado.",
  },
  {
    id: "royale",
    nombre: "Battle Royale",
    icono: "👑",
    color: "#ef4444",
    equipo: 6,
    aLaVez: 1,
    resumen: "Todos contra todos en el mismo combate. No hay ganador y perdedor: hay un orden de llegada.",
    multiple: true,
  },
];

const POR_ID = new Map(FORMATOS.map((formato) => [formato.id, formato]));

/**
 * El formato de algo, con el de siempre como red de seguridad: una jornada
 * guardada con un formato que ya no existe sigue enseñándose como singles en
 * vez de romper la pantalla.
 */
export function formatoDeCombate(id: string | null | undefined): FormatoDeCombate {
  return (id ? POR_ID.get(id) : undefined) ?? POR_ID.get(FORMATO_POR_DEFECTO)!;
}

/** Si es uno de los raros, o el de siempre (que no merece ni chapa). */
export function esFormatoEspecial(id: string | null | undefined) {
  return Boolean(id) && id !== FORMATO_POR_DEFECTO && POR_ID.has(id!);
}

/** Los que se juegan de dos en dos, que son todos menos el royale. */
export const FORMATOS_DE_DOS = FORMATOS.filter((formato) => !formato.multiple);

export function esRoyale(id: string | null | undefined) {
  return formatoDeCombate(id).multiple === true;
}
