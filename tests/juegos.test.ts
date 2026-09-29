/**
 * Los juegos en pareja: Rojo y Azul, Rubí Omega y Zafiro Alfa… se eligen como
 * uno y cada jugador se queda con una de las dos versiones.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  grupoDePlantillaDeJuego,
  juegoPorId,
  juegosPorGrupo,
  regionesDelJuego,
  versionesDelJuego,
} from "@/lib/juegos";

const nombres = (grupo: string, actual?: string) =>
  juegosPorGrupo(actual)
    .find(([g]) => g === grupo)?.[1]
    .map((j) => j.name);

describe("juegos en pareja", () => {
  test("en cada generación, primero la pareja y luego la tercera edición", () => {
    assert.deepEqual(nombres("1ª generación"), ["Rojo y Azul", "Amarillo"]);
    assert.deepEqual(nombres("4ª generación"), ["Diamante y Perla", "Platino"]);
  });
  test("los remakes también van en pareja", () => {
    assert.deepEqual(nombres("Remakes"), [
      "Rojo Fuego y Verde Hoja",
      "HeartGold y SoulSilver",
      "Rubí Omega y Zafiro Alfa",
    ]);
  });
  test("una edición de antes con una versión suelta la sigue teniendo en la lista", () => {
    assert.ok(nombres("Remakes", "heartgold")?.includes("HeartGold"));
  });
  test("la pareja trae sus dos versiones para repartir", () => {
    assert.deepEqual(versionesDelJuego("rubiomega-zafiroalfa"), ["Rubí Omega", "Zafiro Alfa"]);
    assert.deepEqual(versionesDelJuego("platino"), []);
  });
  test("la pareja juega en la región de sus versiones y usa su plantilla", () => {
    assert.deepEqual(regionesDelJuego("heartgold-soulsilver"), ["johto", "kanto"]);
    assert.equal(grupoDePlantillaDeJuego("heartgold-soulsilver")?.nombre, "HeartGold y SoulSilver");
    assert.equal(juegoPorId("sol-luna")?.mapas?.length, 4);
  });
  test("las versiones sueltas siguen valiendo", () => {
    assert.equal(juegoPorId("heartgold")?.name, "HeartGold");
    assert.equal(grupoDePlantillaDeJuego("heartgold")?.id, "heartgold-soulsilver");
  });
});

import { repartirVersiones } from "@/lib/juegos";

describe("repartir las versiones de una pareja", () => {
  const versiones = ["Rubí Omega", "Zafiro Alfa"];
  const cuenta = (reparto: Map<string, string>) =>
    versiones.map((v) => [...reparto.values()].filter((x) => x === v).length);
  test("con cuatro, dos y dos", () => {
    assert.deepEqual(cuenta(repartirVersiones(["a", "b", "c", "d"], versiones)), [2, 2]);
  });
  test("con cinco, tres y dos, y a todos les toca una", () => {
    const r = repartirVersiones(["a", "b", "c", "d", "e"], versiones);
    assert.equal(r.size, 5);
    assert.deepEqual(cuenta(r).sort(), [2, 3]);
  });
  test("sin pareja no se reparte nada", () => {
    assert.equal(repartirVersiones(["a", "b"], ["Platino"]).size, 0);
  });
});

import { leerJuego, nombreDelJuego, versionesDeLaEdicion } from "@/lib/juegos";

describe("juegos no oficiales (fangames)", () => {
  test("Pokémon Añil sobre Rojo y Azul: su nombre y la base", () => {
    const r = leerJuego({ gameId: "rojo-azul", game: "  Pokémon   Añil ", noOficial: "on" });
    assert.deepEqual(r, { gameId: "rojo-azul", game: "Pokémon Añil", juegoNoOficial: true });
  });
  test("desde cero: sin base", () => {
    const r = leerJuego({ gameId: "", game: "Pokémon Z", noOficial: "on" });
    assert.deepEqual(r, { gameId: null, game: "Pokémon Z", juegoNoOficial: true });
  });
  test("sin nombre no vale", () => {
    assert.ok("error" in leerJuego({ gameId: "rojo-azul", game: "", noOficial: "on" }));
  });
  test("un id que no está en la lista no se guarda", () => {
    const r = leerJuego({ gameId: "inventado", game: "", noOficial: "" });
    assert.ok(!("error" in r) && r.gameId === null);
  });
  test("se llama como se escribió, no como su base", () => {
    assert.equal(nombreDelJuego("rojo-azul", "Pokémon Añil", true), "Pokémon Añil");
    assert.equal(nombreDelJuego("rojo-azul", null, false), "Rojo y Azul");
  });
  test("un fangame sobre una pareja no reparte versiones", () => {
    assert.deepEqual(versionesDeLaEdicion({ gameId: "rojo-azul", juegoNoOficial: true }), []);
    assert.equal(versionesDeLaEdicion({ gameId: "rojo-azul", juegoNoOficial: false }).length, 2);
  });
  test("con base, el mapa es el de la base", () => {
    assert.deepEqual(regionesDelJuego("rojo-azul"), ["kanto"]);
  });
});
