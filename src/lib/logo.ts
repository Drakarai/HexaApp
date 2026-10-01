/**
 * El logo de HexaApp: la **media ball**, que junta el logo de siempre (un
 * hexágono de contorno con un punto) con una ball de captura. Arriba, la mitad
 * rellena de la ball; abajo, el contorno hueco del original; y el punto del
 * original hace de botón.
 *
 * **Es la única copia del dibujo.** De aquí salen el logo de la cabecera y de
 * la pantalla de entrar (`components/logo.tsx`) y, con `scripts/iconos.ts`, el
 * icono de la pestaña, el favicon y los iconos para instalar la aplicación. Si
 * se cambia el logo, se cambia aquí y se vuelve a lanzar el script.
 *
 * Es texto y no un componente porque también lo usa ese script, que no pinta
 * React. Sin nada que venga de fuera: se puede meter en el HTML tal cual.
 */

/** El hexágono de punta arriba, centrado en 50,50 dentro de un lienzo de 100 */
const R = 42;
const COS30 = Math.cos(Math.PI / 6);
const IZQ = (50 - R * COS30).toFixed(2);
const DER = (50 + R * COS30).toFixed(2);
const ARRIBA = (50 - R).toFixed(2);
const ABAJO = (50 + R).toFixed(2);
const HOMBRO_ALTO = (50 - R / 2).toFixed(2);
const HOMBRO_BAJO = (50 + R / 2).toFixed(2);

const HEXAGONO = `${IZQ},${HOMBRO_ALTO} 50,${ARRIBA} ${DER},${HOMBRO_ALTO} ${DER},${HOMBRO_BAJO} 50,${ABAJO} ${IZQ},${HOMBRO_BAJO}`;
const MITAD_DE_ARRIBA = `${IZQ},${HOMBRO_ALTO} 50,${ARRIBA} ${DER},${HOMBRO_ALTO} ${DER},50 ${IZQ},50`;

export type ColoresDelLogo = {
  trazo: string;
  arriba: string;
  abajo: string;
  boton: string;
  /** El hueco del botón: el fondo oscuro de la aplicación */
  hueco: string;
};

/** Los de siempre, fijos: para los iconos de instalar, que no saben de temas */
export const COLORES_DEL_LOGO: ColoresDelLogo = {
  trazo: "#818cf8",
  arriba: "#a5b4fc",
  abajo: "#4f46e5",
  boton: "#e0e7ff",
  hueco: "#0b0b0e",
};

/**
 * Los del **tema de cada uno**, para el logo dentro de la aplicación: salen de
 * las variables del tema, así que la media ball de la cabecera y la de tirar
 * para refrescar son rojas con Rojo, doradas con Dinotren… Con el tema de
 * siempre quedan prácticamente como los fijos. Si las variables no están (no
 * debería pasar), se cae a los fijos.
 */
export const COLORES_DEL_TEMA: ColoresDelLogo = {
  trazo: "var(--color-brand-400, #818cf8)",
  arriba: "color-mix(in oklab, var(--color-brand-400, #818cf8) 65%, white)",
  abajo: "var(--color-brand-600, #4f46e5)",
  boton: "color-mix(in oklab, var(--color-brand-400, #818cf8) 18%, white)",
  hueco: "#0b0b0e",
};

/**
 * El logo en SVG. `id` distingue su degradado cuando hay varios logos en la
 * misma página (la cabecera del móvil y la del PC conviven, una escondida): si
 * compartieran nombre, el de la escondida podría dejar al otro sin color.
 */
export function logoSvg(
  id: string,
  tamano?: number,
  c: ColoresDelLogo = COLORES_DEL_LOGO,
): string {
  const medida = tamano ? ` width="${tamano}" height="${tamano}"` : "";
  /**
   * Los colores van en `style` y no como atributos: un atributo como
   * `stroke="var(--x)"` no entiende variables CSS, y el logo con tema las
   * necesita. Con colores fijos da igual una forma que otra.
   */
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${medida} aria-hidden="true">` +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" style="stop-color:${c.arriba}"/><stop offset="1" style="stop-color:${c.abajo}"/>` +
    `</linearGradient></defs>` +
    `<polygon points="${MITAD_DE_ARRIBA}" fill="url(#${id})"/>` +
    `<polygon points="${HEXAGONO}" style="fill:none;stroke:${c.trazo}" stroke-width="6" stroke-linejoin="round"/>` +
    `<line x1="${IZQ}" y1="50" x2="${DER}" y2="50" style="stroke:${c.trazo}" stroke-width="6"/>` +
    `<circle cx="50" cy="50" r="14" style="fill:${c.hueco};stroke:${c.trazo}" stroke-width="6"/>` +
    `<circle cx="50" cy="50" r="5.5" style="fill:${c.boton}"/>` +
    `</svg>`
  );
}
