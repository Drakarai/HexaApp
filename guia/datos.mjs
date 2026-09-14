/**
 * Prepara una partida de ejemplo para las fotos de la guía.
 *
 * Se hace **a través de la propia aplicación** y no metiendo filas en la base
 * de datos: así las capturas de pantalla salen con lo mismo que vería un
 * jugador de verdad —los sprites descargados, las cuentas hechas— y de paso
 * queda comprobado que los formularios de la guía siguen funcionando.
 *
 * Se ejecuta **una vez sobre una base recién sembrada**:
 *   npm run db:seed && npm run build && npm run start
 *   node guia/datos.mjs
 *
 * No es idempotente: pasarlo dos veces duplica capturas y bajas.
 */

import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const { chromium } = await cargarPlaywright();

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";

const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const p = await contexto.newPage();
// Los botones de borrar y de rellenar piden confirmación del navegador
p.on("dialog", (aviso) => aviso.accept());

await p.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await p.fill('input[name="username"]', "draka");
await p.fill('input[name="password"]', CLAVE);
await p.click('button[type="submit"]');
await p.waitForTimeout(1500);

// --- Los mapas: copiar las zonas que trae escritas de fábrica
for (const region of ["johto", "kanto"]) {
  await p.goto(`${BASE}/admin/mapas?region=${region}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(900);
  const traer = p.locator("button", { hasText: "que traigo escritos" }).first();
  if (await traer.count()) {
    await traer.click();
    await p.waitForTimeout(3000);
  }
  console.log("mapa de", region);
}

// --- Capturas
async function apuntarCaptura(zona, especie, mote, fallado = false) {
  await p.goto(BASE + "/mapa", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(800);
  await p.locator('input[placeholder*="Buscar una ruta"]').fill(zona);
  await p.waitForTimeout(500);
  await p.locator("button", { hasText: zona }).first().click();
  await p.waitForTimeout(900);
  await p.locator('input[name="species"]').fill(especie);
  await p.waitForTimeout(1200);
  const sugerencia = p
    .locator("div.fixed button", { hasText: new RegExp("^" + especie, "i") })
    .first();
  if (await sugerencia.count()) await sugerencia.click();
  await p.waitForTimeout(400);
  if (mote) await p.locator('input[name="nickname"]').fill(mote);
  if (fallado) await p.locator('input[name="failed"]').check();
  await p.locator("div.fixed button", { hasText: /^Apuntar$/ }).first().click();
  await p.waitForTimeout(2600);
  console.log("captura:", zona, especie);
}

await apuntarCaptura("Ruta 29", "Sentret", "Cacahuete");
await apuntarCaptura("Ruta 30", "Caterpie", "Fideo");
await apuntarCaptura("Ruta 31", "Bellsprout", "Ensalada");
await apuntarCaptura("Bosque Encinar", "Pidgey", "Plumas");
await apuntarCaptura("Ruta 32", "Zubat", "", true);
await apuntarCaptura("Ruta 33", "Geodude", "Canto");

// --- Bajas
async function apuntarBaja(especie, mote, causa, zona) {
  await p.goto(BASE + "/muertes?apuntar=1", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  await p.locator('input[name="species"]').fill(especie);
  await p.waitForTimeout(1200);
  const sugerencia = p.locator("button", { hasText: new RegExp("^" + especie, "i") }).first();
  if (await sugerencia.count()) await sugerencia.click();
  await p.waitForTimeout(400);
  await p.locator('input[name="nickname"]').fill(mote);
  await p.locator('input[name="cause"]').fill(causa);
  const sitios = p.locator('select[name="zoneId"]');
  const opciones = await sitios.locator("option").allTextContents();
  const cual = opciones.find((texto) => texto.includes(zona));
  if (cual) await sitios.selectOption({ label: cual });
  await p.locator('button:has-text("Registrar baja")').click();
  await p.waitForTimeout(2600);
  console.log("baja:", mote);
}

await apuntarBaja("Caterpie", "Fideo", "Crítico de Rattata", "Ruta 31");
await apuntarBaja("Zubat", "Colmillo", "Confusión", "Ruta 32");

// --- Dos gimnasios superados, para que la pantalla no salga en blanco
await p.goto(BASE + "/level-caps", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
for (const indice of [0, 1]) {
  await p.locator("button", { hasText: /^Draka/ }).nth(indice).click();
  await p.waitForTimeout(2000);
}
console.log("gimnasios marcados");

// --- Una nota
await p.goto(BASE + "/notas", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1000);
await p.locator("summary", { hasText: "Nueva nota" }).first().click();
await p.waitForTimeout(500);
await p.locator('input[name="title"]').fill("Preparar el gimnasio de Pegaso");
await p
  .locator('textarea[name="body"]')
  .fill(
    "Bicho: llevar a Cacahuete y subirlo a 12 antes de entrar. Ojo con el Scyther, que va con Persecución.",
  );
await p.locator('button:has-text("Guardar nota")').click();
await p.waitForTimeout(2500);
console.log("nota");

// --- Un reto con su premio y su castigo
await p.goto(BASE + "/retos", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1000);
await p.locator("summary", { hasText: "Crear reto" }).first().click();
await p.waitForTimeout(500);
await p.locator('select[name="participantAId"]').selectOption({ label: "Draka" });
await p.locator('select[name="participantBId"]').selectOption({ label: "Pablo" });
await p.locator('input[name="prize"]').fill("Elige el mote del próximo bicho del otro");
await p.locator('input[name="punishment"]').fill("Foto de perfil de Bidoof una semana");
await p.locator('button:has-text("Crear reto")').last().click();
await p.waitForTimeout(2500);
console.log("reto");

// --- Objetos en el catálogo y en las bolsas
for (const objeto of ["Revivir", "Ultra Ball"]) {
  await p.goto(BASE + "/bolsa/todas", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1000);
  await p.locator('input[placeholder="Ultra Ball"]').fill(objeto);
  await p.waitForTimeout(1200);
  const sugerencia = p.locator("button", { hasText: new RegExp("^" + objeto) }).first();
  if (await sugerencia.count()) await sugerencia.click();
  await p.waitForTimeout(500);
  await p.locator('button:has-text("Añadir al catálogo")').click();
  await p.waitForTimeout(2500);
  console.log("objeto:", objeto);
}
await p.goto(BASE + "/bolsa/todas", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
const bolsas = p.locator('select[name="itemId"]');
for (let fila = 0; fila < Math.min(3, await bolsas.count()); fila++) {
  await bolsas.nth(fila).selectOption({ index: 1 });
  await p.locator('button:has-text("Dárselo")').nth(fila).click();
  await p.waitForTimeout(2000);
}
console.log("bolsas repartidas");

// --- La primera jornada, jugada entera
const resultados = [
  { ganador: 1, diferencia: 2 },
  { ganador: 1, diferencia: 1 },
  { ganador: 2, diferencia: 3 },
];
for (const resultado of resultados) {
  await p.goto(BASE + "/jornadas", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1400);
  const anotar = p.locator("button", { hasText: "Anotar resultado" }).first();
  if (!(await anotar.count())) break;
  await anotar.click();
  await p.waitForTimeout(800);
  await p.locator('select[name="winnerId"]').first().selectOption({ index: resultado.ganador });
  await p.locator('input[name="pokemonDiff"]').first().fill(String(resultado.diferencia));
  await p.locator('button:has-text("Guardar resultado")').first().click();
  await p.waitForTimeout(2500);
  console.log("resultado anotado");
}

// --- Y los equipos de uno de esos combates, que es lo que abre la votación de MVP
await p.goto(BASE + "/jornadas", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
await p.locator("button", { hasText: "Apuntar equipos" }).first().click();
await p.waitForTimeout(1200);
const equipos = [
  ["Álex", "Quilava", "Brasas"],
  ["Álex", "Noctowl", "Buho"],
  ["Álex", "Gyarados", "Rojete"],
  ["Pablo", "Feraligatr", "Muelas"],
  ["Pablo", "Ampharos", "Farola"],
  ["Pablo", "Onix", "Roca"],
];
for (const [entrenador, especie, mote] of equipos) {
  const cuadro = p.locator("div.fixed");
  await cuadro.locator('input[placeholder="Quilava"]').fill(especie);
  await p.waitForTimeout(1300);
  const sugerencia = cuadro.locator("button", { hasText: new RegExp("^" + especie, "i") }).first();
  if (await sugerencia.count()) await sugerencia.click();
  await p.waitForTimeout(500);
  await cuadro.locator("select").last().selectOption({ label: entrenador });
  await cuadro.locator('input[placeholder="Chispas"]').fill(mote);
  await cuadro.locator('button:has-text("Añadir al equipo")').click();
  await p.waitForTimeout(2600);
  console.log("equipo:", entrenador, especie);
}

// --- Un sorteo de préstamos con su bote, para la página que lo explica
await p.goto(BASE + "/sorteo", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1400);
await p.locator("summary", { hasText: "Nuevo sorteo" }).click();
await p.waitForTimeout(400);
await p.fill('input[name="label"]', "Jornada 4 · préstamos");
await p.locator('button[type="submit"]', { hasText: "Crear" }).click();
await p.waitForTimeout(2000);

for (const especie of ["Lapras", "Arcanine", "Snorlax", "Gengar", "Ampharos", "Scizor"]) {
  const caja = p.locator("details", {
    has: p.locator("summary", { hasText: "Echar un pokémon al bote" }),
  }).first();
  if (!(await caja.evaluate((d) => d.open))) {
    await caja.locator("summary").click();
    await p.waitForTimeout(300);
  }
  const campo = caja.locator('input[name="species"]');
  await campo.fill(especie);
  await p.waitForTimeout(900);
  await campo.press("Enter");
  await p.waitForTimeout(300);
  await caja.locator("button", { hasText: "Al bote" }).click();
  await p.waitForTimeout(2400);
  console.log("al bote:", especie);
}

// Se reparte para que la foto enseñe el reparto y no un bote a medias
await p.locator("button", { hasText: "Repartir" }).first().click();
await p.waitForTimeout(2500);
console.log("sorteo repartido");

await navegador.close();
console.log("\nPartida de ejemplo lista. Ahora: node guia/capturas.mjs");
