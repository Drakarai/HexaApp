/**
 * Genera src/lib/movimientos-detalle.json: lo que sale al tocar un movimiento
 * en la ficha de combate (precisión, PP, prioridad, contacto, descripción y
 * efectos con su probabilidad exacta), con lo que cambió en cada generación.
 *
 *   npx tsx scripts/generate-movimientos-detalle.ts
 *
 * Por qué de dos sitios:
 * - **PokéAPI** (los CSV de su repositorio): los números de cada movimiento,
 *   su historial (`move_changelog`: potencia, precisión, PP, prioridad y
 *   probabilidad del efecto que tenía **antes** de cada cambio) y la
 *   descripción oficial en español más reciente.
 * - **Showdown** (`play.pokemonshowdown.com/data/moves.json`): los efectos
 *   desglosados con su probabilidad (10 % de quemar, 100 % de bajarse la
 *   Defensa…) y si hace contacto. PokéAPI también los tiene (`move_meta`), pero
 *   le faltan los de casi toda la 9ª y parte de la 8ª.
 * - Lo que falta en los dos (descripciones de los más nuevos) va a mano en
 *   `movimientos-recientes.json`, con el texto oficial del mod de expansión de
 *   USUM.
 *
 * Los efectos salen como son hoy; de antes solo se sabe la probabilidad (el
 * historial de PokéAPI no guarda qué hacían). Solo se guardan los movimientos
 * que tiene `movimientos.json`, que es la lista de la app.
 */
import { readFileSync, writeFileSync } from "node:fs";

const CSV_BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const SHOWDOWN = "https://play.pokemonshowdown.com/data/moves.json";
const ESPANOL = "7";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchCsv(name: string) {
  const response = await fetch(`${CSV_BASE}/${name}.csv`);
  if (!response.ok) throw new Error(`No se pudo descargar ${name}.csv (${response.status})`);
  const rows = parseCsv(await response.text());
  const header = rows.shift() ?? [];
  return rows
    .filter((row) => row.length >= header.length)
    .map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])));
}

/** Lo de Showdown que se usa */
type Secundario = {
  chance?: number;
  status?: string;
  volatileStatus?: string;
  boosts?: Record<string, number>;
  self?: { boosts?: Record<string, number> };
};
type MovimientoShowdown = {
  num: number;
  category: string;
  target: string;
  flags?: Record<string, number>;
  secondary?: Secundario | null;
  secondaries?: Secundario[] | null;
  self?: { boosts?: Record<string, number>; volatileStatus?: string } | null;
  /** Como `self`, pero una sola vez aunque dé a varios (Escamas Bélicas, Ráfaga Escamas) */
  selfBoost?: { boosts?: Record<string, number> } | null;
  selfdestruct?: string | boolean;
  multiaccuracy?: boolean;
  boosts?: Record<string, number> | null;
  status?: string;
  volatileStatus?: string;
  drain?: [number, number];
  recoil?: [number, number];
  heal?: [number, number];
  critRatio?: number;
  willCrit?: boolean;
  multihit?: number | [number, number];
  ohko?: boolean | string;
  isMax?: boolean | string;
  isZ?: boolean | string;
};

// "el Ataque", "la Defensa"…: así se juntan dos («baja la Defensa y la Def. Esp.»)
const ESTADISTICA: Record<string, string> = {
  atk: "el Ataque",
  def: "la Defensa",
  spa: "el At. Esp.",
  spd: "la Def. Esp.",
  spe: "la Velocidad",
  accuracy: "la Precisión",
  evasion: "la Evasión",
};
const ESTADO: Record<string, string> = {
  brn: "quema",
  par: "paraliza",
  psn: "envenena",
  tox: "envenena gravemente",
  slp: "duerme",
  frz: "congela",
};
const VOLATIL: Record<string, string> = { flinch: "amedrenta", confusion: "confunde", attract: "enamora" };

function cuanto(niveles: number) {
  const sube = niveles > 0 ? "sube" : "baja";
  const n = Math.abs(niveles);
  return n >= 3 ? `${sube} muchísimo` : n === 2 ? `${sube} mucho` : sube;
}

/** «baja la Defensa y la Def. Esp. del usuario», agrupando las que cambian lo mismo */
function cambios(boosts: Record<string, number>, quien: "del usuario" | "del objetivo") {
  const porNivel = new Map<number, string[]>();
  for (const [stat, n] of Object.entries(boosts)) {
    if (!ESTADISTICA[stat] || !n) continue;
    porNivel.set(n, [...(porNivel.get(n) ?? []), ESTADISTICA[stat]]);
  }
  return [...porNivel].map(([n, stats]) => {
    const lista = stats.length > 1 ? `${stats.slice(0, -1).join(", ")} y ${stats.at(-1)}` : stats[0];
    return `${cuanto(n)} ${lista} ${quien}`;
  });
}

const objetivo = (sd: MovimientoShowdown) => (sd.target === "self" || sd.target === "adjacentAllyOrSelf" ? "al usuario" : "al objetivo");

