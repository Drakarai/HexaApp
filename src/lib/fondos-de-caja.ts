/**
 * Los fondos de las cajas del PC, como en los juegos: cada caja con su
 * paisaje, y cada jugador elige el de las suyas.
 *
 * Se guardan en `Participant.fondosDeCaja` como una lista separada por comas,
 * una posición por caja: `"playa,,cueva"` es la 1 en la playa, la 2 con el
 * suyo de siempre y la 3 en la cueva. Por jugador y por locke, porque la caja
 * es de ese locke. Sin nada elegido, cada caja lleva **el suyo de fábrica**,
 * que va cambiando de una caja a la siguiente, como en los juegos.
 *
 * Los dibujos están en `components/fondo-de-caja.tsx`; aquí solo las cuentas,
 * que son las que se prueban.
 */

export const FONDOS_DE_CAJA = [
  { slug: "bosque", nombre: "Bosque" },
  { slug: "pradera", nombre: "Pradera" },
  { slug: "playa", nombre: "Playa" },
  { slug: "cueva", nombre: "Cueva" },
  { slug: "volcan", nombre: "Volcán" },
  { slug: "nieve", nombre: "Nieve" },
  { slug: "mar", nombre: "Mar" },
  { slug: "noche", nombre: "Noche" },
  // La caja de antes, gris y sin dibujo, por si alguien la prefiere
  { slug: "liso", nombre: "Sin fondo" },
] as const;

export type FondoDeCaja = (typeof FONDOS_DE_CAJA)[number]["slug"];

/** Los de fábrica, en el orden en que salen caja a caja (sin el liso) */
const DE_FABRICA = FONDOS_DE_CAJA.filter((f) => f.slug !== "liso").map((f) => f.slug);

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
