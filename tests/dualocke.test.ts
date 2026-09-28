/**
 * El dualocke: quién se lleva cada jornada, el marcador, el tercer combate de
 * la serie y quién gana el locke (mayoría de jornadas; la final desempata).
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { calcularMarcador, ganadorDeLaJornada, jornadasDelDualocke } from "@/lib/marcador";
import { queHacerConElDesempate } from "@/lib/series";
import { decidirCampeon } from "@/lib/campeon";
import type { FinalFourState } from "@/lib/final-four";
import { formatoParaJugadores } from "@/lib/formatos-finales";
import { DRAKA, PABLO, combate, jornadaDual } from "./ayudas";

const jugadores = [DRAKA, PABLO];

describe("quién se lleva una jornada al mejor de tres", () => {
  test("2-0 la cierra aunque falte el tercero", () => {
    assert.equal(ganadorDeLaJornada([{ winnerId: "draka" }, { winnerId: "draka" }]).ganadorId, "draka");
  });
  test("2-1 es del que llegó a dos", () => {
    const r = ganadorDeLaJornada([{ winnerId: "pablo" }, { winnerId: "draka" }, { winnerId: "pablo" }]);
    assert.equal(r.ganadorId, "pablo");
  });
  test("1-0 con uno por jugar todavía no es de nadie", () => {
    assert.equal(ganadorDeLaJornada([{ winnerId: "draka" }, { winnerId: null }]).ganadorId, null);
  });
  test("1-1 no es de nadie", () => {
    assert.equal(ganadorDeLaJornada([{ winnerId: "draka" }, { winnerId: "pablo" }]).ganadorId, null);
  });
});

describe("de cuántas jornadas va", () => {
  test("mandan las previstas", () => assert.equal(jornadasDelDualocke(7, 2), 7));
  test("sin previstas, las seis de siempre", () => assert.equal(jornadasDelDualocke(null, 2), 6));
  test("sin previstas y con más creadas, las creadas", () => assert.equal(jornadasDelDualocke(null, 8), 8));
});

describe("el marcador", () => {
  test("4 de 6 gana el locke aunque queden dos jornadas", () => {
    const m = calcularMarcador(
      jugadores,
      [1, 2, 3, 4].map((n) => jornadaDual(n, "draka", "draka")),
      6,
    );
    assert.equal(m.hacenFalta, 4);
    assert.equal(m.campeonId, "draka");
    assert.equal(m.empate, false);
  });

  test("con 7 jornadas también hacen falta 4", () => {
    const m = calcularMarcador(jugadores, [1, 2, 3].map((n) => jornadaDual(n, "pablo", "pablo")), 7);
    assert.equal(m.hacenFalta, 4);
    assert.equal(m.campeonId, null);
  });

  test("3-3 con las seis jugadas es empate: decide la final", () => {
    const m = calcularMarcador(
      jugadores,
      ["draka", "pablo", "draka", "pablo", "draka", "pablo"].map((g, i) => jornadaDual(i + 1, g, g)),
      6,
    );
    assert.equal(m.campeonId, null);
    assert.equal(m.empate, true);
    assert.equal(m.quedanPorDecidir, 0);
  });

  test("3-2 con una por jugar: bola de partido para el que va 3", () => {
    const m = calcularMarcador(
      jugadores,
      ["draka", "pablo", "draka", "pablo", "draka"].map((g, i) => jornadaDual(i + 1, g, g)),
      6,
    );
    assert.equal(m.empate, false);
    assert.deepEqual(m.bolaDePartido.map((j) => j.participantId), ["draka"]);
  });

  test("sin previstas, ganar la primera jornada no da el locke", () => {
    const m = calcularMarcador(jugadores, [jornadaDual(1, "draka", "draka")], null);
    assert.equal(m.campeonId, null);
    assert.equal(m.hacenFalta, 4);
  });
});

describe("el tercer combate de la serie", () => {
  test("1-1: se crea el tercero entre los mismos", () => {
    const r = queHacerConElDesempate([combate("draka", "pablo", "draka"), combate("draka", "pablo", "pablo")], 3);
    assert.deepEqual(r.borrar, []);
    assert.equal(r.crear?.participantAId, "draka");
    assert.equal(r.crear?.position, 2);
  });
  test("2-0: no hace falta", () => {
    const r = queHacerConElDesempate([combate("draka", "pablo", "draka"), combate("draka", "pablo", "draka")], 3);
    assert.equal(r.crear, null);
  });
  test("2-0 y un tercero sin jugar (se corrigió un resultado): sobra", () => {
    const tercero = combate("draka", "pablo", null);
    const r = queHacerConElDesempate(
      [combate("draka", "pablo", "draka"), combate("draka", "pablo", "draka"), tercero],
      3,
    );
    assert.deepEqual(r.borrar, [tercero.id]);
  });
  test("1-0 con el segundo por jugar: nada", () => {
    const r = queHacerConElDesempate([combate("draka", "pablo", "draka"), combate("draka", "pablo")], 3);
    assert.deepEqual(r, { borrar: [], crear: null });
  });
  test("nunca borra un combate jugado", () => {
    const r = queHacerConElDesempate(
      [combate("draka", "pablo", "draka"), combate("draka", "pablo", "pablo"), combate("draka", "pablo", "draka")],
      3,
    );
    assert.deepEqual(r.borrar, []);
  });
});

describe("quién gana el dualocke", () => {
  const formato = formatoParaJugadores(2)!;
  const seeds = [
    { participantId: "draka", displayName: "Draka", color: "#f00", avatarImage: null, seed: 1 },
    { participantId: "pablo", displayName: "Pablo", color: "#00f", avatarImage: null, seed: 2 },
  ];
  const finalGanadaPor = (quien: "draka" | "pablo"): FinalFourState => ({
    status: "TERMINADA",
    finalFourId: "f",
    formato,
    llaves: [],
    seeds,
    champion: seeds.find((s) => s.participantId === quien)!,
    runnerUp: seeds.find((s) => s.participantId !== quien)!,
  });
  const bloqueada: FinalFourState = { status: "BLOQUEADA", jugados: 8, total: 8, formato, faltanPorCrear: 2 };
  const cuatroCero = calcularMarcador(jugadores, [1, 2, 3, 4].map((n) => jornadaDual(n, "draka", "draka")), 6);
  const empate = calcularMarcador(
    jugadores,
    ["draka", "pablo", "draka", "pablo", "draka", "pablo"].map((g, i) => jornadaDual(i + 1, g, g)),
    6,
  );

  test("por mayoría, y el locke sigue mientras la final no se juegue", () => {
    const c = decidirCampeon(bloqueada, cuatroCero);
    assert.equal(c?.champion.participantId, "draka");
    assert.equal(c?.como, "jornadas");
    assert.deepEqual(c?.jornadas, { ganadas: 4, perdidas: 0 });
    assert.equal(c?.quedaPorJugar, true);
  });

  test("la final ganada por el otro no cambia el campeón", () => {
    const c = decidirCampeon(finalGanadaPor("pablo"), cuatroCero);
    assert.equal(c?.champion.participantId, "draka");
    assert.equal(c?.runnerUp?.participantId, "pablo");
    assert.equal(c?.quedaPorJugar, false);
  });

  test("con empate, sin final todavía no hay campeón", () => {
    assert.equal(decidirCampeon(bloqueada, empate), null);
  });

  test("con empate, gana el de la final", () => {
    const c = decidirCampeon(finalGanadaPor("pablo"), empate);
    assert.equal(c?.champion.participantId, "pablo");
    assert.equal(c?.como, "final");
  });

  test("si el otro se va, gana por abandono", () => {
    const c = decidirCampeon({ status: "POR_ABANDONO", champion: seeds[0] }, empate);
    assert.equal(c?.como, "abandono");
    assert.equal(c?.champion.participantId, "draka");
  });

  test("ganado por mayoría antes de irse el otro, sigue siendo por jornadas", () => {
    const c = decidirCampeon({ status: "POR_ABANDONO", champion: seeds[1] }, cuatroCero);
    assert.equal(c?.champion.participantId, "draka");
    assert.equal(c?.como, "jornadas");
  });

  test("en un locke que no es dual manda la final", () => {
    const c = decidirCampeon(finalGanadaPor("pablo"), null);
    assert.equal(c?.champion.participantId, "pablo");
  });
});
