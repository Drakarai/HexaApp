/**
 * **El bono prodigioso** de la Bolsa: lo que se gasta en un Intercambio
 * Prodigioso aparte de los que dan las jornadas (ver lib/prodigioso.ts). Es un
 * objeto más del catálogo, para que la organización lo pueda dar como premio
 * de un reto o ponerlo en la ruleta con lo que ya hay; lo distingue su
 * `apiSlug`, que no es de ningún objeto de los juegos.
 */
export const CLAVE_DEL_BONO = "hexaapp-bono-prodigioso";
export const NOMBRE_DEL_BONO = "Bono prodigioso";

/** Su dibujo: la ball del logo en los colores del Prodigioso, con un destello */
const DIBUJO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#0d9488"/></linearGradient></defs>
<polygon points="13.63,29 50,8 86.37,29 86.37,50 13.63,50" fill="url(#a)"/>
<polygon points="13.63,29 50,8 86.37,29 86.37,71 50,92 13.63,71" fill="none" stroke="#2dd4bf" stroke-width="6" stroke-linejoin="round"/>
<line x1="13.63" y1="50" x2="86.37" y2="50" stroke="#2dd4bf" stroke-width="6"/>
<circle cx="50" cy="50" r="14" fill="#0b0b0e" stroke="#2dd4bf" stroke-width="6"/>
<circle cx="50" cy="50" r="5.5" fill="#ccfbf1"/>
<path d="M84 6 L87 14 L95 17 L87 20 L84 28 L81 20 L73 17 L81 14 Z" fill="#fde68a"/>
</svg>`;

/** En una función: `Buffer` solo existe en el servidor, y la clave también la usa el navegador */
export function imagenDelBono() {
  return `data:image/svg+xml;base64,${Buffer.from(DIBUJO).toString("base64")}`;
}
