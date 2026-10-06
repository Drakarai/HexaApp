import nombresDeShowdown from "./showdown.json";
import { queEs } from "@/lib/evoluciones";
import { findSpecies } from "@/lib/pokedex";
import { esPokemonDeAnil } from "@/lib/anil";
import { objetosDelJuego } from "@/lib/objetos";
import { habilidadPorNombre } from "@/lib/habilidades";
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
  /** La habilidad (la de antes de megaevolucionar, que es la que exporta Showdown) */
  habilidad: string | null;
  naturaleza: string | null;
  movimientos: string[];
  /** Lo que venía y no se ha entendido, para decirlo */
  dudas: string[];
};

const NUMERO: Record<string, number> = nombresDeShowdown;

/**
 * Los objetos por su nombre en inglés (el de Showdown) o en español. Los de Añil
 * van con «anil-» delante, que en su servidor no llevan: «Venusaurite Y».
 */
function objetosPorNombre(conAnil: boolean) {
  const mapa = new Map<string, string>();
  for (const objeto of objetosDelJuego(conAnil)) {
    mapa.set(plano(objeto.slug.replace(/^anil-/, "")), objeto.slug);
    mapa.set(plano(objeto.nombre), objeto.slug);
  }
  return mapa;
}
const OBJETO_POR_NOMBRE = { comun: objetosPorNombre(false), anil: objetosPorNombre(true) };

/**
 * El número de un pokémon por su nombre de Showdown. Si la forma no se
 * conoce ("Gastrodon-East", que en PokéAPI no es un pokémon aparte), se queda
 * con la especie.
 */
