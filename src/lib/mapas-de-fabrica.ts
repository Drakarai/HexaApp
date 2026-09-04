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
  // El de Johto es el Bosque Encinar; "Bosque Verde" es el de Kanto, y con las
  // dos regiones en el mismo locke tenerlos con el mismo nombre despistaba
  { nombre: "Bosque Encinar", tipo: "bosque", x: 670, y: 660 },
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
 * Kanto, tal y como se juega en la 2ª generación y en HeartGold/SoulSilver:
 * la mitad que se abre al ganar la Liga de Johto.
 *
 * Vale igual para un locke de 1ª generación —la región es la misma— aunque
 * entre versiones cambie algún sitio: la Zona Safari de Ciudad Fucsia, por
 * ejemplo, ya no existe en la 2ª generación, y la Ruta 23 tampoco está en
 * todas. Como los mapas se editan desde Administración, lo que sobre se quita
 * y lo que falte se añade en cinco segundos.
 */
const KANTO: ZonaDeFabrica[] = [
  { nombre: "Meseta Añil", tipo: "ciudad", x: 100, y: 65 },
  { nombre: "Camino Victoria", tipo: "cueva", x: 290, y: 65 },
  { nombre: "Ruta 25", tipo: "ruta", x: 1240, y: 65 },
  { nombre: "Cueva Celeste", tipo: "cueva", x: 1430, y: 65 },

  { nombre: "Ruta 23", tipo: "ruta", x: 100, y: 150 },
  { nombre: "Ruta 24", tipo: "ruta", x: 1240, y: 150 },

  { nombre: "Ruta 3", tipo: "ruta", x: 670, y: 235 },
  { nombre: "Monte Moon", tipo: "cueva", x: 860, y: 235 },
  { nombre: "Ruta 4", tipo: "ruta", x: 1050, y: 235 },
  { nombre: "Ciudad Celeste", tipo: "ciudad", x: 1240, y: 235 },

  { nombre: "Ciudad Plateada", tipo: "ciudad", x: 480, y: 320 },
  { nombre: "Ruta 9", tipo: "ruta", x: 1430, y: 320 },
  { nombre: "Ruta 10", tipo: "ruta", x: 1620, y: 320 },
  { nombre: "Túnel Roca", tipo: "cueva", x: 1810, y: 320 },

  { nombre: "Bosque Verde", tipo: "bosque", x: 480, y: 405 },
  { nombre: "Ruta 5", tipo: "ruta", x: 1240, y: 405 },
  { nombre: "Central de Energía", tipo: "otro", x: 1810, y: 405 },

  { nombre: "Ruta 2", tipo: "ruta", x: 480, y: 490 },
  { nombre: "Ciudad Azulona", tipo: "ciudad", x: 860, y: 490 },
  { nombre: "Ruta 7", tipo: "ruta", x: 1050, y: 490 },
  { nombre: "Ciudad Azafrán", tipo: "ciudad", x: 1240, y: 490 },
  { nombre: "Ruta 8", tipo: "ruta", x: 1430, y: 490 },
  { nombre: "Ciudad Lavanda", tipo: "ciudad", x: 1620, y: 490 },

  { nombre: "Ruta 22", tipo: "ruta", x: 290, y: 575 },
  { nombre: "Ciudad Verde", tipo: "ciudad", x: 480, y: 575 },
  { nombre: "Ruta 16", tipo: "ruta", x: 670, y: 575 },
  { nombre: "Ruta 6", tipo: "ruta", x: 1240, y: 575 },
  { nombre: "Ruta 12", tipo: "ruta", x: 1620, y: 575 },

  { nombre: "Ruta 1", tipo: "ruta", x: 480, y: 660 },
  { nombre: "Ruta 17", tipo: "ruta", x: 670, y: 660 },
  { nombre: "Ciudad Carmín", tipo: "ciudad", x: 1240, y: 660 },
  { nombre: "Ruta 11", tipo: "ruta", x: 1430, y: 660 },
  { nombre: "Ruta 13", tipo: "ruta", x: 1620, y: 660 },

  { nombre: "Pueblo Paleta", tipo: "ciudad", x: 480, y: 745 },
  { nombre: "Ruta 18", tipo: "ruta", x: 860, y: 745 },
  { nombre: "Ciudad Fucsia", tipo: "ciudad", x: 1050, y: 745 },
  { nombre: "Ruta 15", tipo: "ruta", x: 1240, y: 745 },
  { nombre: "Ruta 14", tipo: "ruta", x: 1430, y: 745 },

  { nombre: "Mansión Pokémon", tipo: "otro", x: 100, y: 830 },
  { nombre: "Isla Canela", tipo: "ciudad", x: 290, y: 830 },
  { nombre: "Ruta 21", tipo: "agua", x: 480, y: 830 },
  { nombre: "Ruta 20", tipo: "agua", x: 670, y: 830 },
  { nombre: "Islas Espuma", tipo: "cueva", x: 860, y: 830 },
  { nombre: "Ruta 19", tipo: "agua", x: 1050, y: 830 },
];

/**
 * Lo que hay hecho de fábrica. Las regiones que faltan salen en Administración
 * como mapas vacíos: se les añaden zonas a mano, o se rellenan cuando las haga.
 */
export const MAPAS_DE_FABRICA: Partial<Record<Region, ZonaDeFabrica[]>> = {
  johto: JOHTO,
  kanto: KANTO,
};
