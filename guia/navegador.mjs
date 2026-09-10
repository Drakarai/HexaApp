/**
 * De dónde sale Playwright para los scripts de la guía.
 *
 * **No es una dependencia del proyecto a propósito**: sirve para hacer la
 * guía, no para que la aplicación funcione, y metiéndolo en `package.json` se
 * instalaría también en cada despliegue. Así que se busca primero en el
 * proyecto y, si no está, en la instalación global (`npm i -g playwright`).
 */
import { execSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function cargarPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    try {
      const modulo = await import(pathToFileURL(join(global, "playwright", "index.js")).href);
      // Playwright es del estilo antiguo: importándolo por su ruta, lo que
      // trae viene dentro de `default` en vez de suelto
      return modulo.chromium ? modulo : modulo.default;
    } catch {
      throw new Error(
        "Falta Playwright. Instálalo con:  npm install -g playwright\n" +
          "Y si no tienes navegador:        npx playwright install chromium",
      );
    }
  }
}

/** El Chromium que se va a usar, si el sistema ya trae uno preparado. */
export function chromiumDelSistema() {
  return process.env.PLAYWRIGHT_CHROMIUM || undefined;
}