function numeroDe(especie: string, conAnil: boolean): number | null {
  // Royaleon y Cefireon, como los escribe el servidor de Showdown de Añil
  const deAnil = conAnil ? findSpecies(especie, true) : undefined;
  if (deAnil && esPokemonDeAnil(deAnil.dex)) return deAnil.dex;
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

export function leerShowdown(texto: string, conAnil = false): PokemonDeShowdown[] {
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
    const pokemonId = numeroDe(especie, conAnil);
    const dudas: string[] = [];
    if (!pokemonId) dudas.push(`No conozco a «${especie}».`);

    let slugObjeto: string | null = null;
    if (objeto) {
      slugObjeto = OBJETO_POR_NOMBRE[conAnil ? "anil" : "comun"].get(plano(objeto)) ?? null;
      if (!slugObjeto) dudas.push(`No conozco el objeto «${objeto}».`);
    }

    let naturaleza: string | null = null;
    let habilidad: string | null = null;
    let shiny = false;
    const movimientos: string[] = [];
    for (const linea of resto) {
      if (linea.startsWith("-")) {
        const nombre = linea.replace(/^-\s*/, "");
        // "Hidden Power [Fire]": el tipo entre corchetes no cuenta para el nombre
        const movimiento = movimientoPorNombre(nombre.replace(/\s*\[.*\]$/, ""), conAnil);
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
      const deHabilidad = /^Ability:\s*(.+)$/i.exec(linea);
      if (deHabilidad) {
        habilidad = habilidadPorNombre(deHabilidad[1], conAnil)?.s ?? null;
        if (!habilidad) dudas.push(`No conozco la habilidad «${deHabilidad[1].trim()}».`);
      }
    }

    equipo.push({
      pokemonId,
      especie: nombreDeLaEspecie(pokemonId, especie),
      // Showdown pone el mote solo si lo hay; si coincide con la especie, no es mote
      mote: mote && plano(mote) !== plano(especie) ? mote : null,
      shiny,
      objeto: slugObjeto,
      habilidad,
      naturaleza,
      movimientos,
      dudas,
    });
  }
  return equipo;
}

/**
 * Lo que se saca de una **repetición** de Showdown: los equipos de los dos (o
 * más) que jugaron, sin que nadie tenga que exportar nada. De una repetición
 * no se puede sacar el «Export» de los demás, pero el registro del combate
 * dice lo suficiente para apuntar el equipo de una jornada:
 *
 *     |player|p1|Pablo|...
 *     |poke|p1|Garchomp, F|          ← la vista previa: los seis de cada uno
 *     |switch|p1a: Chompy|Garchomp, F|100/100   ← el mote, al salir
 *
 * Con vista previa de equipos salen los seis; sin ella (algunos formatos) solo
 * los que llegaron a salir, y se avisa. Los motes salen cuando el pokémon sale
 * al campo: el que no salió se queda sin mote. Ni objetos ni naturalezas, que
 * eso la repetición no lo cuenta entero.
 */
export type JugadorDeLaRepeticion = {
  /** "p1", "p2"… */
  lado: string;
  /** Su nombre en Showdown */
  nombre: string;
  equipo: PokemonDeShowdown[];
  /** Si se vieron los seis en la vista previa, o solo los que salieron */
  completo: boolean;
};

type Visto = { especie: string; mote: string | null; shiny: boolean };

/** Las transformaciones de combate no cambian quién es en el equipo */
const EN_COMBATE = /-(Mega(-[XY])?|Gmax|Primal|Eternamax|Tera|Stellar)$/i;

/** "Urshifu-*" en la vista previa es «alguna forma de Urshifu» */
function mismaEspecie(previa: string, vista: string) {
  if (previa.endsWith("-*")) return plano(vista).startsWith(plano(previa.slice(0, -2)));
  return plano(previa) === plano(vista) || plano(previa) === plano(vista.replace(EN_COMBATE, ""));
}

export function leerRepeticion(log: string): JugadorDeLaRepeticion[] {
  const nombres = new Map<string, string>();
  const vistos = new Map<string, Visto[]>();
  const conPrevia = new Set<string>();
  const de = (lado: string) => {
    if (!vistos.has(lado)) vistos.set(lado, []);
    return vistos.get(lado)!;
  };

  for (const linea of log.split("\n")) {
    const partes = linea.split("|");
    const tipo = partes[1];
    if (tipo === "player" && partes[3]) {
      nombres.set(partes[2], partes[3]);
    } else if (tipo === "poke") {
      const lado = partes[2];
      conPrevia.add(lado);
      const detalles = (partes[3] ?? "").split(",").map((d) => d.trim());
      de(lado).push({ especie: detalles[0], mote: null, shiny: detalles.includes("shiny") });
    } else if (tipo === "switch" || tipo === "drag" || tipo === "replace") {
      // "p1a: Chompy" → lado p1 y mote Chompy
      const quien = /^(p\d)[a-z]?: (.*)$/.exec(partes[2] ?? "");
      if (!quien) continue;
      const [, lado, mote] = quien;
      const detalles = (partes[3] ?? "").split(",").map((d) => d.trim());
      const especie = detalles[0];
      const shiny = detalles.includes("shiny");
      const lista = de(lado);
      const yaVisto =
        lista.find((p) => p.mote === mote) ??
        lista.find((p) => p.mote === null && mismaEspecie(p.especie, especie));
      if (yaVisto) {
        yaVisto.mote = mote;
        yaVisto.shiny ||= shiny;
        // La forma de verdad ("Urshifu-*" → "Urshifu-Rapid-Strike"), pero no la megaevolución
        if (!EN_COMBATE.test(especie)) yaVisto.especie = especie;
      } else if (!conPrevia.has(lado) || !lista.some((p) => mismaEspecie(p.especie, especie))) {
        lista.push({ especie: especie.replace(EN_COMBATE, ""), mote, shiny });
      }
    }
  }

  return [...vistos.keys()].sort().map((lado) => ({
    lado,
    nombre: nombres.get(lado) ?? lado,
    completo: conPrevia.has(lado),
    equipo: de(lado).map((visto) => {
      const especieShowdown = visto.especie.replace(/-\*$/, "");
      const pokemonId = numeroDe(especieShowdown, false);
      // Showdown pone de mote la especie si no tiene: entonces no es mote
      const base = especieShowdown.split("-")[0];
      const esMote =
        visto.mote !== null && plano(visto.mote) !== plano(especieShowdown) && plano(visto.mote) !== plano(base);
      return {
        pokemonId,
        especie: nombreDeLaEspecie(pokemonId, especieShowdown),
        mote: esMote ? visto.mote : null,
        shiny: visto.shiny,
        objeto: null,
        habilidad: null,
        naturaleza: null,
        movimientos: [],
        dudas: pokemonId ? [] : [`No conozco a «${especieShowdown}».`],
      };
    }),
  }));
}

/**
 * De un enlace de repetición a la dirección de sus datos: el mismo
 * identificador con `.json` detrás. Vale con o sin `https://`, con la
 * contraseña de las privadas ("…-abc123pw") y con lo que se pegue detrás.
 * Solo de replay.pokemonshowdown.com: no se va a pedir nada a otro sitio.
 */
export function datosDeLaRepeticion(enlace: string): string | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(enlace.trim()) ? enlace.trim() : `https://${enlace.trim()}`);
  } catch {
    return null;
  }
  if (url.hostname !== "replay.pokemonshowdown.com") return null;
  const id = url.pathname.replace(/^\/+/, "").replace(/\.(json|log|html)$/i, "").replace(/\/+$/, "");
  if (!/^[a-z0-9]+-[a-z0-9-]+$/i.test(id)) return null;
  return `https://replay.pokemonshowdown.com/${id}.json`;
}
