/**
 * El **editor de mapas**: tocar una zona no puede refrescar la pantalla. Cada
 * cambio vuelve con el mapa como ha quedado y el editor se repinta solo, sin
 * recargar la página, sin moverse de sitio y sin cerrar la zona elegida (ver
 * `EstadoDelEditor` en `actions/mapas.ts`).
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, entrar, ir, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

describe("el editor de mapas", () => {
  test("renombrar y mover una zona no refresca la pantalla", async () => {
    const draka = await entrar(navegador, "draka");
    try {
      const { pagina, problemas } = draka;
      await ir(pagina, "/admin/mapas?region=johto");
      // La base de pruebas puede traer Johto vacío: se rellena con las de fábrica
      const rellenar = pagina.locator("button", { hasText: "que traigo escritos" });
      if (await rellenar.count()) {
        await rellenar.click();
        await pagina.locator("svg [fill-opacity]").first().waitFor();
      }
      // Una marca en la página: si se recargara, desaparecería
      await pagina.evaluate(() => {
        window.__sinRecargar = true;
      });

      const zona = pagina.locator("svg [fill-opacity]").nth(3);
      await zona.click();
      const panel = pagina.locator("div.rounded-xl", { has: pagina.locator('input[name="name"]') }).first();
      const nombre = panel.locator('input[name="name"]');
      const antes = await nombre.inputValue();
      await nombre.fill(`${antes} Norte`);
      // Primero a la vista: al pulsar, Playwright desplazaría la pantalla él
      const guardar = panel.getByRole("button", { name: "Guardar", exact: true });
      await guardar.scrollIntoViewIfNeeded();
      const altura = await pagina.evaluate(() => window.scrollY);
      await guardar.click();
      await panel.getByText("Guardada.").waitFor();
      // El panel sigue abierto, con el nombre nuevo, y la pantalla donde estaba
      assert.equal(await nombre.inputValue(), `${antes} Norte`);
      assert.equal(await pagina.evaluate(() => window.scrollY), altura);

      // Arrastrarla: se guarda sin recargar
      const caja = await zona.boundingBox();
      await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await pagina.mouse.down();
      await pagina.mouse.move(caja.x + caja.width / 2 + 30, caja.y + caja.height / 2 + 15, { steps: 6 });
      await pagina.mouse.up();
      await pagina.waitForTimeout(1500);
      assert.equal(await pagina.evaluate(() => window.__sinRecargar), true, "la página se ha recargado");

      // Y está guardado de verdad
      await pagina.reload({ waitUntil: "networkidle" });
      assert.ok((await pagina.content()).includes(`${antes} Norte`));
      sinProblemas(problemas, "el editor de mapas");
    } finally {
      await draka.cerrar();
    }
  });
});
