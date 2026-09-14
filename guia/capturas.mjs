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
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const { chromium } = await cargarPlaywright();

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";
/** Suficiente para que el texto de las capturas se lea sin que pese */
const CALIDAD = 88;

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

async function foto(pagina, nombre, ruta, prepara) {
  if (ruta) {
    await pagina.goto(BASE + ruta, { waitUntil: "domcontentloaded" });
    await pagina.waitForTimeout(1400);
  }
  if (prepara) await prepara(pagina);
  // En JPEG y no en PNG: son treinta fotos y en PNG el PDF se iba a cinco
  // megas, que en el móvil con datos es una descarga tonta
  await pagina.screenshot({ path: join(destino, nombre + ".jpg"), quality: CALIDAD });
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
  await foto(pagina, "jornadas", "/jornadas");
  await foto(pagina, "jornada-jugada", "/jornadas");
  await foto(pagina, "equipos", "/jornadas", async (p) => {
    await p.locator("button", { hasText: "Cambiar equipos" }).first().click();
    await p.waitForTimeout(1200);
  });
  await foto(pagina, "mvp", "/jornadas", async (p) => {
    await p.locator("button,summary", { hasText: "MVP" }).first().click();
    await p.waitForTimeout(1200);
  });
  await foto(pagina, "puntos", "/puntos");
  await foto(pagina, "retos", "/retos");
  await foto(pagina, "ruleta", "/ruleta");
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
    }
  });
  await foto(pagina, "resultado", "/jornadas", async (p) => {
    const anotar = p.locator("button", { hasText: "Anotar resultado" }).first();
    if (await anotar.count()) {
      await anotar.click();
      await p.waitForTimeout(900);
    }
  });
  await foto(pagina, "jugadores", "/competiciones");
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
  await pagina.screenshot({
    path: join(destino, "editor-mapa.jpg"),
    quality: CALIDAD,
    clip: { x: 0, y: 0, width: 980, height: 600 },
  });
  console.log("✓ editor-mapa");

  await pagina.goto(BASE + "/admin/level-caps", { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(1400);
  await pagina.screenshot({
    path: join(destino, "editor-levelcaps.jpg"),
    quality: CALIDAD,
    clip: { x: 0, y: 0, width: 980, height: 700 },
  });
  console.log("✓ editor-levelcaps");
  await contexto.close();
}

await navegador.close();
console.log("\nFotos en guia/img. Ahora: node guia/pdf.mjs");
