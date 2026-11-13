/**
 * **El locke con vidas**: cada jugador puede perder un número de pokémon, y
 * cuando se le acaban pierde el locke. Aquí los wipeos dan igual: un equipo
 * entero son seis bajas en el cementerio, y son las bajas las que cuentan.
 *
 * Con **vida 0**, llegar a cero no acaba el locke: se sigue jugando con la
 * vida 0, y es la siguiente baja la que lo acaba. Con 20 vidas, sin vida 0 se
 * pierde con la baja 20; con vida 0, con la 21.
 *
 * Sin base de datos, para poder probarlo: `vidas-servidor.ts` cuenta las bajas
 * y saca a quien se queda sin vidas.
 */

/** Lo que se puede elegir al crear el locke */
export const VIDAS_POR_DEFECTO = 20;
export const VIDAS_MAXIMAS = 999;

export type ConVidas = { vidas: number | null; vidaCero: boolean };

export type EstadoDeVidas = {
  /** Las del locke, sin contar la vida 0 */
  vidas: number;
  vidaCero: boolean;
  bajas: number;
  /** Las que le quedan; con vida 0 puede ser 0 y seguir jugando */
  quedan: number;
  /** Ya no le quedan: ha perdido el locke */
  sinVidas: boolean;
  /** Está en la vida 0: la siguiente baja le hace perder */
  enLaVidaCero: boolean;
  /** La última: una baja más y fuera (sea la 1 o la vida 0) */
  enLaUltima: boolean;
};

/** Null si el locke no va con vidas */
export function estadoDeVidas(locke: ConVidas, bajas: number): EstadoDeVidas | null {
  if (locke.vidas == null || locke.vidas < 1) return null;
  const quedan = Math.max(locke.vidaCero ? -1 : 0, locke.vidas - bajas);
  const sinVidas = locke.vidaCero ? quedan < 0 : quedan <= 0;
  return {
    vidas: locke.vidas,
    vidaCero: locke.vidaCero,
    bajas,
    quedan: Math.max(0, quedan),
    sinVidas,
    enLaVidaCero: locke.vidaCero && quedan === 0,
    enLaUltima: !sinVidas && (locke.vidaCero ? quedan === 0 : quedan === 1),
  };
}

/** «Le quedan 3 vidas», «Está en la vida 0», «Sin vidas» */
export function textoDeVidas(estado: EstadoDeVidas) {
  if (estado.sinVidas) return "Sin vidas";
  if (estado.enLaVidaCero) return "En la vida 0";
  return `${estado.quedan} ${estado.quedan === 1 ? "vida" : "vidas"}`;
}

/**
 * Lo que manda el formulario: la casilla de «con vidas», cuántas y la vida 0.
 * Sin la casilla, sin vidas, se haya escrito lo que se haya escrito.
 */
export function leerVidas(datos: { conVidas: unknown; vidas: unknown; vidaCero: unknown }): ConVidas {
  if (datos.conVidas !== "on") return { vidas: null, vidaCero: false };
  const escrito = String(datos.vidas ?? "").trim();
  const n = Math.trunc(Number(escrito));
  // Vacío o sin sentido: las de siempre
  const vidas = escrito && Number.isFinite(n) ? Math.min(VIDAS_MAXIMAS, Math.max(1, n)) : VIDAS_POR_DEFECTO;
  return { vidas, vidaCero: datos.vidaCero === "on" };
}

/** Lo que se añade al mensaje de una baja: «Te quedan 3 vidas.» */
export function avisoDeVidas(estado: EstadoDeVidas | null): string {
  if (!estado) return "";
  if (estado.sinVidas) return " Sin vidas: se acabó el locke.";
  if (estado.enLaVidaCero) return " A partir de aquí, la vida 0: la siguiente es la última.";
  if (estado.enLaUltima) return " Queda una sola vida.";
  return ` Quedan ${estado.quedan} vidas.`;
}
