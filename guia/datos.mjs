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

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";
import { apuntarLockesDeAntes } from "./datos-palmares.mjs";
import { montarSoulLink } from "./datos-soullink.mjs";
import { montarEquipo } from "./datos-equipo.mjs";

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
p.on("dialog", (aviso) => aviso.accept().catch(() => {})); // Si ya lo aceptó otro, nada

await p.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await p.fill('input[name="username"]', "draka");
await p.fill('input[name="password"]', CLAVE);
await p.click('button[type="submit"]');
await p.waitForTimeout(1500);

/**
 * --- El juego de la edición
 *
 * Va lo primero y **no sobra**: sin juego elegido no hay región, y sin región
 * la pantalla del mapa dice "esta edición no tiene juego elegido" en vez de
 * enseñar las rutas. Todo lo de abajo —las capturas, las bajas con su zona— se
 * cae detrás.
 */
// En su pestaña de Ajustes, donde el formulario ya viene desplegado
await p.goto(BASE + "/competiciones?seccion=ajustes", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(900);
{
  // Hay más de un formulario con selector de juego en la aplicación (el de
  // crear una edición nueva, por ejemplo): se trabaja dentro del de editar
  const bloque = p.locator("details", { hasText: "Editar datos" }).first();
  if (await bloque.count()) {
    // Ya viene abierto: un toque en el título lo cerraría
    if ((await bloque.getAttribute("open")) === null) await bloque.locator("summary").first().click();
    await p.waitForTimeout(500);
    await bloque.locator('select[name="gameId"]').first().selectOption("heartgold-soulsilver");
    await p.waitForTimeout(400);
    // Y el logo, para que la portada salga con su emblema de fondo. Se pasa a
    // PNG aquí porque el navegador no sabe reducir un SVG a imagen
    const sharp = (await import("sharp")).default;
    const aqui = dirname(fileURLToPath(import.meta.url));
    await bloque.locator('input[type="file"]').first().setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: await sharp(join(aqui, "logo-ejemplo.svg")).resize(640).png().toBuffer(),
    });
    await p.waitForTimeout(1500);
    await bloque.locator("button[type=submit]").first().click();
    await p.waitForTimeout(2400);
    console.log("juego: HeartGold, y el logo");
  }
}

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

