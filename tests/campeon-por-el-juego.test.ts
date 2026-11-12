/**
 * El dualocke en el que manda pasarse el juego y no las jornadas: el
 * interruptor «las jornadas pueden dar el título» apagado.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { campeonPorElJuego, type JugadorDelDual } from "@/lib/campeon-por-el-juego";

const jugador = (id: string, extra: Partial<JugadorDelDual> = {}): JugadorDelDual => ({
  id,
  fuera: false,
  ligaPasada: false,
  wipeos: 0,
  jornadas: 0,
  ...extra,
});

describe("campeón de un dualocke por pasarse el juego", () => {
  test("si uno pierde el locke, gana el otro aunque el que se va llevara la mayoría de jornadas", () => {
    const r = campeonPorElJuego([jugador("a", { fuera: true, jornadas: 4 }), jugador("b", { jornadas: 1 })], "a");
    assert.deepEqual(r, { tipo: "abandono", campeonId: "b", otroId: "a" });
  });

  test("sin nadie con la Liga no hay campeón, lleve quien lleve la mayoría", () => {
    assert.equal(campeonPorElJuego([jugador("a", { jornadas: 4 }), jugador("b")], "a"), null);
  });

  test("los dos con la Liga: gana quien tiene menos wipeos", () => {
    const r = campeonPorElJuego(
      [jugador("a", { ligaPasada: true, wipeos: 3, jornadas: 4 }), jugador("b", { ligaPasada: true, wipeos: 1 })],
      "a",
    );
    assert.deepEqual(r, { tipo: "juego", campeonId: "b", otroId: "a", desempate: "wipeos" });
  });

  test("los dos con la Liga y los mismos wipeos: desempatan las jornadas", () => {
    const porMayoria = campeonPorElJuego(
      [jugador("a", { ligaPasada: true, wipeos: 2, jornadas: 4 }), jugador("b", { ligaPasada: true, wipeos: 2, jornadas: 2 })],
      "a",
    );
    assert.deepEqual(porMayoria, { tipo: "juego", campeonId: "a", otroId: "b", desempate: "jornadas" });
    // Sin mayoría todavía, quien lleve más
    const porMas = campeonPorElJuego(
      [jugador("a", { ligaPasada: true, jornadas: 1 }), jugador("b", { ligaPasada: true, jornadas: 2 })],
      null,
    );
    assert.equal(porMas?.tipo === "juego" && porMas.campeonId, "b");
  });

  test("igualados en todo: decide la Jornada Final", () => {
    const r = campeonPorElJuego(
      [jugador("a", { ligaPasada: true, wipeos: 1, jornadas: 3 }), jugador("b", { ligaPasada: true, wipeos: 1, jornadas: 3 })],
      null,
    );
    assert.deepEqual(r, { tipo: "final" });
  });

  test("solo uno con la Liga: gana ya si lleva menos wipeos de los que tiene el otro", () => {
    const r = campeonPorElJuego([jugador("a", { ligaPasada: true, wipeos: 1 }), jugador("b", { wipeos: 2 })], null);
    assert.deepEqual(r, { tipo: "juego", campeonId: "a", otroId: "b", desempate: "wipeos" });
  });

  test("solo uno con la Liga y los mismos wipeos o más: el otro aún puede alcanzarle", () => {
    assert.equal(campeonPorElJuego([jugador("a", { ligaPasada: true, wipeos: 2 }), jugador("b", { wipeos: 2 })], null), null);
    assert.equal(campeonPorElJuego([jugador("a", { ligaPasada: true, wipeos: 3 }), jugador("b", { wipeos: 1 })], null), null);
  });

  test("solo vale para dos", () => {
    assert.equal(campeonPorElJuego([jugador("a", { ligaPasada: true })], null), null);
  });
});
