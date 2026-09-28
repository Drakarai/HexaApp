/**
 * Los emparejamientos que se proponen al crear una jornada.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { emparejamientosDeJornada, rondasDeLiguilla } from "@/lib/emparejamientos";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";

const clave = ([a, b]: [string, string]) => [a, b].sort().join("-");

describe("la liguilla", () => {
  test("con seis: cinco rondas de tres combates y cada pareja una vez", () => {
    const rondas = rondasDeLiguilla(["a", "b", "c", "d", "e", "f"]);
    assert.equal(rondas.length, 5);
    assert.ok(rondas.every((r) => r.pares.length === 3 && r.descansa === null));
    const parejas = new Set(rondas.flatMap((r) => r.pares.map(clave)));
    assert.equal(parejas.size, 15);
  });
  test("con cinco: cada uno descansa una vez", () => {
    const rondas = rondasDeLiguilla(["a", "b", "c", "d", "e"]);
    assert.equal(rondas.length, 5);
    assert.deepEqual(rondas.map((r) => r.descansa).sort(), ["a", "b", "c", "d", "e"]);
    assert.ok(rondas.every((r) => r.pares.length === 2));
  });
  test("con uno solo no hay nada", () => {
    assert.deepEqual(rondasDeLiguilla(["a"]), []);
  });
});

describe("la jornada que toca", () => {
  test("seis jugadores: la séptima vuelve a empezar por la segunda ronda", () => {
    const jugadores = ["a", "b", "c", "d", "e", "f"];
    const perfil = perfilDeLocke(6);
    assert.deepEqual(
      emparejamientosDeJornada(perfil, jugadores, 7),
      emparejamientosDeJornada(perfil, jugadores, 2),
    );
  });
  test("tres jugadores: los tres combates en la misma jornada", () => {
    const r = emparejamientosDeJornada(perfilDeLocke(3), ["a", "b", "c"], 1);
    assert.deepEqual(r.pares.map(clave).sort(), ["a-b", "a-c", "b-c"]);
    assert.equal(r.descansa, null);
  });
  test("dualocke: la jornada nace con dos combates (el tercero, si hace falta)", () => {
    const r = emparejamientosDeJornada(perfilDeLocke(2), ["a", "b"], 1);
    assert.equal(r.pares.length, 2);
  });
  test("un trío que se queda en dos juega un combate, no una serie", () => {
    const r = emparejamientosDeJornada(perfilDeLocke(3), ["a", "b"], 1);
    assert.equal(r.pares.length, 1);
  });
});
