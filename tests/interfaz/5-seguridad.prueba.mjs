/**
 * La **seguridad** en la aplicación de verdad: las cabeceras que manda, el
 * freno a quien prueba contraseñas y que «Cerrar sesión en los demás
 * dispositivos» eche de verdad a los demás.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, BASE, entrar, ir, MOVIL, sinProblemas } from "./comun.mjs";

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

describe("seguridad", () => {
  test("todas las respuestas llevan sus cabeceras", async () => {
    const respuesta = await fetch(`${BASE}/login`);
    const cabecera = (nombre) => respuesta.headers.get(nombre) ?? "";
    assert.match(cabecera("content-security-policy"), /frame-ancestors 'self'/);
    assert.equal(cabecera("x-frame-options"), "SAMEORIGIN");
    assert.equal(cabecera("x-content-type-options"), "nosniff");
    assert.match(cabecera("permissions-policy"), /camera=\(\)/);
    assert.equal(respuesta.headers.get("x-powered-by"), null, "no dice con qué está hecha");
  });

  test("tras cinco fallos seguidos hay que esperar", async () => {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    try {
      // Una cuenta que no existe: se frena igual, para no delatar cuáles hay
      for (let i = 0; i < 5; i++) {
        await pagina.goto(`${BASE}/login`);
        await pagina.fill('input[name="username"]', "intruso");
        await pagina.fill('input[name="password"]', `no-es-${i}`);
        await pagina.click('button[type="submit"]');
        await pagina.getByText("Usuario o contraseña incorrectos.").waitFor();
      }
      await pagina.goto(`${BASE}/login`);
      await pagina.fill('input[name="username"]', "intruso");
      await pagina.fill('input[name="password"]', "otra-mas");
      await pagina.click('button[type="submit"]');
      await pagina.getByText(/Demasiados intentos fallidos/).waitFor();
    } finally {
      await contexto.close();
    }
  });

  test("cerrar la sesión en los demás dispositivos los echa, y a este no", async () => {
    const aqui = await entrar(navegador, "hector", MOVIL);
    const alli = await entrar(navegador, "hector");
    try {
      await ir(aqui.pagina, "/perfil?seccion=cuenta");
      await aqui.pagina.getByRole("button", { name: "Cerrar sesión en los demás dispositivos" }).click();
      await aqui.pagina.getByText(/tendrás que volver a entrar/).waitFor();

      // El otro, a la próxima, al login
      await alli.pagina.goto(`${BASE}/`);
      await alli.pagina.waitForURL(/\/login/);

      // Este sigue dentro
      await ir(aqui.pagina, "/");
      assert.doesNotMatch(new URL(aqui.pagina.url()).pathname, /^\/login/);
      sinProblemas(aqui.problemas, "cerrar las demás sesiones");
    } finally {
      await aqui.cerrar();
      await alli.cerrar();
    }
  });
});
