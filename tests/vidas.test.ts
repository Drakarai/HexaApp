/**
 * El locke con vidas: cuántas quedan y cuándo se pierde.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { estadoDeVidas, leerVidas, textoDeVidas } from "@/lib/vidas";

describe("locke con vidas", () => {
  test("sin vidas puestas, no hay nada que contar", () => {
    assert.equal(estadoDeVidas({ vidas: null, vidaCero: false }, 30), null);
  });

  test("con 20 vidas se pierde con la baja 20", () => {
    const locke = { vidas: 20, vidaCero: false };
    assert.equal(estadoDeVidas(locke, 0)!.quedan, 20);
    assert.equal(estadoDeVidas(locke, 19)!.enLaUltima, true);
    assert.equal(estadoDeVidas(locke, 19)!.sinVidas, false);
    assert.equal(estadoDeVidas(locke, 20)!.sinVidas, true);
    assert.equal(estadoDeVidas(locke, 25)!.quedan, 0);
  });

  test("con vida 0 se sigue a cero y se pierde con la baja 21", () => {
    const locke = { vidas: 20, vidaCero: true };
    const aCero = estadoDeVidas(locke, 20)!;
    assert.equal(aCero.sinVidas, false);
    assert.equal(aCero.enLaVidaCero, true);
    assert.equal(aCero.enLaUltima, true);
    assert.equal(textoDeVidas(aCero), "En la vida 0");
    assert.equal(estadoDeVidas(locke, 21)!.sinVidas, true);
    assert.equal(textoDeVidas(estadoDeVidas(locke, 21)!), "Sin vidas");
  });

  test("el formulario: sin la casilla no hay vidas, y el número se sanea", () => {
    assert.deepEqual(leerVidas({ conVidas: null, vidas: "20", vidaCero: "on" }), { vidas: null, vidaCero: false });
    assert.deepEqual(leerVidas({ conVidas: "on", vidas: "15", vidaCero: null }), { vidas: 15, vidaCero: false });
    assert.deepEqual(leerVidas({ conVidas: "on", vidas: "-3", vidaCero: "on" }), { vidas: 1, vidaCero: true });
    assert.deepEqual(leerVidas({ conVidas: "on", vidas: "", vidaCero: null }), { vidas: 20, vidaCero: false });
  });
});
