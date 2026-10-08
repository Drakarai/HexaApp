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
import { escribirShowdown, formatoDelLog, leerRepeticion, leerShowdown, logDeLaPagina, paginaDeRepeticionDeAnil } from "@/lib/showdown";
import { megaPorPiedra } from "@/lib/megas";
import { habilidadesDe, habilidadesDelJuego, habilidadPorNombre, habilidadPorSlug } from "@/lib/habilidades";
import { objetosDelJuego } from "@/lib/objetos";
import { rotuloDeMega } from "@/lib/soul-link";

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

describe("Pokémon Añil: formas, megas, habilidades y objetos", () => {
  test("sus formas y megas salen en su especie solo en Añil, con sus tipos", () => {
    const etiquetas = (conAnil: boolean) => findSpecies("Venusaur", conAnil)!.forms.map((f) => f.label);
    assert.ok(etiquetas(true).includes("Mega Y"));
    assert.ok(!etiquetas(false).includes("Mega Y"));
    const corazon = findSpecies("Furfrou", true)!.forms.find((f) => f.label === "Corte Corazón")!;
    assert.deepEqual(tiposDePokemon(corazon.id, GENERACION_ANIL), [tipo("normal"), tipo("fairy")]);
  });

  test("la megapiedra: la de los juegos en todos, las de Añil solo en Añil", () => {
    assert.equal(megaPorPiedra(6, "Charizard", "charizardite-x", false), 10034);
    assert.equal(megaPorPiedra(3, "Venusaur", "venusaurite", false), 10033);
    // La de otro no hace nada
    assert.equal(megaPorPiedra(143, "Snorlax", "charizardite-x", false), null);
    // La Venusaurita Y es de Añil; allí la de siempre es la X
    assert.equal(megaPorPiedra(3, "Venusaur", "anil-venusauritey", false), null);
    const megaY = findSpecies("Venusaur", true)!.forms.find((f) => f.label === "Mega Y")!.id;
    assert.equal(megaPorPiedra(3, "Venusaur", "anil-venusauritey", true), megaY);
    assert.equal(megaPorPiedra(3, "Venusaur", "anil-venusauritex", true), 10033);
    assert.equal(megaPorPiedra(3, "Venusaur", "venusaurite", true), null);
    // Una piedra para dos formas: cada una a la suya
    const toxtricity = findSpecies("Toxtricity", true)!.forms;
    const megaGrave = toxtricity.find((f) => f.label === "Mega (Grave)")!.id;
    assert.equal(megaPorPiedra(10184, "Toxtricity", "anil-toxtricitite", true), megaGrave);
    assert.notEqual(megaPorPiedra(849, "Toxtricity", "anil-toxtricitite", true), megaGrave);
  });

  test("las habilidades de Añil, solo en Añil, con su descripción", () => {
    assert.equal(habilidadPorNombre("Realeza", false), undefined);
    assert.equal(habilidadPorNombre("Realeza", true)?.s, "anil-realeza");
    const royaleon = findSpecies("Royaleon", true)!.dex;
    assert.ok(habilidadesDe(royaleon, true).includes("anil-realeza"));
    assert.deepEqual(habilidadesDe(1, false), ["overgrow", "chlorophyll"]);
    // Entusiasmo hace otra cosa en Añil
    assert.match(habilidadPorSlug("hustle", true)!.d, /Ataque Especial/);
    assert.ok(habilidadesDelJuego(false).every((h) => !h.s.startsWith("anil-")));
  });

  test("los objetos de Añil: los suyos, y sin los que allí no hay", () => {
    const enAnil = objetosDelJuego(true).map((o) => o.slug);
    const fuera = objetosDelJuego(false).map((o) => o.slug);
    assert.ok(enAnil.includes("anil-pelucaregia") && enAnil.includes("anil-venusauritey"));
    assert.ok(!enAnil.includes("venusaurite"));
    assert.ok(fuera.includes("venusaurite") && !fuera.some((s) => s.startsWith("anil-")));
  });

  test("pegar de Showdown lee la habilidad, y lo de Añil solo en Añil", () => {
    const [comun] = leerShowdown("Venusaur @ Venusaurite\nAbility: Overgrow\n- Giga Drain");
    assert.equal(comun.habilidad, "overgrow");
    assert.equal(comun.objeto, "venusaurite");
    const [enAnil] = leerShowdown("Venusaur @ Venusaurite Y\nAbility: Realeza\n- Giga Drain", true);
    assert.equal(enAnil.objeto, "anil-venusauritey");
    assert.equal(enAnil.habilidad, "anil-realeza");
    const [fuera] = leerShowdown("Venusaur @ Venusaurite Y\nAbility: Realeza\n- Giga Drain");
    assert.equal(fuera.objeto, null);
    assert.equal(fuera.habilidad, null);
  });

  test("exportar a Showdown lo de Añil y volver a pegarlo", () => {
    const royaleon = findSpecies("Royaleon", true)!;
    const texto = escribirShowdown([
      {
        pokemonId: royaleon.dex,
        especie: "Royaleon",
        mote: null,
        shiny: false,
        objeto: "anil-venusauritey",
        habilidad: "anil-realeza",
        naturaleza: "modest",
        movimientos: ["anil-escalofrio", "hyper-voice"],
      },
    ]);
    assert.ok(texto.startsWith("Royaleon @ "));
    const [vuelta] = leerShowdown(texto, true);
    assert.equal(vuelta.pokemonId, royaleon.dex);
    assert.equal(vuelta.objeto, "anil-venusauritey");
    assert.equal(vuelta.habilidad, "anil-realeza");
    assert.deepEqual(vuelta.movimientos, ["anil-escalofrio", "hyper-voice"]);
  });

  test("las potencias de Añil y cómo se llama una mega", () => {
    assert.equal(movimientoParaVer("twister", GENERACION_ANIL)?.potencia, 60);
    assert.equal(movimientoParaVer("twister", 9)?.potencia, 40);
    assert.equal(rotuloDeMega("Mega-Charizard X", "Charizard"), "Mega X");
    assert.equal(rotuloDeMega("Mega-Venusaur", "Venusaur"), "Mega");
    assert.equal(rotuloDeMega("Mega Y", "Venusaur"), "Mega Y");
  });
});

