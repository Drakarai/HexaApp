/**
 * Pokémon Añil: cuándo un locke lo es y qué cambia entonces (sus tipos, sus
 * pokémon nuevos y sus movimientos). Fuera de Añil todo tiene que quedarse
 * como siempre.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { esPokemonAnil, GENERACION_ANIL } from "@/lib/anil";
import { generacionDeTipos } from "@/lib/juegos";
import { debilidadesDe, tiposDePokemon, TIPOS } from "@/lib/tipos";
import { evolucionesDe, raizDeLaFamilia } from "@/lib/evoluciones";
import { findSpecies, searchSpecies } from "@/lib/pokedex";
import { movimientoParaVer, movimientoPorNombre, movimientosDelJuego } from "@/lib/movimientos";
import { leerShowdown } from "@/lib/showdown";

const tipo = (slug: string) => TIPOS.find((t) => t.slug === slug)!.id;
const fangame = (game: string) => ({ game, gameId: null, juegoNoOficial: true, tipos: null });

describe("Pokémon Añil", () => {
  test("se reconoce por el nombre del fangame, con o sin tildes", () => {
    for (const nombre of ["Pokémon Añil", "Pokemon Anil", "añil", "Pokémon Añil 2.0"]) {
      assert.equal(esPokemonAnil(fangame(nombre)), true, nombre);
    }
    for (const nombre of ["Pokémon Z", "Meseta Añil", "Pokémon Añilado", ""]) {
      assert.equal(esPokemonAnil(fangame(nombre)), false, nombre);
    }
    // Un juego oficial nunca lo es, diga lo que diga su texto libre
    assert.equal(esPokemonAnil({ game: "Pokémon Añil", gameId: "rojo-fuego", juegoNoOficial: false }), false);
  });

  test("sus tipos: los de Añil en sus lockes y los de siempre en los demás", () => {
    assert.equal(generacionDeTipos(fangame("Pokémon Añil")), GENERACION_ANIL);
    assert.equal(generacionDeTipos(fangame("Pokémon Z")), null);
    // Meganium es Planta/Hada en Añil y Planta en los juegos
    assert.deepEqual(tiposDePokemon(154, GENERACION_ANIL), [tipo("grass"), tipo("fairy")]);
    assert.deepEqual(tiposDePokemon(154, 9), [tipo("grass")]);
    // Lo que Añil no cambia, como siempre (Charizard)
    assert.deepEqual(tiposDePokemon(6, GENERACION_ANIL), tiposDePokemon(6, 9));
    // Y las debilidades salen de esos tipos: a Meganium en Añil no le hace nada el Dragón
    const dragon = debilidadesDe(154, GENERACION_ANIL).find((d) => d.slug === "dragon");
    assert.equal(dragon?.x, 0);
  });

  test("Royaleon y Cefireon solo salen en sus lockes", () => {
    assert.equal(findSpecies("Royaleon"), undefined);
    assert.equal(findSpecies("Royaleon", true)?.name, "Royaleon");
    assert.deepEqual(searchSpecies("Cefir"), []);
    assert.deepEqual(searchSpecies("Cefir", 8, true).map((e) => e.name), ["Cefireon"]);
    const cefireon = findSpecies("Cefireon", true)!;
    assert.deepEqual(tiposDePokemon(cefireon.dex, GENERACION_ANIL), [tipo("flying")]);
  });

  test("Eevee evoluciona a ellos solo en Añil, y siguen siendo de su familia", () => {
    const sinAnil = evolucionesDe(133, "Eevee").map((o) => o.especie);
    const conAnil = evolucionesDe(133, "Eevee", true).map((o) => o.especie);
    assert.ok(!sinAnil.includes("Royaleon"));
    assert.ok(conAnil.includes("Royaleon") && conAnil.includes("Cefireon"));
    assert.ok(conAnil.includes("Vaporeon"));
    const royaleon = findSpecies("Royaleon", true)!;
    assert.equal(raizDeLaFamilia(royaleon.dex, "Royaleon"), 133);
  });

  test("sus movimientos nuevos, solo en sus lockes; y Fuerza es Roca", () => {
    assert.equal(movimientoPorNombre("Escalofrio"), undefined);
    assert.equal(movimientoPorNombre("Escalofrio", true)?.n, "Escalofrío");
    assert.ok(!movimientosDelJuego(false).some((m) => m.n === "Triple Golpe"));
    assert.ok(movimientosDelJuego(true).some((m) => m.n === "Triple Golpe"));
    assert.equal(movimientoParaVer("strength", GENERACION_ANIL)?.tipo?.slug, "rock");
    assert.equal(movimientoParaVer("strength", 9)?.tipo?.slug, "normal");
  });

  test("pegar de Showdown entiende a Royaleon y Escalofrio solo en Añil", () => {
    const texto = "Royaleon @ Leftovers\nModest Nature\n- Escalofrio\n- Hyper Voice";
    const [enAnil] = leerShowdown(texto, true);
    assert.equal(enAnil.especie, "Royaleon");
    assert.ok(enAnil.pokemonId);
    assert.equal(enAnil.movimientos.length, 2);
    const [fuera] = leerShowdown(texto);
    assert.equal(fuera.pokemonId, null);
    assert.equal(fuera.movimientos.length, 1);
  });
});
