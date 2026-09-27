/**
 * Las fotos de la guía, sacadas de la aplicación en marcha.
 *
 * Van a tamaño de móvil (390×844, al doble de resolución) porque la guía está
 * escrita para el móvil, que es donde se usa la aplicación. Las tres últimas
 * son del editor de mapas y de las plantillas, que se manejan desde un
 * ordenador y no cabrían en una pantalla de teléfono.
 *
 *   node guia/capturas.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const { chromium } = await cargarPlaywright();

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";
/**
 * Suficiente para que el texto de las capturas se lea sin que pese. Se
 * comprimen con mozjpeg y no con el JPEG del navegador: a la vista son
 * iguales y pesan un tercio menos, que en el PDF son megas.
 */
const CALIDAD = 80;

async function guardar(pagina, nombre, opciones = {}) {
  const png = await pagina.screenshot(opciones);
  writeFileSync(
    join(destino, nombre + ".jpg"),
    await sharp(png).jpeg({ quality: CALIDAD, mozjpeg: true }).toBuffer(),
  );
}

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = join(aqui, "img");
mkdirSync(destino, { recursive: true });

const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });

async function abrirMovil() {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const pagina = await contexto.newPage();
  pagina.on("dialog", (aviso) => aviso.accept());
  return { contexto, pagina };
}

async function entrar(pagina, quien) {
  await pagina.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(400);
  if (await pagina.locator('input[name="username"]').count()) {
    await pagina.fill('input[name="username"]', quien);
    await pagina.fill('input[name="password"]', CLAVE);
    await pagina.click('button[type="submit"]');
    await pagina.waitForTimeout(1800);
  }
}

/**
 * Abre las jornadas que estén plegadas. Una jornada con todos sus combates
 * jugados se pliega sola, y lo de dentro —los equipos, el botón de cambiar el
 * resultado— existe pero no se ve, así que no se puede fotografiar ni pulsar.
 */
async function desplegarJornadas(p) {
  // De una en una y volviendo a buscar: al abrir una, la lista de plegadas
  // cambia, y recorrerla entera de golpe se quedaba esperando a la que ya no está
  const plegadas = p.locator("section.card details:not([open]) summary");
  while (await plegadas.count()) {
    await plegadas.first().click();
    await p.waitForTimeout(400);
  }
}

/**
 * Deja un elemento arriba del todo, justo debajo de la cabecera fija. Para las
 * fotos de algo que queda más abajo de lo que cabe en la pantalla: sin esto,
 * el navegador lo deja pegado al borde de abajo y la foto sale cortada.
 */
async function arriba(p, elemento, margen = 80) {
  await elemento.evaluate((el, m) => {
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - m);
  }, margen);
  await p.waitForTimeout(500);
}

async function foto(pagina, nombre, ruta, prepara) {
  if (ruta) {
    await pagina.goto(BASE + ruta, { waitUntil: "domcontentloaded" });
    await pagina.waitForTimeout(1400);
  }
  if (prepara) await prepara(pagina);
  // En JPEG y no en PNG: son cuarenta fotos y en PNG el PDF se iba a cinco
  // megas, que en el móvil con datos es una descarga tonta
  await guardar(pagina, nombre);
  console.log("✓", nombre);
}

// --- Sin sesión
{
  const { contexto, pagina } = await abrirMovil();
  await foto(pagina, "login", "/login");
  await contexto.close();
}

