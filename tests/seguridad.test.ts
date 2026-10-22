/**
 * La seguridad de entrar: cuándo se frena a quien falla y qué contraseñas
 * valen.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRASENA_MINIMA,
  LIMITES_DE_ENTRADA,
  minutosDeEspera,
  problemaDeContrasena,
} from "@/lib/seguridad";

const ahora = new Date("2026-10-22T20:00:00Z");
const haceMinutos = (m: number) => new Date(ahora.getTime() - m * 60_000);
const fallos = (n: number, cada = 1) => Array.from({ length: n }, (_, i) => haceMinutos(i * cada));

describe("Freno al entrar", () => {
  test("con menos fallos de la cuenta se puede seguir probando", () => {
    assert.equal(
      minutosDeEspera({ fallosDelUsuario: fallos(LIMITES_DE_ENTRADA.porUsuario - 1), fallosDeLaRed: [], ahora }),
      0,
    );
  });

  test("al llegar al límite hay que esperar a que el más viejo salga de la ventana", () => {
    // Cinco fallos, uno por minuto: el quinto fue hace 4 minutos, sale en 11
    const espera = minutosDeEspera({ fallosDelUsuario: fallos(5), fallosDeLaRed: [], ahora });
    assert.equal(espera, LIMITES_DE_ENTRADA.ventanaMinutos - 4);
  });

  test("los fallos viejos ya no cuentan", () => {
    const viejos = fallos(10).map((f) => new Date(f.getTime() - 60 * 60_000));
    assert.equal(minutosDeEspera({ fallosDelUsuario: viejos, fallosDeLaRed: viejos, ahora }), 0);
  });

  test("desde una misma red se toleran más, pero no sin fin", () => {
    // Medio minuto entre uno y otro: todos dentro de la ventana
    assert.equal(minutosDeEspera({ fallosDelUsuario: [], fallosDeLaRed: fallos(LIMITES_DE_ENTRADA.porRed - 1, 0.5), ahora }), 0);
    assert.ok(minutosDeEspera({ fallosDelUsuario: [], fallosDeLaRed: fallos(LIMITES_DE_ENTRADA.porRed, 0.5), ahora }) > 0);
  });

  test("nunca se pide esperar cero minutos estando frenado", () => {
    // El decisivo (el quinto, de hace 4 minutos) se lleva hasta un segundo antes de salir
    const casi = fallos(5).map((f) => new Date(f.getTime() - (LIMITES_DE_ENTRADA.ventanaMinutos - 4) * 60_000 + 1_000));
    assert.equal(minutosDeEspera({ fallosDelUsuario: casi, fallosDeLaRed: [], ahora }), 1);
  });
});

describe("Contraseñas", () => {
  test("cortas, no", () => {
    assert.ok(problemaDeContrasena("a".repeat(CONTRASENA_MINIMA - 1)));
  });

  test("las que se prueban primero, tampoco", () => {
    for (const mala of ["12345678", "Password", "contraseña", "aaaaaaaa", "pokemon123"]) {
      assert.ok(problemaDeContrasena(mala), mala);
    }
  });

  test("ni el propio usuario dentro, salvo que el usuario sea muy corto", () => {
    assert.ok(problemaDeContrasena("draka2026!", "draka"));
    assert.ok(problemaDeContrasena("ana", "ana"));
    assert.equal(problemaDeContrasena("bananas-al-sol", "ana"), null);
  });

  test("una normal vale (y la de los datos de ejemplo también)", () => {
    assert.equal(problemaDeContrasena("rutas-y-gimnasios", "hector"), null);
    assert.equal(problemaDeContrasena("hexalocke", "draka"), null);
  });
});
