/**
 * El **Buzón** de punta a punta: Héctor manda un error desde el móvil, Draka (que
 * lleva la aplicación) lo ve, lo da por hecho y le contesta, y a Héctor le sale
 * el aviso y la respuesta. Y lo que no se puede: que Héctor vea lo de otro.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, entrar, ir, MOVIL, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

describe("el Buzón", () => {
  const TITULO = `La ruleta no gira ${Date.now()}`;

  test("un jugador manda un error, con la pantalla de la que viene ya elegida", async () => {
    const hector = await entrar(navegador, "hector", MOVIL);
    try {
      const { pagina, problemas } = hector;
      await ir(pagina, "/ruleta");
      await ir(pagina, "/buzon");
      assert.equal(await pagina.locator('select[name="pantalla"]').inputValue(), "/ruleta");
      await pagina.fill('input[name="titulo"]', TITULO);
      await pagina.fill('textarea[name="texto"]', "Le doy a girar y no hace nada.");
      await pagina.getByRole("button", { name: "Mandar" }).click();
      await pagina.getByText("¡Recibido!").waitFor();
      const suya = pagina.locator("article", { hasText: TITULO });
      await suya.getByText("Enviada").waitFor();
      sinProblemas(problemas, "el Buzón de Héctor");
    } finally {
      await hector.cerrar();
    }
  });

  test("quien lleva la aplicación lo ve, lo da por hecho y contesta", async () => {
    const draka = await entrar(navegador, "draka");
    try {
      const { pagina, problemas } = draka;
      await ir(pagina, "/buzon");
      const suya = pagina.locator("article", { hasText: TITULO });
      await suya.getByText("Nueva").waitFor();
      assert.match(await suya.innerText(), /Héctor/);
      await suya.locator("label", { hasText: "Hecha" }).click();
      await suya.locator('textarea[name="respuesta"]').fill("Arreglado, gracias.");
      await suya.getByRole("button", { name: "Guardar" }).click();
      // Hecha ya no está por resolver: se va de la lista y pasa a la de hechas
      await suya.waitFor({ state: "detached" });
      await ir(pagina, "/buzon?ver=hechas");
      await pagina.locator("article", { hasText: TITULO }).locator("p", { hasText: "Arreglado, gracias." }).waitFor();
      sinProblemas(problemas, "el Buzón de Draka");
    } finally {
      await draka.cerrar();
    }
  });

  test("al que lo mandó le sale el aviso y la respuesta; lo de otros, nunca", async () => {
    const hector = await entrar(navegador, "hector", MOVIL);
    const rodri = await entrar(navegador, "rodri", MOVIL);
    try {
      await ir(hector.pagina, "/");
      // El punto de «Lo mío» en la barra de abajo
      await hector.pagina.locator("nav button", { hasText: "Lo mío" }).last().locator('[aria-label="Hay algo nuevo"]').waitFor();
      await ir(hector.pagina, "/buzon");
      const suya = hector.pagina.locator("article", { hasText: TITULO });
      await suya.getByText("Hecha").waitFor();
      await suya.getByText("Arreglado, gracias.").waitFor();
      sinProblemas(hector.problemas, "la respuesta");

      await ir(rodri.pagina, "/buzon");
      assert.equal(await rodri.pagina.getByText(TITULO).count(), 0, "Rodri no ve lo de Héctor");
      sinProblemas(rodri.problemas, "el Buzón de Rodri");
    } finally {
      await hector.cerrar();
      await rodri.cerrar();
    }
  });
});
