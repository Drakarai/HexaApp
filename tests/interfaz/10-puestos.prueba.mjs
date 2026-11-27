/**
 * **La clasificación por puestos**: encenderla en Puntos, ver la tabla de cada
 * jornada en Jornadas y los puntos por puesto, y apagarla: la clasificación
 * tiene que volver a ser la de antes (cada victoria con su punto).
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, entrar, ir, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

/** La clasificación global tal cual se lee, para compararla */
async function clasificacion(pagina) {
  await ir(pagina, "/puntos");
  return (await pagina.locator("table.data-table").first().innerText()).replace(/\s+/g, " ");
}

async function guardar(pagina, activo) {
  await ir(pagina, "/puntos");
  const config = pagina.locator("[data-config-puestos]");
  await config.locator("summary").click();
  await config.locator('input[name="activo"]').setChecked(activo);
  await config.getByRole("button", { name: "Guardar" }).click();
  await config.getByText(activo ? /Guardado/ : /Quitado/).waitFor();
}

describe("clasificación por puestos", () => {
  let sesion;
  before(async () => {
    sesion = await entrar(navegador, "draka");
  });
  after(async () => {
    await guardar(sesion.pagina, false).catch(() => {});
    await sesion?.cerrar();
  });

  test("encendida, cada jornada tiene su tabla y apagada vuelve todo como estaba", async () => {
    const { pagina, problemas } = sesion;
    const antes = await clasificacion(pagina);

    await guardar(pagina, true);
    await ir(pagina, "/puntos");
    await pagina.locator("[data-puestos]").getByText("2 puntos").first().waitFor();
    await ir(pagina, "/jornadas");
    assert.ok((await pagina.locator("[data-tabla-de-puestos]").count()) > 0, "las jornadas con combates llevan su tabla");

    await guardar(pagina, false);
    assert.equal(await clasificacion(pagina), antes);
    sinProblemas(problemas, "la clasificación por puestos");
  });
});
