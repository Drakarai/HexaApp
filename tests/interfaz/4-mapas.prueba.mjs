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

  test("cambiar el tamaño del lienzo mueve las zonas con él", async () => {
    const draka = await entrar(navegador, "draka");
    try {
      const { pagina, problemas } = draka;
      await ir(pagina, "/admin/mapas?region=johto");
      const fondo = async (ancho, alto) => {
        await pagina.getByRole("button", { name: /mapa de fondo/ }).click();
        const form = pagina.locator("form", { has: pagina.locator('input[name="width"]') });
        await form.locator('input[name="width"]').fill(String(ancho));
        await form.locator('input[name="height"]').fill(String(alto));
        await form.getByRole("button", { name: "Guardar" }).click();
        await pagina.getByText(/se han movido con el tamaño nuevo/).waitFor();
        await form.getByRole("button", { name: "Cerrar" }).click();
      };
      // A la mitad: antes se quedaban fuera y salía el aviso de las que se salen
      await fondo(950, 480);
      assert.equal(await pagina.locator('input[name="anchoAntes"]').count(), 0, "ninguna zona se sale");
      // Y vuelta al de siempre, para no dejar el mapa cambiado
      await fondo(1900, 960);
      assert.equal(await pagina.locator('input[name="anchoAntes"]').count(), 0);
      sinProblemas(problemas, "cambiar el tamaño del lienzo");
    } finally {
      await draka.cerrar();
    }
  });
});
