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
 * una posición por caja: `"5,,liso"` es la 1 con el fondo 5, la 2 con el suyo
 * de siempre y la 3 sin fondo. Por jugador y por locke, porque la caja es de
 * ese locke. Sin nada elegido, cada caja lleva **el suyo de fábrica**, que va
 * cambiando de una caja a la siguiente, como en los juegos. Lo que no se
 * reconoce (los paisajes dibujados de la primera prueba) cuenta como vacío.
 */

export const FONDOS_DE_CAJA = [
  { slug: "1", nombre: "Fondo 1" },
  { slug: "2", nombre: "Fondo 2" },
  { slug: "3", nombre: "Fondo 3" },
  { slug: "4", nombre: "Fondo 4" },
  { slug: "5", nombre: "Fondo 5" },
  { slug: "6", nombre: "Fondo 6" },
  { slug: "7", nombre: "Fondo 7" },
  { slug: "8", nombre: "Fondo 8" },
  { slug: "9", nombre: "Fondo 9" },
  { slug: "10", nombre: "Fondo 10" },
  { slug: "11", nombre: "Fondo 11" },
  { slug: "12", nombre: "Fondo 12" },
  { slug: "13", nombre: "Fondo 13" },
  { slug: "14", nombre: "Fondo 14" },
  { slug: "15", nombre: "Fondo 15" },
  // La caja gris de antes, por si alguien la prefiere
  { slug: "liso", nombre: "Sin fondo" },
] as const;

export type FondoDeCaja = (typeof FONDOS_DE_CAJA)[number]["slug"];

/**
 * El orden en que salen de fábrica, caja a caja: primero los tranquilos (la
 * ball, la hierba, la arena, los ladrillos), que son los que se ven al empezar,
 * y después los de los legendarios.
 */
const DE_FABRICA: FondoDeCaja[] = ["1", "13", "14", "15", "11", "12", "5", "6", "2", "3", "4", "7", "8", "9", "10"];

/** Más no hacen falta: con 30 por caja, son 1.500 pokémon */
export const MAXIMO_DE_CAJAS = 50;

export function esFondo(valor: string): valor is FondoDeCaja {
  return FONDOS_DE_CAJA.some((f) => f.slug === valor);
}

export function nombreDelFondo(fondo: FondoDeCaja) {
  return FONDOS_DE_CAJA.find((f) => f.slug === fondo)?.nombre ?? "";
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
