import nombresDeShowdown from "./showdown.json";
import { queEs } from "@/lib/evoluciones";
import { OBJETOS } from "@/lib/objetos";
import {
  MOVIMIENTOS_POR_POKEMON,
  movimientoPorNombre,
  naturalezaPorNombre,
  plano,
} from "@/lib/movimientos";

/**
 * Leer un equipo **exportado de Showdown** («Export» en el Teambuilder), para
 * meterlo en la aplicación sin teclear: los seis de un combate de jornada, o
 * la naturaleza, el objeto y los movimientos de un pokémon del Equipo y PC.
 *
 * Solo se lee, no se escribe: el grupo lo quiere en ese sentido. El formato es
 *
 *     Brasas (Charizard) (M) @ Leftovers
 *     Ability: Blaze
 *     Shiny: Yes
 *     Timid Nature
 *     - Flamethrower
 *     - Air Slash
 *
 * con una línea en blanco entre pokémon. Lo que no se usa (habilidad, EV, IV,
 * nivel, teratipo) se ignora sin protestar, y lo que no se reconoce se avisa
 * pero no tumba al resto.
 */

export type PokemonDeShowdown = {
  /** Número de PokéAPI, forma incluida; null si no se reconoce la especie */
  pokemonId: number | null;
  /** El nombre de la especie como lo tiene la aplicación (o el de Showdown) */
  especie: string;
  mote: string | null;
  shiny: boolean;
  /** Slugs de PokéAPI, como se guardan */
  objeto: string | null;
  naturaleza: string | null;
  movimientos: string[];
  /** Lo que venía y no se ha entendido, para decirlo */
  dudas: string[];
};

const NUMERO: Record<string, number> = nombresDeShowdown;

const OBJETO_POR_NOMBRE = new Map<string, string>();
for (const objeto of OBJETOS) {
  OBJETO_POR_NOMBRE.set(plano(objeto.slug), objeto.slug);
  OBJETO_POR_NOMBRE.set(plano(objeto.nombre), objeto.slug);
}

/**
 * El número de un pokémon por su nombre de Showdown. Si la forma no se
 * conoce ("Gastrodon-East", que en PokéAPI no es un pokémon aparte), se queda
 * con la especie.
 */
function numeroDe(especie: string): number | null {
  const exacto = NUMERO[plano(especie)];
  if (exacto) return exacto;
  const partes = especie.split("-");
  for (let i = partes.length - 1; i > 0; i--) {
    const numero = NUMERO[plano(partes.slice(0, i).join("-"))];
    if (numero) return numero;
  }
  return null;
}

/** El nombre que le da la aplicación a ese número: el de su especie */
function nombreDeLaEspecie(pokemonId: number | null, deShowdown: string) {
  if (!pokemonId) return deShowdown;
  return queEs(pokemonId, deShowdown)?.especie.name ?? deShowdown;
}

function leerPrimeraLinea(linea: string) {
  const [izquierda, ...objeto] = linea.split(" @ ");
  // Fuera el sexo, que va entre paréntesis al final: "(M)" o "(F)"
  const sinSexo = izquierda.trim().replace(/\s*\((M|F)\)\s*$/, "");
  const conMote = /^(.*\S)\s*\(([^()]+)\)$/.exec(sinSexo);
  return {
    mote: conMote ? conMote[1].trim() : null,
    especie: (conMote ? conMote[2] : sinSexo).trim(),
    objeto: objeto.join(" @ ").trim() || null,
  };
}

export function leerShowdown(texto: string): PokemonDeShowdown[] {
  const bloques = texto
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((bloque) => bloque.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lineas) => lineas.length);

  const equipo: PokemonDeShowdown[] = [];
  for (const lineas of bloques) {
    // Las cabeceras de un equipo guardado ("=== [gen9] Mi equipo ===") no son pokémon
    const [primera, ...resto] = lineas[0].startsWith("===") ? lineas.slice(1) : lineas;
    if (!primera) continue;
    const { mote, especie, objeto } = leerPrimeraLinea(primera);
    const pokemonId = numeroDe(especie);
    const dudas: string[] = [];
    if (!pokemonId) dudas.push(`No conozco a «${especie}».`);

    let slugObjeto: string | null = null;
    if (objeto) {
      slugObjeto = OBJETO_POR_NOMBRE.get(plano(objeto)) ?? null;
      if (!slugObjeto) dudas.push(`No conozco el objeto «${objeto}».`);
    }

    let naturaleza: string | null = null;
    let shiny = false;
    const movimientos: string[] = [];
    for (const linea of resto) {
      if (linea.startsWith("-")) {
        const nombre = linea.replace(/^-\s*/, "");
        // "Hidden Power [Fire]": el tipo entre corchetes no cuenta para el nombre
        const movimiento = movimientoPorNombre(nombre.replace(/\s*\[.*\]$/, ""));
        if (!movimiento) dudas.push(`No conozco el movimiento «${nombre}».`);
        else if (movimientos.length < MOVIMIENTOS_POR_POKEMON && !movimientos.includes(movimiento.s)) {
          movimientos.push(movimiento.s);
        }
        continue;
      }
      const deNaturaleza = /^(\w+)\s+Nature$/i.exec(linea);
      if (deNaturaleza) {
        naturaleza = naturalezaPorNombre(deNaturaleza[1])?.s ?? null;
        if (!naturaleza) dudas.push(`No conozco la naturaleza «${deNaturaleza[1]}».`);
        continue;
      }
      if (/^Shiny:\s*Yes$/i.test(linea)) shiny = true;
    }

    equipo.push({
      pokemonId,
      especie: nombreDeLaEspecie(pokemonId, especie),
      // Showdown pone el mote solo si lo hay; si coincide con la especie, no es mote
      mote: mote && plano(mote) !== plano(especie) ? mote : null,
      shiny,
      objeto: slugObjeto,
      naturaleza,
      movimientos,
      dudas,
    });
  }
  return equipo;
}
