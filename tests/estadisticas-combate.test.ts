/**
 * Lo que hizo cada pokémon en un combate, leído del registro de Showdown.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { estadisticasDeLaRepeticion } from "@/lib/showdown";

const log = (...lineas: string[]) =>
  ["|player|p1|DrakaSD|1|", "|player|p2|Rival|2|", "|start", ...lineas].join("\n");
const de = (r: ReturnType<typeof estadisticasDeLaRepeticion>, nombre: string) => {
  const e = r.pokemon.find((p) => p.nombre === nombre);
  assert.ok(e, `no está ${nombre}`);
  return e;
};

describe("estadísticas de un combate", () => {
  test("crítico, supereficaz y KO van a quien ataca", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|switch|p1a: Brasa|Quilava, M|100/100",
        "|switch|p2a: Pikachu|Pikachu, F|100/100",
        "|turn|1",
        "|move|p1a: Brasa|Flamethrower|p2a: Pikachu",
        "|-crit|p2a: Pikachu",
        "|-supereffective|p2a: Pikachu",
        "|-damage|p2a: Pikachu|0 fnt",
        "|faint|p2a: Pikachu",
      ),
    );
    const brasa = de(r, "Brasa");
    assert.equal(brasa.kos, 1);
    assert.equal(brasa.criticosHechos, 1);
    assert.equal(brasa.supereficaces, 1);
    assert.equal(brasa.danoHecho, 100);
    assert.equal(brasa.mote, "Brasa");
    assert.equal(brasa.especie, "Quilava");
    const pika = de(r, "Pikachu");
    assert.equal(pika.criticosRecibidos, 1);
    assert.equal(pika.cayo, true);
    assert.equal(pika.mote, null, "sin mote: Showdown pone la especie");
    assert.equal(brasa.turnos, 1);
  });

  test("caer por veneno no es KO de nadie", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|switch|p1a: Brasa|Quilava, M|100/100",
        "|switch|p2a: Pikachu|Pikachu, F|100/100",
        "|move|p1a: Brasa|Ember|p2a: Pikachu",
        "|-damage|p2a: Pikachu|10/100",
        "|-damage|p2a: Pikachu|0 fnt|[from] psn",
        "|faint|p2a: Pikachu",
      ),
    );
    assert.equal(de(r, "Brasa").kos, 0);
    assert.equal(de(r, "Brasa").danoHecho, 90, "el veneno no cuenta como daño suyo");
  });

  test("quien usa Explosión no le regala el KO al que le pegó antes", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|switch|p1a: Rocoso|Graveler, M|100/100",
        "|switch|p2a: Pikachu|Pikachu, F|100/100",
        "|move|p2a: Pikachu|Thunder Shock|p1a: Rocoso",
        "|-damage|p1a: Rocoso|80/100",
        "|move|p1a: Rocoso|Explosion|p2a: Pikachu",
        "|-damage|p2a: Pikachu|0 fnt",
        "|faint|p1a: Rocoso",
        "|faint|p2a: Pikachu",
      ),
    );
    assert.equal(de(r, "Pikachu").kos, 0);
    assert.equal(de(r, "Rocoso").kos, 1);
  });

  test("en dobles, un ataque a los dos cuenta cada crítico aparte", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|switch|p1a: Ola|Gyarados, M|100/100",
        "|switch|p2a: Uno|Pidgey, M|100/100",
        "|switch|p2b: Dos|Rattata, M|100/100",
        "|move|p1a: Ola|Surf|p2a: Uno|[spread] p2a,p2b",
        "|-crit|p2a: Uno",
        "|-crit|p2b: Dos",
        "|-damage|p2a: Uno|50/100",
        "|-damage|p2b: Dos|40/100",
      ),
    );
    assert.equal(de(r, "Ola").criticosHechos, 2);
    assert.equal(de(r, "Ola").danoHecho, 110);
  });

  test("Ilusión: lo hecho disfrazado es de Zoroark, y el disfraz desaparece", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|switch|p1a: Brasa|Quilava, M|100/100",
        "|switch|p2a: Pikachu|Pikachu, F|100/100",
        "|turn|1",
        "|move|p2a: Pikachu|Night Daze|p1a: Brasa",
        "|-crit|p1a: Brasa",
        "|-damage|p1a: Brasa|0 fnt",
        "|faint|p1a: Brasa",
        "|switch|p1a: Ola|Gyarados, M|100/100",
        "|move|p1a: Ola|Waterfall|p2a: Pikachu",
        "|-damage|p2a: Pikachu|30/100",
        "|replace|p2a: Zorro|Zoroark, M",
        "|-end|p2a: Zorro|Illusion",
      ),
    );
    const zorro = de(r, "Zorro");
    assert.equal(zorro.kos, 1);
    assert.equal(zorro.criticosHechos, 1);
    assert.equal(zorro.danoRecibido, 70);
    assert.equal(zorro.especie, "Zoroark");
    assert.equal(r.pokemon.some((p) => p.nombre === "Pikachu"), false, "el disfraz no jugó");
  });

  test("fallos y esquivas", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|switch|p1a: Brasa|Quilava, M|100/100",
        "|switch|p2a: Pikachu|Pikachu, F|100/100",
        "|move|p1a: Brasa|Fire Blast|p2a: Pikachu|[miss]",
        "|-miss|p1a: Brasa|p2a: Pikachu",
      ),
    );
    assert.equal(de(r, "Brasa").fallos, 1);
    assert.equal(de(r, "Pikachu").esquivados, 1);
  });

  test("turnos perdidos: parálisis, sueño o retroceso sí; recargar no", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|switch|p1a: Brasa|Quilava, M|100/100",
        "|switch|p2a: Pikachu|Pikachu, F|100/100",
        "|cant|p1a: Brasa|par",
        "|cant|p1a: Brasa|slp",
        "|cant|p1a: Brasa|flinch",
        "|cant|p2a: Pikachu|recharge",
      ),
    );
    assert.equal(de(r, "Brasa").turnosPerdidos, 3);
    assert.equal(de(r, "Pikachu").turnosPerdidos, 0);
  });

  test("el último en pie: gana su lado y es lo único que le queda", () => {
    const r = estadisticasDeLaRepeticion(
      log(
        "|teamsize|p1|2",
        "|teamsize|p2|1",
        "|switch|p1a: Rocoso|Graveler, M|100/100",
        "|switch|p2a: Pikachu|Pikachu, F|100/100",
        "|move|p2a: Pikachu|Thunderbolt|p1a: Rocoso",
        "|-damage|p1a: Rocoso|0 fnt",
        "|faint|p1a: Rocoso",
        "|switch|p1a: Brasa|Quilava, M|100/100",
        "|move|p1a: Brasa|Flamethrower|p2a: Pikachu",
        "|-damage|p2a: Pikachu|0 fnt",
        "|faint|p2a: Pikachu",
        "|win|DrakaSD",
      ),
    );
    assert.equal(de(r, "Brasa").ultimoEnPie, true);
    assert.equal(de(r, "Rocoso").ultimoEnPie, false);
  });

  test("en un locke de Añil, sus pokémon propios se reconocen", () => {
    const registro = log("|switch|p1a: Corona|Royaleon, F|100/100", "|switch|p2a: Pikachu|Pikachu, F|100/100");
    assert.equal(de(estadisticasDeLaRepeticion(registro, true), "Corona").pokemonId, 20001);
    assert.notEqual(de(estadisticasDeLaRepeticion(registro), "Corona").pokemonId, 20001);
  });
});
