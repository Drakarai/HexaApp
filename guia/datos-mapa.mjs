/**
 * Un mapa de verdad para las fotos del mapa en las guías: **Isla Melemele**,
 * con el dibujo y las zonas tal y como las colocó a mano el usuario en su
 * aplicación (`mapa-melemele.webp` y `mapa-melemele.json`; solo el mapa, ni
 * una captura ni nada de nadie). Lo pidió él: las zonas de fábrica de Johto
 * son un esquema sin dibujo y no enseñan cómo queda un mapa hecho.
 *
 * - La región entra **directamente en la base**, porque el editor no tiene
 *   «importar». Por eso pide `DATABASE_URL` en el entorno, la de la base de la
 *   guía, y no se fía de la de `.env`: ahí está la de trabajo.
 * - Lo demás va por la aplicación, como en `datos.mjs`: un locke de Ultrasol
 *   y Ultraluna de Draka (el «Hexalocke Alola») con unas capturas en la isla,
 *   un fallo y una baja, para que el mapa enseñe todos sus estados.
 *
 * Lo llama `datos.mjs` al final. También se puede lanzar suelto sobre una base
 * ya preparada (`node guia/datos-mapa.mjs`). Como el resto, **no se puede pasar
 * dos veces**.
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";
export const ALOLA = "Hexalocke Alola";
const aqui = dirname(fileURLToPath(import.meta.url));

/** La isla con su dibujo y sus zonas, padres antes que hijas */
async function meterLaIsla() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL en el entorno: la de la base de la guía, no la de trabajo.");
  }
  const { PrismaClient } = (await import("@prisma/client")).default;
  const prisma = new PrismaClient();
  try {
    const mapa = JSON.parse(readFileSync(join(aqui, "mapa-melemele.json"), "utf8"));
    const imagen =
      "data:image/webp;base64," + readFileSync(join(aqui, "mapa-melemele.webp")).toString("base64");
    // Como el almacén de la aplicación (`lib/almacen-de-imagenes.ts`): la
    // fila apunta a la imagen por su contenido
    const clave = `h-${createHash("md5").update(imagen).digest("hex")}`;
    await prisma.imagen.upsert({
      where: { clave },
      update: {},
      create: { clave, datos: imagen, bytes: imagen.length },
    });

    const datos = { name: mapa.name, image: `ref:${clave}`, width: mapa.width, height: mapa.height, relleno: mapa.relleno };
    const region = await prisma.mapRegion.upsert({
      where: { slug: mapa.slug },
      update: datos,
      create: { slug: mapa.slug, ...datos },
    });
    // Si ya tenía zonas con algo apuntado, no se pisan: no es una base nueva
    const usadas = await prisma.capture.count({ where: { zone: { regionId: region.id } } });
    if (usadas) throw new Error(`${mapa.name} ya tiene capturas: esto es para una base de la guía recién hecha.`);
    await prisma.mapZone.deleteMany({ where: { regionId: region.id } });

    const ids = [];
    for (const { padre, ...zona } of mapa.zonas) {
      const creada = await prisma.mapZone.create({
        data: { ...zona, regionId: region.id, parentId: padre === undefined ? null : ids[padre] },
      });
      ids.push(creada.id);
    }
    console.log(`mapa: ${mapa.name}, ${ids.length} zonas`);
  } finally {
    await prisma.$disconnect();
  }
}

