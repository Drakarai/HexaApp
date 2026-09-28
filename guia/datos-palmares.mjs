/**
 * Dos lockes de antes para la foto del palmarés: uno de seis con alguien **sin
 * cuenta** y un dualocke. Con los dos, el palmarés enseña sus pestañas (Grupo,
 * Dualocke) y la línea de un locke apuntado a mano con su ganador.
 *
 * Lo llama `datos.mjs` al final. También se puede lanzar suelto sobre una base
 * ya preparada (`node guia/datos-palmares.mjs`), que es como se hizo la primera
 * vez: se restauró la copia de `datos.mjs` y se le pasó solo esto. Como el
 * resto, **no se puede pasar dos veces**: los apuntaría repetidos.
 */

import { fileURLToPath } from "node:url";
import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";

async function apuntar(p, { nombre, juego, cuando, cuentas, sinCuenta = "", ganador, subcampeon }) {
  await p.goto(BASE + "/palmares", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  await p.locator("summary", { hasText: "Apuntar un locke de antes" }).click();
  await p.waitForTimeout(500);
  const f = p.locator("form", { has: p.locator('input[name="sinCuenta"]') }).first();
  await f.locator('input[name="nombre"]').fill(nombre);
  await f.locator('input[name="juego"]').fill(juego);
  await f.locator('input[name="cuando"]').fill(cuando);
  // Vienen marcados los del locke de ahora: se deja solo a los que jugaron
  for (const casilla of await f.locator('input[name="jugadoresIds"]').all()) {
    if (await casilla.isChecked()) await casilla.uncheck();
  }
  for (const usuario of cuentas) {
    await f.locator(`label:has-text("@${usuario}") input[name="jugadoresIds"]`).check();
  }
  if (sinCuenta) await f.locator('input[name="sinCuenta"]').fill(sinCuenta);
  await f.locator('select[name="ganador"]').selectOption({ label: ganador });
  if (subcampeon) await f.locator('select[name="subcampeon"]').selectOption({ label: subcampeon });
  await f.locator("button", { hasText: "Apuntar en el palmarés" }).click();
  await p.waitForTimeout(2200);
  console.log("locke de antes:", nombre);
}

/** Con la sesión de un administrador ya abierta en `p`. */
export async function apuntarLockesDeAntes(p) {
  await apuntar(p, {
    nombre: "Hexalocke 1",
    juego: "Platino",
    cuando: "2025-02-10",
    cuentas: ["draka", "pablo", "hector", "rodri", "enzo"],
    sinCuenta: "Marcos",
    ganador: "Pablo",
    subcampeon: "Draka",
  });
  await apuntar(p, {
    nombre: "Duelo de verano",
    juego: "Esmeralda",
    cuando: "2025-08-01",
    cuentas: ["draka", "hector"],
    ganador: "Draka",
    subcampeon: "Héctor",
  });
}

// Suelto: entra como Draka y apunta los dos
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
  await apuntarLockesDeAntes(p);
  await navegador.close();
}
