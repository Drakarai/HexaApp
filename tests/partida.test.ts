/**
 * Leer la partida de Pokémon Añil y ponerla en el Equipo y PC: el lector de
 * Marshal, lo que se saca de Essentials (con lo que el juego calcula al vuelo),
 * la traducción a los nombres de la app y el plan de qué se toca.
 *
 * La partida es de mentira pero con la forma de la de verdad: la genera
 * `scripts/partida-de-prueba.rb` con el Marshal de Ruby.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { leerMarshal, Diccionario, Objeto, Simbolo } from "@/lib/partida/marshal";
import { leerPartida, PartidaNoValida } from "@/lib/partida/essentials";
import { partidaDelNavegador, traducir, type PokemonTraducido } from "@/lib/partida/traducir";
import { planear, zonaDelSitio, type CapturaParaPlan } from "@/lib/partida/plan";

const bytes = new Uint8Array(readFileSync(path.join(__dirname, "partidas", "anil.rxdata")));
const partida = leerPartida(bytes);
const por = (especie: string) => partida.pokemon.find((p) => p.especie === especie)!;
const traducidos = partida.pokemon.map((p) => traducir(p, partida.habilidadesRandom)!);
const t = (especie: string) => traducidos.find((p) => p.especie === especie)!;

describe("Marshal", () => {
  test("lee los tipos básicos de Ruby", () => {
    // [1, -1, 300, -300, nil, true, "hola", :sim, :sim, 2**40] hecho con Marshal.dump
    const hex =
      "04085b0f690669fa69022c0169fed4fe3054492209686f6c61063a0645463a0873696d3b066c2b08000000000001";
    const v = leerMarshal(Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16)))) as unknown[];
    assert.deepEqual(v.slice(0, 7), [1, -1, 300, -300, null, true, "hola"]);
    assert.ok(v[7] instanceof Simbolo && (v[7] as Simbolo).nombre === "sim");
    assert.ok(v[8] instanceof Simbolo && (v[8] as Simbolo).nombre === "sim");
    assert.equal(v[9], 2 ** 40);
  });

  test("lo que no es Marshal no se lee", () => {
    assert.throws(() => leerMarshal(new Uint8Array([1, 2, 3])));
    assert.throws(() => leerPartida(new Uint8Array([4, 8, 0x5b, 0x00])), PartidaNoValida);
  });

  test("la partida entera, con objetos repetidos, Table, Color y números grandes", () => {
    const raiz = leerMarshal(bytes);
    assert.ok(raiz instanceof Diccionario);
    const jugador = raiz.get("player");
    assert.ok(jugador instanceof Objeto && jugador.clase === "Player");
    // El dueño es el mismo objeto en todos (una referencia «@»)
    const equipo = jugador.get("@party") as Objeto[];
    assert.equal(equipo[0].get("@owner"), equipo[1].get("@owner"));
    assert.equal(equipo[0].get("@personalID"), 3_000_000_001);
  });
});

describe("Lo que sale de la partida", () => {
  test("el equipo y las cajas, sin huevos, con su sitio", () => {
    assert.equal(partida.jugador, "Draka");
    assert.deepEqual(partida.cajas, ["Caja 1", "Caja 2", "Caídos"]);
    assert.deepEqual(
      partida.pokemon.map((p) => [p.especie, p.donde]),
      [
        ["CHARMELEON", { lugar: "equipo", hueco: 0 }],
        ["PIDGEY", { lugar: "equipo", hueco: 1 }],
        ["VULPIX", { lugar: "equipo", hueco: 2 }],
        ["ROYALEON", { lugar: "caja", caja: 0, hueco: 0 }],
        ["ABRA", { lugar: "caja", caja: 0, hueco: 2 }],
        ["RATTATA", { lugar: "caja", caja: 2, hueco: 0 }],
      ],
    );
  });

  test("lo guardado, tal cual; lo no guardado, calculado como el juego", () => {
    assert.equal(por("CHARMELEON").mote, "CHISPAS");
    assert.equal(por("CHARMELEON").naturaleza, "ADAMANT");
    assert.equal(por("CHARMELEON").shiny, false);
    // Sin nada guardado: shiny y naturaleza salen de su personalID y el ID del dueño
    assert.equal(por("PIDGEY").shiny, true);
    assert.equal(por("PIDGEY").naturaleza, "QUIET");
    assert.equal(por("PIDGEY").mote, null);
    assert.equal(por("VULPIX").forma, 1);
    assert.equal(por("VULPIX").mote, "Nieví");
    assert.equal(por("ROYALEON").textoDeObtencion, "Regalo de Bill");
  });

  test("las habilidades del modo Random, solo de las especies que hay", () => {
    assert.deepEqual(Object.keys(partida.habilidadesRandom!).sort(), ["PIDGEY", "VULPIX", "VULPIX_1"]);
  });
});

describe("Traducido a la app", () => {
  test("especie, forma, naturaleza, objeto y movimientos", () => {
    const chispas = t("Charmeleon");
    assert.equal(chispas.pokemonId, 5);
    assert.equal(chispas.naturaleza, "adamant");
    assert.equal(chispas.objeto, "leftovers");
    assert.deepEqual(chispas.movimientos, ["ember", "scratch", "dragon-breath"]);
    assert.equal(chispas.recibido, new Date(1_759_000_000 * 1000).toISOString());
    assert.equal(chispas.clave, "e0");
    assert.equal(t("Vulpix").pokemonId, 10103);
    assert.equal(t("Royaleon").pokemonId, 20001);
    assert.equal(t("Royaleon").clave, "c0-0");
  });

  test("la habilidad, como la calcula el juego", () => {
    assert.equal(t("Charmeleon").habilidad, "blaze"); // guardada
    assert.equal(t("Pidgey").habilidad, "intimidate"); // la del Random, índice 0
    assert.equal(t("Vulpix").habilidad, "sand-stream"); // la oculta del Random de su forma
    assert.equal(t("Royaleon").habilidad, "levitate"); // la de la cápsula
    assert.equal(t("Abra").habilidad, "magic-guard"); // la forzada
    // Sin Random, la de su especie en los datos de Añil
    assert.equal(traducir(por("PIDGEY"), null)!.habilidad, "keen-eye");
  });

  test("lo que llega del navegador se comprueba", () => {
    const ida = JSON.parse(JSON.stringify(partida));
    assert.deepEqual(partidaDelNavegador(ida), partida);
    const tramposa = { ...ida, pokemon: [{ especie: "PIKACHU'; DROP", donde: { lugar: "equipo", hueco: 0 } }, { especie: "PIKACHU", donde: { lugar: "equipo", hueco: 9 } }] };
    assert.equal(partidaDelNavegador(tramposa)!.pokemon.length, 0);
    assert.equal(partidaDelNavegador("nada"), null);
  });
});

describe("Ruta de una captura nueva", () => {
  const zonas = [
    { id: "r1", name: "Ruta 1", label: "Ruta 1" },
    { id: "r10", name: "Ruta 10", label: "Ruta 10" },
    { id: "celeste", name: "Ciudad Celeste", label: "Ciudad Celeste" },
    { id: "gym", name: "Ruta 10", label: "Ciudad Celeste › Ruta 10" },
  ];
  test("igual, o con algo detrás como nota", () => {
    assert.deepEqual(zonaDelSitio("Ruta 10", zonas), { zona: zonas[1], nota: null });
    assert.deepEqual(zonaDelSitio("RUTA 10", zonas), { zona: zonas[1], nota: null });
    assert.deepEqual(zonaDelSitio("Ruta 10 Norte", zonas), { zona: zonas[1], nota: "Ruta 10 Norte" });
    assert.deepEqual(zonaDelSitio("Ruta 1", zonas), { zona: zonas[0], nota: null });
  });
  test("con solo «Ruta» en común, o una parte de un número, nada", () => {
    assert.equal(zonaDelSitio("Ruta 26", zonas), null);
    assert.equal(zonaDelSitio("Ruta 100", zonas), null);
    assert.equal(zonaDelSitio("Monte Moon", zonas), null);
    assert.equal(zonaDelSitio(null, zonas), null);
  });
});

describe("El plan", () => {
  const captura = (c: Partial<CapturaParaPlan> & Pick<CapturaParaPlan, "id" | "species">): CapturaParaPlan => ({
    nickname: null,
    pokemonId: null,
    shiny: false,
    naturaleza: null,
    objeto: null,
    movimientos: [],
    habilidad: null,
    muerta: false,
    creado: "2025-09-27T00:00:00.000Z",
    ...c,
  });
  const capturas = [
    // Sin evolucionar en la app y con el mote en minúsculas
    captura({ id: "chispas", species: "Charmander", pokemonId: 4, nickname: "chispas" }),
    captura({ id: "pidgey", species: "Pidgey", pokemonId: 16 }),
    // La de Kanto en la app; en el juego es la de Alola. Sin tilde y en mayúsculas
    captura({ id: "nievi", species: "Vulpix", pokemonId: 37, nickname: "NIEVI", naturaleza: "naughty" }),
    captura({ id: "raton", species: "Rattata", pokemonId: 19, nickname: "ratón" }),
    captura({ id: "piolin", species: "Spearow", pokemonId: 21, nickname: "Piolín" }),
  ];
  const plan = planear({
    partida: traducidos,
    capturas,
    bajasSueltas: [{ id: "b-abra", species: "Abra", nickname: null }],
    zonas: [],
    cajaDeCaidos: 2,
  });
  const paso = (clave: string) => plan.pasos.find((p) => p.clave === clave);

  test("el que ya estaba se pone al día, con su evolución", () => {
    const chispas = paso("e0");
    assert.ok(chispas?.tipo === "actualizar");
    assert.equal(chispas.captureId, "chispas");
    assert.deepEqual(chispas.evoluciona, { de: "Charmander", a: "Charmeleon" });
    assert.deepEqual(chispas.datos, {
      pokemonId: 5,
      species: "Charmeleon",
      naturaleza: "adamant",
      habilidad: "blaze",
      objeto: "leftovers",
      movimientos: ["ember", "scratch", "dragon-breath"],
    });
  });

  test("sin mote, con el de su familia sin mote; el shiny solo se gana", () => {
    const pidgey = paso("e1");
    assert.ok(pidgey?.tipo === "actualizar");
    assert.equal(pidgey.captureId, "pidgey");
    assert.equal(pidgey.datos.shiny, true);
  });

  test("una forma distinta no es una evolución", () => {
    const nievi = paso("e2");
    assert.ok(nievi?.tipo === "actualizar");
    assert.equal(nievi.evoluciona, null);
    assert.equal(nievi.datos.pokemonId, 10103);
    assert.equal(nievi.cambios[0].campo, "Forma");
    // La naturaleza ya era esa: no sale
    assert.ok(!nievi.cambios.some((c) => c.campo === "Naturaleza"));
  });

  test("el que no estaba se apunta; el de la caja de caídos se da por muerto", () => {
    assert.equal(paso("c0-0")?.tipo, "nueva");
    const raton = paso("c2-0");
    assert.ok(raton?.tipo === "muere");
    assert.equal(raton.captureId, "raton");
  });

  test("lo que solo está en la app, o caído en la app, no se toca", () => {
    assert.deepEqual(plan.soloEnLaApp, ["Piolín"]);
    // Abra está vivo en el juego pero en el cementerio de la app
    assert.deepEqual(plan.caidosEnLaApp, ["Abra"]);
    assert.equal(paso("c0-2"), undefined);
  });

  test("leerla otra vez, ya al día, no cambia nada", () => {
    const despues = capturas.map((c) => {
      const p = plan.pasos.find((x) => x.tipo === "actualizar" && x.captureId === c.id);
      return p?.tipo === "actualizar" ? { ...c, ...p.datos, species: p.datos.species ?? c.species } : c.id === "raton" ? { ...c, muerta: true } : c;
    });
    const rey: PokemonTraducido = t("Royaleon");
    despues.push(
      captura({ id: "rey", species: rey.especie, pokemonId: rey.pokemonId, nickname: rey.mote, shiny: true, habilidad: rey.habilidad, movimientos: rey.movimientos, naturaleza: rey.naturaleza }),
    );
    const otra = planear({ partida: traducidos, capturas: despues, bajasSueltas: [{ id: "b-abra", species: "Abra", nickname: null }], zonas: [], cajaDeCaidos: 2 });
    assert.deepEqual(otra.pasos, []);
    assert.equal(otra.yaCaidos, 1);
  });

  test("sin caja de caídos, nadie cae", () => {
    const sin = planear({ partida: traducidos, capturas, bajasSueltas: [], zonas: [], cajaDeCaidos: null });
    assert.ok(!sin.pasos.some((p) => p.tipo === "muere" || p.tipo === "baja"));
  });
});

// ---------------------------------------------------------------------------
// Juegos oficiales
// ---------------------------------------------------------------------------

import { leerPartidaOficial } from "@/lib/partida/oficial";
import { traducirOficial, partidaOficialDelNavegador } from "@/lib/partida/traducir-oficial";
import { pk, partidaG1, partidaG2, partidaG3, partidaG4, partidaG5, partidaG6 } from "./partidas-falsas";

const oficial = (sav: Uint8Array) => {
  const p = leerPartidaOficial(sav);
  return { p, t: p.pokemon.map((x) => traducirOficial(x, p.familia)!) };
};

describe("Partidas de los juegos oficiales", () => {
  test("1ª: Rojo, con el mote y los movimientos; la especie, del número interno", () => {
    const { p, t } = oficial(partidaG1(pk("raichu.pk1")));
    assert.equal(p.familia, "rby");
    assert.equal(t[0].especie, "Raichu");
    assert.equal(t[0].mote, "RAZOR");
    assert.deepEqual(t[0].movimientos, ["thunder", "body-slam", "mega-kick", "thunderbolt"]);
    assert.equal(t[0].naturaleza, null);
    assert.equal(t[1].clave, "c0-0");
  });

  test("2ª: Cristal, con objeto y dónde se capturó; sin mote si se llama como su especie", () => {
    const { p, t } = oficial(partidaG2(pk("hitmonchan.pk2"), pk("dodrio.pk2")));
    assert.equal(p.familia, "c");
    assert.equal(t[0].mote, null);
    assert.equal(t[0].sitio, "Mt. Mortero");
    assert.equal(t[1].mote, "DORIS");
    assert.equal(t[1].objeto, "smoke-ball");
  });

  test("3ª: Rojo Fuego, descifrado, con su habilidad de entre las dos de su especie", () => {
    const { p, t } = oficial(partidaG3(pk("psyduck.pk3"), pk("jynx.pk3")));
    assert.equal(p.familia, "frlg");
    assert.equal(t[0].especie, "Psyduck");
    assert.equal(t[0].mote, null);
    assert.equal(t[0].habilidad, "damp");
    assert.equal(t[0].naturaleza, "impish");
    assert.equal(t[1].clave, "c0-2");
    assert.equal(t[1].mote, "ZYNX");
    assert.equal(t[1].habilidad, "oblivious");
    assert.equal(t[1].sitio, "(Intercambio del juego)");
  });

  test("4ª: Diamante, con la copia buena, la fecha y el sitio", () => {
    const { p, t } = oficial(partidaG4(pk("roserade.pk4"), pk("geodude.pk4")));
    assert.equal(p.familia, "dp");
    assert.equal(t[0].habilidad, "natural-cure");
    assert.equal(t[0].recibido, "2018-04-18T12:00:00.000Z");
    assert.equal(t[1].clave, "c1-5");
    assert.equal(t[1].sitio, "Ruinas Alfa");
  });

  test("5ª: Negro, firmado con su CRC, con las cajas abiertas", () => {
    const { p, t } = oficial(partidaG5(pk("roserade.pk5"), pk("blissey.pk5")));
    assert.equal(p.familia, "bw");
    assert.equal(p.cajas.length, 3);
    assert.equal(t[1].especie, "Blissey");
    assert.deepEqual(t[1].movimientos, ["pound", "helping-hand", "snore", "swagger"]);
  });

  test("6ª: X, con el lugar de Hoenn de un pokémon traído", () => {
    const { p, t } = oficial(partidaG6(pk("clefairy.pk6"), pk("ludicolo.pk7")));
    assert.equal(p.familia, "xy");
    assert.equal(t[0].habilidad, "friend-guard");
    assert.equal(t[0].sitio, "Cascada Meteoro");
    assert.equal(t[1].sitio, "Ruta 114");
    assert.equal(t[1].clave, "c1-0");
  });

  test("lo que no es una partida no se lee, y lo que llega del navegador se comprueba", () => {
    assert.throws(() => leerPartidaOficial(new Uint8Array(1234)));
    const { p } = oficial(partidaG4(pk("roserade.pk4"), pk("geodude.pk4")));
    assert.deepEqual(partidaOficialDelNavegador(JSON.parse(JSON.stringify(p))), p);
    assert.equal(partidaOficialDelNavegador({ ...p, familia: "swsh" }), null);
  });
});
