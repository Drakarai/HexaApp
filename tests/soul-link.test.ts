/**
 * El Soul Link: dónde va cada pokémon en el equipo y la caja, cómo se vinculan
 * las capturas, a qué evoluciona cada uno y qué cambia el estilo de juego.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  HUECOS_POR_CAJA,
  MINIMO_DE_CAJAS,
  colocar,
  companerasDe,
  mismoSitio,
  mover,
  sePuedenVincular,
  sitioParaUnaNueva,
  vinculoAlCapturar,
  vinculosDe,
  type Vinculable,
} from "@/lib/equipo-y-caja";
import { evolucionesDe } from "@/lib/evoluciones";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { categoriaDeUnaEdicion } from "@/lib/palmares";
import {
  MAXIMO_DE_CAJAS,
  elegirFondo,
  fondoDeCaja,
  leerFondos,
  leerNombresDeCaja,
  nombrarCaja,
  nombreDeCaja,
} from "@/lib/fondos-de-caja";

let reloj = 0;
const poke = (id: string, lugar: string, hueco: number) => ({ id, lugar, hueco, creado: reloj++ });

describe("colocar", () => {
  test("respeta los huecos y deja libres los que no se usan", () => {
    const { equipo, caja } = colocar([poke("a", "equipo", 0), poke("b", "equipo", 3), poke("c", "caja", 5)]);
    assert.deepEqual(equipo.map((p) => p?.id ?? null), ["a", null, null, "b", null, null]);
    // Siempre las cajas de serie, aunque solo haya un pokémon
    assert.equal(caja.length, HUECOS_POR_CAJA * MINIMO_DE_CAJAS);
    assert.equal(caja[5]?.id, "c");
  });

  test("dos en el mismo hueco: se queda el más antiguo y el otro va al primero libre", () => {
    const { equipo } = colocar([poke("viejo", "equipo", 2), poke("nuevo", "equipo", 2)]);
    assert.equal(equipo[2]?.id, "viejo");
    assert.equal(equipo[0]?.id, "nuevo");
  });

  test("un séptimo en el equipo se va a la caja", () => {
    const siete = Array.from({ length: 7 }, (_, i) => poke(`p${i}`, "equipo", i));
    const { equipo, caja } = colocar(siete);
    assert.equal(equipo.filter(Boolean).length, 6);
    assert.equal(caja.filter(Boolean).length, 1);
  });

  test("las capturas de antes, todas en el hueco 0 de la caja, se reparten", () => {
    const { caja } = colocar([poke("a", "caja", 0), poke("b", "caja", 0), poke("c", "caja", 0)]);
    assert.deepEqual(caja.slice(0, 3).map((p) => p?.id), ["a", "b", "c"]);
  });

  test("cuando se llenan las de serie, sale una caja más", () => {
    const pocas = Array.from({ length: 31 }, (_, i) => poke(`c${i}`, "caja", i));
    assert.equal(colocar(pocas).caja.length, HUECOS_POR_CAJA * MINIMO_DE_CAJAS);
    const total = HUECOS_POR_CAJA * MINIMO_DE_CAJAS + 1;
    const muchas = Array.from({ length: total }, (_, i) => poke(`c${i}`, "caja", i));
    assert.equal(colocar(muchas).caja.length, HUECOS_POR_CAJA * (MINIMO_DE_CAJAS + 1));
  });
});

describe("mover", () => {
  const base = () => [poke("a", "equipo", 0), poke("b", "equipo", 1), poke("c", "caja", 0)];

  test("a otra caja: al primer hueco libre de esa caja", () => {
    const r = mover(base(), "a", { lugar: "caja", caja: 2 });
    assert.ok("posiciones" in r);
    assert.deepEqual(r.posiciones.find((p) => p.id === "a"), {
      id: "a",
      lugar: "caja",
      hueco: HUECOS_POR_CAJA * 2,
    });
    // Si ya está en esa caja, se queda donde está
    const quieto = mover(base(), "c", { lugar: "caja", caja: 0 });
    assert.ok("posiciones" in quieto);
    assert.equal(quieto.posiciones.find((p) => p.id === "c")?.hueco, 0);
  });

  test("a una caja llena o que no existe, no", () => {
    const llena = [
      ...Array.from({ length: HUECOS_POR_CAJA }, (_, i) => poke(`l${i}`, "caja", HUECOS_POR_CAJA + i)),
      poke("x", "caja", 0),
    ];
    const r = mover(llena, "x", { lugar: "caja", caja: 1 });
    assert.ok("error" in r && /llena/.test(r.error));
    assert.ok("error" in mover(base(), "a", { lugar: "caja", caja: MINIMO_DE_CAJAS }));
  });

  test("a un hueco libre", () => {
    const r = mover(base(), "c", { lugar: "equipo", hueco: 4 });
    assert.ok("posiciones" in r);
    assert.deepEqual(r.posiciones.find((p) => p.id === "c"), { id: "c", lugar: "equipo", hueco: 4 });
  });

  test("a un hueco ocupado: se cambian", () => {
    const r = mover(base(), "c", { lugar: "equipo", hueco: 0 });
    assert.ok("posiciones" in r);
    const donde = Object.fromEntries(r.posiciones.map((p) => [p.id, `${p.lugar}${p.hueco}`]));
    assert.equal(donde.c, "equipo0");
    assert.equal(donde.a, "caja0");
    assert.equal(donde.b, "equipo1");
  });

  test("al equipo sin hueco, con el equipo lleno, no se puede", () => {
    const lleno = [...Array.from({ length: 6 }, (_, i) => poke(`e${i}`, "equipo", i)), poke("x", "caja", 0)];
    const r = mover(lleno, "x", { lugar: "equipo" });
    assert.ok("error" in r);
  });

  test("uno que no es suyo no se mueve", () => {
    assert.ok("error" in mover(base(), "zzz", { lugar: "caja", hueco: 3 }));
  });
});

test("una captura nueva va al equipo si hay hueco y si no a la caja", () => {
  assert.deepEqual(sitioParaUnaNueva([poke("a", "equipo", 0)]), { lugar: "equipo", hueco: 1 });
  const lleno = Array.from({ length: 6 }, (_, i) => poke(`e${i}`, "equipo", i));
  assert.deepEqual(sitioParaUnaNueva([...lleno, poke("c", "caja", 0)]), { lugar: "caja", hueco: 1 });
});

describe("vínculos", () => {
  const cap = (
    id: string,
    participantId: string,
    extra: Partial<Vinculable> = {},
  ): Vinculable => ({
    id,
    participantId,
    vinculo: null,
    zoneId: null,
    sitio: null,
    muerta: false,
    creado: reloj++,
    ...extra,
  });

  test("con el suelto del otro en la misma ruta, se juntan", () => {
    const otras = [cap("x", "enzo", { zoneId: "ruta1" }), cap("y", "enzo", { zoneId: "ruta2" })];
    assert.deepEqual(vinculoAlCapturar({ participantId: "pepe", zoneId: "ruta1", sitio: null }, otras), {
      juntarCon: ["x"],
    });
  });

  test("sin mapa, por el sitio escrito, sin mirar mayúsculas ni tildes", () => {
    const otras = [cap("x", "enzo", { sitio: "Ruta 1" })];
    assert.deepEqual(vinculoAlCapturar({ participantId: "pepe", zoneId: null, sitio: "ruta1" }, otras), {
      juntarCon: ["x"],
    });
    assert.ok(mismoSitio("Bosque Verde", "bosque  verde"));
    assert.ok(!mismoSitio("", ""));
  });

  test("en un Soul Link de tres, el tercero entra en el vínculo que ya hay", () => {
    const otras = [
      cap("x", "enzo", { zoneId: "ruta1", vinculo: "v1" }),
      cap("y", "ana", { zoneId: "ruta1", vinculo: "v1" }),
    ];
    // Un vínculo de dos en el que ya está pepe no sirve; este no lo tiene
    assert.deepEqual(vinculoAlCapturar({ participantId: "pepe", zoneId: "ruta1", sitio: null }, otras), {
      unirseA: "v1",
    });
  });

  test("sin nadie en esa ruta, va suelto; y lo caído no cuenta", () => {
    const otras = [cap("x", "enzo", { zoneId: "ruta1", muerta: true })];
    assert.equal(vinculoAlCapturar({ participantId: "pepe", zoneId: "ruta1", sitio: null }, otras), null);
    assert.equal(vinculoAlCapturar<Vinculable>({ participantId: "pepe", zoneId: "ruta9", sitio: null }, []), null);
  });

  test("lo suyo no se vincula consigo mismo", () => {
    const otras = [cap("x", "pepe", { zoneId: "ruta1" })];
    assert.equal(vinculoAlCapturar({ participantId: "pepe", zoneId: "ruta1", sitio: null }, otras), null);
  });

  test("un vínculo del que solo queda uno es como ir suelto", () => {
    const capturas = [cap("a", "pepe", { vinculo: "v" }), cap("b", "enzo", { vinculo: "w" })];
    assert.equal(vinculosDe(capturas).size, 0);
    assert.deepEqual(companerasDe(capturas, "a"), []);
  });

  test("las compañeras son las del mismo vínculo", () => {
    const capturas = [
      cap("a", "pepe", { vinculo: "v" }),
      cap("b", "enzo", { vinculo: "v" }),
      cap("c", "ana", { vinculo: "otro" }),
    ];
    assert.deepEqual(companerasDe(capturas, "a").map((c) => c.id), ["b"]);
  });

  test("vincular a mano: de jugadores distintos, vivos y sin repetir jugador", () => {
    const capturas = [
      cap("a", "pepe"),
      cap("b", "enzo"),
      cap("c", "pepe"),
      cap("d", "enzo", { muerta: true }),
      cap("e", "ana", { vinculo: "v" }),
      cap("f", "pepe", { vinculo: "v" }),
    ];
    assert.equal(sePuedenVincular(capturas, "a", "b"), null);
    assert.ok(sePuedenVincular(capturas, "a", "c"));
    assert.ok(sePuedenVincular(capturas, "a", "d"));
    // "e" ya va con uno de pepe: meter otro de pepe no vale
    assert.ok(sePuedenVincular(capturas, "a", "e"));
    assert.equal(sePuedenVincular(capturas, "b", "e"), null);
  });
});

describe("evoluciones", () => {
  const nombres = (opciones: { rotulo: string }[]) => opciones.map((o) => o.rotulo);

  test("Eevee: las ocho, sin límite de generación", () => {
    assert.equal(evolucionesDe(133, "Eevee").length, 8);
  });

  test("las que faltaban en HeartGold y Rojo Fuego por mirar la región", () => {
    assert.deepEqual(nombres(evolucionesDe(null, "Budew")), ["Roselia"]);
    assert.deepEqual(nombres(evolucionesDe(null, "Roselia")), ["Roserade"]);
    assert.deepEqual(nombres(evolucionesDe(null, "Magneton")), ["Magnezone"]);
    assert.deepEqual(nombres(evolucionesDe(null, "Golbat")), ["Crobat"]);
    assert.deepEqual(nombres(evolucionesDe(null, "Onix")), ["Steelix"]);
  });

  test("las formas regionales salen siempre, sin megas ni Gigamax", () => {
    assert.deepEqual(nombres(evolucionesDe(25, "Pikachu")), ["Raichu", "Raichu de Alola"]);
    assert.deepEqual(nombres(evolucionesDe(null, "Charmeleon")), ["Charizard"]);
  });

  test("las formas que sí salen de evolucionar", () => {
    assert.deepEqual(nombres(evolucionesDe(null, "Rockruff")), [
      "Lycanroc",
      "Lycanroc Nocturna",
      "Lycanroc Crepuscular",
    ]);
    // Aegislash Filo es de combate: no se evoluciona a ella
    assert.deepEqual(nombres(evolucionesDe(null, "Doublade")), ["Aegislash"]);
  });

  test("un regional evoluciona antes a su forma", () => {
    // Vulpix de Alola
    assert.equal(evolucionesDe(10103, "Vulpix")[0]?.rotulo, "Ninetales de Alola");
  });

  test("por el nombre, si la captura no guardó el número", () => {
    assert.deepEqual(nombres(evolucionesDe(null, "Cyndaquil")), ["Quilava"]);
    assert.deepEqual(evolucionesDe(null, "Typhlosion"), []);
  });
});


describe("estilo de juego", () => {
  test("un Soul Link es cooperativo: sin jornadas y se gana con la Liga", () => {
    const perfil = perfilDeLocke(2, "soullink");
    assert.equal(perfil.cooperativo, true);
    assert.equal(perfil.sinJornadas, true);
    assert.equal(perfil.victoria, "liga");
    assert.equal(perfil.serieAlMejorDe, null);
  });

  test("sin estilo, o con uno raro, es el de siempre", () => {
    assert.equal(perfilDeLocke(2).victoria, "jornadas");
    assert.equal(perfilDeLocke(2, "loquesea").cooperativo, false);
    assert.equal(perfilDeLocke(6, null).sinJornadas, false);
  });

  test("un Soul Link de uno no existe: es en solitario", () => {
    assert.equal(perfilDeLocke(1, "soullink").enSolitario, true);
    assert.equal(perfilDeLocke(1, "soullink").cooperativo, false);
  });

  test("en el palmarés va en su categoría, sea de dos o de cuatro", () => {
    assert.equal(categoriaDeUnaEdicion({ maxPlayers: 2, estilo: "soullink" }), "soullink");
    assert.equal(categoriaDeUnaEdicion({ maxPlayers: 4, estilo: "soullink" }), "soullink");
    assert.equal(categoriaDeUnaEdicion({ maxPlayers: 2, estilo: "competitivo" }), "dual");
  });
});

describe("Fondos de las cajas", () => {
  test("sin elegir nada, cada caja lleva el suyo de fábrica y van cambiando", () => {
    assert.equal(fondoDeCaja([], 0), "1");
    assert.equal(fondoDeCaja([], 1), "13");
    // Después del último de fábrica, vuelta a empezar (el liso no sale solo)
    assert.equal(fondoDeCaja([], 15), "1");
  });

  test("se guarda uno por caja y lo de fábrica va vacío", () => {
    const guardado = elegirFondo(null, 2, "5");
    assert.equal(guardado, ",,5");
    const fondos = leerFondos(guardado);
    assert.equal(fondoDeCaja(fondos, 0), "1");
    assert.equal(fondoDeCaja(fondos, 2), "5");
  });

  test("volver al de fábrica no deja la lista creciendo", () => {
    assert.equal(elegirFondo(",,5", 2, "14"), null); // la 3 es la arena de fábrica
    assert.equal(elegirFondo("3,,5", 2, "14"), "3");
  });

  test("lo que no es un fondo se lee como el de fábrica, y las cajas raras no se aceptan", () => {
    // "noche" es de los paisajes dibujados de la primera prueba
    assert.deepEqual(leerFondos("noche,liso"), [null, "liso"]);
    assert.throws(() => elegirFondo(null, -1, "2"));
    assert.throws(() => elegirFondo(null, 1.5, "2"));
    assert.throws(() => elegirFondo(null, MAXIMO_DE_CAJAS, "2"));
  });
});

describe("Nombres de las cajas", () => {
  test("sin nombre es «Caja N»; con él, el suyo", () => {
    const nombres = nombrarCaja([], 2, "  Banquillo ");
    assert.deepEqual(nombres, [null, null, "Banquillo"]);
    assert.equal(nombreDeCaja(nombres, 2), "Banquillo");
    assert.equal(nombreDeCaja(nombres, 0), "Caja 1");
  });

  test("vacío o «Caja N» le devuelve el de siempre, y no deja colas vacías", () => {
    assert.deepEqual(nombrarCaja([null, "Reservas"], 1, ""), []);
    assert.deepEqual(nombrarCaja(["Equipo B", "Reservas"], 1, "caja 2"), ["Equipo B"]);
  });

  test("se corta a 16 letras y lo raro guardado no rompe nada", () => {
    assert.equal(nombrarCaja([], 0, "Para evolucionar algún día")[0], "Para evolucionar");
    assert.deepEqual(leerNombresDeCaja("no es una lista"), []);
    assert.deepEqual(leerNombresDeCaja([3, " ", "Sí"]), [null, null, "Sí"]);
    assert.throws(() => nombrarCaja([], MAXIMO_DE_CAJAS, "Nada"));
  });
});
