/**
 * Pegar de Showdown y la ficha completa: que un equipo exportado se entienda
 * y que los movimientos tengan el tipo de su generación.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { datosDeLaRepeticion, escribirShowdown, especieEnShowdown, leerRepeticion, leerShowdown } from "@/lib/showdown";
import { POKEDEX } from "@/lib/pokedex";
import { MOVIMIENTOS } from "@/lib/movimientos";
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

describe("leerRepeticion", () => {
  // Un combate de verdad, recortado: vista previa, salidas, megaevolución y Urshifu-*
  const log = [
    "|j|☆Pablo",
    "|player|p1|Pablo|1|",
    "|player|p2|Draka Sama|2|",
    "|teamsize|p1|3",
    "|teamsize|p2|2",
    "|gen|9",
    "|poke|p1|Garchomp, F|",
    "|poke|p1|Urshifu-*, M|",
    "|poke|p1|Charizard, M|",
    "|poke|p2|Rotom-Wash|",
    "|poke|p2|Pikachu, F|",
    "|start",
    "|switch|p1a: Chompy|Garchomp, F|100/100",
    "|switch|p2a: Rotom|Rotom-Wash|100/100",
    "|switch|p1a: Puños|Urshifu-Rapid-Strike, M|100/100",
    "|switch|p2a: Rayito|Pikachu, F, shiny|100/100",
    "|switch|p1a: Brasas|Charizard, M|100/100",
    "|detailschange|p1a: Brasas|Charizard-Mega-Y, M",
    "|switch|p1a: Chompy|Garchomp, F|50/100",
    "|switch|p1a: Brasas|Charizard-Mega-Y, M|80/100",
  ].join("\n");
  const [pablo, draka] = leerRepeticion(log);

  test("los dos jugadores, con su nombre de Showdown y sus equipos enteros", () => {
    assert.equal(pablo.nombre, "Pablo");
    assert.equal(draka.nombre, "Draka Sama");
    assert.ok(pablo.completo && draka.completo);
    assert.deepEqual(
      pablo.equipo.map((p) => [p.especie, p.mote]),
      [
        ["Garchomp", "Chompy"],
        ["Urshifu", "Puños"],
        ["Charizard", "Brasas"],
      ],
    );
  });

  test("la forma de verdad sale al salir al campo, y la mega no cambia quién es", () => {
    assert.notEqual(pablo.equipo[1].pokemonId, 892); // Urshifu de un golpe no: Fluido
    assert.equal(pablo.equipo[2].pokemonId, 6);
  });

  test("el mote que es la propia especie no es mote, y el shiny se ve al salir", () => {
    assert.equal(draka.equipo[0].mote, null);
    assert.equal(draka.equipo[0].pokemonId, 10009);
    assert.equal(draka.equipo[1].shiny, true);
  });

  test("sin vista previa, solo los que salieron, y avisando", () => {
    const [solo] = leerRepeticion("|player|p1|Enzo|\n|switch|p1a: Uno|Zubat, M|100/100\n|switch|p1a: Dos|Geodude|100/100");
    assert.equal(solo.completo, false);
    assert.deepEqual(solo.equipo.map((p) => p.mote), ["Uno", "Dos"]);
  });

  test("el enlace de la repetición, solo de Showdown", () => {
    assert.equal(
      datosDeLaRepeticion("https://replay.pokemonshowdown.com/gen9ou-2194849123?p2"),
      "https://replay.pokemonshowdown.com/gen9ou-2194849123.json",
    );
    assert.equal(
      datosDeLaRepeticion("replay.pokemonshowdown.com/gen9ou-2194849123-abc123pw"),
      "https://replay.pokemonshowdown.com/gen9ou-2194849123-abc123pw.json",
    );
    assert.equal(datosDeLaRepeticion("https://www.youtube.com/watch?v=x"), null);
    assert.equal(datosDeLaRepeticion("https://replay.pokemonshowdown.com.malo.com/gen9ou-1"), null);
  });
});

describe("escribirShowdown", () => {
  const brasas = {
    pokemonId: 6,
    especie: "Charizard",
    mote: "Brasas",
    shiny: true,
    objeto: "charizardite-x",
    habilidad: "blaze",
    naturaleza: "timid",
    movimientos: ["flamethrower", "u-turn", "will-o-wisp", "dragon-claw"],
  };

  test("el formato de Showdown, con el nivel del cap", () => {
    assert.equal(
      escribirShowdown([brasas], { nivel: 34 }),
      `Brasas (Charizard) @ Charizardite X
Ability: Blaze
Level: 34
Shiny: Yes
Timid Nature
- Flamethrower
- U-turn
- Will-O-Wisp
- Dragon Claw`,
    );
  });

  test("sin motes y sin nivel, una línea en blanco entre pokémon", () => {
    const texto = escribirShowdown(
      [brasas, { ...brasas, pokemonId: 10009, especie: "Rotom", mote: null, shiny: false, objeto: null, habilidad: null, naturaleza: null, movimientos: [] }],
      { conMotes: false },
    );
    assert.equal(texto.split("\n\n")[1], "Rotom-Wash");
    assert.ok(texto.startsWith("Charizard @ Charizardite X\n"));
    assert.ok(!texto.includes("Level"));
  });

  test("lo que se exporta se vuelve a pegar igual", () => {
    const [vuelta] = leerShowdown(escribirShowdown([brasas]));
    assert.equal(vuelta.pokemonId, 6);
    assert.equal(vuelta.mote, "Brasas");
    assert.equal(vuelta.objeto, "charizardite-x");
    assert.equal(vuelta.habilidad, "blaze");
    assert.equal(vuelta.naturaleza, "timid");
    assert.equal(vuelta.shiny, true);
    assert.deepEqual(vuelta.movimientos, brasas.movimientos);
  });

  test("los nombres que Showdown escribe distinto que PokéAPI", () => {
    assert.equal(especieEnShowdown(772, "Código Cero"), "Type: Null");
    assert.equal(especieEnShowdown(29, "Nidoran♀"), "Nidoran-F");
    assert.equal(especieEnShowdown(669, "Flabébé"), "Flabebe");
    assert.equal(especieEnShowdown(10186, "Indeedee"), "Indeedee-F");
    assert.equal(especieEnShowdown(10094, "Pikachu"), "Pikachu-Original");
    assert.equal(especieEnShowdown(10250, "Tauros"), "Tauros-Paldea-Combat");
    // La mega y el Gigamax son del combate: la especie, y la piedra hace el resto
    assert.equal(especieEnShowdown(10034, "Charizard"), "Charizard");
    assert.equal(especieEnShowdown(10196, "Charizard"), "Charizard");
  });

  test("todas las formas y todos los movimientos van y vuelven", () => {
    const delCombate = /mega|gmax|t[oó]tem|primigenia|infinito|meteorito|build|mode|own tempo|10%|50%/i;
    for (const especie of POKEDEX) {
      for (const forma of especie.forms) {
        if (delCombate.test(forma.label)) continue;
        const texto = escribirShowdown([{ ...brasas, pokemonId: forma.id, especie: especie.name, mote: null }]);
        assert.equal(leerShowdown(texto)[0].pokemonId, forma.id, `${especie.name} (${forma.label}): ${texto.split("\n")[0]}`);
      }
    }
    for (const movimiento of MOVIMIENTOS) {
      const [vuelta] = leerShowdown(escribirShowdown([{ ...brasas, movimientos: [movimiento.s] }]));
      assert.deepEqual(vuelta.movimientos, [movimiento.s], movimiento.s);
    }
  });
});
