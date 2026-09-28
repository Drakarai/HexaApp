/**
 * Los checkpoints de jornada de los level caps y lo que le toca a cada uno.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  checkpointAbierto,
  checkpointsDelLocke,
  jornadaJugada,
  miParteDeLaJornada,
} from "@/lib/checkpoints";
import { combate } from "./ayudas";

const hito = (label: string, jornadaDespues = false) => ({ id: label, label, jornadaDespues });
const jornada = (id: string, matches: ReturnType<typeof combate>[] = [], royales: { participantes: string[]; ganado: boolean }[] = []) => ({
  id,
  label: id,
  milestone: null,
  matches,
  royales,
});

describe("checkpoints", () => {
  const hitos = [hito("Brock"), hito("Misty", true), hito("Surge"), hito("Erika", true)];

  test("el primer checkpoint es la primera jornada, el segundo la segunda", () => {
    const cps = checkpointsDelLocke(hitos, [jornada("J1"), jornada("J2")]);
    assert.deepEqual(cps.map((c) => [c.hito.label, c.jornada?.id, c.numero]), [
      ["Misty", "J1", 1],
      ["Erika", "J2", 2],
    ]);
  });
  test("una jornada sin combates no está jugada", () => {
    assert.equal(jornadaJugada(jornada("J1")), false);
  });
  test("toca jornada cuando todos pasan el hito y no está jugada", () => {
    const cps = checkpointsDelLocke(hitos, [jornada("J1", [combate("a", "b")])]);
    assert.equal(checkpointAbierto(cps, 1), null); // solo Brock pasado
    assert.equal(checkpointAbierto(cps, 2)?.numero, 1); // Misty pasado por todos
  });
  test("jugada la jornada, ya no toca", () => {
    const cps = checkpointsDelLocke(hitos, [jornada("J1", [combate("a", "b", "a")])]);
    assert.equal(checkpointAbierto(cps, 2), null);
  });
});

describe("lo que le toca a cada uno en la jornada", () => {
  const j = jornada("J3", [combate("alex", "enzo"), combate("hector", "rodri"), combate("draka", "pablo", "draka")]);
  test("su rival", () => {
    const r = miParteDeLaJornada(j, "hector");
    assert.equal(r.tipo === "rival" && r.rivalId, "rodri");
  });
  test("si el rival está fuera, no hay que jugarlo", () => {
    const r = miParteDeLaJornada(j, "enzo", new Set(["alex"]));
    assert.equal(r.tipo, "porRetirada");
  });
  test("si ya lo jugó", () => assert.equal(miParteDeLaJornada(j, "pablo").tipo, "hecho"));
  test("si descansa", () => assert.equal(miParteDeLaJornada(j, "lara").tipo, "fuera"));
  test("en un royale", () => {
    const r = miParteDeLaJornada(jornada("J4", [], [{ participantes: ["a", "b", "c"], ganado: false }]), "b");
    assert.equal(r.tipo, "royale");
  });
});
