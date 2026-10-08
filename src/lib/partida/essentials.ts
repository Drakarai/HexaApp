import { Diccionario, Objeto, Simbolo, Volcado, leerMarshal, type Valor } from "./marshal";

/**
 * Lo que la app saca de una partida de **Pokémon Essentials** (la de Pokémon
 * Añil: «Partida N.rxdata»), leída en el navegador: el equipo y las cajas, y
 * de cada pokémon lo que hace falta para su ficha. Niveles, IV y EV no: no se
 * guardan en la app.
 *
 * Aquí todo va con **los nombres internos del juego** («PIKACHU», «STATIC»):
 * traducirlos a los de la app es cosa del servidor (`traducir.ts`), que es
 * quien tiene las tablas. Así al navegador no le pesa nada más que el lector.
 *
 * Lo que Essentials calcula al vuelo y puede no estar guardado —si es shiny,
 * la naturaleza, la habilidad— se calcula aquí igual que lo hace el juego (ver
 * `Pokemon#shiny?`, `#nature` y `#ability_id` de Essentials v21.1).
 */

export type DondeEnLaPartida = { lugar: "equipo"; hueco: number } | { lugar: "caja"; caja: number; hueco: number };

export type PokemonDeLaPartida = {
  especie: string;
  forma: number;
  /** Su mote; null si no tiene (se llama como su especie) */
  mote: string | null;
  shiny: boolean;
  naturaleza: string | null;
  /**
   * Lo que hace falta para saber su habilidad (ver `habilidadDe` en
   * traducir.ts): la guardada si el juego ya la calculó, la forzada del modo
   * Random, la de la cápsula, o su índice para buscarla en su especie.
   */
  habilidad: {
    guardada: string | null;
    forzada: string | null;
    /** La de la cápsula del modo Random, ya elegida como lo hace el plugin */
    capsula: string | null;
    indice: number;
    personalID: number;
  };
  objeto: string | null;
  movimientos: string[];
  /** Dónde se consiguió: el número de mapa, o el texto si es un regalo con nombre */
  mapa: number | null;
  textoDeObtencion: string | null;
  /** Cuándo se consiguió, en segundos desde 1970 */
  recibido: number | null;
  donde: DondeEnLaPartida;
};

export type PartidaLeida = {
  jugador: string | null;
  pokemon: PokemonDeLaPartida[];
  /** El nombre de cada caja del PC, en orden */
  cajas: string[];
  /**
   * Las habilidades del **modo Random**, si está puesto: las de cada especie
   * (o forma, «VULPIX_1») que sale en la partida, como `[normales, ocultas]`.
   * Null si las habilidades son las de siempre.
   */
  habilidadesRandom: Record<string, [string[], string[]]> | null;
};

export class PartidaNoValida extends Error {}

const sim = (v: Valor | undefined) => (v instanceof Simbolo ? v.nombre : null);
const num = (v: Valor | undefined) => (typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : null);
const texto = (v: Valor | undefined) => (typeof v === "string" ? v : null);
const obj = (v: Valor | undefined) => (v instanceof Objeto ? v : null);

/** Las 25 de siempre, en el orden de Essentials: sin guardar, sale de `personalID % 25` */
const NATURALEZAS = [
  "HARDY", "LONELY", "BRAVE", "ADAMANT", "NAUGHTY", "BOLD", "DOCILE", "RELAXED", "IMPISH", "LAX",
  "TIMID", "HASTY", "SERIOUS", "JOLLY", "NAIVE", "MODEST", "MILD", "QUIET", "BASHFUL", "RASH",
  "CALM", "GENTLE", "SASSY", "CAREFUL", "QUIRKY",
];

/** La probabilidad de shiny de Essentials (`Settings::SHINY_POKEMON_CHANCE`) */
const PROBABILIDAD_DE_SHINY = 16;

/** Los interruptores del modo Random de Añil (plugin «Modo Random», 000_Config.rb) */
const INTERRUPTOR_DE_HABILIDADES = 48;
const SIN_HABILIDAD_RANDOM = new Set(["SHEDINJA", "MEWTWO_5"]);

function esShiny(p: Objeto, idDelDueno: number | null): boolean {
  const guardado = p.get("@shiny");
  if (typeof guardado === "boolean") return guardado;
  if (p.get("@super_shiny") === true) return true;
  const personal = num(p.get("@personalID"));
  const dueno = num(obj(p.get("@owner"))?.get("@id")) ?? idDelDueno;
  if (personal === null || dueno === null) return false;
  // Igual que `Pokemon#shiny?`: lo que no está guardado se calcula del ID
  const a = (personal ^ dueno) >>> 0;
  const d = (a & 0xffff) ^ ((a >>> 16) & 0xffff);
  return d < PROBABILIDAD_DE_SHINY;
}

