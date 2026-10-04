/**
 * Pegar de Showdown y la ficha completa: que un equipo exportado se entienda
 * y que los movimientos tengan el tipo de su generación.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { leerShowdown } from "@/lib/showdown";
import { ataquesDeLosMovimientos, leerMovimientos, movimientoPorNombre } from "@/lib/movimientos";
import { tipoDelMovimiento } from "@/lib/tipo-del-movimiento";

describe("leerShowdown", () => {
  const [brasas, rotom, sinMote] = leerShowdown(`=== [gen9] Equipo ===

Brasas (Charizard) (M) @ Leftovers
Ability: Blaze
Shiny: Yes
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Flamethrower
- Air Slash
- Hidden Power [Ice]
- U-turn

Rotom-Wash @ Choice Scarf
- Hydro Pump

Garchomp (F)
- Earthquake`);

  test("mote, especie, objeto, naturaleza, shiny y movimientos", () => {
    assert.equal(brasas.mote, "Brasas");
    assert.equal(brasas.especie, "Charizard");
    assert.equal(brasas.pokemonId, 6);
    assert.equal(brasas.objeto, "leftovers");
    assert.equal(brasas.naturaleza, "timid");
    assert.equal(brasas.shiny, true);
    assert.deepEqual(brasas.movimientos, ["flamethrower", "air-slash", "hidden-power", "u-turn"]);
    assert.deepEqual(brasas.dudas, []);
  });

  test("las formas se quedan con su número y la especie de la aplicación", () => {
    assert.equal(rotom.pokemonId, 10009);
    assert.equal(rotom.especie, "Rotom");
    assert.equal(rotom.mote, null);
    assert.equal(rotom.objeto, "choice-scarf");
  });

  test("el sexo entre paréntesis no es un mote", () => {
    assert.equal(sinMote.especie, "Garchomp");
    assert.equal(sinMote.mote, null);
  });

  test("lo que no se conoce se dice y no tumba al resto", () => {
    const [raro] = leerShowdown("Fakemon @ Cosa Rara\n- Golpe Imaginario\n- Tackle");
    assert.equal(raro.pokemonId, null);
    assert.equal(raro.dudas.length, 3);
    assert.deepEqual(raro.movimientos, ["tackle"]);
  });
});

describe("Movimientos", () => {
  test("se encuentran en español o en inglés", () => {
    assert.equal(movimientoPorNombre("rayo")?.s, "thunderbolt");
    assert.equal(movimientoPorNombre("Thunderbolt")?.n, "Rayo");
  });

  test("el tipo es el de la generación del locke", () => {
    const mordisco = movimientoPorNombre("Mordisco")!;
    assert.equal(tipoDelMovimiento(mordisco, 1), 1); // Normal en la 1ª
    assert.equal(tipoDelMovimiento(mordisco, 2), 17); // Siniestro desde la 2ª
  });

  test("los de estado no cuentan para pegar, y lo guardado raro se ignora", () => {
    assert.deepEqual(ataquesDeLosMovimientos(["swords-dance", "earthquake"]), [{ t: 5 }]);
    assert.deepEqual(leerMovimientos(["earthquake", "no-existe", 3, "tackle", "ember", "surf", "fly"]), [
      "earthquake",
      "tackle",
      "ember",
      "surf",
    ]);
  });
});