describe("Pokémon Añil: repeticiones de su servidor", () => {
  test("se reconocen sus enlaces, con o sin .html, y nada más", () => {
    const esperada = "https://anil-showdown-replays.pages.dev/replays/2026-10-06_1222_drakarai1-vs-drakarai2_gen9anilcustom-3";
    assert.equal(paginaDeRepeticionDeAnil(esperada), esperada);
    assert.equal(paginaDeRepeticionDeAnil(`${esperada}.html`), esperada);
    assert.equal(paginaDeRepeticionDeAnil(esperada.replace("https://", "")), esperada);
    assert.equal(paginaDeRepeticionDeAnil("https://anil-showdown-replays.pages.dev/"), null);
    assert.equal(paginaDeRepeticionDeAnil("https://anil-showdown-replays.pages.dev/otra/cosa"), null);
    assert.equal(paginaDeRepeticionDeAnil("https://ejemplo.com/replays/abc"), null);
    assert.equal(paginaDeRepeticionDeAnil("https://replay.pokemonshowdown.com/gen9ou-123"), null);
  });

  test("de su página sale el combate, con sus pokémon de Añil", () => {
    // Como la escribe el mod: el registro dentro del script, con las barras escapadas
    const log = [
      "|player|p1|Drakarai1|1",
      "|player|p2|Drakarai2|2",
      "|tier|[Gen 9] Añil Custom",
      "|poke|p1|Royaleon, F|",
      "|poke|p1|Venusaur, M|",
      "|poke|p2|Cefireon, M|",
      "|switch|p1a: Reina|Royaleon, F|100\\/100",
      "|switch|p2a: Cefireon|Cefireon, M|100\\/100",
      "|detailschange|p1a: Reina|Royaleon, F",
    ].join("\n");
    const html = `<!DOCTYPE html>\n<h1>x</h1>\n<script type="text/plain" class="battle-log-data">${log}</script>\n</div>`;
    const leido = logDeLaPagina(html)!;
    assert.ok(leido.includes("100/100"));
    assert.equal(formatoDelLog(leido), "[Gen 9] Añil Custom");
    const [uno, dos] = leerRepeticion(leido, true);
    assert.equal(uno.nombre, "Drakarai1");
    assert.deepEqual(uno.equipo.map((p) => p.especie), ["Royaleon", "Venusaur"]);
    assert.equal(uno.equipo[0].pokemonId, findSpecies("Royaleon", true)!.dex);
    assert.equal(uno.equipo[0].mote, "Reina");
    assert.equal(dos.equipo[0].pokemonId, findSpecies("Cefireon", true)!.dex);
    // Fuera de Añil no se sabe quién es
    assert.equal(leerRepeticion(leido)[0].equipo[0].pokemonId, null);
    assert.equal(logDeLaPagina("<html>nada</html>"), null);
  });
});
