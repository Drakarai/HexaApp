/**
 * Los fondos de las cajas del PC: los de los juegos de verdad, hasta la 5ª
 * generación (los que eligió el grupo; de ahí en adelante no convencían). Cada
 * caja lleva el suyo, y cada jugador elige el de las suyas.
 *
 * Las imágenes están en `public/cajas/<slug>.png`, al triple de su tamaño y sin
 * retocar. El slug es su número y no su nombre, para poder renombrarlas sin
 * tocar lo que ya haya guardado nadie.
 *
 * Se guardan en `Participant.fondosDeCaja` como una lista separada por comas,
 * una posición por caja: `"5,,liso"` es la 1 con Corazón (el 5), la 2 con el suyo
 * de siempre y la 3 sin fondo. Por jugador y por locke, porque la caja es de
 * ese locke. Sin nada elegido, cada caja lleva **el suyo de fábrica**, que va
 * cambiando de una caja a la siguiente, como en los juegos. Lo que no se
 * reconoce (los paisajes dibujados de la primera prueba) cuenta como vacío.
 */

export const FONDOS_DE_CAJA = [
  { slug: "1", nombre: "Poké Ball" },
  { slug: "2", nombre: "Distorsión" },
  { slug: "3", nombre: "Dioses" },
  { slug: "4", nombre: "Demonio" },
  { slug: "5", nombre: "Corazón" },
  { slug: "6", nombre: "Alma" },
  { slug: "7", nombre: "Verdad" },
  { slug: "8", nombre: "Ideales" },
  { slug: "9", nombre: "Yin" },
  { slug: "10", nombre: "Yang" },
  { slug: "11", nombre: "Munna" },
  { slug: "12", nombre: "Croagunk" },
  { slug: "13", nombre: "Césped" },
  { slug: "14", nombre: "Cueva" },
  { slug: "15", nombre: "Ciudad" },
  // La caja gris de antes, por si alguien la prefiere
  { slug: "liso", nombre: "Sin fondo" },
] as const;

export type FondoDeCaja = (typeof FONDOS_DE_CAJA)[number]["slug"];

/**
 * El orden en que salen de fábrica, caja a caja: primero los tranquilos (Poké
 * Ball, Césped, Cueva y Ciudad), que son los que se ven al empezar, y después
 * los de los legendarios.
 */
const DE_FABRICA: FondoDeCaja[] = ["1", "13", "14", "15", "11", "12", "5", "6", "2", "3", "4", "7", "8", "9", "10"];

/** Más no hacen falta: con 30 por caja, son 1.500 pokémon */
export const MAXIMO_DE_CAJAS = 50;

export function esFondo(valor: string): valor is FondoDeCaja {
  return FONDOS_DE_CAJA.some((f) => f.slug === valor);
}

/** Lo guardado, leído: una posición por caja, vacía si va el de fábrica */
export function leerFondos(guardado: string | null | undefined): (FondoDeCaja | null)[] {
  if (!guardado) return [];
  return guardado
    .split(",")
    .slice(0, MAXIMO_DE_CAJAS)
    .map((valor) => (esFondo(valor.trim()) ? (valor.trim() as FondoDeCaja) : null));
}

/** El fondo de una caja (contando desde 0): el elegido o el de fábrica */
export function fondoDeCaja(fondos: (FondoDeCaja | null)[], caja: number): FondoDeCaja {
  return fondos[caja] ?? DE_FABRICA[caja % DE_FABRICA.length];
}

/**
 * Lo que hay que guardar al elegir el fondo de una caja. Si se elige justo el
 * de fábrica se guarda vacío, y lo vacío del final se recorta: así la lista
 * no crece por mirar fondos y volver al de siempre.
 */
export function elegirFondo(
  guardado: string | null | undefined,
  caja: number,
  fondo: FondoDeCaja,
): string | null {
  if (!Number.isInteger(caja) || caja < 0 || caja >= MAXIMO_DE_CAJAS) {
    throw new Error("Esa caja no existe.");
  }
  const fondos = leerFondos(guardado);
  while (fondos.length <= caja) fondos.push(null);
  fondos[caja] = fondo === DE_FABRICA[caja % DE_FABRICA.length] ? null : fondo;
  while (fondos.length && fondos[fondos.length - 1] === null) fondos.pop();
  return fondos.length ? fondos.map((f) => f ?? "").join(",") : null;
}

/**
 * Los nombres de las cajas, como en los juegos: «Banquillo», «Para evolucionar»…
 * Se guardan en `Participant.nombresDeCaja`, una posición por caja y null donde
 * no se ha puesto, para que la caja siga llamándose «Caja N».
 *
 * Hasta 16 letras: en los juegos son 8, pero aquí se escribe en español y
 * «Para evolucionar» no cabría.
 */
export const LARGO_DEL_NOMBRE_DE_CAJA = 16;

export function leerNombresDeCaja(guardado: unknown): (string | null)[] {
  if (!Array.isArray(guardado)) return [];
  return guardado
    .slice(0, MAXIMO_DE_CAJAS)
    .map((nombre) => (typeof nombre === "string" && nombre.trim() ? nombre.trim() : null));
}

/** El nombre de una caja (contando desde 0): el puesto o «Caja N» */
export function nombreDeCaja(nombres: (string | null)[], caja: number) {
  return nombres[caja] ?? `Caja ${caja + 1}`;
}

/**
 * Lo que hay que guardar al ponerle nombre a una caja. Vacío, o justo
 * «Caja N», le devuelve el de siempre; lo vacío del final se recorta.
 */
export function nombrarCaja(guardado: unknown, caja: number, nombre: string): (string | null)[] {
  if (!Number.isInteger(caja) || caja < 0 || caja >= MAXIMO_DE_CAJAS) {
    throw new Error("Esa caja no existe.");
  }
  const limpio = nombre.replace(/\s+/g, " ").trim().slice(0, LARGO_DEL_NOMBRE_DE_CAJA).trim();
  const nombres = leerNombresDeCaja(guardado);
  while (nombres.length <= caja) nombres.push(null);
  nombres[caja] = !limpio || limpio.toLowerCase() === `caja ${caja + 1}` ? null : limpio;
  while (nombres.length && nombres[nombres.length - 1] === null) nombres.pop();
  return nombres;
}
