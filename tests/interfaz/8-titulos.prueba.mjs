/**
 * **Los títulos**: uno del catálogo común dado en general desde
 * Administración, uno extra del locke dado desde sus ajustes, los dos en el
 * perfil de quien los gana (cada uno en su grupo), y el que se pone para el
 * locke en la clasificación.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, entrar, ir, MOVIL, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

const COMUN = "Corazón de hierro";
const EXTRA = "Rey de la prueba";

/** Crea un título desde el bloque de títulos que haya en la página */
async function crear(pagina, rotulo, nombre) {
  const nuevo = pagina.locator("details", { hasText: rotulo }).first();
  if ((await nuevo.getAttribute("open")) === null) await nuevo.locator("summary").click();
  await nuevo.locator('input[name="name"]').fill(nombre);
  await nuevo.getByRole("button", { name: "Crear título" }).click();
  await nuevo.getByText(`Título "${nombre}" creado.`).waitFor();
}

/** Se lo da a alguien, en el sitio que diga el desplegable de «Dónde» */
async function dar(pagina, titulo, persona, donde) {
  const fila = pagina.locator("li", { hasText: titulo }).first();
  const plegado = fila.locator("details", { hasText: "Dárselo a alguien" });
  if ((await plegado.getAttribute("open")) === null) await plegado.locator("summary").click();
  await fila.locator('select[name="userId"]').selectOption({ label: persona });
  await fila.getByLabel("Dónde", { exact: true }).selectOption({ label: donde });
  await fila.getByRole("button", { name: "Dárselo" }).click();
  await fila.getByText(`"${titulo}" para ${persona}.`).waitFor();
}

describe("títulos generales y de un locke", () => {
  test("el Creador da uno común en general y uno extra del locke", async () => {
    const draka = await entrar(navegador, "draka");
    try {
      await ir(draka.pagina, "/admin?seccion=titulos");
      await crear(draka.pagina, "Crear un título", COMUN);
      await dar(draka.pagina, COMUN, "Héctor", "General");

      await ir(draka.pagina, "/competiciones?seccion=ajustes");
      await crear(draka.pagina, "Crear un título para este locke", EXTRA);
      await dar(draka.pagina, EXTRA, "Héctor", "Solo en este locke");
      // Un extra no se puede dar como general: solo sale «solo en este locke»
      const opciones = await draka.pagina
        .locator("li", { hasText: EXTRA })
        .first()
        .getByLabel("Dónde", { exact: true })
        .locator("option")
        .allTextContents();
      assert.deepEqual(opciones, ["Solo en este locke"]);
      sinProblemas(draka.problemas, "repartir títulos");
    } finally {
      await draka.cerrar();
    }
  });

  test("en su perfil salen agrupados, y el del locke se lleva en el locke", async () => {
    const hector = await entrar(navegador, "hector", MOVIL);
    try {
      const { pagina, problemas } = hector;
      await ir(pagina, "/perfil?seccion=titulos");
      const titulos = pagina.locator("[data-titulos]");
      const grupos = await titulos.locator("[data-grupo-de-titulos]").evaluateAll((g) =>
        g.map((x) => x.getAttribute("data-grupo-de-titulos")),
      );
      // Primero el locke que se está mirando, luego los generales
      assert.deepEqual(grupos, ["En Hexalocke 2", "Generales"]);

      // El del locke solo se puede llevar en el locke, no en general
      const extra = titulos.locator("li", { hasText: EXTRA });
      assert.equal(await extra.getByRole("button", { name: "Llevarlo en general" }).count(), 0);
      await extra.getByRole("button", { name: "Llevarlo en Hexalocke 2" }).click();
      await extra.getByText("puesto aquí").waitFor();

      // El común, en general
      const comun = titulos.locator("li", { hasText: COMUN });
      await comun.getByRole("button", { name: "Llevarlo en general" }).click();
      await comun.getByText("puesto en general").waitFor();

      // En la clasificación del locke manda el del locke
      await ir(pagina, "/puntos");
      await pagina.getByText(EXTRA).first().waitFor();
      sinProblemas(problemas, "títulos de Héctor");
    } finally {
      await hector.cerrar();
    }
  });

  test("un título ya dado cambia de sitio sin quitarlo", async () => {
    const draka = await entrar(navegador, "draka");
    try {
      await ir(draka.pagina, "/admin?seccion=titulos");
      const concesion = draka.pagina.locator("li", { hasText: COMUN }).locator("li", { hasText: "Héctor" });
      await concesion.getByLabel("Dónde vale").selectOption({ label: "Solo en Hexalocke 2" });
      await draka.pagina.waitForTimeout(1500);
      await ir(draka.pagina, "/admin?seccion=titulos");
      assert.equal(
        await draka.pagina.locator("li", { hasText: COMUN }).locator("li", { hasText: "Héctor" }).getByLabel("Dónde vale").inputValue(),
        await draka.pagina.locator("li", { hasText: COMUN }).locator('option', { hasText: "Solo en Hexalocke 2" }).first().getAttribute("value"),
      );
      sinProblemas(draka.problemas, "cambiar dónde vale");
    } finally {
      await draka.cerrar();
    }

    // En su perfil ya no hay generales: los dos son de Hexalocke 2, y el porqué sigue
    const hector = await entrar(navegador, "hector", MOVIL);
    try {
      await ir(hector.pagina, "/perfil?seccion=titulos");
      const grupos = await hector.pagina.locator("[data-grupo-de-titulos]").evaluateAll((g) =>
        g.map((x) => x.getAttribute("data-grupo-de-titulos")),
      );
      assert.deepEqual(grupos, ["En Hexalocke 2"]);
      // Era su general puesto: uno de un locke no se lleva en general
      assert.equal(await hector.pagina.getByText("puesto en general").count(), 0);
    } finally {
      await hector.cerrar();
    }
  });
});
