/**
 * Convierte `guia.html` en el PDF que se reparte.
 *
 * Además avisa si alguna página se ha quedado larga: como cada hoja es un
 * recuadro de 297 mm con lo que sobra recortado, un párrafo de más se
 * perdería sin más aviso que este.
 *
 *   node guia/pdf.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const { chromium } = await cargarPlaywright();

const aqui = dirname(fileURLToPath(import.meta.url));

const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
const pagina = await (await navegador.newContext()).newPage();

await pagina.goto("file://" + join(aqui, "guia.html"), { waitUntil: "load" });
await pagina.waitForTimeout(1500);

const salida = join(aqui, "HexaApp-guia-de-uso.pdf");
await pagina.pdf({
  path: salida,
  format: "A4",
  printBackground: true,
  // El tamaño manda desde el CSS (@page), no desde aquí
  preferCSSPageSize: true,
});

const largas = await pagina.$$eval(".pagina", (hojas) =>
  hojas
    .map((hoja, indice) => ({ n: indice + 1, alto: hoja.scrollHeight, cabe: hoja.clientHeight }))
    .filter((hoja) => hoja.alto > hoja.cabe + 2),
);

console.log("Páginas:", await pagina.locator(".pagina").count());
console.log(
  largas.length ? "⚠ Se salen del papel: " + JSON.stringify(largas) : "Todas caben en su hoja.",
);
console.log(salida);

await navegador.close();
