/**
 * Escribir en una partida de Ultrasol/Ultraluna para la GTS: las
 * comprobaciones de bloque, el cambio del que se va por el que llega y lo que
 * pasa cuando el que se va estaba en el equipo y el que llega viene de una caja.
 * La firma no se prueba aquí (necesita la clave, que no está en el repositorio):
 * se comprobó con una partida de verdad que vuelve a dar la del juego.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  cambiarEnLaPartida,
  cerrarPartida,
  comprobacionesCuadran,
  estaEnLaPartida,
  huellaDe,
} from "@/lib/partida/oficial/escribir-usum";
import { leerGen67 } from "@/lib/partida/oficial/gen67";
import { u16 } from "@/lib/partida/oficial/comun";
import { cifrar67, partidaUSUMConMod, pk } from "./partidas-falsas";

const sinFirma = (region: Uint8Array) => region;
const EQUIPO = 0x1600;

/** Otro pokémon: el mismo con otra constante de cifrado, otro PID y su suma bien */
function otro(claro: Uint8Array, semilla: number) {
  const d = claro.slice(0, 0xe8);
  d[0] = semilla;
  d[0x18] = semilla;
  let suma = 0;
  for (let p = 8; p < 0xe8; p += 2) suma = (suma + u16(d, p)) & 0xffff;
  d[6] = suma & 0xff;
  d[7] = suma >>> 8;
  return cifrar67(d);
}

/** Una partida con dos en el equipo (el primero, el que se va) y bien cerrada */
function partidaConDos() {
  const claro = pk("ludicolo.pk7");
  const sav = partidaUSUMConMod(claro, { habilidad: 33, objeto: 0 });
  const segundo = otro(claro, 0x55);
  sav.set(segundo, EQUIPO + 0x104);
  sav[EQUIPO + 6 * 0x104] = 2;
  return { sav: cerrarPartida(sav, sinFirma), primero: sav.slice(EQUIPO, EQUIPO + 0xe8), claro };
}

describe("GTS: escribir la partida de USUM", () => {
  test("cerrarla deja las 39 comprobaciones cuadrando, y tocar un byte las rompe", () => {
    const { sav } = partidaConDos();
    assert.equal(comprobacionesCuadran(sav), true);
    const rota = sav.slice();
    rota[0x5200 + 100] ^= 1;
    assert.equal(comprobacionesCuadran(rota), false);
    assert.equal(comprobacionesCuadran(new Uint8Array(100)), false);
  });

  test("el que se va estaba en el equipo y el que llega viene de una caja: va a la caja y el equipo se corre", () => {
    const { sav, primero, claro } = partidaConDos();
    const llega = otro(claro, 0x77);
    const r = cambiarEnLaPartida(sav, primero, llega);
    assert.ok(!("error" in r), "error" in r ? r.error : "");
    if ("error" in r) return;
    assert.equal(r.alaCaja, true);
    const nueva = cerrarPartida(r.datos, sinFirma);
    assert.equal(comprobacionesCuadran(nueva), true);
    assert.equal(nueva[EQUIPO + 6 * 0x104], 1);
    assert.equal(estaEnLaPartida(nueva, llega), true);
    assert.equal(estaEnLaPartida(nueva, primero), false);
    const leida = leerGen67(nueva, "usum").pokemon;
    assert.deepEqual(leida.filter((p) => p.donde.lugar === "equipo").length, 1);
    assert.deepEqual(leida.find((p) => p.donde.lugar === "caja")?.donde, { lugar: "caja", caja: 0, hueco: 0 });

    // Volver a subirla no lo mete dos veces
    const otraVez = cambiarEnLaPartida(nueva, primero, llega);
    assert.ok("error" in otraVez && otraVez.yaEsta);
  });

  test("con los 0x104 del equipo ocupa su mismo hueco", () => {
    const { sav, primero, claro } = partidaConDos();
    const llega = new Uint8Array(0x104);
    llega.set(otro(claro, 0x99));
    const r = cambiarEnLaPartida(sav, primero, llega);
    if ("error" in r) throw new Error(r.error);
    assert.equal(r.alaCaja, false);
    assert.equal(r.datos[EQUIPO + 6 * 0x104], 2);
    assert.deepEqual(huellaDe(r.datos.subarray(EQUIPO, EQUIPO + 0xe8)), huellaDe(llega));
  });

  test("si no está el que se va, no se toca nada", () => {
    const { sav, claro } = partidaConDos();
    const r = cambiarEnLaPartida(sav, otro(claro, 0x11), otro(claro, 0x12));
    assert.ok("error" in r && /No encuentro/.test(r.error));
  });
});
