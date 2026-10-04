/**
 * Lo que enseñan las páginas del Equipo y PC y de planificar equipo: una caja
 * con nombre, la ficha completa de un pokémon (pegada de Showdown, que es como
 * se suele hacer) y el equipo de ahora metido en el planificador.
 *
 * Lo llama `datos.mjs` al final, después del Soul Link (necesita el equipo de
 * Draka en el Hexalocke 2). También se puede lanzar suelto sobre una base ya
 * preparada (`node guia/datos-equipo.mjs`). Pasarlo dos veces no duplica nada,
 * pero tampoco hace falta.
 */

import { fileURLToPath } from "node:url";
import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";
import { aLocke } from "./datos-soullink.mjs";

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";

/** El set de Sentret, como sale del «Export» de Showdown */
const SET = `Sentret @ Leftovers
Ability: Keen Eye
Jolly Nature
- Quick Attack
- Dig
- Slam
- Defense Curl`;

/** Con la sesión de Draka ya abierta en `p`. */
export async function montarEquipo(p) {
  await aLocke(p, "Hexalocke 2");

  // --- La primera caja, con nombre
  await p.goto(BASE + "/equipo", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  await p.locator('button[title="Ponerle nombre a esta caja"]').first().click();
  await p.locator('input[aria-label="Nombre de la caja 1"]').fill("Reservas");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  console.log("caja: Reservas");

  // --- La ficha completa de Sentret, pegando su set
  await p.goto(BASE + "/equipo", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  await p.locator('button[title*="Sentret"]').first().click();
  const ficha = p.getByRole("dialog");
  await ficha.getByRole("button", { name: /^(Apuntar|Editar)$/ }).click();
  await ficha.locator("select").first().waitFor();
  await ficha.getByText("Pegar de Showdown").click();
  await ficha.locator("textarea").fill(SET);
  await ficha.getByRole("button", { name: "Leer" }).click();
  await p.waitForTimeout(1500);
  await ficha.getByRole("button", { name: "Guardar" }).first().click();
  await p.waitForTimeout(2500);
  await p.keyboard.press("Escape");
  console.log("ficha: Sentret");

  // --- El equipo de ahora, en el planificador de Mis notas
  await p.goto(BASE + "/notas?planificar=1#cobertura", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  await p.locator("#cobertura").getByRole("button", { name: "Mi equipo de ahora" }).click();
  // Se guarda solo al rato de dejar de tocar
  await p.waitForTimeout(2500);
  console.log("planificador: el equipo de ahora");
}

// Suelto: entra como Draka y lo monta
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await cargarPlaywright();
  const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
  const p = await (
    await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  ).newPage();
  p.on("dialog", (aviso) => aviso.accept());
  await p.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await p.fill('input[name="username"]', "draka");
  await p.fill('input[name="password"]', CLAVE);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1500);
  await montarEquipo(p);
  await navegador.close();
}
