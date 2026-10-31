/**
 * Las zonas del mapa al cambiar el tamaño del lienzo: que sigan encima del
 * mismo sitio de la imagen, que se sepa cuáles se han quedado fuera y qué
 * tamaño tenía seguramente.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  cajaDeVertices,
  girarVertices,
  lienzoProbable,
  pegarARecta,
  reescalarZona,
  verticesDeCaja,
  verticesDeOvalo,
  verticesValidos,
  zonasQueSeSalen,
} from "@/lib/zonas";

const rect = { x: 1000, y: 400, w: 150, h: 44, shape: "rect", points: null };

describe("Zonas al cambiar el lienzo", () => {
  test("a la mitad, todo a la mitad", () => {
    assert.deepEqual(reescalarZona(rect, 0.5, 0.5), { x: 500, y: 200, w: 75, h: 22, points: null });
  });

  test("con otras proporciones, cada eje con lo suyo", () => {
    const nueva = reescalarZona(rect, 0.5, 2);
    assert.deepEqual([nueva.x, nueva.y, nueva.w, nueva.h], [500, 800, 75, 88]);
  });

  test("un círculo sigue redondo y con el mismo centro", () => {
    const circulo = { x: 100, y: 100, w: 60, h: 60, shape: "circulo", points: null };
    const nuevo = reescalarZona(circulo, 2, 1);
    assert.equal(nuevo.w, nuevo.h);
    assert.equal(nuevo.w, 60); // el menor de los dos
    assert.equal(nuevo.x + nuevo.w / 2, 260); // centro: 130 × 2
    assert.equal(nuevo.y + nuevo.h / 2, 130);
  });

  test("los vértices de una zona a medida también se mueven", () => {
    const poly = { x: 0, y: 0, w: 100, h: 100, shape: "poly", points: [[0, 0], [100, 0], [50, 100]] as [number, number][] };
    assert.deepEqual(reescalarZona(poly, 0.5, 0.5).points, [[0, 0], [50, 0], [25, 50]]);
  });

  test("al encoger el lienzo sin moverlas, se salen", () => {
    const zonas = [rect, { ...rect, x: 100, y: 100 }, { ...rect, x: 900, shape: "none" }];
    assert.deepEqual(zonasQueSeSalen(zonas, 950, 480), [rect]);
    assert.deepEqual(zonasQueSeSalen(zonas, 1900, 960), []);
  });

  test("la que solo asoma por el borde no cuenta", () => {
    assert.deepEqual(zonasQueSeSalen([{ ...rect, x: 1800 }], 1900, 960), []);
  });

  test("el tamaño probable de antes: lo que ocupan, y como poco el de siempre", () => {
    assert.deepEqual(lienzoProbable([rect]), { ancho: 1900, alto: 960 });
    assert.deepEqual(lienzoProbable([{ x: 1800, y: 1700, w: 90, h: 95 }]), { ancho: 1900, alto: 1800 });
  });
});

describe("Zonas a medida", () => {
  test("de un rectángulo salen sus cuatro esquinas, y de ellas la misma caja", () => {
    const esquinas = verticesDeCaja(100, 50, 200, 80);
    assert.deepEqual(esquinas, [[100, 50], [300, 50], [300, 130], [100, 130]]);
    assert.deepEqual(cajaDeVertices(esquinas), { x: 100, y: 50, w: 200, h: 80 });
  });

  test("de un óvalo, ocho esquinas dentro de su caja", () => {
    const ocho = verticesDeOvalo(0, 0, 100, 60);
    assert.equal(ocho.length, 8);
    assert.deepEqual(cajaDeVertices(ocho), { x: 0, y: 0, w: 100, h: 60 });
  });

  test("girar los vértices 90° alrededor de su centro", () => {
    const girados = girarVertices([[0, 0], [100, 0], [100, 20], [0, 20]], 90);
    // Un tumbado de 100×20 pasa a uno de pie de 20×100 con el mismo centro (50, 10)
    assert.deepEqual(cajaDeVertices(girados), { x: 40, y: -40, w: 20, h: 100 });
    assert.deepEqual(girarVertices([[1, 2], [3, 4], [5, 6]], 0), [[1, 2], [3, 4], [5, 6]]);
  });

  test("una esquina que pasa cerca de la recta de su vecina se pega a ella", () => {
    const l: [number, number][] = [[0, 0], [100, 0], [100, 50], [40, 50], [40, 120], [0, 120]];
    // La 3 (40, 50) movida a (43, 47): se pega a la altura de la 2 y al ancho de la 4
    assert.deepEqual(pegarARecta(l, 3, [43, 47], 10), [40, 50]);
    // Lejos de todo, se queda donde se suelta
    assert.deepEqual(pegarARecta(l, 3, [70, 80], 10), [70, 80]);
  });

  test("lo que llega del navegador: entre 3 y 60 esquinas, números, dentro del lienzo", () => {
    assert.deepEqual(verticesValidos([[-5, 10], [50, 2000], [30.6, 40]], 1900, 960), [[0, 10], [50, 960], [31, 40]]);
    assert.equal(verticesValidos([[0, 0], [1, 1]], 100, 100), null);
    assert.equal(verticesValidos("[[0,0]]", 100, 100), null);
    assert.equal(verticesValidos([[0, 0], [1, "a"], [2, 2]], 100, 100), null);
    assert.equal(verticesValidos(Array.from({ length: 61 }, (_, i) => [i, i]), 100, 100), null);
  });
});