function leerPokemon(
  p: Objeto,
  donde: DondeEnLaPartida,
  idDelJugador: number | null,
  capsulas: Diccionario | null,
): PokemonDeLaPartida | null {
  const especie = sim(p.get("@species"));
  if (!especie) return null;
  // Un huevo todavía no es un pokémon de la caja
  if ((num(p.get("@steps_to_hatch")) ?? 0) > 0) return null;
  const personalID = num(p.get("@personalID")) ?? 0;
  const forma = num(p.get("@forced_form")) ?? num(p.get("@form")) ?? 0;
  const mote = texto(p.get("@name"))?.trim() || null;
  const naturaleza = sim(p.get("@nature")) ?? NATURALEZAS[(personalID >>> 0) % NATURALEZAS.length];
  const movimientos = (Array.isArray(p.get("@moves")) ? (p.get("@moves") as Valor[]) : [])
    .map((m) => sim(obj(m)?.get("@id")))
    .filter((m): m is string => Boolean(m));
  // La cápsula de habilidad del modo Random: va por el número único de cada pokémon
  const idUnico = num(p.get("@id"));
  const capsula = idUnico !== null ? capsulas?.get(idUnico) : undefined;
  const indice = num(p.get("@ability_index")) ?? (personalID & 1);
  return {
    especie,
    forma,
    mote,
    shiny: esShiny(p, idDelJugador),
    naturaleza,
    habilidad: {
      guardada: sim(p.get("@ability")),
      forzada: sim(p.get("@forced_ability")),
      capsula: deLaCapsula(capsula, num(p.get("@ability_index"))),
      indice,
      personalID,
    },
    objeto: sim(p.get("@item")),
    movimientos,
    mapa: num(p.get("@obtain_map")),
    textoDeObtencion: texto(p.get("@obtain_text"))?.trim() || null,
    recibido: num(p.get("@timeReceived")),
    donde,
  };
}

/**
 * La habilidad que le dio la cápsula del modo Random (plugin «Modo Random»,
 * 008_RandomAbilityCapsule.rb): la lista sorteada es de pares [habilidad,
 * índice]; con índice guardado, la de ese índice, y si no, la primera.
 */
function deLaCapsula(lista: Valor | undefined, indice: number | null): string | null {
  if (!Array.isArray(lista) || !lista.length) return null;
  const pares = lista.filter(Array.isArray) as Valor[][];
  const elegido = (indice !== null ? pares.find((par) => num(par[1]) === indice) : undefined) ?? pares[0];
  return sim(elegido?.[0]);
}

/** Lee el fichero entero. Si no es una partida de Essentials, salta `PartidaNoValida` */
export function leerPartida(bytes: Uint8Array): PartidaLeida {
  let raiz: Valor;
  try {
    raiz = leerMarshal(bytes);
  } catch {
    throw new PartidaNoValida("Ese fichero no es una partida de Pokémon Essentials.");
  }
  if (!(raiz instanceof Diccionario)) {
    throw new PartidaNoValida("Ese fichero no es una partida de Pokémon Essentials.");
  }
  const jugador = obj(raiz.get("player"));
  const almacen = obj(raiz.get("storage_system"));
  if (!jugador || !almacen) {
    throw new PartidaNoValida("No encuentro el equipo ni las cajas en esa partida. ¿Es una «Partida N.rxdata» del Añil?");
  }
  const idDelJugador = num(jugador.get("@id"));
  const global = obj(raiz.get("global_metadata"));
  const capsulas = global?.get("@random_abs_pokes");

  const pokemon: PokemonDeLaPartida[] = [];
  const equipo = jugador.get("@party");
  (Array.isArray(equipo) ? equipo : []).forEach((p, hueco) => {
    const leido = p instanceof Objeto ? leerPokemon(p, { lugar: "equipo", hueco }, idDelJugador, capsulas instanceof Diccionario ? capsulas : null) : null;
    if (leido) pokemon.push(leido);
  });
  const cajas: string[] = [];
  const todas = almacen.get("@boxes");
  (Array.isArray(todas) ? todas : []).forEach((caja, numero) => {
    const c = obj(caja);
    cajas.push(texto(c?.get("@name")) ?? `Caja ${numero + 1}`);
    const dentro = c?.get("@pokemon");
    (Array.isArray(dentro) ? dentro : []).forEach((p, hueco) => {
      const leido =
        p instanceof Objeto
          ? leerPokemon(p, { lugar: "caja", caja: numero, hueco }, idDelJugador, capsulas instanceof Diccionario ? capsulas : null)
          : null;
      if (leido) pokemon.push(leido);
    });
  });

  return {
    jugador: texto(jugador.get("@name")),
    pokemon,
    cajas,
    habilidadesRandom: habilidadesRandom(raiz, global, pokemon),
  };
}

/**
 * Las habilidades del modo Random de las especies que hay en la partida. El
 * juego las sortea una vez y las guarda (`$randomized_data[:abilities]`); vale
 * lo mismo que `RandomizedChallenge::Ability.get`: solo si el modo y su
 * interruptor están puestos, y nunca para las especies que el plugin excluye.
 */
function habilidadesRandom(raiz: Diccionario, global: Objeto | null, pokemon: PokemonDeLaPartida[]) {
  const interruptores = obj(raiz.get("switches"))?.get("@data");
  const puesto =
    global?.get("@random_enabled") === true &&
    Array.isArray(interruptores) &&
    interruptores[INTERRUPTOR_DE_HABILIDADES] === true;
  if (!puesto) return null;
  const sorteadas = raiz.get("randomized_data");
  const tabla = sorteadas instanceof Diccionario ? sorteadas.get("abilities") : null;
  if (!(tabla instanceof Diccionario)) return null;

  const salida: Record<string, [string[], string[]]> = {};
  const lista = (v: Valor | undefined) => (Array.isArray(v) ? v.map((h) => sim(h) ?? "") : []);
  for (const p of pokemon) {
    for (const clave of p.forma ? [`${p.especie}_${p.forma}`, p.especie] : [p.especie]) {
      if (salida[clave] || SIN_HABILIDAD_RANDOM.has(clave)) continue;
      const suyas = tabla.get(clave);
      if (suyas instanceof Diccionario) salida[clave] = [lista(suyas.get("base")), lista(suyas.get("hidden"))];
    }
  }
  return salida;
}

// Para las pruebas y para leer los datos del juego (scripts/anil-mapas.ts)
export { leerMarshal, Diccionario, Objeto, Simbolo, Volcado };
