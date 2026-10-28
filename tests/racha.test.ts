/**
 * La racha de la clasificación: los últimos cinco resultados de cada uno, en
 * orden y sin los combates que no tienen ganador.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { rachas, type CombateParaRacha } from "@/lib/racha";

const dia = (n: number) => new Date(Date.UTC(2026, 9, n));
const combate = (a: string, b: string, ganador: string | null, n: number, orden = 0): CombateParaRacha => ({
  participantAId: a,
  participantBId: b,
  winnerId: ganador,
  cuando: dia(n),
  orden,
});

describe("Racha", () => {
  test("del más viejo al más reciente, para los dos de cada combate", () => {
    const r = rachas([combate("pablo", "enzo", "enzo", 3), combate("pablo", "hector", "pablo", 1)]);
    assert.deepEqual(r.get("pablo"), ["V", "D"]);
    assert.deepEqual(r.get("enzo"), ["V"]);
    assert.deepEqual(r.get("hector"), ["D"]);
  });

  test("solo los cinco últimos", () => {
    const combates = Array.from({ length: 7 }, (_, i) => combate("pablo", "enzo", i < 2 ? "enzo" : "pablo", i + 1));
    assert.deepEqual(rachas(combates).get("pablo"), ["V", "V", "V", "V", "V"]);
  });

  test("sin ganador no cuenta, y el mismo día manda el orden de la jornada", () => {
    const r = rachas([
      combate("pablo", "enzo", null, 1),
      combate("pablo", "hector", "hector", 2, 1),
      combate("pablo", "rodri", "pablo", 2, 0),
    ]);
    assert.deepEqual(r.get("pablo"), ["V", "D"]);
  });

  test("quien no ha jugado no tiene racha", () => {
    assert.equal(rachas([]).get("pablo"), undefined);
  });
});
