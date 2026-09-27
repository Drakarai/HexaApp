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

export const COLORES_DEL_LOGO = {
  trazo: "#818cf8",
  arriba: "#a5b4fc",
  abajo: "#4f46e5",
  boton: "#e0e7ff",
  /** El hueco del botón: el fondo oscuro de la aplicación */
  hueco: "#0b0b0e",
};

/**
 * El logo en SVG. `id` distingue su degradado cuando hay varios logos en la
 * misma página (la cabecera del móvil y la del PC conviven, una escondida): si
 * compartieran nombre, el de la escondida podría dejar al otro sin color.
 */
export function logoSvg(id: string, tamano?: number): string {
  const c = COLORES_DEL_LOGO;
  const medida = tamano ? ` width="${tamano}" height="${tamano}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${medida} aria-hidden="true">` +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${c.arriba}"/><stop offset="1" stop-color="${c.abajo}"/>` +
    `</linearGradient></defs>` +
    `<polygon points="${MITAD_DE_ARRIBA}" fill="url(#${id})"/>` +
    `<polygon points="${HEXAGONO}" fill="none" stroke="${c.trazo}" stroke-width="6" stroke-linejoin="round"/>` +
    `<line x1="${IZQ}" y1="50" x2="${DER}" y2="50" stroke="${c.trazo}" stroke-width="6"/>` +
    `<circle cx="50" cy="50" r="14" fill="${c.hueco}" stroke="${c.trazo}" stroke-width="6"/>` +
    `<circle cx="50" cy="50" r="5.5" fill="${c.boton}"/>` +
    `</svg>`
  );
}
