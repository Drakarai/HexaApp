/**
 * La clasificación por puestos: la tabla de cada jornada y sus puntos.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { puntosDelTexto, tablaDeLaJornada } from "@/lib/puestos";

const PUNTOS = [2, 2, 2, 1, 0, 0];

describe("clasificación por puestos", () => {
  test("ganar manda; luego la diferencia, luego los críticos y luego la general", () => {
    const tabla = tablaDeLaJornada({
      combates: [
        { participantAId: "ana", participantBId: "bea", winnerId: "ana", pokemonDiff: 3 },
        { participantAId: "cris", participantBId: "dani", winnerId: "dani", pokemonDiff: 1 },
        { participantAId: "eva", participantBId: "fer", winnerId: "eva", pokemonDiff: 1 },
      ],
      criticos: new Map([
        ["dani", { hechos: 0, recibidos: 2 }],
        ["eva", { hechos: 3, recibidos: 0 }],
      ]),
      ordenGeneral: ["fer", "cris", "bea", "ana", "dani", "eva"],
      puntosPorPuesto: PUNTOS,
    });
    assert.deepEqual(
      tabla.map((f) => [f.participantId, f.puesto, f.puntos]),
      [
        ["ana", 1, 2], // ganó por 3
        ["eva", 2, 2], // ganó por 1, con +3 en críticos
        ["dani", 3, 2], // ganó por 1, con −2
        ["fer", 4, 1], // perdió por 1; empata con cris y va antes en la general
        ["cris", 5, 0],
        ["bea", 6, 0], // perdió por 3
      ],
    );
  });

  test("con el mismo puesto de general entre los empatados, la general desempata", () => {
    const tabla = tablaDeLaJornada({
      combates: [
        { participantAId: "a", participantBId: "b", winnerId: "a", pokemonDiff: 2 },
        { participantAId: "c", participantBId: "d", winnerId: "c", pokemonDiff: 2 },
      ],
      criticos: new Map(),
      ordenGeneral: ["c", "a", "d", "b"],
      puntosPorPuesto: PUNTOS,
    });
    assert.deepEqual(tabla.map((f) => f.participantId), ["c", "a", "d", "b"]);
  });

  test("los que están fuera del locke no se llevan puesto", () => {
    const tabla = tablaDeLaJornada({
      combates: [{ participantAId: "a", participantBId: "b", winnerId: "a", pokemonDiff: 6 }],
      criticos: new Map(),
      ordenGeneral: [],
      puntosPorPuesto: PUNTOS,
      fuera: new Set(["b"]),
    });
    assert.deepEqual(tabla.map((f) => f.participantId), ["a"]);
  });

  test("los puntos se escriben como «2, 2, 2, 1, 0, 0»", () => {
    assert.deepEqual(puntosDelTexto("2, 2, 2, 1, 0, 0"), [2, 2, 2, 1, 0, 0]);
    assert.deepEqual(puntosDelTexto("3 2 1"), [3, 2, 1]);
    assert.equal(puntosDelTexto(""), null);
    assert.equal(puntosDelTexto("dos, uno"), null);
  });
});
