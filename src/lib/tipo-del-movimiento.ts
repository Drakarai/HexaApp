import { GENERACION_ANIL } from "./anil";

/**
 * El tipo de un movimiento en una generación, sin cargar la lista de
 * movimientos: lo usa la cobertura de tipos en el navegador, que recibe ya
 * resueltos los ataques de cada pokémon y solo tiene que elegir tabla.
 *
 * Algunos movimientos cambiaron de tipo: Mordisco era Normal en la 1ª y
 * Encanto, Normal hasta la 5ª. `a` lleva esos cambios como [hasta la
 * generación, tipo de entonces], del más antiguo al más nuevo.
 */
export type TipoDeMovimiento = {
  t: number;
  a?: [number, number][];
  /** Su tipo en Pokémon Añil, si allí es otro (Fuerza es Roca): ver lib/anil.ts */
  an?: number;
};

export function tipoDelMovimiento(movimiento: TipoDeMovimiento, generacion: number) {
  if (generacion === GENERACION_ANIL && movimiento.an) return movimiento.an;
  for (const [hasta, tipo] of movimiento.a ?? []) {
    if (generacion <= hasta) return tipo;
  }
  return movimiento.t;
}
