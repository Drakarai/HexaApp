import nombresDeShowdown from "./showdown.json";
import { queEs } from "@/lib/evoluciones";
import { findSpecies, POKEDEX } from "@/lib/pokedex";
import { esPokemonDeAnil } from "@/lib/anil";
import { objetosDelJuego } from "@/lib/objetos";
import { habilidadPorNombre, habilidadPorSlug } from "@/lib/habilidades";
import {
  MOVIMIENTOS_POR_POKEMON,
  movimientoPorNombre,
  movimientoPorSlug,
  naturalezaPorNombre,
  plano,
} from "@/lib/movimientos";

/**
 * Leer un equipo **exportado de Showdown** («Export» en el Teambuilder), para
 * meterlo en la aplicación sin teclear: los seis de un combate de jornada, o
 * la naturaleza, el objeto y los movimientos de un pokémon del Equipo y PC.
 * Y al revés: **escribir** el equipo del Equipo y PC para pegarlo en el
 * Teambuilder («Import from text») y probar el combate (`escribirShowdown`,
 * más abajo). El formato es
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
  const exacto = formasDeShowdown().get(plano(especie)) ?? NUMERO[plano(especie)];
  if (exacto) return exacto;
  const partes = especie.split("-");
  for (let i = partes.length - 1; i > 0; i--) {
    const numero = NUMERO[plano(partes.slice(0, i).join("-"))];
    if (numero) return numero;
  }
  return null;
}

/**
 * Los nombres de Showdown que no están en `showdown.json` porque PokéAPI los
 * llama de otra manera ("Indeedee-F", "Pikachu-Original", "Tauros-Paldea-Combat"):
 * los mismos que escribe `especieEnShowdown`, para que lo que sale de la
 * aplicación vuelva a entrar como la misma forma. Los que valen para varias
 * («Minior-Meteor», de siete colores) no entran: se quedan en la especie.
 */
