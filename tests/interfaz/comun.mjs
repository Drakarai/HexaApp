/**
 * Lo que comparten las pruebas de la interfaz (ver `correr.mjs`): el
 * navegador, entrar con una cuenta del Hexalocke 2 de ejemplo y el **vigía**,
 * que apunta todo lo que se rompe por el camino —errores de la página, del
 * servidor y de la consola— para que una prueba falle aunque la pantalla
 * parezca bien.
 */
import assert from "node:assert/strict";
import { cargarPlaywright, chromiumDelSistema } from "../../guia/navegador.mjs";

export const BASE = process.env.PRUEBAS_URL ?? "http://localhost:3100";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";

const { chromium } = await cargarPlaywright();

export function abrirNavegador() {
  return chromium.launch({ executablePath: chromiumDelSistema() });
}

export const MOVIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
export const ORDENADOR = { viewport: { width: 1280, height: 900 } };

/**
 * Lo que no se le perdona a ninguna pantalla. Las imágenes que no cargan no
 * cuentan: los sprites vienen de GitHub y aquí puede no haber internet.
 */
function vigilar(pagina) {
  const problemas = [];
  pagina.on("pageerror", (error) => problemas.push(`error en la página: ${String(error).slice(0, 300)}`));
  pagina.on("console", (mensaje) => {
    if (mensaje.type() !== "error") return;
    const texto = mensaje.text();
    if (/Failed to load resource|ERR_|net::/.test(texto)) return;
    problemas.push(`consola: ${texto.slice(0, 300)}`);
  });
  pagina.on("response", (respuesta) => {
    if (respuesta.status() >= 500) problemas.push(`el servidor dio ${respuesta.status()} en ${respuesta.url()}`);
  });
  return problemas;
}

/** Una pestaña nueva, ya dentro con esa cuenta. Devuelve la página y lo que se haya roto */
export async function entrar(navegador, usuario, dispositivo = ORDENADOR) {
  const contexto = await navegador.newContext({ ...dispositivo, locale: "es-ES" });
  const pagina = await contexto.newPage();
  // Borrar y rellenar piden confirmación: se dice que sí
  pagina.on("dialog", (aviso) => aviso.accept().catch(() => {}));
  const problemas = vigilar(pagina);
  await pagina.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await pagina.fill('input[name="username"]', usuario);
  await pagina.fill('input[name="password"]', CLAVE);
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });
  return { pagina, problemas, cerrar: () => contexto.close() };
}

/** Ir a una pantalla y esperar a que se quede quieta */
export async function ir(pagina, ruta) {
  const respuesta = await pagina.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
  return respuesta;
}

/** Que no se haya roto nada desde que se entró */
export function sinProblemas(problemas, donde = "") {
  assert.deepEqual(problemas, [], `Algo se ha roto${donde ? ` en ${donde}` : ""}:\n${problemas.join("\n")}`);
}
