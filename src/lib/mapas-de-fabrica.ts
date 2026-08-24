import type { Region } from "@/lib/juegos";
import type { TipoDeZona } from "@/lib/zonas";

/**
 * Las zonas de cada región, tal y como vienen de fábrica.
 *
 * **Esto es solo la semilla.** Los mapas de verdad viven en la base de datos y
 * se editan desde Administración: renombrar, mover, añadir y quitar. De aquí
 * solo se copian la primera vez, para no tener que colocar cincuenta zonas a
 * mano; a partir de ahí manda lo que haya guardado y esta lista no vuelve a
 * tocar nada.
 *
 * Los nombres en español están escritos a mano porque **PokéAPI no los tiene**:
 * de Johto, Kanto, Sinnoh y Teselia no hay ni uno solo traducido (Hoenn, Kalos
 * y Alola sí). Si alguno no es el que sale en tu cartucho, se cambia desde
 * Administración en cinco segundos.
 *
 * Las coordenadas van sobre un lienzo de 1900×960 y son aproximadas: colocan
 * cada sitio más o menos donde está en la región. Se arrastran a gusto, y si
 * subes la imagen del mapa oficial se recolocan encima de ella.
 */

export type ZonaDeFabrica = {
  nombre: string;
  tipo: TipoDeZona;
  x: number;
  y: number;
};

export const LIENZO = { ancho: 1900, alto: 960 };

const JOHTO: ZonaDeFabrica[] = [
  { nombre: "Ruta 43", tipo: "ruta", x: 1050, y: 65 },
  { nombre: "Lago de la Furia", tipo: "agua", x: 1240, y: 65 },
  { nombre: "Guarida Dragón", tipo: "cueva", x: 1810, y: 65 },
  { nombre: "Monte Mortero", tipo: "cueva", x: 670, y: 150 },
  { nombre: "Ruta 42", tipo: "ruta", x: 860, y: 150 },
  { nombre: "Pueblo Caoba", tipo: "ciudad", x: 1050, y: 150 },
  { nombre: "Ruta 44", tipo: "ruta", x: 1240, y: 150 },
  { nombre: "Camino Helado", tipo: "cueva", x: 1430, y: 150 },
  { nombre: "Ciudad Endrino", tipo: "ciudad", x: 1620, y: 150 },
  { nombre: "Torre Campana", tipo: "otro", x: 100, y: 235 },
  { nombre: "Torre Quemada", tipo: "otro", x: 290, y: 235 },
  { nombre: "Ruta 37", tipo: "ruta", x: 480, y: 235 },
  { nombre: "Ruta 36", tipo: "ruta", x: 860, y: 235 },
  { nombre: "Torre Bellsprout", tipo: "otro", x: 1240, y: 235 },
  { nombre: "Cueva Oscura", tipo: "cueva", x: 1430, y: 235 },
  { nombre: "Ruta 45", tipo: "ruta", x: 1810, y: 235 },
  { nombre: "Zona Safari", tipo: "otro", x: 100, y: 320 },
  { nombre: "Ciudad Iris", tipo: "ciudad", x: 290, y: 320 },
  { nombre: "Parque Nacional", tipo: "otro", x: 480, y: 320 },
  { nombre: "Ciudad Malva", tipo: "ciudad", x: 1240, y: 320 },
  { nombre: "Ruta 46", tipo: "ruta", x: 1810, y: 320 },
  { nombre: "Ruta 48", tipo: "ruta", x: 100, y: 405 },
  { nombre: "Ruta 38", tipo: "ruta", x: 290, y: 405 },
  { nombre: "Ruta 35", tipo: "ruta", x: 480, y: 405 },
  { nombre: "Ruinas Alfa", tipo: "otro", x: 1050, y: 405 },
  { nombre: "Ruta 31", tipo: "ruta", x: 1430, y: 405 },
  { nombre: "Ruta 47", tipo: "ruta", x: 100, y: 490 },
  { nombre: "Ruta 39", tipo: "ruta", x: 290, y: 490 },
  { nombre: "Ciudad Trigal", tipo: "ciudad", x: 480, y: 490 },
  { nombre: "Ruta 32", tipo: "ruta", x: 1240, y: 490 },
  { nombre: "Ruta 30", tipo: "ruta", x: 1620, y: 490 },
  { nombre: "Ciudad Orquídea", tipo: "ciudad", x: 100, y: 575 },
  { nombre: "Ciudad Olivo", tipo: "ciudad", x: 290, y: 575 },
  { nombre: "Ruta 34", tipo: "ruta", x: 480, y: 575 },
  { nombre: "Cueva Unión", tipo: "cueva", x: 1240, y: 575 },
  { nombre: "Ciudad Cerezo", tipo: "ciudad", x: 1620, y: 575 },
  { nombre: "Ruta 29", tipo: "ruta", x: 1810, y: 575 },
  { nombre: "Ruta 40", tipo: "agua", x: 290, y: 660 },
  { nombre: "Bosque Verde", tipo: "bosque", x: 670, y: 660 },
  { nombre: "Ruta 33", tipo: "ruta", x: 1050, y: 660 },
  { nombre: "Cataratas Tohjo", tipo: "cueva", x: 1620, y: 660 },
  { nombre: "Pueblo Primavera", tipo: "ciudad", x: 1810, y: 660 },
  { nombre: "Cueva Acantilado", tipo: "cueva", x: 100, y: 745 },
  { nombre: "Ruta 41", tipo: "agua", x: 290, y: 745 },
  { nombre: "Pueblo Azalea", tipo: "ciudad", x: 860, y: 745 },
  { nombre: "Ruta 27", tipo: "ruta", x: 1620, y: 745 },
  { nombre: "Islas Remolino", tipo: "cueva", x: 290, y: 830 },
  { nombre: "Pozo Slowpoke", tipo: "cueva", x: 860, y: 830 },
  { nombre: "Ruta 28", tipo: "ruta", x: 1430, y: 830 },
  { nombre: "Ruta 26", tipo: "ruta", x: 1620, y: 830 },
  { nombre: "Monte Plateado", tipo: "cueva", x: 1430, y: 915 },
];

/**
 * Lo que hay hecho de fábrica. Las regiones que faltan salen en Administración
 * como mapas vacíos: se les añaden zonas a mano, o se rellenan cuando las haga.
 */
export const MAPAS_DE_FABRICA: Partial<Record<Region, ZonaDeFabrica[]>> = {
  johto: JOHTO,
};
