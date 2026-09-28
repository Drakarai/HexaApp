/**
 * La final: qué formato toca, las series al mejor de tres, cuándo se abre y
 * quién gana el cuadro.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  campeonYSubcampeon,
  claveDelCombate,
  comoVaLaSerie,
  formatoParaJugadores,
  llavesPosteriores,
} from "@/lib/formatos-finales";
import { calcularEstadoDeLaFinal } from "@/lib/final-four";
import { fila } from "./ayudas";

describe("qué formato toca", () => {
  test("con uno no hay final", () => assert.equal(formatoParaJugadores(1), null));
  test("dos y tres juegan la Jornada Final", () => {
    assert.equal(formatoParaJugadores(2)?.nombre, "Jornada Final");
    assert.equal(formatoParaJugadores(3)?.nombre, "Jornada Final");
  });
  test("de cuatro a seis, Final Four", () => {
    for (const n of [4, 5, 6]) assert.equal(formatoParaJugadores(n)?.jugadores, n);
  });
  test("de siete para arriba, el de seis", () => {
    assert.equal(formatoParaJugadores(8)?.jugadores, 6);
  });
  test("con seis, los dos primeros esperan", () => {
    assert.equal(formatoParaJugadores(6)?.esperan, 2);
  });
});

describe("una serie al mejor de tres", () => {
  test("2-0: el tercero sobra", () => {
    const r = comoVaLaSerie(["a", "a", null]);
    assert.equal(r.ganador, "a");
    assert.deepEqual(r.sobra, [false, false, true]);
  });
  test("un tercero viejo tras corregir a 2-0 no cuenta", () => {
    const r = comoVaLaSerie(["a", "a", "b"]);
    assert.equal(r.ganador, "a");
    assert.equal(r.ganadas.get("b") ?? 0, 0);
  });
  test("1-1 sigue abierta", () => assert.equal(comoVaLaSerie(["a", "b", null]).ganador, null));
});

describe("el cuadro de seis", () => {
  const seis = formatoParaJugadores(6)!;
  test("cambiar un cruce afecta a su semifinal y a la final, no a la otra", () => {
    assert.deepEqual(llavesPosteriores(seis, "CROSS_A").sort(), ["FINAL", "SEMI_A"]);
  });
  test("campeón y subcampeón salen de las series", () => {
    const seeds = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const g = new Map<string, string | null>();
    const serie = (llave: string, ganador: string) => {
      g.set(claveDelCombate(llave, 1), ganador);
      g.set(claveDelCombate(llave, 2), ganador);
    };
    serie("CROSS_A", "p6"); // el 6º da la campanada
    serie("CROSS_B", "p4");
    serie("SEMI_A", "p6");
    serie("SEMI_B", "p2");
    serie("FINAL", "p6");
    assert.deepEqual(campeonYSubcampeon(seis, seeds, g), { campeon: "p6", subcampeon: "p2" });
  });
});

describe("en qué punto está la final", () => {
  const base = {
    combates: [
      { winnerId: "a", matchdayId: "j1" },
      { winnerId: "c", matchdayId: "j1" },
    ],
    cuadro: null,
    activos: 4,
    participantes: 4,
    jornadasPrevistas: null,
    standings: ["a", "b", "c", "d"].map((id, i) => fila(id, { points: 10 - i })),
  };

  test("todo jugado y sin cuadro: toca sembrarlo", () => {
    assert.equal(calcularEstadoDeLaFinal(base).status, "SIN_CUADRO");
  });
  test("con un combate sin jugar, cerrada", () => {
    const r = calcularEstadoDeLaFinal({
      ...base,
      combates: [...base.combates, { winnerId: null, matchdayId: "j2" }],
    });
    assert.equal(r.status, "BLOQUEADA");
  });
  test("con jornadas previstas sin crear, cerrada aunque esté todo jugado", () => {
    const r = calcularEstadoDeLaFinal({ ...base, jornadasPrevistas: 3 });
    assert.equal(r.status, "BLOQUEADA");
    assert.equal(r.status === "BLOQUEADA" && r.faltanPorCrear, 2);
  });
  test("sin combates todavía", () => {
    assert.equal(calcularEstadoDeLaFinal({ ...base, combates: [] }).status, "SIN_JORNADAS");
  });
  test("si solo queda uno en pie, gana por abandono", () => {
    const r = calcularEstadoDeLaFinal({
      ...base,
      activos: 1,
      standings: [fila("a"), fila("b", { retirado: true })],
    });
    assert.equal(r.status, "POR_ABANDONO");
    assert.equal(r.status === "POR_ABANDONO" && r.champion.participantId, "a");
  });
  test("un locke en solitario no gana por abandono: no hay final", () => {
    const r = calcularEstadoDeLaFinal({ ...base, activos: 1, participantes: 1 });
    assert.equal(r.status, "POCA_GENTE");
  });
  test("con el cuadro hecho y la final ganada, hay campeón", () => {
    const partido = (key: string, winnerId: string) => ({
      key,
      winnerId,
      pokemonDiff: 1,
      playedAt: new Date(),
      notes: null,
      replayUrl: null,
    });
    const r = calcularEstadoDeLaFinal({
      ...base,
      cuadro: {
        id: "f",
        jugadores: 4,
        seeds: ["a", "b", "c", "d"],
        matches: [
          partido("SEMI_A#1", "a"),
          partido("SEMI_A#2", "a"),
          partido("SEMI_B#1", "c"),
          partido("SEMI_B#2", "c"),
          partido("FINAL#1", "c"),
          partido("FINAL#2", "c"),
        ],
      },
    });
    assert.equal(r.status, "TERMINADA");
    if (r.status === "TERMINADA") {
      assert.equal(r.champion?.participantId, "c");
      assert.equal(r.runnerUp?.participantId, "a");
    }
  });
});