async function apuntarCaptura(p, zona, especie, mote, fallado = false) {
  await p.goto(BASE + "/mapa?region=melemele", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(800);
  await p.locator('input[placeholder*="Buscar una ruta"]').fill(zona);
  await p.waitForTimeout(500);
  await p.locator("button", { hasText: zona }).first().click();
  await p.waitForTimeout(900);
  await p.locator('input[name="species"]').fill(especie);
  await p.waitForTimeout(1200);
  const sugerencia = p.locator("div.fixed button", { hasText: new RegExp("^" + especie, "i") }).first();
  if (await sugerencia.count()) await sugerencia.click();
  await p.waitForTimeout(400);
  if (mote) await p.locator('input[name="nickname"]').fill(mote);
  if (fallado) await p.locator('input[name="failed"]').check();
  await p.locator("div.fixed button", { hasText: /^Apuntar$/ }).first().click();
  await p.waitForTimeout(2600);
  console.log("captura:", zona, especie);
}

/** Con la sesión del Creador (Draka) ya abierta en `p`. */
export async function montarMapa(p) {
  await meterLaIsla();

  // --- El locke, solo de Draka y sin archivar nada (en la pestaña Nueva)
  await p.goto(BASE + "/competiciones?seccion=nueva", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  const alta = p.locator("details", {
    has: p.locator("summary", { hasText: "Crear una competición nueva" }),
  });
  await alta.locator("summary").click();
  const f = alta.locator("form");
  await f.locator('input[name="name"]').fill(ALOLA);
  await f.locator('select[name="gameId"]').selectOption("ultrasol-ultraluna");
  await f.locator('input[name="maxPlayers"]').fill("2");
  await f.locator('textarea[name="description"]').fill("Isla a isla por Alola.");
  for (const casilla of await f.locator('input[name="archivar"]').all()) {
    if (await casilla.isChecked()) await casilla.uncheck();
  }
  await f.getByRole("button", { name: "Crear competición" }).click();
  await p.waitForTimeout(3000);
  const { aLocke } = await import("./datos-soullink.mjs");
  await aLocke(p, ALOLA);
  await p.goto(BASE + "/competiciones", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1000);
  await p.locator('input[placeholder="@usuario exacto"]').fill("draka");
  await p.getByRole("button", { name: "Añadir jugador" }).click();
  await p.waitForTimeout(2000);
  console.log("locke:", ALOLA);

  // --- Lo apuntado: zonas sueltas y zonas dentro de otras, un fallo y una baja
  await apuntarCaptura(p, "Ruta 1", "Pikipek", "Pico");
  await apuntarCaptura(p, "Colina Dequilate", "Rockruff", "Tofu");
  await apuntarCaptura(p, "Jardines de Melemele", "Oricorio", "Pompón");
  await apuntarCaptura(p, "Cueva Sotobosque", "Zubat", "");
  await apuntarCaptura(p, "Bahía Kalae", "Wingull", "Gaviota");
  await apuntarCaptura(p, "Mar de Melemele", "Tentacool", "", true);

  await p.goto(BASE + "/muertes?apuntar=1", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  await p.locator('input[name="species"]').fill("Pikipek");
  await p.waitForTimeout(1200);
  const sugerencia = p.locator("button", { hasText: /^Pikipek/i }).first();
  if (await sugerencia.count()) await sugerencia.click();
  await p.waitForTimeout(400);
  await p.locator('input[name="nickname"]').fill("Pico");
  await p.locator('input[name="cause"]').fill("Placaje crítico de un Yungoos");
  const sitios = p.locator('select[name="zoneId"]');
  const cual = (await sitios.locator("option").allTextContents()).find((t) => t.includes("Ruta 1"));
  if (cual) await sitios.selectOption({ label: cual });
  await p.locator('button:has-text("Registrar baja")').click();
  await p.waitForTimeout(2600);
  console.log("baja: Pico");

  // Que Draka vuelva a mirar el Hexalocke 2, que es el de casi todas las fotos
  await aLocke(p, "Hexalocke 2");
}

// Suelto: entra como Draka y lo monta
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await cargarPlaywright();
  const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
  const p = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  p.on("dialog", (aviso) => aviso.accept().catch(() => {})); // Si ya lo aceptó otro, nada
  await p.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await p.fill('input[name="username"]', "draka");
  await p.fill('input[name="password"]', CLAVE);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1500);
  await montarMapa(p);
  await navegador.close();
}
