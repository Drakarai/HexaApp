/**
 * La GTS: cuándo se abre, los boletos, lo que se ve en el modo oculto y la
 * ficha entera que se lee de un pokémon de 6ª o 7ª.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { boletosQueQuedan, fichaParaVer, sePuedeTenerGts, ventanaDeLaGts, type FichaDeGts } from "@/lib/gts";
import { fichaCompleta67, nivelPorExperiencia } from "@/lib/partida/oficial/ficha-gen67";
import { u16 } from "@/lib/partida/oficial/comun";
import { cifrar67, pk } from "./partidas-falsas";

const checkpoint = (numero: number, jugada: boolean, hito: string) => ({
  numero,
  jugada,
  hito: { id: hito, label: `Gimnasio ${hito}` },
  jornada: { label: `Jornada ${numero}` },
});

describe("GTS", () => {
  test("solo en lockes de tres o más y nunca en un Soul Link", () => {
    assert.equal(sePuedeTenerGts({ estilo: "competitivo", maxPlayers: 2 }), false);
    assert.equal(sePuedeTenerGts({ estilo: "competitivo", maxPlayers: 3 }), true);
    assert.equal(sePuedeTenerGts({ estilo: "soullink", maxPlayers: 4 }), false);
  });

  test("se abre a quien ha pasado el level cap del primer checkpoint sin jugar", () => {
    const checkpoints = [checkpoint(1, true, "a"), checkpoint(2, false, "b"), checkpoint(3, false, "c")];
    assert.equal(ventanaDeLaGts(checkpoints, new Set(["a", "b"])).estado, "abierta");
    const falta = ventanaDeLaGts(checkpoints, new Set(["a"]));
    assert.equal(falta.estado, "falta-el-hito");
    assert.equal(falta.estado === "falta-el-hito" && falta.hito, "Gimnasio b");
    // Haber pasado el siguiente no abre nada: la jornada 2 se sigue debiendo
    assert.equal(ventanaDeLaGts(checkpoints, new Set(["a", "c"])).estado, "falta-el-hito");
  });

  test("sin jornadas por jugar está cerrada", () => {
    assert.equal(ventanaDeLaGts([checkpoint(1, true, "a")], new Set(["a"])).estado, "cerrada");
    assert.equal(ventanaDeLaGts([], new Set()).estado, "cerrada");
  });

  test("dos boletos, uno por jornada acabada, y cada intercambio gasta uno", () => {
    assert.equal(boletosQueQuedan(0, 0), 2);
    assert.equal(boletosQueQuedan(3, 1), 4);
    assert.equal(boletosQueQuedan(0, 2), 0);
    assert.equal(boletosQueQuedan(0, 5), 0);
  });

  test("en la oculta solo se ve especie, mote, nivel y sexo, salvo el dueño o ya hecho", () => {
    const ficha: FichaDeGts = {
      especie: "Ludicolo",
      pokemonId: 272,
      mote: "Pancho",
      shiny: false,
      imagen: null,
      nivel: 40,
      sexo: "M",
      naturaleza: "modest",
      habilidad: "swift-swim",
      objeto: "leftovers",
      movimientos: ["surf"],
      ivs: [31, 31, 31, 31, 31, 31],
      evs: [0, 0, 0, 252, 4, 252],
      entrenador: { nombre: "Rosso", id: 1 },
      ball: "Poké Ball",
      dePartida: true,
    };
    const oculta = fichaParaVer(ficha, { aVista: false, esSuyo: false, hecho: false });
    assert.deepEqual(Object.keys(oculta).sort(), ["especie", "imagen", "mote", "nivel", "oculta", "pokemonId", "sexo", "shiny"]);
    assert.equal(fichaParaVer(ficha, { aVista: false, esSuyo: true, hecho: false }), ficha);
    assert.equal(fichaParaVer(ficha, { aVista: false, esSuyo: false, hecho: true }), ficha);
    assert.equal(fichaParaVer(ficha, { aVista: true, esSuyo: false, hecho: false }), ficha);
  });

  test("el nivel de la caja sale de la experiencia", () => {
    // Ferropalmas (crecimiento lento): 5·92³/4 = 973 360
    assert.equal(nivelPorExperiencia(992, 973360), 92);
    assert.equal(nivelPorExperiencia(992, 973359), 91);
    assert.equal(nivelPorExperiencia(1, 0), 1);
    assert.equal(nivelPorExperiencia(1, 99_999_999), 100);
    assert.equal(nivelPorExperiencia(5000, 100), null);
  });

  test("la ficha entera de un pokémon de 7ª: IV, EV, sexo y el orden de las estadísticas", () => {
    const claro = pk("ludicolo.pk7").slice(0, 0xe8);
    // EV en el orden del juego: PS, Ataque, Defensa, Velocidad, At. Esp., Def. Esp.
    [10, 20, 30, 40, 50, 60].forEach((v, i) => (claro[0x1e + i] = v));
    // IV 1..6 en el mismo orden, sin tocar los bits de huevo y mote
    const ivs = [1, 2, 3, 4, 5, 6].reduce((acc, v, i) => acc | (v << (5 * i)), 0);
    const altos = claro[0x77] & 0xc0;
    claro[0x74] = ivs & 0xff;
    claro[0x75] = (ivs >>> 8) & 0xff;
    claro[0x76] = (ivs >>> 16) & 0xff;
    claro[0x77] = ((ivs >>> 24) & 0x3f) | altos;
    claro[0x1d] = (claro[0x1d] & ~6) | (1 << 1); // hembra
    let suma = 0;
    for (let p = 8; p < 0xe8; p += 2) suma = (suma + u16(claro, p)) & 0xffff;
    claro[6] = suma & 0xff;
    claro[7] = suma >>> 8;

    const ficha = fichaCompleta67(cifrar67(claro), 7, false)!;
    assert.equal(ficha.pokemon.especie, 272);
    assert.equal(ficha.sexo, "F");
    // En la app: PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad
    assert.deepEqual(ficha.evs, [10, 20, 30, 50, 60, 40]);
    assert.deepEqual(ficha.ivs, [1, 2, 3, 5, 6, 4]);
    assert.ok(ficha.nivel! >= 1 && ficha.nivel! <= 100);
    assert.equal(fichaCompleta67(new Uint8Array(10), 7, false), null);
  });
});
