/**
 * **El locke con vidas**: encenderlo en Editar datos, ver las vidas de cada
 * uno en el cementerio, quedarse sin ellas con una baja (y perder el locke) y
 * recuperarlas borrándola. Al acabar se apaga, para dejar el locke como estaba.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, entrar, ir, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

/** Pone (o quita, con null) las vidas del locke desde Ajustes */
async function ponerVidas(pagina, vidas, vidaCero = false) {
  await ir(pagina, "/competiciones?seccion=ajustes");
  const campo = pagina.locator("[data-campo-vidas]").last();
  const editar = pagina.locator("details", { has: campo }).last();
  if ((await editar.getAttribute("open")) === null) await editar.locator("summary").first().click();
  await campo.getByLabel("Jugar con vidas").setChecked(vidas !== null);
  if (vidas !== null) {
    await campo.getByLabel("Vidas", { exact: true }).fill(String(vidas));
    await campo.getByLabel("Con vida 0").setChecked(vidaCero);
  }
  // Se espera a la respuesta del servidor; si ha guardado se ve luego en el cementerio
  await Promise.all([
    pagina.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/competiciones")),
    editar.getByRole("button", { name: "Guardar" }).click(),
  ]);
}

/** Lo que dice el marcador de un jugador: «3 / 20», «En la vida 0», «Sin vidas» */
async function vidasDe(pagina, nombre) {
  await ir(pagina, "/muertes");
  return (await pagina.locator(`[data-vidas-de="${nombre}"]`).innerText()).replace(/\s+/g, " ").trim();
}

async function registrarBaja(pagina, nombre, especie) {
  await ir(pagina, "/muertes");
  const formulario = pagina.locator("details", { hasText: "Registrar una baja" }).first();
  if ((await formulario.getAttribute("open")) === null) await formulario.locator("summary").click();
  await formulario.locator('select[name="participantId"]').selectOption({ label: nombre });
  const deLaCaja = formulario.locator('select[name="captureId"]');
  if (await deLaCaja.count()) await deLaCaja.selectOption("");
  await formulario.locator('input[name="species"]').fill(especie);
  await formulario.getByRole("button", { name: "Registrar baja" }).click();
  return formulario;
}

describe("locke con vidas", () => {
  let sesion;
  before(async () => {
    sesion = await entrar(navegador, "draka");
  });
  after(async () => {
    // Pase lo que pase, el locke se queda sin vidas para lo demás
    await ponerVidas(sesion.pagina, null).catch(() => {});
    await sesion?.cerrar();
  });

  test("sin encenderlo no hay vidas en el cementerio", async () => {
    await ir(sesion.pagina, "/muertes");
    assert.equal(await sesion.pagina.locator("[data-vidas]").count(), 0);
  });

  test("la última baja deja sin vidas, saca del locke y borrarla lo devuelve", async () => {
    const { pagina, problemas } = sesion;
    // Con muchas, para saber cuántas bajas lleva Héctor
    await ponerVidas(pagina, 50);
    const [quedan] = (await vidasDe(pagina, "Héctor")).match(/\d+(?= \/)/) ?? [];
    const bajas = 50 - Number(quedan);
    // Una vida más que bajas: la siguiente baja es la última
    await ponerVidas(pagina, bajas + 1);
    assert.match(await vidasDe(pagina, "Héctor"), /1 \/ \d+/);

    const formulario = await registrarBaja(pagina, "Héctor", "Rattata");
    await formulario.getByText(/Sin vidas: se acabó el locke/).waitFor();
    assert.match(await vidasDe(pagina, "Héctor"), /Sin vidas/);
    await ir(pagina, "/competiciones?seccion=jugadores");
    await pagina.locator("li", { hasText: "Héctor" }).getByText("sin vidas").first().waitFor();

    // Era un error: se borra la baja y vuelve
    await ir(pagina, "/muertes?jugador=" + (await idDe(pagina, "Héctor")));
    await pagina.getByRole("button", { name: /Rattata/ }).first().click();
    const ficha = pagina.getByRole("dialog");
    await ficha.getByRole("button", { name: /Borrar/ }).first().click();
    await pagina.waitForTimeout(1500);
    assert.match(await vidasDe(pagina, "Héctor"), /1 \/ \d+/);
    sinProblemas(problemas, "locke con vidas");
  });

  test("con vida 0, a cero se sigue jugando", async () => {
    const { pagina, problemas } = sesion;
    await ponerVidas(pagina, 50);
    const bajas = async () => 50 - Number((await vidasDe(pagina, "Héctor")).match(/\d+(?= \/)/)?.[0]);
    // Hace falta al menos una baja: un locke no puede tener cero vidas
    if ((await bajas()) === 0) await registrarBaja(pagina, "Héctor", "Pidgey").then((f) => f.getByText(/F por/).waitFor());
    // Tantas vidas como bajas: está a cero, pero con vida 0 sigue
    await ponerVidas(pagina, await bajas(), true);
    assert.match(await vidasDe(pagina, "Héctor"), /En la vida 0/);
    sinProblemas(problemas, "vida 0");
  });
});

/** El id de un jugador, sacado del filtro del cementerio */
async function idDe(pagina, nombre) {
  await ir(pagina, "/muertes");
  const enlace = pagina.locator('a[href^="/muertes?jugador="]', { hasText: nombre }).first();
  return new URL(await enlace.getAttribute("href"), "http://x").searchParams.get("jugador");
}
