/**
 * Las categorías del palmarés, por tamaño del locke.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriaDelLocke } from "@/lib/palmares";

test("uno es solitario, dos dualocke, tres o más de grupo", () => {
  assert.deepEqual([1, 2, 3, 6, 8].map(categoriaDelLocke), [
    "solitario",
    "dual",
    "grupo",
    "grupo",
    "grupo",
  ]);
});
