/**
 * HexaPost: qué se acepta al mandar algo, de qué pantalla se viene y cuántas
 * se pueden mandar al día.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  LIMITES_DEL_BUZON,
  pantallaDeLaQueVienes,
  puedeMandarOtra,
  rotuloDePantalla,
  validarSugerencia,
} from "@/lib/buzon";

const buena = { tipo: "error", titulo: "Se cae el mapa", texto: "Al tocar la Ruta 2.", pantalla: "/mapa" };

describe("HexaPost", () => {
  test("una bien rellena pasa limpia", () => {
    const r = validarSugerencia({ ...buena, titulo: "  Se   cae\nel mapa " });
    assert.ok("datos" in r);
    assert.deepEqual(r.datos, { tipo: "error", titulo: "Se cae el mapa", texto: "Al tocar la Ruta 2.", pantalla: "/mapa" });
  });

  test("sin tipo, sin resumen o sin texto, dice qué falta", () => {
    assert.match((validarSugerencia({ ...buena, tipo: "queja" }) as { error: string }).error, /error, una mejora o un cambio/);
    assert.match((validarSugerencia({ ...buena, titulo: "   " }) as { error: string }).error, /una línea/);
    assert.match((validarSugerencia({ ...buena, texto: "" }) as { error: string }).error, /Cuéntalo/);
  });

  test("lo que se pasa de largo no entra", () => {
    assert.ok("error" in validarSugerencia({ ...buena, titulo: "a".repeat(LIMITES_DEL_BUZON.titulo + 1) }));
    assert.ok("error" in validarSugerencia({ ...buena, texto: "a".repeat(LIMITES_DEL_BUZON.texto + 1) }));
    assert.ok("datos" in validarSugerencia({ ...buena, texto: "a".repeat(LIMITES_DEL_BUZON.texto) }));
  });

  test("una pantalla que no es de la lista se queda en «en general»", () => {
    const r = validarSugerencia({ ...buena, pantalla: "/no-existe" });
    assert.ok("datos" in r && r.datos.pantalla === null);
    assert.equal(rotuloDePantalla("/equipo"), "Equipo y PC");
    assert.equal(rotuloDePantalla(null), null);
  });

  test("la pantalla de la que vienes, la más larga que encaje", () => {
    assert.equal(pantallaDeLaQueVienes("/equipo?ver=abc"), "/equipo");
    assert.equal(pantallaDeLaQueVienes("/admin/mapas"), "/admin");
    assert.equal(pantallaDeLaQueVienes("/"), "/");
    // Ni el propio HexaPost ni lo que no se parece a nada
    assert.equal(pantallaDeLaQueVienes("/hexapost"), "");
    assert.equal(pantallaDeLaQueVienes("/mapache"), "");
    assert.equal(pantallaDeLaQueVienes(null), "");
  });

  test("cinco al día y no más", () => {
    assert.ok(puedeMandarOtra(0));
    assert.ok(puedeMandarOtra(LIMITES_DEL_BUZON.alDia - 1));
    assert.ok(!puedeMandarOtra(LIMITES_DEL_BUZON.alDia));
  });
});
