/**
 * Las categorías del palmarés, por tamaño del locke.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriaDelLocke } from "@/lib/palmares";

test("uno es solitario, dos dualocke, tres o más de grupo", () => {
  assert.deepEqual([1, 2, 3, 6, 8].map(categoriaDelLocke), [
    "solitario",
    "dual",
    "grupo",
    "grupo",
    "grupo",
  ]);
});

import { describe } from "node:test";
import { leerEleccion, leerNombres, montarJugadores } from "@/lib/lockes-de-antes";

describe("lockes de antes con gente sin cuenta", () => {
  test("los nombres se limpian y no se repiten", () => {
    assert.deepEqual(leerNombres(" Marcos ,lucas, marcos,, "), ["Marcos", "lucas"]);
  });

  test("seis jugadores: cuatro con cuenta, dos sin ella, y ganó uno sin cuenta", () => {
    const r = montarJugadores({
      cuentas: ["draka", "pablo", "hector", "enzo"],
      nombres: ["Marcos", "Lucas"],
      ganador: leerEleccion("n:Marcos"),
      subcampeon: leerEleccion("u:pablo"),
    });
    assert.ok(!("error" in r));
    if ("error" in r) return;
    assert.equal(r.jugadoresIds.length + r.sinCuenta.length, 6);
    assert.equal(r.ganadorId, null);
    assert.equal(r.ganadorNombre, "Marcos");
    assert.equal(r.subcampeonId, "pablo");
  });

  test("el ganador entra como jugador aunque no se marcara", () => {
    const r = montarJugadores({ cuentas: [], nombres: [], ganador: leerEleccion("u:hector"), subcampeon: null });
    assert.ok(!("error" in r) && r.jugadoresIds.includes("hector"));
  });

  test("sin ganador no se guarda", () => {
    const r = montarJugadores({ cuentas: ["a"], nombres: [], ganador: null, subcampeon: null });
    assert.ok("error" in r);
  });

  test("vincular: el nombre pasa a ser su cuenta, también como ganador", () => {
    const r = montarJugadores({
      cuentas: ["draka"],
      nombres: ["Marcos", "Lucas"],
      ganador: leerEleccion("n:marcos"),
      subcampeon: null,
      vinculos: new Map([["Marcos", "u-marcos"]]),
    });
    assert.ok(!("error" in r));
    if ("error" in r) return;
    assert.deepEqual(r.sinCuenta, ["Lucas"]);
    assert.ok(r.jugadoresIds.includes("u-marcos"));
    assert.equal(r.ganadorId, "u-marcos");
    assert.equal(r.ganadorNombre, null);
  });

  test("el subcampeón no puede ser el mismo que el ganador", () => {
    const r = montarJugadores({
      cuentas: [],
      nombres: [],
      ganador: leerEleccion("u:a"),
      subcampeon: leerEleccion("u:a"),
    });
    assert.ok(!("error" in r) && r.subcampeonId === null);
  });
});