/**
 * Los efectos con probabilidad, [probabilidad, qué hace], y las notas que no
 * dependen de la suerte (cuánto roba, cuántas veces golpea…).
 */
function efectos(sd: MovimientoShowdown) {
  const conProbabilidad: [number, string][] = [];
  const notas: string[] = [];
  const secundarios = sd.secondaries ?? (sd.secondary ? [sd.secondary] : []);
  for (const s of secundarios) {
    const p = s.chance ?? 100;
    if (s.status && ESTADO[s.status]) conProbabilidad.push([p, `${ESTADO[s.status]} al objetivo`]);
    if (s.volatileStatus && VOLATIL[s.volatileStatus]) conProbabilidad.push([p, `${VOLATIL[s.volatileStatus]} al objetivo`]);
    if (s.boosts) for (const t of cambios(s.boosts, "del objetivo")) conProbabilidad.push([p, t]);
    if (s.self?.boosts) for (const t of cambios(s.self.boosts, "del usuario")) conProbabilidad.push([p, t]);
  }
  if (sd.self?.boosts) for (const t of cambios(sd.self.boosts, "del usuario")) conProbabilidad.push([100, t]);
  if (sd.selfBoost?.boosts) for (const t of cambios(sd.selfBoost.boosts, "del usuario")) conProbabilidad.push([100, t]);
  // Triataque elige al azar en su propio código (Showdown no lo pone como secundario)
  if (sd.num === 161) conProbabilidad.push([20, "quema, paraliza o congela al objetivo (al azar)"]);
  // Los de estado: lo que hacen siempre que aciertan
  if (sd.category === "Status") {
    const quien = sd.target === "self" || sd.target === "allySide" || sd.target === "adjacentAllyOrSelf" ? "del usuario" : "del objetivo";
    if (sd.boosts) for (const t of cambios(sd.boosts, quien)) conProbabilidad.push([100, t]);
    if (sd.status && ESTADO[sd.status]) conProbabilidad.push([100, `${ESTADO[sd.status]} ${objetivo(sd)}`]);
    if (sd.volatileStatus && VOLATIL[sd.volatileStatus]) conProbabilidad.push([100, `${VOLATIL[sd.volatileStatus]} ${objetivo(sd)}`]);
  }
  const porcentaje = ([a, b]: [number, number]) => Math.round((100 * a) / b);
  if (sd.drain) notas.push(`Recupera el ${porcentaje(sd.drain)} % del daño que causa.`);
  if (sd.recoil) notas.push(`El usuario recibe el ${porcentaje(sd.recoil)} % del daño que causa.`);
  if (sd.heal) notas.push(`Recupera el ${porcentaje(sd.heal)} % de sus PS máximos.`);
  if (sd.willCrit) notas.push("Siempre es golpe crítico.");
  else if (sd.critRatio && sd.critRatio > 1) notas.push("Índice de golpe crítico alto.");
  if (Array.isArray(sd.multihit)) notas.push(`Golpea de ${sd.multihit[0]} a ${sd.multihit[1]} veces.`);
  else if (sd.multihit && sd.multiaccuracy) notas.push(`Golpea hasta ${sd.multihit} veces: cada golpe puede fallar y entonces para.`);
  else if (sd.multihit) notas.push(`Golpea ${sd.multihit} veces.`);
  if (sd.self?.volatileStatus === "mustrecharge") notas.push("El usuario tiene que descansar el turno siguiente.");
  if (sd.selfdestruct) notas.push("El usuario se debilita al usarlo.");
  if (sd.ohko) notas.push("Debilita de un golpe si acierta.");
  return { conProbabilidad, notas };
}

/** Lo que se guarda de cada movimiento (las claves, cortas: va al navegador) */
type Detalle = {
  /** Precisión; sin ella, no falla nunca */
  pc?: number;
  pp: number;
  /** Prioridad, si no es 0 */
  pr?: number;
  /** 1 si hace contacto */
  k?: 1;
  /** Descripción oficial en español */
  d: string;
  /** Efectos con su probabilidad: [probabilidad, qué hace] */
  e?: [number, string][];
  /** Lo que no depende de la suerte */
  x?: string[];
  /** Lo que tenía antes: [hasta la generación, cambios]; del más antiguo al más nuevo */
  h?: [number, { p?: number; pc?: number | null; pp?: number; pr?: number; ec?: number }][];
};

