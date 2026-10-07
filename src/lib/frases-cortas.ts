/**
 * Las frases del compañero que hacen falta en el navegador (ver
 * lib/frases-del-companero.ts para las demás): las de cualquiera, las de
 * dormido y las de la hora, que solo sabe el navegador de quien mira. Van
 * aparte para que el navegador no se lleve las de las mil especies.
 */

/** Las de cualquiera, para variar y por si no hay línea */
export const GENERICAS = [
  "{n} te mira con curiosidad",
  "{n} tararea algo",
  "{n} quiere que le hagas caso",
  "{n} parece que quiere decirte algo",
  "{n} da un saltito al verte",
  "{n} sigue tus pasos",
];

/** Si se le toca de noche, mientras duerme */
export const DORMIDO = [
  "{n} abre un ojo, te ve y sigue durmiendo",
  "{n} murmura algo en sueños",
  "{n} se da la vuelta y sigue soñando",
  "{n} ronca bajito",
];

/** De 0 a 8 duerme, como cualquiera */
export const esDeNoche = (hora: number) => hora < 8;

export function frasesDeLaHora(hora: number): string[] {
  if (hora >= 8 && hora < 11) return ["{n} se despereza: buenos días", "{n} todavía tiene legañas"];
  if (hora >= 14 && hora < 17) return ["{n} pide una siesta después de comer"];
  if (hora >= 22) return ["{n} bosteza: se está haciendo tarde"];
  return [];
}

export const rellenar = (frase: string, nombre: string) => frase.replaceAll("{n}", nombre);
