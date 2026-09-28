/**
 * Los combates que se ganan porque el rival se retiró o perdió el locke. Se
 * dan cuando el resto de su jornada está jugado, no antes.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { combatesPorRetirada } from "@/lib/retiradas";
import { combate } from "./ayudas";

const fuera = new Set(["alex"]);

describe("combates por retirada", () => {
  test("mientras quede otro combate de la jornada por jugar, espera", () => {
    const jornada = [combate("alex", "enzo"), combate("hector", "rodri")];
    assert.deepEqual(combatesPorRetirada(jornada, fuera), []);
  });
  test("con el resto jugado, se da", () => {
    const suyo = combate("alex", "enzo");
    const jornada = [suyo, combate("hector", "rodri", "hector")];
    assert.deepEqual(combatesPorRetirada(jornada, fuera), [suyo]);
  });
  test("uno entre dos que están fuera no bloquea a los demás y no se da", () => {
    const dosFuera = new Set(["alex", "enzo"]);
    const suyo = combate("alex", "hector");
    const jornada = [suyo, combate("alex", "enzo"), combate("hector", "rodri", "rodri")];
    assert.deepEqual(combatesPorRetirada(jornada, dosFuera), [suyo]);
  });
  test("uno con permiso de jugarse ni se da ni deja cerrar la jornada", () => {
    const conPermiso = combate("alex", "enzo", null, { excepcion: true });
    const otro = combate("alex", "hector");
    assert.deepEqual(combatesPorRetirada([conPermiso, otro], fuera), []);
  });
  test("sin nadie fuera, nada", () => {
    assert.deepEqual(combatesPorRetirada([combate("a", "b")], new Set()), []);
  });
});
