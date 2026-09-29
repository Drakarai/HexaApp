/**
 * El Equipo y PC y un Soul Link, para sus fotos en las guías.
 *
 * - En el Hexalocke 2, Draka mete en su equipo lo que tenía capturado (las
 *   capturas de antes nacen todas en la caja).
 * - Monta el **Soul Link de Johto** entre Draka y Héctor, con capturas en las
 *   mismas rutas —se vinculan solas—, una que va suelta, dos evoluciones y una
 *   baja que se lleva a su pareja.
 *
 * Lo llama `datos.mjs` al final. También se puede lanzar suelto sobre una base
 * ya preparada (`node guia/datos-soullink.mjs`). Como el resto, **no se puede
 * pasar dos veces**. Ojo: el Soul Link queda como el locke más nuevo, así que
 * `capturas.mjs` elige a mano en qué locke saca cada foto.
 */

import { fileURLToPath } from "node:url";
import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";
export const SOUL_LINK = "Soul Link de Johto";

/** Cambia el locke que se mira, como el selector de arriba */
export async function aLocke(p, nombre) {
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const id = await p.evaluate(
    (n) =>
      [...document.querySelectorAll("select option")].find((o) => o.textContent.trim().startsWith(n))
        ?.value,
    nombre,
  );
  if (!id) throw new Error("No encuentro el locke " + nombre);
  await p.context().addCookies([{ name: "hexaapp_competition", value: id, url: BASE }]);
}

/** Abre la ficha de un pokémon del tablero de alguien y pulsa un botón */
async function enLaFicha(p, dueno, pokemon, boton) {
  const tablero = p.locator("section.card", { has: p.locator("h2", { hasText: dueno }) }).first();
  await tablero.locator(`button[title*="${pokemon}"]`).first().click();
  await p.waitForTimeout(500);
  await p.locator("div.fixed").getByRole("button", { name: boton }).first().click();
  await p.waitForTimeout(3000);
  if (await p.locator("div.fixed h3").count()) await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
}

async function capturar(p, { para, especie, mote = "", ruta }) {
  await p.goto(BASE + "/equipo?apuntar=1", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(900);
  const para_ = p.locator('select[name="participantId"]');
  if (await para_.count()) await para_.selectOption({ label: para });
  await p.fill('input[name="species"]', especie);
  await p.waitForTimeout(300);
  if (mote) await p.fill('input[name="nickname"]', mote);
  const zona = await p
    .locator('select[name="zoneId"]')
    .evaluate((s, r) => [...s.options].find((o) => o.textContent.trim() === r)?.value, ruta);
  await p.locator('select[name="zoneId"]').selectOption(zona);
  await p.getByRole("button", { name: "Apuntar", exact: true }).click();
  await p.waitForTimeout(3000);
  console.log("captura:", para, especie, ruta);
}

/** Con la sesión del Creador (Draka) ya abierta en `p`. */
export async function montarSoulLink(p) {
  p.on("dialog", (aviso) => aviso.accept());

  // --- El equipo de Draka en el Hexalocke 2
  await aLocke(p, "Hexalocke 2");
  for (const especie of ["Sentret", "Geodude", "Bellsprout"]) {
    await p.goto(BASE + "/equipo", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1000);
    await enLaFicha(p, "Draka", especie, /Al equipo/);
    console.log("al equipo:", especie);
  }

  // --- El Soul Link, de dos y sin archivar nada
  await p.goto(BASE + "/competiciones", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  const alta = p.locator("details", {
    has: p.locator("summary", { hasText: "Crear una competición nueva" }),
  });
  await alta.locator("summary").click();
  const f = alta.locator("form");
  await f.locator('input[name="name"]').fill(SOUL_LINK);
  await f.getByRole("button", { name: "Soul Link" }).click();
  await f.locator('select[name="gameId"]').selectOption("heartgold-soulsilver");
  await f.locator('textarea[name="description"]').fill("Draka y Héctor, vinculados ruta a ruta.");
  for (const casilla of await f.locator('input[name="archivar"]').all()) {
    if (await casilla.isChecked()) await casilla.uncheck();
  }
  await f.getByRole("button", { name: "Crear competición" }).click();
  await p.waitForTimeout(3000);
  await aLocke(p, SOUL_LINK);
  for (const usuario of ["draka", "hector"]) {
    await p.goto(BASE + "/competiciones", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1000);
    await p.locator('input[placeholder="@usuario exacto"]').fill(usuario);
    await p.getByRole("button", { name: "Añadir jugador" }).click();
    await p.waitForTimeout(2000);
    console.log("al Soul Link:", usuario);
  }

  // --- Las capturas: las de la misma ruta se vinculan solas
  const capturas = [
    { para: "Draka", especie: "Cyndaquil", mote: "Brasa", ruta: "Ruta 29" },
    { para: "Héctor", especie: "Totodile", mote: "Olas", ruta: "Ruta 29" },
    { para: "Draka", especie: "Pidgey", ruta: "Ruta 30" },
    { para: "Héctor", especie: "Rattata", ruta: "Ruta 30" },
    { para: "Draka", especie: "Caterpie", ruta: "Ruta 31" },
    { para: "Héctor", especie: "Weedle", ruta: "Ruta 31" },
    { para: "Draka", especie: "Wooper", ruta: "Ruta 32" },
    { para: "Héctor", especie: "Mareep", mote: "Lana", ruta: "Ruta 32" },
    // Esta va suelta: Héctor todavía no ha capturado en la 33
    { para: "Draka", especie: "Hoppip", ruta: "Ruta 33" },
  ];
  for (const captura of capturas) await capturar(p, captura);

  // --- Evoluciones, una caja con algo y una baja con su pareja
  await p.goto(BASE + "/equipo", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  await enLaFicha(p, "Draka", "Brasa", /Quilava/);
  await enLaFicha(p, "Héctor", "Olas", /Croconaw/);
  await enLaFicha(p, "Héctor", "Weedle", /A la caja/);
  const draka = p.locator("section.card", { has: p.locator("h2", { hasText: "Draka" }) }).first();
  await draka.locator('button[title*="Pidgey"]').click();
  await p.waitForTimeout(500);
  await p.fill("#causa-ficha", "Crítico de un Bellsprout");
  await p.locator("div.fixed").getByRole("button", { name: /Dar por muerto/ }).click();
  await p.waitForTimeout(4000);
  console.log("Soul Link montado");

  // Que Draka vuelva a mirar el Hexalocke 2, que es el de casi todas las fotos
  await aLocke(p, "Hexalocke 2");
}

// Suelto: entra como Draka y lo monta
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await cargarPlaywright();
  const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
  const p = await (
    await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  ).newPage();
  await p.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await p.fill('input[name="username"]', "draka");
  await p.fill('input[name="password"]', CLAVE);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1500);
  await montarSoulLink(p);
  await navegador.close();
}
