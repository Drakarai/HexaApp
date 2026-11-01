/**
 * **Repartir los juegos de una pareja** (HeartGold y SoulSilver…) entre los
 * jugadores, desde Competiciones → Jugadores.
 *
 * Va la última porque le pone juego a la edición de pruebas, que nace sin él,
 * y eso cambia lo que ven las demás (mapa, level caps…).
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, entrar, ir, MOVIL, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

describe("los juegos de una pareja", () => {
  test("sin juego en pareja no sale el recuadro", async () => {
    const draka = await entrar(navegador, "draka");
    try {
      await ir(draka.pagina, "/competiciones?seccion=jugadores");
      await draka.pagina.getByRole("heading", { name: /Jugadores/ }).first().waitFor();
      assert.equal(await draka.pagina.getByText(/Los juegos:/).count(), 0);
      sinProblemas(draka.problemas, "Jugadores sin pareja");
    } finally {
      await draka.cerrar();
    }
  });

  test("con HeartGold y SoulSilver: quién lleva cada uno, y se reparten al azar", async () => {
    const draka = await entrar(navegador, "draka");
    try {
      const { pagina, problemas } = draka;
      await ir(pagina, "/competiciones?seccion=ajustes");
      const datos = pagina.locator("details", { hasText: "Editar datos de la competición" });
      if ((await datos.getAttribute("open")) === null) await datos.locator("summary").click();
      await datos.locator('select[name="gameId"]').selectOption("heartgold-soulsilver");
      await datos.getByRole("button", { name: "Guardar", exact: true }).click();
      await datos.getByText("Competición actualizada.").waitFor();

      await ir(pagina, "/competiciones?seccion=jugadores");
      const recuadro = pagina.locator("div.rounded-xl", { hasText: "Los juegos: HeartGold y SoulSilver" });
      await recuadro.waitFor();
      // Los de ejemplo vienen tres y tres
      const cuenta = async (version) =>
        Number(/· (\d+)/.exec(await recuadro.locator("p", { hasText: new RegExp(`^${version}`) }).innerText())?.[1]);
      assert.equal(await cuenta("HeartGold"), 3);
      assert.equal(await cuenta("SoulSilver"), 3);

      await recuadro.getByRole("button", { name: /Volver a repartir/ }).click();
      await pagina.waitForLoadState("networkidle");
      // Al azar, pero siempre a partes iguales y sin nadie suelto
      assert.equal(await cuenta("HeartGold"), 3);
      assert.equal(await cuenta("SoulSilver"), 3);
      assert.equal(await recuadro.getByText("Sin juego todavía").count(), 0);
      sinProblemas(problemas, "repartir los juegos");
    } finally {
      await draka.cerrar();
    }
  });

  test("un jugador ve quién lleva qué, pero no reparte", async () => {
    const hector = await entrar(navegador, "hector", MOVIL);
    try {
      await ir(hector.pagina, "/competiciones?seccion=jugadores");
      const recuadro = hector.pagina.locator("div.rounded-xl", { hasText: "Los juegos: HeartGold y SoulSilver" });
      await recuadro.waitFor();
      assert.equal(await recuadro.getByRole("button").count(), 0);
      sinProblemas(hector.problemas, "los juegos, de jugador");
    } finally {
      await hector.cerrar();
    }
  });
});
