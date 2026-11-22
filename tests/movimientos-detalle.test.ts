import { test } from "node:test";
import assert from "node:assert/strict";
import { detalleDelMovimiento, potenciaEnGeneracion } from "@/lib/movimientos-detalle";
import { claseEnGeneracion, movimientoParaVer } from "@/lib/movimientos";
import { GENERACION_ANIL } from "@/lib/anil";

test("los efectos salen con su probabilidad exacta", () => {
  const colmillo = detalleDelMovimiento("fire-fang", 9)!;
  assert.deepEqual(colmillo.efectos, [
    { probabilidad: 10, texto: "quema al objetivo" },
    { probabilidad: 10, texto: "amedrenta al objetivo" },
  ]);
  assert.equal(colmillo.contacto, true);
  assert.equal(colmillo.precision, 95);
  // Se bajan sus defensas siempre, y no hay suerte en lo que roba
  assert.deepEqual(detalleDelMovimiento("close-combat", 9)!.efectos, [
    { probabilidad: 100, texto: "baja la Defensa y la Def. Esp. del usuario" },
  ]);
  assert.deepEqual(detalleDelMovimiento("drain-punch", 9)!.notas, ["Recupera el 50 % del daño que causa."]);
  assert.equal(detalleDelMovimiento("swift", 9)!.precision, null);
  assert.equal(detalleDelMovimiento("quick-attack", 9)!.prioridad, 1);
});

test("con los valores de la generación del locke", () => {
  // Rayo: 95 hasta la 5ª, 90 desde la 6ª
  assert.equal(movimientoParaVer("thunderbolt", 5)!.potencia, 95);
  assert.equal(movimientoParaVer("thunderbolt", 6)!.potencia, 90);
  assert.equal(potenciaEnGeneracion("thunderbolt", 9), null);
  // Onda Trueno no fallaba hasta la 6ª
  assert.equal(detalleDelMovimiento("thunder-wave", 6)!.precision, 100);
  assert.equal(detalleDelMovimiento("thunder-wave", 7)!.precision, 90);
  // Triataque no tenía efecto en la 1ª
  assert.equal(detalleDelMovimiento("tri-attack", 1)!.efectos.length, 0);
  assert.equal(detalleDelMovimiento("tri-attack", 2)!.efectos[0].probabilidad, 20);
});

test("hasta la 3ª, físico o especial lo decide el tipo", () => {
  // Puño Fuego (Fuego) era especial; Bola Sombra (Fantasma), física
  assert.equal(movimientoParaVer("fire-punch", 3)!.clase, 2);
  assert.equal(movimientoParaVer("fire-punch", 4)!.clase, 1);
  assert.equal(movimientoParaVer("shadow-ball", 3)!.clase, 1);
  assert.equal(claseEnGeneracion(0, 10, 1), 0);
  // En Añil, como hoy
  assert.equal(movimientoParaVer("fire-punch", GENERACION_ANIL)!.clase, 1);
});
