/**
 * Que **ninguna pantalla se caiga**: todas las del menú, en el móvil y en el
 * ordenador, con quien lleva el locke y con un jugador normal. Es la red que
 * habría pillado, por ejemplo, la ficha que rompía la carga de
 * `/equipo?ver=…` al pintarse en el servidor.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { abrirNavegador, entrar, ir, MOVIL, ORDENADOR, sinProblemas } from "./comun.mjs";

const PANTALLAS = [
  "/",
  "/jornadas",
  "/retos",
  "/sorteo",
  "/ruleta",
  "/final-four",
  "/hall-de-la-fama",
  "/puntos",
  "/estadisticas",
  "/muertes",
  "/actividad",
  "/level-caps",
  "/reglas",
  "/palmares",
  "/mapa",
  "/equipo",
  "/bolsa",
  "/notas",
  "/perfil",
  "/competiciones",
  "/guia",
  "/hexapost",
];
// Las que solo son de quien administra
const DE_ADMINISTRAR = ["/reglas?editar=1", "/admin", "/diagnostico", "/bolsa/todas"];

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

for (const [quien, extra] of [
  ["draka", DE_ADMINISTRAR],
  ["hector", []],
]) {
  for (const [nombre, dispositivo] of [
    ["móvil", MOVIL],
    ["ordenador", ORDENADOR],
  ]) {
    describe(`${quien} en el ${nombre}`, () => {
      // Se entra una vez y se va pantalla por pantalla, como haría alguien
      let sesion;
      before(async () => {
        sesion = await entrar(navegador, quien, dispositivo);
      });
      after(() => sesion?.cerrar());

      for (const ruta of [...PANTALLAS, ...extra]) {
        test(ruta, async () => {
          const { pagina, problemas } = sesion;
          problemas.length = 0;
          const respuesta = await ir(pagina, ruta);
          assert.ok(respuesta && respuesta.status() < 400, `${ruta} dio ${respuesta?.status()}`);
          // La pantalla de «se ha roto algo» de la aplicación, y las de Next
          const texto = await pagina.locator("body").innerText();
          assert.doesNotMatch(texto, /Se ha roto algo|Application error|This page couldn.t load/i, `${ruta} enseña un error`);
          assert.ok(await pagina.locator("h1").count(), `${ruta} no tiene título`);
          sinProblemas(problemas, ruta);
        });
      }
    });
  }
}
