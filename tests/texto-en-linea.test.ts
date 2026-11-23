/**
 * El texto de las reglas y las notas: negrita, enlaces escritos y direcciones
 * pegadas tal cual, sin dejar pasar nada que no sea http o https.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { trozosDeLinea } from "@/lib/texto-en-linea";

describe("Texto en línea", () => {
  test("sin nada especial es un solo trozo de texto", () => {
    assert.deepEqual(trozosDeLinea("Seis pokémon por equipo."), [{ tipo: "texto", texto: "Seis pokémon por equipo." }]);
  });

  test("la negrita de siempre", () => {
    assert.deepEqual(trozosDeLinea("Nada de **objetos** en combate"), [
      { tipo: "texto", texto: "Nada de " },
      { tipo: "negrita", texto: "objetos" },
      { tipo: "texto", texto: " en combate" },
    ]);
  });

  test("un enlace escrito con su texto", () => {
    assert.deepEqual(trozosDeLinea("Mira [la lista de baneos](https://claude.ai/artifact/abc) antes."), [
      { tipo: "texto", texto: "Mira " },
      { tipo: "enlace", texto: "la lista de baneos", href: "https://claude.ai/artifact/abc" },
      { tipo: "texto", texto: " antes." },
    ]);
  });

  test("una dirección pegada tal cual, sin el punto final de la frase", () => {
    assert.deepEqual(trozosDeLinea("Las reglas: https://example.com/reglas."), [
      { tipo: "texto", texto: "Las reglas: " },
      { tipo: "enlace", texto: "https://example.com/reglas", href: "https://example.com/reglas" },
      { tipo: "texto", texto: "." },
    ]);
  });

  test("entre paréntesis, el de cierre es de la frase", () => {
    const t = trozosDeLinea("(ver https://example.com/a)");
    assert.deepEqual(t[1], { tipo: "enlace", texto: "https://example.com/a", href: "https://example.com/a" });
    assert.deepEqual(t[2], { tipo: "texto", texto: ")" });
  });

  test("pero el de una dirección que abre el suyo se queda", () => {
    const t = trozosDeLinea("https://es.wikipedia.org/wiki/Pokémon_(serie)");
    assert.equal(t.length, 1);
    assert.equal(t[0].tipo === "enlace" && t[0].href, "https://es.wikipedia.org/wiki/Pokémon_(serie)");
  });

  test("solo http y https: lo demás se queda como texto", () => {
    for (const linea of ["[pulsa](javascript:alert(1))", "[foto](data:text/html,hola)", "javascript:alert(1)"]) {
      assert.ok(trozosDeLinea(linea).every((t) => t.tipo !== "enlace"), linea);
    }
  });

  test("negrita y enlaces juntos en la misma línea", () => {
    const t = trozosDeLinea("**Importante:** lee [esto](https://a.com) y https://b.com");
    assert.deepEqual(t.map((x) => x.tipo), ["negrita", "texto", "enlace", "texto", "enlace"]);
  });
});