async function main() {
  console.log("Descargando datos de PokéAPI y de Showdown…");
  const [moves, flavor, changelog, versionGroups, showdown] = await Promise.all([
    fetchCsv("moves"),
    fetchCsv("move_flavor_text"),
    fetchCsv("move_changelog"),
    fetchCsv("version_groups"),
    fetch(SHOWDOWN).then((r) => {
      if (!r.ok) throw new Error(`No se pudo descargar la lista de Showdown (${r.status})`);
      return r.json() as Promise<Record<string, MovimientoShowdown>>;
    }),
  ]);
  const recientes = JSON.parse(readFileSync("scripts/movimientos-recientes.json", "utf-8")).descripciones as Record<
    string,
    string
  >;
  const deLaApp = new Set(
    (JSON.parse(readFileSync("src/lib/movimientos.json", "utf-8")).movimientos as { s: string }[]).map((m) => m.s),
  );

  const generacionDelGrupo = new Map(versionGroups.map((v) => [v.id, Number(v.generation_id)]));
  // La descripción del grupo de versiones más nuevo que la tenga en español
  const descripcion = new Map<string, [number, string]>();
  for (const f of flavor) {
    if (f.language_id !== ESPANOL) continue;
    const grupo = Number(f.version_group_id);
    const antes = descripcion.get(f.move_id);
    if (!antes || grupo >= antes[0]) descripcion.set(f.move_id, [grupo, f.flavor_text.replace(/\s+/g, " ").trim()]);
  }
  // Showdown por número, sin los Z ni los Dinamax (comparten número con otros)
  const porNumero = new Map<number, MovimientoShowdown>();
  for (const m of Object.values(showdown)) if (!m.isMax && !m.isZ && !porNumero.has(m.num)) porNumero.set(m.num, m);

  const detalle: Record<string, Detalle> = {};
  const sinDescripcion: string[] = [];
  const sinShowdown: string[] = [];
  for (const m of moves) {
    if (!deLaApp.has(m.identifier)) continue;
    const d = descripcion.get(m.id)?.[1] ?? recientes[m.identifier];
    if (!d) sinDescripcion.push(m.identifier);
    const fila: Detalle = { pp: Number(m.pp), d: d ?? "" };
    if (m.accuracy) fila.pc = Number(m.accuracy);
    if (m.priority && m.priority !== "0") fila.pr = Number(m.priority);
    const sd = porNumero.get(Number(m.id));
    if (sd) {
      if (sd.flags?.contact) fila.k = 1;
      const { conProbabilidad, notas } = efectos(sd);
      if (conProbabilidad.length) fila.e = conProbabilidad;
      if (notas.length) fila.x = notas;
    } else sinShowdown.push(m.identifier);
    detalle[m.identifier] = fila;
  }

  // El historial: la fila lleva lo que tenía **antes** del grupo en el que cambió
  const idASlug = new Map(moves.map((m) => [m.id, m.identifier]));
  for (const f of changelog) {
    const slug = idASlug.get(f.move_id);
    if (!slug || !detalle[slug]) continue;
    const hasta = (generacionDelGrupo.get(f.changed_in_version_group_id) ?? 1) - 1;
    if (hasta < 1) continue;
    const antes: NonNullable<Detalle["h"]>[number][1] = {};
    if (f.power) antes.p = Number(f.power);
    if (f.accuracy) antes.pc = Number(f.accuracy);
    if (f.pp) antes.pp = Number(f.pp);
    if (f.priority) antes.pr = Number(f.priority);
    if (f.effect_chance) antes.ec = Number(f.effect_chance);
    if (!Object.keys(antes).length) continue;
    const h = (detalle[slug].h ??= []);
    const mismo = h.find(([g]) => g === hasta);
    if (mismo) Object.assign(mismo[1], antes);
    else h.push([hasta, antes]);
    h.sort((a, b) => a[0] - b[0]);
  }

  writeFileSync("src/lib/movimientos-detalle.json", JSON.stringify(detalle));
  console.log(`${Object.keys(detalle).length} movimientos.`);
  if (sinDescripcion.length) console.log(`Sin descripción en español (${sinDescripcion.length}): ${sinDescripcion.join(", ")}`);
  if (sinShowdown.length) console.log(`Sin datos de Showdown (${sinShowdown.length}): ${sinShowdown.join(", ")}`);

  const casos: [boolean, string][] = [
    [JSON.stringify(detalle["fire-fang"]?.e) === JSON.stringify([[10, "quema al objetivo"], [10, "amedrenta al objetivo"]]), "Colmillo Ígneo: 10 % de quemar y 10 % de amedrentar"],
    [detalle["close-combat"]?.e?.[0]?.[0] === 100 && detalle["close-combat"]?.k === 1, "A Bocajarro: se baja las defensas y hace contacto"],
    [detalle["swift"]?.pc === undefined, "Rapidez no falla nunca"],
    [detalle["quick-attack"]?.pr === 1, "Ataque Rápido tiene prioridad +1"],
    [detalle["drain-punch"]?.x?.[0] === "Recupera el 50 % del daño que causa.", "Puño Drenaje roba la mitad"],
    [Boolean(detalle["thunderbolt"]?.h?.some(([g, c]) => g === 5 && c.p === 95)), "Rayo tenía 95 de potencia hasta la 5ª"],
    [detalle["clanging-scales"]?.e?.[0]?.[1] === "baja la Defensa del usuario", "Escamas Bélicas se baja la Defensa"],
    [detalle["tri-attack"]?.e?.[0]?.[0] === 20, "Triataque: 20 %"],
    [Boolean(detalle["hyper-beam"]?.x?.some((t) => t.includes("descansar"))), "Hiperrayo descansa"],
  ];
  for (const [ok, que] of casos) if (!ok) throw new Error(`Falla la comprobación: ${que}`);
  console.log("Comprobaciones: bien.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
