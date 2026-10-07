/**
 * Las frases del compañero: que todas las especies tengan las suyas, que una
 * forma que no se parece a su especie no hable de otro pokémon, y lo que dice
 * de cómo va el locke.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import frasesDeEspecie from "@/lib/frases-de-especie.json";
import { frasesDeSuEspecie, frasesDeSusTipos, frasesDelLocke } from "@/lib/frases-del-companero";
import { esDeNoche, frasesDeLaHora, rellenar } from "@/lib/frases-cortas";
import { findSpecies } from "@/lib/pokedex";

const sinNada = {
  proximoRival: null,
  proximoGimnasio: null,
  victoriaContra: null,
  bajaReciente: null,
  dias: null,
  shiny: false,
  recienEvolucionado: false,
};

describe("Frases del compañero", () => {
  test("los 1025 y los de Añil tienen al menos dos, todas con su nombre", () => {
    const todas = frasesDeEspecie as Record<string, string[]>;
    for (let n = 1; n <= 1025; n++) {
      const suyas = todas[String(n)];
      assert.ok(suyas && suyas.length >= 2, `al ${n} le faltan frases`);
      for (const frase of suyas) assert.ok(frase.includes("{n}"), `${n}: «${frase}» sin {n}`);
    }
    assert.ok(todas["20001"]?.length && todas["20002"]?.length);
  });

  test("las de su especie, y las de las formas que se le parecen", () => {
    assert.ok(frasesDeSuEspecie(6, "Charizard").some((f) => f.includes("llamarada")));
    // Un Vulpix de Alola es de Hielo: nada de colas de fuego
    const alola = findSpecies("Vulpix")!.forms.find((f) => /alola/i.test(f.label))!;
    assert.deepEqual(frasesDeSuEspecie(alola.id, "Vulpix"), []);
  });

  test("las de su tipo salen de sus tipos", () => {
    const deCharizard = frasesDeSusTipos(6, 9);
    assert.ok(deCharizard.some((f) => f.includes("hoguera")));
    assert.ok(deCharizard.some((f) => f.includes("cielo")));
  });

  test("lo que dice de cómo va el locke", () => {
    assert.deepEqual(frasesDelLocke(sinNada), []);
    const frases = frasesDelLocke({
      ...sinNada,
      proximoRival: "Pablo",
      proximoGimnasio: { nombre: "Fausto", cap: 23 },
      bajaReciente: "Buho",
      dias: 60,
    });
    assert.ok(frases.includes("{n} está impaciente: te toca contra Pablo"));
    assert.ok(frases.includes("{n} entrena para Fausto: nivel máximo 23"));
    assert.ok(frases.includes("{n} echa de menos a Buho"));
    assert.ok(frases.includes("Hoy hace 2 meses que conociste a {n}"));
    assert.ok(frasesDelLocke({ ...sinNada, dias: 1 }).includes("{n} lleva 1 día a tu lado"));
  });

  test("de noche duerme, y el nombre va en su sitio", () => {
    assert.equal(esDeNoche(3), true);
    assert.equal(esDeNoche(9), false);
    assert.deepEqual(frasesDeLaHora(12), []);
    assert.equal(rellenar("{n} bosteza", "Brasas"), "Brasas bosteza");
  });
});
