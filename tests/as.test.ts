/**
 * El historial del pokémon as: quién lo fue, por qué dejó de serlo y qué sale
 * de ahí en la historia de cada pokémon.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { leerAses, nombrarAs, quitarAs, sucesosDelAs, type PokemonDelAs } from "@/lib/as";

const brasas: PokemonDelAs = { captureId: "c1", species: "Quilava", nickname: "Brasas", pokemonId: 156 };
const buho: PokemonDelAs = { captureId: "c2", species: "Noctowl", nickname: "Buho", pokemonId: 164 };
const roca: PokemonDelAs = { captureId: "c3", species: "Onix", nickname: null, pokemonId: 95 };
const del = (id: string) => (t: { captureId: string | null }) => t.captureId === id;

describe("Pokémon as", () => {
  test("el primero entra sin relevar a nadie", () => {
    const historial = nombrarAs([], brasas, null, "2026-10-01T10:00:00Z");
    assert.equal(historial.length, 1);
    const [nombrado] = sucesosDelAs(historial, del("c1"));
    assert.equal(nombrado.tipo, "as");
    assert.equal(nombrado.detalle, null);
  });

  test("relevado por uno mejor: los dos lo cuentan", () => {
    let historial = nombrarAs([], brasas, null, "2026-10-01T10:00:00Z");
    historial = nombrarAs(historial, buho, { ...brasas, caido: false }, "2026-10-05T10:00:00Z");
    const deBrasas = sucesosDelAs(historial, del("c1"));
    assert.deepEqual(
      deBrasas.map((s) => [s.tipo, s.detalle]),
      [
        ["as", null],
        ["deja-as", "le relevó Buho"],
      ],
    );
    const [deBuho] = sucesosDelAs(historial, del("c2"));
    assert.equal(deBuho.detalle, "en lugar de Brasas");
    // El de ahora sigue abierto
    assert.equal(historial.at(-1)!.hasta, null);
  });

  test("relevado porque cayó", () => {
    let historial = nombrarAs([], brasas, null, "2026-10-01T10:00:00Z");
    historial = nombrarAs(historial, roca, { ...brasas, caido: true }, "2026-10-06T10:00:00Z");
    assert.equal(sucesosDelAs(historial, del("c1"))[1].detalle, "tras caer, le relevó Onix");
    assert.equal(sucesosDelAs(historial, del("c3"))[0].detalle, "tras caer Brasas");
  });

  test("un as de antes del historial se apunta igual al relevarlo", () => {
    const antiguo = { captureId: null, species: "Typhlosion", nickname: "Llama", pokemonId: 157, caido: false };
    const historial = nombrarAs([], buho, antiguo, "2026-10-07T10:00:00Z");
    assert.equal(historial.length, 2);
    const deLlama = sucesosDelAs(historial, (t) => t.nickname === "Llama");
    // No se sabe desde cuándo lo era: solo sale que dejó de serlo
    assert.deepEqual(deLlama.map((s) => s.tipo), ["deja-as"]);
  });

  test("quitarlo cierra el turno sin decir quién releva", () => {
    const historial = quitarAs(nombrarAs([], brasas, null, "2026-10-01T10:00:00Z"), "2026-10-02T10:00:00Z");
    const [, salida] = sucesosDelAs(historial, del("c1"));
    assert.equal(salida.tipo, "deja-as");
    assert.equal(salida.detalle, null);
    assert.equal(historial[0].salida, "quitado");
  });

  test("lo guardado raro no rompe nada", () => {
    assert.deepEqual(leerAses(null), []);
    assert.deepEqual(leerAses([{ hola: 1 }, null, "x"]), []);
  });
});
