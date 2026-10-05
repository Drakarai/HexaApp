/**
 * El orden del hall de la fama según cómo se ganó el locke, los perfiles de
 * locke según cuántos sean y la tabla de tipos de cada generación.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ordenDelHall } from "@/lib/hall";
import { alMejorDeDeLaJornada, jornadasParaGanar, perfilDeLocke } from "@/lib/perfiles-de-locke";
import { coberturaOfensiva, debilidadesDe, multiplicador, tiposDePokemon, tiposDeGeneracion, TIPOS } from "@/lib/tipos";
import { fila } from "./ayudas";

const ficha = (participantId: string, seed = 1) => ({
  participantId,
  displayName: participantId,
  color: "#fff",
  avatarImage: null,
  seed,
});

describe("el hall de la fama", () => {
  test("dualocke ganado por jornadas: campeón y subcampeón, con el marcador", () => {
    const r = ordenDelHall([fila("Pablo", { points: 9 }), fila("Draka")], null, {
      champion: ficha("Draka"),
      runnerUp: ficha("Pablo", 2),
      como: "jornadas",
      jornadas: { ganadas: 4, perdidas: 2 },
      quedaPorJugar: false,
    });
    assert.deepEqual(r.podio.map((p) => [p.displayName, p.titulo]), [
      ["Draka", "Campeón"],
      ["Pablo", "Subcampeón"],
    ]);
    assert.match(r.comoLoGano, /4-2 en jornadas/);
  });
  test("por abandono: solo el campeón en el podio", () => {
    const r = ordenDelHall([fila("Draka"), fila("Pablo", { retirado: true })], null, {
      champion: ficha("Draka"),
      runnerUp: null,
      como: "abandono",
      quedaPorJugar: false,
    });
    assert.equal(r.podio.length, 1);
    assert.equal(r.jugadores[0].participantId, "Draka");
  });
  test("sin campeón no hay podio", () => {
    assert.deepEqual(ordenDelHall([fila("a"), fila("b")], null).podio, []);
  });
});

describe("perfiles de locke", () => {
  test("uno solo es un locke en solitario", () => assert.equal(perfilDeLocke(1).enSolitario, true));
  test("dos es dualocke: se gana por jornadas y cada jornada al mejor de tres", () => {
    const p = perfilDeLocke(2);
    assert.equal(p.victoria, "jornadas");
    assert.equal(p.serieAlMejorDe, 3);
  });
  test("tres o más se gana por puntos", () => assert.equal(perfilDeLocke(6).victoria, "puntos"));
  test("la mayoría: 4 de 6, 4 de 7, 3 de 5", () => {
    assert.deepEqual([6, 7, 5].map(jornadasParaGanar), [4, 4, 3]);
  });
});

describe("la serie de cada jornada", () => {
  test("en el dualocke, la elegida; sin elegir, al mejor de tres como siempre", () => {
    const dual = perfilDeLocke(2);
    assert.equal(alMejorDeDeLaJornada(1, dual), 1);
    assert.equal(alMejorDeDeLaJornada(3, dual), 3);
    assert.equal(alMejorDeDeLaJornada(null, dual), 3);
    // Algo raro en la base de datos no la rompe: la de siempre
    assert.equal(alMejorDeDeLaJornada(7, dual), 3);
  });
  test("con más gente no hay series: un combate", () => {
    assert.equal(alMejorDeDeLaJornada(3, perfilDeLocke(6)), 1);
    assert.equal(alMejorDeDeLaJornada(null, perfilDeLocke(3)), 1);
  });
});

describe("tipos de cada generación", () => {
  const FANTASMA = 8;
  const ACERO = 9;
  const FUEGO = 10;
  const BICHO = 7;
  test("el Acero resiste al Fantasma hasta la 5ª, y en la 6ª ya no", () => {
    assert.equal(multiplicador(FANTASMA, [ACERO], 5), 0.5);
    assert.equal(multiplicador(FANTASMA, [ACERO], 6), 1);
  });
  test("el Hada no existe antes de la 6ª", () => {
    assert.equal(tiposDeGeneracion(5).some((t) => t.slug === "fairy"), false);
    assert.equal(tiposDeGeneracion(7).some((t) => t.slug === "fairy"), true);
  });
  test("Clefairy es Normal en Johto y Hada en Alola", () => {
    assert.deepEqual(tiposDePokemon(35, 2), [1]);
    assert.deepEqual(tiposDePokemon(35, 7), [18]);
  });
  test("Fuego contra Bicho/Acero hace x4", () => {
    assert.equal(multiplicador(FUEGO, [BICHO, ACERO], 7), 4);
  });
});

describe("coberturaOfensiva", () => {
  const id = (slug: string) => TIPOS.find((t) => t.slug === slug)!.id;
  const de = (filas: ReturnType<typeof coberturaOfensiva>, slug: string) =>
    filas.find((f) => f.tipo.slug === slug)!;

  test("cuenta lo mejor que pega el equipo con sus propios tipos", () => {
    const filas = coberturaOfensiva(
      [
        { nombre: "Brasas", tipos: [id("fire")] },
        { nombre: "Chorro", tipos: [id("water")] },
      ],
      9,
    );
    // Al Acero le pega fuerte el fuego; a la Roca, el agua
    assert.equal(de(filas, "steel").mejor, 2);
    assert.deepEqual(de(filas, "steel").quienes, ["Brasas"]);
    assert.deepEqual(de(filas, "rock").quienes, ["Chorro"]);
    // Al Dragón no le da fuerte ninguno de los dos
    assert.ok(de(filas, "dragon").mejor < 2);
    assert.deepEqual(de(filas, "dragon").quienes, []);
  });

  test("en la 2ª generación no hay Hada que cubrir", () => {
    const filas = coberturaOfensiva([{ nombre: "X", tipos: [id("fire")] }], 2);
    assert.equal(filas.some((f) => f.tipo.slug === "fairy"), false);
  });
});

describe("debilidadesDe", () => {
  const de = (id: number, gen: number) =>
    Object.fromEntries(debilidadesDe(id, gen).map((d) => [d.slug, d.x]));

  test("Gyarados: x4 a Eléctrico, x2 a Roca, inmune a Tierra y sin los neutros", () => {
    const g = de(130, 9);
    assert.equal(g.electric, 4);
    assert.equal(g.rock, 2);
    assert.equal(g.ground, 0);
    assert.equal(g.fire, 0.5);
    assert.equal(g.normal, undefined);
  });

  test("de lo que más duele a lo que no hace nada", () => {
    const xs = debilidadesDe(130, 9).map((d) => d.x);
    assert.deepEqual(xs, [...xs].sort((a, b) => b - a));
  });

  test("con la tabla de su generación: Hada solo desde la 6ª", () => {
    // Dragonite (Dragón/Volador): el Hada le hace x2 en la 6ª y no existe en la 5ª
    assert.equal(de(149, 6).fairy, 2);
    assert.equal(de(149, 5).fairy, undefined);
  });

  test("sin saber qué pokémon es, nada", () => assert.deepEqual(debilidadesDe(null, 9), []));
});
