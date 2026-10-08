/**
 * Cuánto mide y cuánto pesa cada pantalla, para poder comparar antes y después
 * de tocar algo. No forma parte de la guía: vive aquí porque reaprovecha el
 * mismo Playwright y la misma forma de entrar.
 *
 *   node guia/medir.mjs [ruta ...]
 */
import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const { chromium } = await cargarPlaywright();

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";
const QUIEN = process.env.MEDIR_USUARIO ?? "draka";

const rutas = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["/", "/jornadas", "/level-caps", "/puntos", "/muertes"];

const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });

async function sesion(ancho, alto) {
  const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto } });
  const pagina = await contexto.newPage();
  pagina.on("dialog", (aviso) => aviso.accept().catch(() => {})); // Si ya lo aceptó otro, nada
  await pagina.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(400);
  if (await pagina.locator('input[name="username"]').count()) {
    await pagina.fill('input[name="username"]', QUIEN);
    await pagina.fill('input[name="password"]', CLAVE);
    await pagina.click('button[type="submit"]');
    await pagina.waitForTimeout(1800);
  }
  return { contexto, pagina };
}

for (const [nombre, ancho, alto] of [
  ["móvil", 390, 844],
  ["PC", 1280, 800],
]) {
  const { contexto, pagina } = await sesion(ancho, alto);
  console.log(`\n=== ${nombre} (${ancho}×${alto}) ===`);
  for (const ruta of rutas) {
    const respuesta = await pagina.goto(BASE + ruta, { waitUntil: "domcontentloaded" });
    await pagina.waitForTimeout(1200);
    const peso = (await respuesta.body()).length;
    const medidas = await pagina.evaluate(() => ({
      alto: document.documentElement.scrollHeight,
      ancho: document.documentElement.scrollWidth,
      nodos: document.querySelectorAll("*").length,
    }));
    console.log(
      `${ruta.padEnd(14)} alto ${String(medidas.alto).padStart(5)} px` +
        ` · html ${String(Math.round(peso / 1024)).padStart(4)} KB` +
        ` · ${String(medidas.nodos).padStart(4)} nodos` +
        (medidas.ancho > ancho ? `  ⚠ desborda (${medidas.ancho})` : ""),
    );
  }
  await contexto.close();
}

await navegador.close();
