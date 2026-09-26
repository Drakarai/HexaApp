/**
 * Volver a la pantalla que se pidió después de entrar.
 *
 * El proxy apunta en una cabecera qué dirección se pidió; si no hay sesión,
 * `requireUser` manda al login con ella en `?volver=`, y el login, al entrar,
 * lleva ahí en vez de a la portada.
 */

export const CABECERA_DE_RUTA = "x-hexaapp-ruta";

/**
 * La dirección de `?volver=` solo si es de esta aplicación.
 *
 * Viene en la URL, así que la puede escribir cualquiera: sin esto, un enlace
 * con `?volver=https://otra-web` usaría nuestro login para mandar a la gente
 * fuera justo después de meter la contraseña.
 */
export function destinoSeguro(valor: unknown): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  // Una barra y solo una: "//otra-web" y "/\otra-web" son direcciones de fuera
  if (!/^\/(?![/\\])/.test(texto)) return "/";
  // Volver al login o a la instalación sería dar una vuelta para nada
  if (/^\/(login|instalacion)(?:[/?#]|$)/.test(texto)) return "/";
  return texto;
}
