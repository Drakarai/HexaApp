/**
 * Genera src/lib/movimientos.json y src/lib/showdown.json a partir de los datos
 * abiertos de PokéAPI.
 *
 *   npx tsx scripts/generate-movimientos.ts
 *
 * - movimientos.json: cada movimiento con su nombre en español, su tipo (y el
 *   que tenía antes, si cambió: Mordisco era Normal en la 1ª), su clase y su
 *   potencia, y las 25 naturalezas con lo que suben y bajan. Lo usa la ficha
 *   completa del Equipo y PC y la cobertura de Mis notas.
 * - showdown.json: el nombre de cada pokémon tal y como lo escribe Showdown,
 *   sin guiones ni mayúsculas ("rotomwash", "ninetalesalola"), con su número.
 *   Solo lo lee el servidor, al pegar un equipo exportado de Showdown.
 *
 * Como los otros generadores, lee los CSV del repositorio de PokéAPI y el
 * resultado se sube: la aplicación no depende de nadie en marcha.
 */
import { writeFileSync } from "node:fs";

const CSV_BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const ESPANOL = "7";

/** Parser de CSV pequeño pero correcto con comillas y comas dentro de campos. */
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

/** Como lo compara Showdown: "U-turn" y "u-turn" son "uturn" */
const plano = (texto: string) => texto.toLowerCase().replace(/[^a-z0-9]/g, "");

async function main() {
  console.log("Descargando datos de PokéAPI…");
  const [moves, moveNames, changelog, versionGroups, natures, natureNames, statNames, pokemon, species] =
    await Promise.all([
      fetchCsv("moves"),
      fetchCsv("move_names"),
      fetchCsv("move_changelog"),
      fetchCsv("version_groups"),
      fetchCsv("natures"),
      fetchCsv("nature_names"),
      fetchCsv("stat_names"),
      fetchCsv("pokemon"),
      fetchCsv("pokemon_species"),
    ]);

  const espanol = (filas: Record<string, string>[], clave: string) =>
    new Map(filas.filter((f) => f.local_language_id === ESPANOL).map((f) => [f[clave], f.name]));

  const nombreDeMovimiento = espanol(moveNames, "move_id");
  const generacionDelGrupo = new Map(versionGroups.map((v) => [v.id, Number(v.generation_id)]));

  /**
   * Los cambios de tipo: la fila del changelog lleva el tipo **de antes** del
   * grupo de versiones en el que cambió. Se guarda como [hasta esta generación,
   * tipo], del más antiguo al más nuevo.
   */
  const tiposDeAntes = new Map<string, [number, number][]>();
  for (const fila of changelog) {
    if (!fila.type_id) continue;
    const hasta = (generacionDelGrupo.get(fila.changed_in_version_group_id) ?? 1) - 1;
    if (hasta < 1) continue;
    const lista = tiposDeAntes.get(fila.move_id) ?? [];
    lista.push([hasta, Number(fila.type_id)]);
    tiposDeAntes.set(fila.move_id, lista.sort((a, b) => a[0] - b[0]));
  }

  type Movimiento = {
    /** El identificador de PokéAPI ("thunderbolt"): es lo que se guarda */
    s: string;
    /** Nombre en español */
    n: string;
    /** Tipo de ahora */
    t: number;
    /** 0 de estado, 1 físico, 2 especial */
    c: number;
    /** Potencia, si la tiene */
    p?: number;
    /** Generación en la que salió */
    g: number;
    /** Los tipos de antes, [hasta la generación, tipo] */
    a?: [number, number][];
  };
  const movimientos: Movimiento[] = [];
  for (const m of moves) {
    const nombre = nombreDeMovimiento.get(m.id);
    if (!nombre || Number(m.id) >= 10000) continue;
    // Fuera los Movimientos Z y Dinamax: no se llevan, salen solos en combate
    if (m.identifier.includes("--") || /^(g-)?max-/.test(m.identifier)) continue;
    if (m.pp === "1" && m.identifier !== "sketch") continue;
    const movimiento: Movimiento = {
      s: m.identifier,
      n: nombre,
      t: Number(m.type_id),
      c: Number(m.damage_class_id) - 1,
      g: Number(m.generation_id),
    };
    if (m.power) movimiento.p = Number(m.power);
    const antes = tiposDeAntes.get(m.id);
    if (antes) movimiento.a = antes;
    movimientos.push(movimiento);
  }
  movimientos.sort((a, b) => a.n.localeCompare(b.n, "es"));

  const nombreDeEstadistica = espanol(statNames, "stat_id");
  const nombreDeNaturaleza = espanol(natureNames, "nature_id");
  const naturalezas = natures
    .map((n) => ({
      s: n.identifier,
      n: nombreDeNaturaleza.get(n.id) ?? n.identifier,
      // Las neutras suben y bajan lo mismo: no cambian nada
      sube: n.increased_stat_id === n.decreased_stat_id ? null : nombreDeEstadistica.get(n.increased_stat_id) ?? null,
      baja: n.increased_stat_id === n.decreased_stat_id ? null : nombreDeEstadistica.get(n.decreased_stat_id) ?? null,
    }))
    .sort((a, b) => a.n.localeCompare(b.n, "es"));

  writeFileSync("src/lib/movimientos.json", JSON.stringify({ movimientos, naturalezas }));
  console.log(`${movimientos.length} movimientos y ${naturalezas.length} naturalezas.`);

  /**
   * Showdown escribe las formas como "Rotom-Wash" o "Ninetales-Alola", igual
   * que los identificadores de PokéAPI. Las formas por defecto llevan sufijo en
   * PokéAPI ("deoxys-normal") y en Showdown no ("Deoxys"): para esas está el de
   * la especie, que apunta a su forma por defecto.
   */
  const nombres: Record<string, number> = {};
  for (const e of species) nombres[plano(e.identifier)] = Number(e.id);
  for (const p of pokemon) {
    const clave = plano(p.identifier);
    if (!(clave in nombres)) nombres[clave] = Number(p.id);
  }
  writeFileSync("src/lib/showdown.json", JSON.stringify(nombres));
  console.log(`${Object.keys(nombres).length} nombres de Showdown.`);

  // Unas comprobaciones, para no subir un fichero roto sin enterarse
  const buscar = (s: string) => movimientos.find((m) => m.s === s);
  const casos: [boolean, string][] = [
    [buscar("thunderbolt")?.n === "Rayo" && buscar("thunderbolt")?.t === 13, "Rayo es Eléctrico"],
    [buscar("bite")?.a?.[0]?.[0] === 1 && buscar("bite")?.a?.[0]?.[1] === 1, "Mordisco era Normal en la 1ª"],
    [buscar("u-turn")?.c === 1, "Ida y Vuelta es físico"],
    [!buscar("breakneck-blitz--physical") && !buscar("max-flare"), "Sin Movimientos Z ni Dinamax"],
    [nombres.rotomwash === 10009 && nombres.garchomp === 445 && nombres.deoxys === 386, "Nombres de Showdown"],
    [naturalezas.some((n) => n.s === "adamant" && n.sube === "Ataque"), "Firme sube el Ataque"],
  ];
  for (const [ok, que] of casos) if (!ok) throw new Error(`Falla la comprobación: ${que}`);
  console.log("Comprobaciones: bien.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