// --- Los tres primeros gimnasios, pasados por todos. En este orden para que
// las coronas del primero en pasar se repartan: Draka, Pablo y Héctor. Se busca por
// el nombre sin anclar, porque al que ya lleva corona el botón le empieza por
// ella
await p.goto(BASE + "/level-caps", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
const ORDEN_EN_CADA_GIMNASIO = [
  ["Draka", "Pablo", "Héctor", "Álex", "Enzo", "Rodri"],
  ["Pablo", "Draka", "Héctor", "Álex", "Enzo", "Rodri"],
  ["Héctor", "Draka", "Pablo", "Álex", "Enzo", "Rodri"],
];
for (const [gimnasio, orden] of ORDEN_EN_CADA_GIMNASIO.entries()) {
  for (const quien of orden) {
    // Solo los chips de marcar, que llevan el punto de color: los de "+ vídeo"
    // de cada gimnasio también son chips con el nombre y abrían su ventana
    await p
      .locator("button.chip:has(span.rounded-full)", { hasText: quien })
      .nth(gimnasio)
      .click();
    await p.waitForTimeout(1500);
  }
}
console.log("gimnasios marcados");

// --- Checkpoints de jornada tras esos tres gimnasios: la 1ª y la 2ª jornada
// quedan jugadas más abajo, así que la que toca es la 3ª, que es lo que la
// portada enseña con el rival de cada uno. Siempre el primer botón sin poner,
// que después de cada clic es el del gimnasio siguiente
for (let vez = 0; vez < 3; vez++) {
  await p.locator('button[aria-label="Poner jornada después de este hito"]').first().click();
  await p.waitForTimeout(1800);
}
console.log("checkpoints de jornada");

// --- Una regla cambiada con el locke ya en marcha, que es lo que avisa a
// todos. La casilla de avisar viene marcada, así que basta con guardar
await p.goto(BASE + "/reglas", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
{
  const regla = p.locator("article", { hasText: "Añadidos a las reglas generales" }).first();
  await regla.locator("button", { hasText: "Editar" }).click();
  await p.waitForTimeout(500);
  const cuerpo = regla.locator('textarea[name="body"]');
  const antes = await cuerpo.inputValue();
  await cuerpo.fill(
    antes.replace(
      /^- Cada combate de gimnasio .*$/m,
      "- Cada combate de gimnasio **se graba** y el enlace se pega debajo de su gimnasio, en Level caps.\n- Quien no suba el vídeo en dos días **repite el gimnasio**.",
    ),
  );
  await regla.locator("button", { hasText: "Guardar" }).click();
  await p.waitForTimeout(2200);
  console.log("regla cambiada");
}

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

// --- Dos casillas con premio en la ruleta de las recompensas
// Van después de crear los objetos a propósito: el desplegable de la casilla
// se llena del catálogo, y antes de esto el catálogo está vacío.
await p.goto(BASE + "/ruleta", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.locator('a:has-text("Recompensas del líder")').first().click();
await p.waitForTimeout(1500);

await p.locator('button:has-text("🎒 Objeto")').click();
await p.waitForTimeout(400);
await p.locator('select[name="itemId"]').selectOption({ label: "Ultra Ball" });
await p.locator('input[name="cantidad"]').fill("2");
// Colores propios: por defecto las dos salen del mismo azul y en la rueda se
// leen como un solo trozo, que es justo lo que la foto tiene que enseñar
await p.locator('input[name="color"]').fill("#8b5cf6");
await p.locator('form:has(select[name="itemId"]) button[type="submit"]').click();
await p.waitForTimeout(2000);
console.log("casilla con objeto");

await p.locator('button:has-text("🎟️ Tickets")').click();
await p.waitForTimeout(400);
await p
  .locator('select[name="ticketsDeId"]')
  .selectOption({ label: "Castigos de la jornada" });
await p.locator('input[name="cantidad"]').fill("2");
await p.locator('input[name="color"]').fill("#ec4899");
await p
  .locator('form:has(select[name="ticketsDeId"]) button[type="submit"]')
  .click();
await p.waitForTimeout(2000);
console.log("casilla con tickets");

// --- Las dos primeras jornadas, jugadas enteras. Dos y no una: las flechas de
// la clasificación comparan con la jornada anterior, y con una sola no hay
// con qué. La segunda le da la vuelta a la primera para que se muevan
const resultados = [
  { ganador: 1, diferencia: 2 },
  { ganador: 1, diferencia: 1 },
  { ganador: 2, diferencia: 3 },
  { ganador: 2, diferencia: 2 },
  { ganador: 2, diferencia: 1 },
  { ganador: 2, diferencia: 4 },
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
// La jornada acaba de terminarse, así que está plegada y hay que abrirla: los
// botones de dentro existen pero no se ven, y el clic se quedaba esperando
// De una en una y volviendo a buscar: al abrir una, la lista de plegadas
// cambia, y recorrerla entera de golpe se quedaba esperando a la que ya no está
const plegadas = p.locator("section.card details:not([open]) summary");
while (await plegadas.count()) {
  await plegadas.first().click();
  await p.waitForTimeout(400);
}
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

// --- Una cuenta sin ningún locke, para la foto de la bienvenida
await p.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.locator("summary", { hasText: "Crear usuario" }).first().click();
await p.waitForTimeout(400);
await p.fill('input[name="username"]', "lara");
await p.fill('input[name="displayName"]', "Lara");
await p.fill('input[name="password"]', CLAVE);
await p.locator("button", { hasText: "Crear usuario" }).click();
await p.waitForTimeout(2000);
console.log("cuenta sin locke: lara");

// --- Lockes de antes, para las pestañas y la línea a mano del palmarés
await apuntarLockesDeAntes(p);

// --- El equipo de Draka en Equipo y PC y un Soul Link con Héctor
await montarSoulLink(p);
await montarEquipo(p);

await navegador.close();
console.log("\nPartida de ejemplo lista. Ahora: node guia/capturas.mjs");
