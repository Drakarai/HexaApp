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
 * Los iconos se escriben en el HTML como `<i data-i="Crown"></i>` (el nombre
 * del icono en lucide, el mismo que usa la app) y se pintan aquí, justo antes
 * de imprimir. Así el original se lee sin cuarenta líneas de SVG en medio, y
 * los iconos de la guía son exactamente los de la pantalla.
 *
 *   node guia/pdf.mjs            # las dos
 *   node guia/pdf.mjs admin      # solo la del administrador
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as lucide from "lucide-react";

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

/**
 * El SVG de un icono, con el mismo grosor de trazo que en la app. Con
 * `data-relleno` va relleno, como la estrella o la chincheta.
 */
function icono(nombre, relleno) {
  const Dibujo = lucide[nombre];
  if (!Dibujo) throw new Error(`No hay ningún icono que se llame "${nombre}" en lucide`);
  return renderToStaticMarkup(
    createElement(Dibujo, {
      size: "1.15em",
      strokeWidth: 1.9,
      fill: relleno ? "currentColor" : "none",
    }),
  ).replace(/ class="[^"]*"/, "");
}

const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
const pagina = await (await navegador.newContext()).newPage();

for (const cual of cuales) {
  const guia = GUIAS[cual];
  await pagina.goto("file://" + join(aqui, guia.fuente), { waitUntil: "load" });

  const pedidos = await pagina.$$eval("i[data-i]", (todos) =>
    todos.map((i) => [i.dataset.i, i.hasAttribute("data-relleno")]),
  );
  const dibujos = Object.fromEntries(
    pedidos.map(([nombre, relleno]) => [`${nombre}:${relleno}`, icono(nombre, relleno)]),
  );
  await pagina.$$eval(
    "i[data-i]",
    (todos, dibujos) => {
      for (const i of todos) {
        const clave = `${i.dataset.i}:${i.hasAttribute("data-relleno")}`;
        const molde = document.createElement("template");
        molde.innerHTML = dibujos[clave];
        const svg = molde.content.firstElementChild;
        // Las clases del <i> (el color, sobre todo) pasan al dibujo
        svg.setAttribute("class", ["ico", i.className].join(" ").trim());
        svg.setAttribute("aria-hidden", "true");
        i.replaceWith(svg);
      }
    },
    dibujos,
  );
  // Sin esperar a las letras, el PDF salía con la de sistema en la primera hoja
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(800);

  const salida = join(aqui, "..", "public", guia.salida);
  await pagina.pdf({
    path: salida,
    format: "A4",
    printBackground: true,
    // El tamaño manda desde el CSS (@page), no desde aquí
    preferCSSPageSize: true,
  });

  /**
   * Las que no caben. No basta con mirar si la hoja se desborda: el pie va
   * pegado abajo por encima de todo, y un texto largo se le metía debajo sin
   * que la hoja llegara a desbordarse. Así que se mide también dónde acaba lo
   * último de cada hoja contra dónde empieza su pie.
   */
  const largas = await pagina.$$eval(".pagina", (hojas) =>
    hojas
      .map((hoja, indice) => {
        const pie = hoja.querySelector(".pie");
        const fin = Math.max(
          0,
          ...[...hoja.children]
            .filter((hijo) => hijo !== pie)
            .map((hijo) => hijo.getBoundingClientRect().bottom),
        );
        const tope = pie
          ? pie.getBoundingClientRect().top - 6
          : hoja.getBoundingClientRect().bottom;
        return {
          n: indice + 1,
          sobra: Math.round(fin - tope),
          desborda: hoja.scrollHeight > hoja.clientHeight + 2,
        };
      })
      .filter((hoja) => hoja.sobra > 0 || hoja.desborda),
  );

  // Con GUIA_VISTAS=carpeta deja además una foto de cada hoja, para
  // revisarlas sin abrir el PDF
  if (process.env.GUIA_VISTAS) {
    const hojas = pagina.locator(".pagina");
    for (let i = 0; i < (await hojas.count()); i++) {
      await hojas.nth(i).screenshot({
        path: join(process.env.GUIA_VISTAS, `${cual}-${String(i + 1).padStart(2, "0")}.png`),
      });
    }
  }

  console.log(`\n${guia.nombre} · ${await pagina.locator(".pagina").count()} páginas`);
  console.log(
    largas.length
      ? "⚠ No caben (px de más): " +
          largas.map((h) => `pág. ${h.n}${h.sobra > 0 ? ` +${h.sobra}` : ""}`).join(", ")
      : "Todas caben en su hoja.",
  );
  console.log(salida);
}

await navegador.close();