let formas: Map<string, number> | null = null;
function formasDeShowdown() {
  if (formas) return formas;
  const vistos = new Map<string, number | null>();
  for (const especie of POKEDEX) {
    for (const forma of especie.forms) {
      const clave = plano(especieEnShowdown(forma.id, especie.name));
      if (NUMERO[clave] && !NUMERO_EN_SHOWDOWN[forma.id]) continue;
      vistos.set(clave, vistos.has(clave) && vistos.get(clave) !== forma.id ? null : forma.id);
    }
  }
  formas = new Map([...vistos].filter((par): par is [string, number] => par[1] !== null));
  return formas;
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

// ---------------------------------------------------------------------------
// Escribir: del Equipo y PC al Teambuilder
// ---------------------------------------------------------------------------

/** Un pokémon tal y como se guarda: los slugs de PokéAPI, igual que salen de `leerShowdown` */
export type PokemonParaShowdown = {
  pokemonId: number | null;
  especie: string;
  mote: string | null;
  shiny: boolean;
  objeto: string | null;
  /** La de siempre, no la de la mega: Showdown pone la mega solo con la piedra */
  habilidad: string | null;
  naturaleza: string | null;
  movimientos: string[];
};

/**
 * El nombre de Showdown de cada número. En `showdown.json` van sin guiones ni
 * mayúsculas ("rotomheat"), y una especie puede tener dos ("deoxys" y
 * "deoxysnormal"): se queda el más corto, que es el de la forma de siempre.
 */
const CLAVE_DE_NUMERO = new Map<number, string>();
for (const [clave, numero] of Object.entries(NUMERO)) {
  const antes = CLAVE_DE_NUMERO.get(numero);
  if (!antes || clave.length < antes.length) CLAVE_DE_NUMERO.set(numero, clave);
}

/** Los pocos cuyo nombre en castellano no es el de Showdown */
const ESPECIE_EN_SHOWDOWN: Record<string, string> = {
  nidoranf: "Nidoran-F",
  nidoranm: "Nidoran-M",
  typenull: "Type: Null",
};

/**
 * Las formas que PokéAPI llama de otra manera que Showdown (de ahí sale
 * `showdown.json`). Con `null`, Showdown no la tiene aparte: solo existe
 * dentro del combate (la mega sale sola con su piedra puesta) o es la de
 * siempre con otra habilidad, así que se escribe la especie y ya.
 */
const FORMA_EN_SHOWDOWN: [RegExp, string | null][] = [
  [/mega[xyz]?$|gmax|primal|eternamax|totem|build$|mode$|owntempo|^50powerconstruct$/, null],
  [/^(10)powerconstruct$/, "10"],
  [/^female$/, "F"],
  [/^galarstandard$/, "Galar"],
  [/^paldea(combat|blaze|aqua)breed$/, "Paldea-$1"],
  // Las gorras de Pikachu y los plumajes de Squawkabilly, sin la palabra
  [/^(\w+)(cap|plumage)$/, "$1"],
  [/^\w+meteor$/, "Meteor"],
];

/** Las que van al revés: en PokéAPI la de siempre es la de cuatro, en Showdown la de tres */
const NUMERO_EN_SHOWDOWN: Record<number, string> = { 925: "Maushold-Four", 10257: "Maushold" };

const sinTildes = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * "Rotom-Heat", "Lycanroc-Midnight", "Farfetch’d-Galar". Showdown compara los
 * nombres sin mayúsculas ni signos, así que basta con que las letras sean las
 * suyas; los guiones son para que se lea bien.
 */
export function especieEnShowdown(pokemonId: number | null, especie: string): string {
  const es = queEs(pokemonId, especie);
  if (es && NUMERO_EN_SHOWDOWN[es.pokemonId]) return NUMERO_EN_SHOWDOWN[es.pokemonId];
  const base = es?.especie;
  const claveBase = base ? CLAVE_DE_NUMERO.get(base.dex) : undefined;
  // Royaleon, Cefireon y lo que Showdown no tenga: su nombre, sin tildes
  if (!base || !claveBase) return sinTildes(base?.name ?? especie);
  const nombreBase =
    ESPECIE_EN_SHOWDOWN[claveBase] ??
    (plano(base.name) === claveBase ? sinTildes(base.name) : mayuscula(claveBase));
  const clave = es.pokemonId === base.dex ? claveBase : CLAVE_DE_NUMERO.get(es.pokemonId);
  // Una forma de Añil que Showdown no tiene se queda en su especie
  if (!clave || clave === claveBase) return nombreBase;
  if (!clave.startsWith(claveBase)) return mayuscula(clave);
  const forma = clave.slice(claveBase.length);
  const cambio = FORMA_EN_SHOWDOWN.find(([patron]) => patron.test(forma));
  if (!cambio) return `${nombreBase}-${mayuscula(forma)}`;
  if (cambio[1] === null) return nombreBase;
  return `${nombreBase}-${forma.replace(cambio[0], cambio[1]).split("-").map(mayuscula).join("-")}`;
}

/**
 * Los nombres en inglés que no salen de poner mayúsculas al slug. Tampoco
 * hace falta que estén todos: Showdown los reconoce igual sin el apóstrofo o
 * con otro guion, esto es para que se lea como lo escribe él.
 */
const EN_INGLES: Record<string, string> = {
  "u-turn": "U-turn",
  "v-create": "V-create",
  "will-o-wisp": "Will-O-Wisp",
  "x-scissor": "X-Scissor",
  "double-edge": "Double-Edge",
  "self-destruct": "Self-Destruct",
  "soft-boiled": "Soft-Boiled",
  "freeze-dry": "Freeze-Dry",
  "lock-on": "Lock-On",
  "mud-slap": "Mud-Slap",
  "wake-up-slap": "Wake-Up Slap",
  "baby-doll-eyes": "Baby-Doll Eyes",
  "power-up-punch": "Power-Up Punch",
  "trick-or-treat": "Trick-or-Treat",
  "multi-attack": "Multi-Attack",
  "kings-shield": "King's Shield",
  "forests-curse": "Forest's Curse",
  "lands-wrath": "Land's Wrath",
  "natures-madness": "Nature's Madness",
  "kings-rock": "King's Rock",
  "never-melt-ice": "Never-Melt Ice",
};

/** "choice-scarf" → "Choice Scarf" */
function nombreDeSlug(slug: string) {
  return EN_INGLES[slug] ?? slug.split("-").map(mayuscula).join(" ");
}

function objetoEnShowdown(slug: string) {
  // Las megapiedras de Añil van con «anil-» en la aplicación y sin él en su servidor
  return nombreDeSlug(slug.replace(/^anil-/, ""));
}

function movimientoEnShowdown(slug: string) {
  const movimiento = movimientoPorSlug(slug);
  if (!movimiento) return null;
  // Los nuevos de Añil, por su nombre de allí y sin tildes, como los escribe su servidor
  return slug.startsWith("anil-") ? sinTildes(movimiento.n) : nombreDeSlug(slug);
}

function habilidadEnShowdown(slug: string) {
  const habilidad = habilidadPorSlug(slug, slug.startsWith("anil-"));
  if (!habilidad) return null;
  return slug.startsWith("anil-") ? sinTildes(habilidad.n) : nombreDeSlug(slug);
}

/** Lo que rompería la primera línea: los paréntesis y la @ son del formato */
const moteLimpio = (mote: string) => mote.replace(/[()@]/g, "").replace(/\s+/g, " ").trim();

/**
 * El equipo en el formato de «Export» de Showdown, para pegarlo en su
 * Teambuilder. Con `nivel`, todos a ese nivel (el level cap, que es a lo que
 * se juegan los combates); sin él, Showdown pone el que toque al formato.
 */
export function escribirShowdown(
  equipo: PokemonParaShowdown[],
  { nivel = null, conMotes = true }: { nivel?: number | null; conMotes?: boolean } = {},
): string {
  return equipo
    .map((p) => {
      const especie = especieEnShowdown(p.pokemonId, p.especie);
      const mote = conMotes && p.mote ? moteLimpio(p.mote) : "";
      const lineas = [
        (mote && plano(mote) !== plano(especie) ? `${mote} (${especie})` : especie) +
          (p.objeto ? ` @ ${objetoEnShowdown(p.objeto)}` : ""),
      ];
      const habilidad = p.habilidad ? habilidadEnShowdown(p.habilidad) : null;
      if (habilidad) lineas.push(`Ability: ${habilidad}`);
      if (nivel && nivel >= 1 && nivel <= 100) lineas.push(`Level: ${Math.round(nivel)}`);
      if (p.shiny) lineas.push("Shiny: Yes");
      if (p.naturaleza) lineas.push(`${mayuscula(p.naturaleza)} Nature`);
      for (const slug of p.movimientos) {
        const movimiento = movimientoEnShowdown(slug);
        if (movimiento) lineas.push(`- ${movimiento}`);
      }
      return lineas.join("\n");
    })
    .join("\n\n");
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

export function leerRepeticion(log: string, conAnil = false): JugadorDeLaRepeticion[] {
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
      const pokemonId = numeroDe(especieShowdown, conAnil);
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

/**
 * De un enlace de repetición del servidor de Showdown de Añil a su página.
 * Esas no están en replay.pokemonshowdown.com: el mod las publica como páginas
 * sueltas en Cloudflare Pages (`https://<proyecto>.pages.dev/replays/<nombre>`,
 * con o sin `.html`). Se acepta cualquier proyecto de pages.dev porque el
 * nombre del proyecto puede cambiar si el elegido ya estaba cogido; lo que no
 * se acepta es otro sitio ni otra carpeta.
 */
export function paginaDeRepeticionDeAnil(enlace: string): string | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(enlace.trim()) ? enlace.trim() : `https://${enlace.trim()}`);
  } catch {
    return null;
  }
  if (!/^[a-z0-9-]+\.pages\.dev$/i.test(url.hostname)) return null;
  const nombre = /^\/replays\/([A-Za-z0-9_.-]+?)(\.html)?\/?$/.exec(url.pathname)?.[1];
  if (!nombre) return null;
  return `https://${url.hostname.toLowerCase()}/replays/${nombre}`;
}

/**
 * El registro del combate dentro de una página de repetición (la de «Download
 * replay» de Showdown, que es la que copia el mod de Añil): va en un
 * `<script type="text/plain" class="battle-log-data">` con las barras escritas
 * `\/`, para que nada del registro cierre la etiqueta antes de tiempo.
 */
export function logDeLaPagina(html: string): string | null {
  const dentro = /<script[^>]*class="battle-log-data"[^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1];
  return dentro ? dentro.replace(/\\\//g, "/") : null;
}

/** El formato del combate según el propio registro ("|tier|[Gen 9] Añil Custom") */
export function formatoDelLog(log: string): string | undefined {
  return /^\|tier\|(.+)$/m.exec(log)?.[1].trim() || undefined;
}
