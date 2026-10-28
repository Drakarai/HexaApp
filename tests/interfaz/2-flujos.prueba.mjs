/**
 * **Lo de todos los días**, de principio a fin y en orden, sobre el Hexalocke
 * 2 recién sembrado: entrar, apuntar una captura, abrir su ficha y llegar a
 * ella con el buscador, exportarla a Showdown, marcar un gimnasio, apuntar un
 * resultado y ver los puntos, y las reglas con y sin «Editar reglas».
 *
 * Van en un solo `describe` porque unas dependen de otras: la ficha es la de
 * la captura de antes.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, BASE, entrar, ir, MOVIL, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

describe("lo de todos los días", () => {
  let sesion;
  before(async () => {
    sesion = await entrar(navegador, "draka");
  });
  after(() => sesion?.cerrar());

  test("con la contraseña mal no se entra, y se dice", async () => {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/login`);
    await pagina.fill('input[name="username"]', "draka");
    await pagina.fill('input[name="password"]', "esta-no-es");
    await pagina.click('button[type="submit"]');
    await pagina.getByText("Usuario o contraseña incorrectos.").waitFor();
    assert.match(new URL(pagina.url()).pathname, /^\/login/);
    await contexto.close();
  });

  test("apuntar una captura en Equipo y PC", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/equipo");
    const formulario = pagina.locator("details", { hasText: "Apuntar una captura" }).first();
    if ((await formulario.getAttribute("open")) === null) await formulario.locator("summary").click();
    await formulario.locator('input[name="species"]').fill("Sentret");
    await formulario.locator('input[name="nickname"]').fill("Cacahuete");
    await formulario.getByRole("button", { name: "Apuntar", exact: true }).click();
    // Va solo al equipo, que está vacío
    await pagina.locator('[aria-label^="Cacahuete —"]').first().waitFor({ timeout: 15_000 });
    sinProblemas(problemas, "Equipo y PC");
  });

  test("su ficha se abre y tiene sus pestañas", async () => {
    const { pagina, problemas } = sesion;
    await pagina.locator('[aria-label^="Cacahuete —"]').first().click();
    const ficha = pagina.getByRole("dialog");
    await ficha.waitFor();
    await ficha.getByRole("tab", { name: /Combate/ }).click();
    await ficha.getByText("Para combatir").waitFor();
    await ficha.getByRole("tab", { name: /Historia/ }).click();
    await pagina.keyboard.press("Escape");
    await ficha.waitFor({ state: "detached" });
    sinProblemas(problemas, "la ficha");
  });

  test("exportar el equipo a Showdown", async () => {
    const { pagina, problemas } = sesion;
    await pagina.getByRole("button", { name: /Exportar a Showdown/ }).click();
    const texto = pagina.locator('textarea[aria-label^="El equipo"]');
    await pagina.waitForFunction(() => document.querySelector('textarea[aria-label^="El equipo"]')?.value);
    assert.match(await texto.inputValue(), /^Cacahuete \(Sentret\)/);
    await pagina.keyboard.press("Escape");
    sinProblemas(problemas, "exportar a Showdown");
  });

  test("compartir su tarjeta hace la imagen, y nadie más la puede pedir", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/equipo");
    await pagina.locator('[aria-label^="Cacahuete —"]').first().click();
    const ficha = pagina.getByRole("dialog");
    const [respuesta] = await Promise.all([
      pagina.waitForResponse((r) => r.url().includes("/api/pokemon/")),
      ficha.getByRole("button", { name: /Compartir su tarjeta/ }).click(),
    ]);
    assert.equal(respuesta.status(), 200);
    assert.equal(respuesta.headers()["content-type"], "image/png");
    await pagina.keyboard.press("Escape");
    // Su caja es privada: la tarjeta de otro, ni con la dirección a mano
    const hector = await entrar(navegador, "hector", MOVIL);
    try {
      const ajena = await hector.pagina.request.get(respuesta.url());
      assert.equal(ajena.status(), 404);
    } finally {
      await hector.cerrar();
    }
    sinProblemas(problemas, "la tarjeta del pokémon");
  });

  test("el buscador lleva a la ficha (Ctrl+K)", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/");
    await pagina.keyboard.press("Control+k");
    const buscador = pagina.getByRole("dialog", { name: "Buscador rápido" });
    await buscador.waitFor();
    await buscador.getByLabel("Buscar").fill("cacahu");
    // Lo del locke llega del servidor al abrirlo
    await buscador.getByRole("button", { name: /Cacahuete/ }).waitFor();
    await pagina.keyboard.press("Enter");
    await pagina.waitForURL(/\/equipo\?ver=/);
    // La ficha se abre ya en el navegador: pintarla en el servidor rompía la carga
    await pagina.getByRole("dialog").getByText("Cacahuete").first().waitFor();
    sinProblemas(problemas, "el buscador");
  });

  test("marcar un gimnasio sube el tope al siguiente", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/level-caps");
    const cartel = pagina.locator("section", { hasText: "Tu nivel máximo" }).first();
    assert.match(await cartel.innerText(), /Llevas\s*0\s*de\s*\d+/);
    assert.match(await cartel.innerText(), /pegaso/i);
    // Los botones de marcar llevan el punto de color de cada jugador
    await pagina.locator("button.chip:has(span.rounded-full)", { hasText: "Draka" }).first().click();
    // Pasado Pegaso, el tope es el de Antón
    await cartel.getByText("Antón").waitFor();
    assert.match(await cartel.innerText(), /Llevas\s*1\s*de\s*\d+/);
    sinProblemas(problemas, "Level caps");
  });

  test("apuntar un resultado suma el punto", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/jornadas");
    await pagina.getByRole("button", { name: "Anotar resultado" }).first().click();
    const ganador = pagina.locator('select[name="winnerId"]').first();
    const nombre = (await ganador.locator("option").nth(1).innerText()).trim();
    await ganador.selectOption({ index: 1 });
    await pagina.locator('input[name="pokemonDiff"]').first().fill("2");
    await pagina.getByRole("button", { name: "Guardar resultado" }).first().click();
    await pagina.waitForTimeout(1500);
    await ir(pagina, "/puntos");
    await pagina.getByText(`victoria de ${nombre}`).first().waitFor();
    sinProblemas(problemas, "jornadas y puntos");
  });

  test("las reglas: leer sin botones, editar con ellos", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/reglas");
    assert.equal(await pagina.getByTitle("Subir").count(), 0, "al leer no hay botones de mover");
    await pagina.getByRole("link", { name: /Editar reglas/ }).click();
    await pagina.waitForURL(/editar=1/);
    assert.ok(await pagina.getByTitle("Subir").count(), "editando sí");
    await pagina.getByRole("link", { name: /Terminar/ }).click();
    await pagina.waitForURL((u) => !u.search.includes("editar"));
    sinProblemas(problemas, "Reglas");
  });

  test("un jugador normal no ve «Editar reglas»", async () => {
    const hector = await entrar(navegador, "hector", MOVIL);
    try {
      await ir(hector.pagina, "/reglas?editar=1");
      assert.equal(await hector.pagina.getByRole("link", { name: /Editar reglas/ }).count(), 0);
      // Ni con la dirección a mano: el modo de editar es solo de quien administra
      assert.equal(await hector.pagina.getByTitle("Subir").count(), 0);
      sinProblemas(hector.problemas, "Reglas de Héctor");
    } finally {
      await hector.cerrar();
    }
  });
});
