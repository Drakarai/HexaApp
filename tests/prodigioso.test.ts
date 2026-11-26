/**
 * El Intercambio Prodigioso: qué especie puede llegar y que el pokémon
 * fabricado sea uno que el juego (y el lector de la app) lee bien.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DE_LA_ESPECIE, candidatas, elegirEspecie, fabricarPokemon } from "@/lib/prodigioso";
import { fichaCompleta67 } from "@/lib/partida/oficial/ficha-gen67";
import { descifrar16, u16, u32 } from "@/lib/partida/oficial/comun";
import { cifrar67, pk } from "./partidas-falsas";

/** Un azar que se repite: así las pruebas dan siempre lo mismo */
function azarFijo(semilla = 1) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const todo = { porBst: false, legendarios: true, etapaPorNivel: false };

describe("Intercambio Prodigioso", () => {
  test("la etapa por nivel: a 12, Gible; a 30, Gabite; a 50, Garchomp", () => {
    const opciones = { porBst: false, legendarios: false, etapaPorNivel: true };
    const a12 = candidatas(12, 9, opciones);
    const a30 = candidatas(30, 9, opciones);
    const a50 = candidatas(50, 9, opciones);
    assert.ok(a12.includes(443) && !a12.includes(444) && !a12.includes(445));
    assert.ok(a30.includes(444) && !a30.includes(443));
    assert.ok(a50.includes(445) && !a50.includes(444));
    // Pikachu sale de un bebé: se tiene desde el principio
    assert.ok(candidatas(5, 9, opciones).includes(25));
  });

  test("sin legendarios (ni míticos ni Ultraentes) salvo que se permitan, y la Pokédex de su generación", () => {
    const sin = candidatas(100, 9, { porBst: false, legendarios: false, etapaPorNivel: false });
    assert.ok(!sin.includes(150) && !sin.includes(151) && !sin.includes(793));
    assert.ok(candidatas(100, 9, todo).includes(150));
    assert.equal(Math.max(...candidatas(100, 4, todo)), 493);
    assert.equal(Math.max(...candidatas(100, 9, todo)), 1025);
  });

  test("por BST, uno parecido al que se va", () => {
    const azar = azarFijo(7);
    for (let i = 0; i < 30; i++) {
      const dex = elegirEspecie({ nivel: 50, generacion: 9, bstDelQueSeVa: 600, opciones: { ...todo, porBst: true } }, azar);
      const bst = DE_LA_ESPECIE(dex)!.bst;
      assert.ok(bst >= 540 && bst <= 660, `${dex} tiene ${bst}`);
    }
  });

  test("fabricado sobre el que se va: se lee bien, con su nivel, sin objeto ni EV y con el entrenador de antes", () => {
    const plantilla = cifrar67(pk("ludicolo.pk7").slice(0, 0xe8));
    const antes = fichaCompleta67(plantilla, 7, false)!;
    for (const enEquipo of [false, true]) {
      const { bytes, generado } = fabricarPokemon(plantilla, { especie: 445, nivel: 50, enEquipo }, azarFijo(3));
      assert.equal(bytes.length, enEquipo ? 0x104 : 0xe8);
      const leido = fichaCompleta67(bytes, 7, true)!;
      assert.ok(leido, "el lector lo da por bueno (suma de comprobación incluida)");
      assert.equal(leido.pokemon.especie, 445);
      assert.equal(leido.nivel, 50);
      assert.equal(leido.pokemon.objeto, null);
      assert.deepEqual(leido.evs, [0, 0, 0, 0, 0, 0]);
      assert.deepEqual(leido.ivs, generado.ivs);
      assert.equal(leido.pokemon.naturaleza, generado.naturaleza);
      assert.equal(leido.pokemon.mote, null);
      assert.deepEqual(leido.pokemon.movimientos, generado.movimientos);
      assert.equal(leido.entrenador.nombre, antes.entrenador.nombre);
      assert.equal(leido.ball, "Poké Ball");
      assert.equal(leido.pokemon.habilidad, generado.habilidad);
    }
  });

  test("en el equipo lleva sus estadísticas: Garchomp a 50 con PS de su especie", () => {
    const plantilla = cifrar67(pk("ludicolo.pk7").slice(0, 0xe8));
    const { bytes, generado } = fabricarPokemon(plantilla, { especie: 445, nivel: 50, enEquipo: true }, azarFijo(5));
    // Se descifra la parte del equipo para mirar los PS: (2·108 + IV)·50/100 + 50 + 10
    const equipo = bytes.slice();
    descifrar16(equipo, 0xe8, 0x104, u32(equipo, 0));
    const esperado = Math.floor(((2 * 108 + generado.ivs[0]) * 50) / 100) + 60;
    assert.equal(equipo[0xec], 50);
    assert.equal(u16(equipo, 0xf0), esperado);
    assert.equal(u16(equipo, 0xf2), esperado);
  });
});
