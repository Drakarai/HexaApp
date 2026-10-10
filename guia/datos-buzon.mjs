/**
 * HexaPost, para sus fotos en las guías: Héctor manda un error con la pantalla
 * de la que viene, Enzo una mejora y Rodri un cambio, y Draka —que lleva la
 * aplicación— contesta el de Héctor y deja apuntado el de Enzo.
 *
 * Lo llama `datos.mjs` al final. También se puede lanzar suelto sobre una base
 * ya preparada (`node guia/datos-buzon.mjs`). Como el resto, **no se puede
 * pasar dos veces**.
 */

import { fileURLToPath } from "node:url";
import { cargarPlaywright, chromiumDelSistema } from "./navegador.mjs";

const BASE = process.env.GUIA_URL ?? "http://localhost:3000";
const CLAVE = process.env.SEED_PASSWORD ?? "hexalocke";

async function entrar(navegador, usuario) {
  const p = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  p.on("dialog", (aviso) => aviso.accept().catch(() => {})); // Si ya lo aceptó otro, nada
  await p.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await p.fill('input[name="username"]', usuario);
  await p.fill('input[name="password"]', CLAVE);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/login"));
  return p;
}

async function mandar(navegador, { quien, desde, tipo, titulo, texto }) {
  const p = await entrar(navegador, quien);
  // Se pasa antes por la pantalla de la que habla, como haría cualquiera
  // (hasta que carga del todo: la pantalla se apunta cuando la página arranca)
  if (desde) await p.goto(BASE + desde, { waitUntil: "networkidle" });
  await p.goto(BASE + "/hexapost", { waitUntil: "networkidle" });
  await p.locator("label", { hasText: tipo }).first().click();
  await p.fill('input[name="titulo"]', titulo);
  await p.fill('textarea[name="texto"]', texto);
  await p.getByRole("button", { name: "Mandar" }).click();
  await p.getByText("¡Recibido!").waitFor();
  await p.close();
  console.log("buzón:", quien, tipo);
}

async function contestar(p, titulo, estado, respuesta) {
  const suya = p.locator("article", { hasText: titulo });
  await suya.locator("label", { hasText: estado }).click();
  if (respuesta) await suya.locator('textarea[name="respuesta"]').fill(respuesta);
  await suya.getByRole("button", { name: "Guardar" }).click();
  await p.waitForTimeout(2500);
  console.log("buzón: contestado", estado);
}

export async function montarBuzon(navegador) {
  await mandar(navegador, {
    quien: "hector",
    desde: "/ruleta",
    tipo: "Un error",
    titulo: "La ruleta se queda pillada al girar dos veces",
    texto: "Si le doy a girar y otra vez antes de que pare, se queda quieta y no me gasta el ticket.",
  });
  await mandar(navegador, {
    quien: "enzo",
    desde: "/mapa",
    tipo: "Una mejora",
    titulo: "Que el mapa diga cuántas zonas quedan hasta el próximo gimnasio",
    texto: "Para saber cuántas capturas me quedan antes del tope sin contar a mano.",
  });
  await mandar(navegador, {
    quien: "rodri",
    desde: "/muertes",
    tipo: "Un cambio",
    titulo: "Poner el cementerio en Lo mío",
    texto: "Lo abro más que la actividad y siempre me cuesta encontrarlo.",
  });

  const p = await entrar(navegador, "draka");
  await p.goto(BASE + "/hexapost", { waitUntil: "networkidle" });
  await contestar(p, "La ruleta se queda pillada", "Hecha", "Arreglado: ahora el botón espera a que pare. ¡Gracias, Héctor!");
  await contestar(p, "cuántas zonas quedan", "Apuntada", "Buena idea, la apunto para la próxima tanda.");
  await p.close();
}

// Suelto
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await cargarPlaywright();
  const navegador = await chromium.launch({ executablePath: chromiumDelSistema() });
  await montarBuzon(navegador);
  await navegador.close();
}
