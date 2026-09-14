/**
 * Convierte las guías en los PDF que se reparten.
 *
 * Hay dos y salen del mismo molde (`estilo.css`): la de todos y la de quien
 * lleva un locke. Sin argumentos hace las dos; con uno, solo esa.
 *
 * Además avisa si alguna página se ha quedado larga: como cada hoja es un
 * recuadro de 297 mm con lo que sobra recortado, un párrafo de más se
 * perdería sin más aviso que este.
 *
 *   node guia/pdf.mjs            # las dos
 *   node guia/pdf.mjs admin      # solo la del administrador
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const { chromium } = await cargarPlaywright();

const aqui = dirname(fileURLToPath(import.meta.url));

/**
 * Las dos guías. Se guardan en `public/` y **se suben al repositorio**: son lo
 * que sirve el apartado "Guía de uso" de la aplicación, así que tienen que
 * viajar con el despliegue. Por eso las fotos van en JPEG, para que pesen lo
 * menos posible.
 */
const GUIAS = {
  uso: { fuente: "guia.html", salida: "guia-de-uso.pdf", nombre: "Guía de uso" },
  admin: {
    fuente: "guia-admin.html",
    salida: "guia-de-administrador.pdf",
    nombre: "Guía del administrador",
  },
};

const pedida = process.argv[2];
if (pedida && !GUIAS[pedida]) {
  console.error(`No conozco "${pedida}". Las que hay: ${Object.keys(GUIAS).join(", ")}`);
  process.exit(1);
}
const cuales = pedida ? [pedida] : Object.keys(GUIAS);

const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
const pagina = await (await navegador.newContext()).newPage();

for (const cual of cuales) {
  const guia = GUIAS[cual];
  await pagina.goto("file://" + join(aqui, guia.fuente), { waitUntil: "load" });
  await pagina.waitForTimeout(1500);

  const salida = join(aqui, "..", "public", guia.salida);
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

  console.log(`\n${guia.nombre} · ${await pagina.locator(".pagina").count()} páginas`);
  console.log(
    largas.length
      ? "⚠ Se salen del papel: " + JSON.stringify(largas)
      : "Todas caben en su hoja.",
  );
  console.log(salida);
}

await navegador.close();