// --- Como jugador y administrador
{
  const { contexto, pagina } = await abrirMovil();
  await entrar(pagina, "draka");

  await foto(pagina, "resumen", "/");
  await foto(pagina, "menu", "/", async (p) => {
    await p.locator("nav button", { hasText: "La edición" }).last().click();
    await p.waitForTimeout(700);
  });
  await foto(pagina, "menu-lomio", "/", async (p) => {
    await p.locator("nav button", { hasText: "Lo mío" }).last().click();
    await p.waitForTimeout(700);
  });

  await foto(pagina, "mapa-lista", "/mapa");
  await foto(pagina, "mapa-dibujo", "/mapa", async (p) => {
    await p.locator("button", { hasText: "🗺️ Mapa" }).first().click();
    await p.waitForTimeout(900);
  });
  await foto(pagina, "mapa-apuntar", "/mapa", async (p) => {
    await p.locator('input[placeholder*="Buscar una ruta"]').fill("Ruta 34");
    await p.waitForTimeout(600);
    await p.locator("button", { hasText: "Ruta 34" }).first().click();
    await p.waitForTimeout(900);
    const especie = p.locator('input[name="species"]');
    await especie.click();
    // Escrito tecla a tecla: rellenar el campo de golpe no abre la lista
    await especie.pressSequentially("Abr", { delay: 130 });
    await p.waitForTimeout(1800);
  });

  await foto(pagina, "muertes", "/muertes");
  await foto(pagina, "muertes-form", "/muertes?apuntar=1", async (p) => {
    await p.locator('input[name="species"]').fill("Geodude");
    await p.waitForTimeout(1300);
  });

  await foto(pagina, "level-caps", "/level-caps");
  // Esta va tal cual: enseña la jornada terminada plegada, que es como se ve
  await foto(pagina, "jornadas", "/jornadas");
  // La segunda arriba: es la que acaba de cambiar la clasificación
  await foto(pagina, "jornada-jugada", "/jornadas", async (p) => {
    await desplegarJornadas(p);
    await arriba(p, p.locator("section.card", { hasText: "Jornada 2" }).first());
  });
  await foto(pagina, "equipos", "/jornadas", async (p) => {
    await desplegarJornadas(p);
    await p.locator("button", { hasText: "Cambiar equipos" }).first().click();
    await p.waitForTimeout(1200);
  });
  await foto(pagina, "mvp", "/jornadas", async (p) => {
    await p.locator("button,summary", { hasText: "MVP" }).first().click();
    await p.waitForTimeout(1200);
  });
  await foto(pagina, "puntos", "/puntos");
  await foto(pagina, "retos", "/retos");
  // La de las recompensas y no la primera: es la que lleva las casillas con
  // premio, que es lo que cuenta la guía
  await foto(pagina, "ruleta", "/ruleta", async (p) => {
    const chapa = p.locator('a:has-text("Recompensas del líder")').first();
    if (await chapa.count()) {
      await chapa.click();
      await p.waitForTimeout(1500);
    }
  });
  await foto(pagina, "bolsa", "/bolsa");
  await foto(pagina, "notas", "/notas");
  await foto(pagina, "tipos", "/notas", async (p) => {
    await p.locator("summary", { hasText: "Cobertura de tipos" }).first().click();
    await p.waitForTimeout(900);
  });
  await foto(pagina, "actividad", "/actividad");
  await foto(pagina, "perfil", "/perfil");
  await foto(pagina, "final", "/final-four");
  await foto(pagina, "hall", "/hall-de-la-fama");
  await foto(pagina, "palmares", "/palmares");
  await foto(pagina, "competiciones", "/competiciones");
  await foto(pagina, "sorteo", "/sorteo");
  await foto(pagina, "sin-conexion", "/", async (p) => {
    // El aviso de abajo, tal y como se ve cuando se va la línea
    await p.context().setOffline(true);
    await p.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await p.waitForTimeout(2500);
  });
  await pagina.context().setOffline(false);
  await foto(pagina, "admin", "/admin");

  // --- Para la guía de quien lleva un locke
  await foto(pagina, "bolsas-todos", "/bolsa/todas");
  await foto(pagina, "jornada-nueva", "/jornadas", async (p) => {
    const abrir = p.locator("summary", { hasText: /Nueva jornada|Crear jornada/i }).first();
    if (await abrir.count()) {
      await abrir.click();
      await p.waitForTimeout(700);
      await arriba(p, abrir);
    }
  });
  await foto(pagina, "resultado", "/jornadas", async (p) => {
    const anotar = p.locator("button", { hasText: "Anotar resultado" }).first();
    if (await anotar.count()) {
      await anotar.click();
      await p.waitForTimeout(900);
      // El formulario sale dentro del combate, que queda a media página
      await arriba(p, p.locator('select[name="winnerId"]').first(), 220);
    }
  });
  await foto(pagina, "jugadores", "/competiciones");
  // El aspecto se elige en el perfil, más abajo de lo que cabe en la pantalla
  await foto(pagina, "aspecto", "/perfil", async (p) => {
    await arriba(p, p.locator("h2", { hasText: "Aspecto" }).first(), 110);
  });
  // El formulario de la edición abierto por donde se sube el logo
  await foto(pagina, "logo-edicion", "/competiciones", async (p) => {
    const bloque = p.locator("details", { hasText: "Editar datos" }).first();
    await bloque.locator("summary").first().click();
    await p.waitForTimeout(600);
    await bloque.locator("text=Logo de la edición").first().scrollIntoViewIfNeeded();
    await p.evaluate(() => window.scrollBy(0, 160));
    await p.waitForTimeout(500);
  });
  await contexto.close();
}

// --- Como un jugador que no administra, que es a quien le avisan de lo que
// cambia Draka (Pablo no vale: también administra, y saldrían sus botones)
{
  const { contexto, pagina } = await abrirMovil();
  await entrar(pagina, "hector");
  /**
   * Dos fotos de la misma visita: la regla resaltada tal y como te la
   * encuentras, y abierto lo que ha cambiado. En la misma, porque al entrar la
   * visita se apunta y en la siguiente la regla ya no sale como nueva. Por
   * eso también se busca por su título y no por el "no la habías visto": si
   * se repiten las fotos, salen sin el resalte en vez de quedarse esperando.
   */
  const regla = pagina.locator("article", { hasText: "Añadidos a las reglas generales" }).first();
  await foto(pagina, "reglas", "/reglas", async (p) => {
    await arriba(p, regla, 110);
  });
  await foto(pagina, "reglas-cambios", null, async (p) => {
    const cambios = regla.locator("summary", { hasText: "Qué ha cambiado" });
    await cambios.click();
    await p.waitForTimeout(500);
    await arriba(p, cambios, 110);
  });
  await contexto.close();
}

// --- Lo que se maneja desde el ordenador
{
  const contexto = await navegador.newContext({
    viewport: { width: 980, height: 1000 },
    deviceScaleFactor: 2,
  });
  const pagina = await contexto.newPage();
  pagina.on("dialog", (aviso) => aviso.accept());
  await entrar(pagina, "draka");

  await pagina.goto(BASE + "/admin/mapas?region=johto", { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(1600);
  // Con una zona elegida salen sus tiradores: el de estirar y el de girar
  await pagina.locator("svg rect[fill-opacity]").nth(12).click();
  await pagina.waitForTimeout(900);
  await guardar(pagina, "editor-mapa", { clip: { x: 0, y: 0, width: 980, height: 600 } });
  console.log("✓ editor-mapa");

  await pagina.goto(BASE + "/admin/level-caps", { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(1400);
  await guardar(pagina, "editor-levelcaps", { clip: { x: 0, y: 0, width: 980, height: 700 } });
  console.log("✓ editor-levelcaps");
  await contexto.close();
}

await navegador.close();
console.log("\nFotos en guia/img. Ahora: node guia/pdf.mjs");
