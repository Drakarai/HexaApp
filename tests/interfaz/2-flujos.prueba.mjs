/**
 * **Lo de todos los días**, de principio a fin y en orden, sobre el Hexalocke
 * 2 recién sembrado: entrar, apuntar una captura, abrir su ficha y llegar a
 * ella con el buscador, exportarla a Showdown, marcar un gimnasio, apuntar un
 * resultado a mano y otro leído de la repetición, ver los puntos y el
 * marcador, filtrar la actividad, y las reglas con y sin «Editar reglas».
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

  test("hacerlo as desde su ficha, con su porqué", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/equipo");
    await pagina.locator('[aria-label^="Cacahuete —"]').first().click();
    const ficha = pagina.getByRole("dialog");
    // En el ordenador, los botones rápidos van en la columna de la izquierda
    await ficha.getByRole("button", { name: /Hacerlo as/ }).first().click();
    await ficha.getByLabel(/va a ser tu as/).fill("Fue el primero de todos.");
    await ficha.locator("form").getByRole("button", { name: /Hacerlo as/ }).click();
    await ficha.getByRole("button", { name: /Es el as/ }).waitFor();
    // El porqué se guarda: al abrirlo para cambiarlo, ahí está
    await ficha.getByRole("button", { name: /Es el as/ }).click();
    assert.equal(await ficha.getByLabel("Por qué es tu as").inputValue(), "Fue el primero de todos.");
    await ficha.getByLabel("Por qué es tu as").fill("El primero, y el más pesado.");
    await ficha.locator("form", { has: pagina.getByLabel("Por qué es tu as") }).getByRole("button", { name: /Guardar/ }).click();
    await pagina.getByText("As guardado.").waitFor();
    await pagina.keyboard.press("Escape");
    sinProblemas(problemas, "el as desde la ficha");
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

  test("el combate jugado sale como un marcador", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/jornadas");
    // El de antes: el ganador marca la diferencia (2) y el perdedor, 0
    const marcador = pagina.getByTitle("Pokémon que le quedaban a cada uno").first();
    assert.match((await marcador.innerText()).replace(/\s+/g, ""), /^(2:0|0:2)$/);
    sinProblemas(problemas, "marcador de la jornada");
  });

  test("el resultado se lee de la repetición", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/jornadas");
    // Draka contra Rodri; la repetición de mentira es de «DrakaSD» y gana con cinco en pie
    const combate = pagina.locator("li", { hasText: "Draka" }).filter({ hasText: "Rodri" }).first();
    await combate.getByRole("button", { name: "Anotar resultado" }).click();
    await combate.getByLabel("Enlace del combate").fill("https://replay.pokemonshowdown.com/gen2ou-1");
    await combate.getByRole("button", { name: "Leer el resultado" }).click();
    await combate.getByText("«DrakaSD» es Draka").waitFor();
    assert.equal(
      (await combate.locator('select[name="winnerId"] option:checked').innerText()).trim(),
      "Draka",
    );
    assert.equal(await combate.locator('input[name="pokemonDiff"]').inputValue(), "5");
    // Se guarda con el botón de siempre, y el marcador lo enseña
    await combate.getByRole("button", { name: "Guardar resultado" }).click();
    await pagina
      .getByTitle("Pokémon que le quedaban a cada uno")
      .filter({ hasText: "5" })
      .first()
      .waitFor();
    sinProblemas(problemas, "resultado de la repetición");
  });

  test("las estadísticas del combate salen de su repetición", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/jornadas");
    const combate = pagina.locator("li", { hasText: "Draka" }).filter({ hasText: "Rodri" }).first();
    await combate.getByRole("button", { name: /Estadísticas del combate/ }).click();
    const tabla = pagina.getByRole("dialog").locator("[data-estadisticas-combate]");
    await tabla.waitFor();
    // En la repetición de mentira, Brasa tumba a dos: la columna de KOs es la primera
    const brasa = tabla.locator("tr", { hasText: "Brasa" });
    assert.equal((await brasa.locator("td").nth(1).innerText()).trim(), "2");
    assert.equal(await tabla.locator("h4", { hasText: "Rodri" }).count(), 1, "el otro lado es de Rodri");
    await pagina.keyboard.press("Escape");

    // Y en la pantalla de estadísticas, Brasa es El Verdugo
    await ir(pagina, "/estadisticas");
    const verdugo = pagina.locator("[data-galardones] .card", { hasText: "El Verdugo" });
    assert.match(await verdugo.innerText(), /Brasa[\s\S]*2 KOs/);
    // Las clasificaciones van de una en una, con pestañas
    const clasificaciones = pagina.locator("[data-clasificaciones]");
    await clasificaciones.getByRole("tab", { name: /Barrida/ }).click();
    assert.match(await clasificaciones.locator("li").first().innerText(), /Brasa[\s\S]*2 KOs/);
    sinProblemas(problemas, "estadísticas del combate");
  });

  test("la actividad se filtra por tipo", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/actividad");
    const filtros = pagina.getByRole("navigation", { name: "Filtrar por tipo" });
    await filtros.getByRole("link", { name: /Combates/ }).click();
    await pagina.waitForURL(/tipo=combate/);
    // Solo combates: el del test de antes está, el gimnasio marcado no
    await pagina.getByText(/gana a/).first().waitFor();
    assert.equal(await pagina.getByText(/ha superado/).count(), 0, "sin los gimnasios");
    await filtros.getByRole("link", { name: "Todo", exact: true }).click();
    await pagina.waitForURL((u) => !u.search.includes("tipo"));
    await pagina.getByText(/ha superado/).first().waitFor();
    sinProblemas(problemas, "filtros de la actividad");
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

  test("las reglas: cambiar el nombre de un título y añadirle un artículo", async () => {
    const { pagina, problemas } = sesion;
    await ir(pagina, "/reglas?editar=1");
    const primero = pagina.locator('section[aria-labelledby="titulo-I"]');
    await primero.getByRole("button", { name: "✎ Nombre" }).click();
    await primero.getByLabel("Nombre del título").fill("Lo básico del todo");
    await primero.getByRole("button", { name: "Guardar" }).click();
    await primero.locator("h2", { hasText: "Lo básico del todo" }).waitFor();

    // El artículo nuevo va dentro de ese título, detrás del último que tenía
    await primero.getByRole("button", { name: /Añadir un artículo a «Lo básico del todo»/ }).click();
    await primero.locator('input[name="title"]').last().fill("Artículo de la prueba");
    await primero.locator('textarea[name="body"]').last().fill("- Una línea cualquiera.");
    await primero.getByRole("button", { name: "Añadir", exact: true }).click();
    await primero.locator("article", { hasText: "Artículo de la prueba" }).waitFor();
    const nombres = await primero.locator("article h3").allInnerTexts();
    assert.match(nombres.at(-1) ?? "", /Artículo de la prueba/, "el último de su título");
    sinProblemas(problemas, "títulos de las reglas");
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
