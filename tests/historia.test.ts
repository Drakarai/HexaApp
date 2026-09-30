/**
 * La historia de un pokémon: reconocer al mismo pokémon por las jornadas, el
 * hall y el cementerio, y contar lo que le ha pasado en orden.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  cifrasDeLaHistoria,
  esElMismo,
  leerHistoria,
  ordenarSucesos,
  type Suceso,
} from "@/lib/historia";
import { raizDeLaFamilia } from "@/lib/evoluciones";

describe("raizDeLaFamilia", () => {
  test("sube hasta el primero de la línea", () => {
    assert.equal(raizDeLaFamilia(null, "Typhlosion"), 155);
    assert.equal(raizDeLaFamilia(157, "lo que sea"), 155);
    // Pikachu viene de Pichu, que salió después
    assert.equal(raizDeLaFamilia(null, "Raichu"), 172);
  });

  test("una especie inventada no tiene familia", () => {
    assert.equal(raizDeLaFamilia(null, "Fakemon del fangame"), null);
  });
});

describe("esElMismo", () => {
  test("mismo mote y evolucionado: es el mismo", () => {
    assert.ok(
      esElMismo({ species: "Cyndaquil", nickname: "Chispas" }, { species: "Typhlosion", nickname: "chíspas " }),
    );
  });

  test("mismo mote pero otra familia: no", () => {
    assert.ok(!esElMismo({ species: "Zubat", nickname: "Chispas" }, { species: "Typhlosion", nickname: "Chispas" }));
  });

  test("otro mote en la misma familia: no", () => {
    assert.ok(!esElMismo({ species: "Zubat", nickname: "Uno" }, { species: "Golbat", nickname: "Dos" }));
  });

  test("con mote de un lado y sin él del otro: no", () => {
    assert.ok(!esElMismo({ species: "Zubat", nickname: "Uno" }, { species: "Zubat", nickname: null }));
  });

  test("sin mote ninguno: vale la familia", () => {
    assert.ok(esElMismo({ species: "Zubat", nickname: null }, { species: "Crobat", nickname: "" }));
    assert.ok(!esElMismo({ species: "Zubat", nickname: null }, { species: "Geodude", nickname: null }));
  });

  test("especie inventada: manda el mote", () => {
    assert.ok(esElMismo({ species: "Fakemon", nickname: "Rayo" }, { species: "Fakemon evolucionado", nickname: "Rayo" }));
  });
});

describe("leerHistoria", () => {
  test("se queda solo con lo que tiene la forma buena", () => {
    const buena = { tipo: "evoluciona", de: "Cyndaquil", a: "Quilava", fecha: "2026-09-01T00:00:00.000Z" };
    assert.deepEqual(leerHistoria([buena, { tipo: "otra" }, null, 3]), [buena]);
    assert.deepEqual(leerHistoria(null), []);
    assert.deepEqual(leerHistoria("[]"), []);
  });
});

describe("ordenarSucesos", () => {
  const s = (tipo: Suceso["tipo"], fecha: string | null, texto = tipo): Suceso => ({ tipo, texto, fecha });

  test("por fecha, y la captura antes que lo demás del mismo día", () => {
    const orden = ordenarSucesos([
      s("caida", "2026-09-10"),
      s("jornada", "2026-09-05"),
      s("captura", "2026-09-01"),
      s("evoluciona", "2026-09-01"),
    ]).map((x) => x.tipo);
    assert.deepEqual(orden, ["captura", "evoluciona", "jornada", "caida"]);
  });

  test("lo que no tiene fecha va donde le toca por su tipo", () => {
    const orden = ordenarSucesos([
      s("caida", "2026-09-10"),
      s("jornada", "2026-09-05"),
      s("final", null),
      s("gimnasio", null),
    ]).map((x) => x.tipo);
    assert.deepEqual(orden, ["gimnasio", "jornada", "final", "caida"]);
  });
});

describe("cifrasDeLaHistoria", () => {
  test("cuenta combates jugados, victorias, MVP y días", () => {
    const sucesos: Suceso[] = [
      { tipo: "jornada", texto: "", fecha: null, gano: true },
      { tipo: "jornada", texto: "", fecha: null, gano: false },
      { tipo: "reto", texto: "", fecha: null, gano: null },
      { tipo: "mvp", texto: "", fecha: null },
    ];
    assert.deepEqual(cifrasDeLaHistoria(sucesos, "2026-09-01T00:00:00Z", "2026-09-11T00:00:00Z"), {
      combates: 2,
      victorias: 1,
      mvps: 1,
      dias: 10,
    });
    assert.equal(cifrasDeLaHistoria([], null, "2026-09-11T00:00:00Z").dias, null);
  });
});
