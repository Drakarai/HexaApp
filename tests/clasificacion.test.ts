/**
 * La tabla: victorias y derrotas, desempates, y los que se fueron al final.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { contarCombates, ordenarClasificacion } from "@/lib/competition";
import { combate, fila } from "./ayudas";

describe("victorias, derrotas y diferencia", () => {
  test("cuenta a los dos lados del combate", () => {
    const stats = contarCombates([combate("a", "b", "a", { pokemonDiff: 3 })], [], false);
    assert.deepEqual(stats.get("a"), { wins: 1, losses: 0, played: 1, diff: 3 });
    assert.deepEqual(stats.get("b"), { wins: 0, losses: 1, played: 1, diff: -3 });
  });
  test("un combate sin jugar no cuenta", () => {
    assert.equal(contarCombates([combate("a", "b")], [], true).size, 0);
  });
  test("los retos suman victorias pero su diferencia solo si la edición lo dice", () => {
    const reto = combate("a", "b", "b", { pokemonDiff: 4 });
    assert.equal(contarCombates([], [reto], false).get("b")?.diff, 0);
    assert.equal(contarCombates([], [reto], false).get("b")?.wins, 1);
    assert.equal(contarCombates([], [reto], true).get("b")?.diff, 4);
  });
});

describe("el orden de la tabla", () => {
  test("puntos, luego menos muertes, luego diferencia, luego nombre", () => {
    const tabla = ordenarClasificacion([
      fila("Enzo", { points: 7, deaths: 3 }),
      fila("Héctor", { points: 7, deaths: 1, pokemonDiff: -2 }),
      fila("Draka", { points: 8 }),
      fila("Pablo", { points: 7, deaths: 1, pokemonDiff: 4 }),
      fila("Álex", { points: 7, deaths: 3 }),
    ]);
    assert.deepEqual(
      tabla.map((f) => f.participantId),
      ["Draka", "Pablo", "Héctor", "Álex", "Enzo"],
    );
    assert.deepEqual(tabla.map((f) => f.position), [1, 2, 3, 4, 5]);
  });
  test("el retirado va al final y no ocupa puesto aunque tenga más puntos", () => {
    const tabla = ordenarClasificacion([
      fila("Rodri", { points: 20, retirado: true }),
      fila("Héctor", { points: 5 }),
    ]);
    assert.deepEqual(tabla.map((f) => [f.participantId, f.position]), [["Héctor", 1], ["Rodri", 0]]);
  });
  test("no cambia la lista que se le pasa", () => {
    const filas = [fila("b", { points: 1 }), fila("a", { points: 2 })];
    ordenarClasificacion(filas);
    assert.equal(filas[0].participantId, "b");
  });
});
