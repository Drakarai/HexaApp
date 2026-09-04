/**
 * Genera src/lib/tipos.json a partir de los datos abiertos de PokéAPI: los
 * dieciocho tipos con su nombre en español, la tabla de efectividad **de cada
 * generación** y los tipos de cada pokémon, también los que cambiaron con el
 * tiempo.
 *
 *   npx tsx scripts/generate-tipos.ts
 *
 * Lo de "de cada generación" no es un capricho. La tabla ha cambiado, y en un
 * locke de 2ª generación la app tiene que decir lo que pasa **en ese juego**:
 *
 * - El tipo Hada no existe hasta la 6ª: en HeartGold, Clefairy es Normal.
 * - Hasta la 6ª, el Acero resistía Fantasma y Siniestro.
 * - En la 1ª, Veneno era supereficaz contra Bicho, y Bicho contra Veneno.
 *
 * Todo eso viene en `type_efficacy_past.csv` y `pokemon_types_past.csv`, así
 * que no hay nada escrito a mano: se calcula una tabla por generación y se
 * guardan las nueve. Ocupa unos pocos KB y evita depender de PokéAPI en marcha.
 */
import { writeFileSync } from "node:fs";

const CSV_BASE =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const ESPANOL = "7";
const SALIDA = "src/lib/tipos.json";

/** Los tipos de verdad. PokéAPI tiene además "unknown" y "shadow", que no. */
const ULTIMO_TIPO = 18;
const GENERACIONES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchCsv(name: string) {
  const response = await fetch(`${CSV_BASE}/${name}.csv`);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${name}.csv (${response.status})`);
  }
  const rows = parseCsv(await response.text());
  const header = rows.shift() ?? [];
  return rows
    .filter((row) => row.length >= header.length)
    .map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])));
}

async function main() {
  console.log("Descargando datos de PokéAPI…");
  const [tipos, nombres, efectividad, efectividadPasada, deCadaUno, pasados] =
    await Promise.all([
      fetchCsv("types"),
      fetchCsv("type_names"),
      fetchCsv("type_efficacy"),
      fetchCsv("type_efficacy_past"),
      fetchCsv("pokemon_types"),
      fetchCsv("pokemon_types_past"),
    ]);

  // --------------------------------------------------------------- Los tipos
  const nombrePorTipo = new Map<string, string>();
  for (const fila of nombres) {
    if (fila.local_language_id === ESPANOL) {
      nombrePorTipo.set(fila.type_id, fila.name);
    }
  }

  const listaDeTipos = tipos
    .filter((fila) => Number(fila.id) <= ULTIMO_TIPO)
    .map((fila) => ({
      id: Number(fila.id),
      slug: fila.identifier,
      nombre: nombrePorTipo.get(fila.id) ?? fila.identifier,
      /** Desde qué generación existe: Siniestro y Acero en la 2ª, Hada en la 6ª */
      desde: Number(fila.generation_id),
    }))
    .sort((a, b) => a.id - b.id);

  console.log(`  ${listaDeTipos.length} tipos:`, listaDeTipos.map((t) => t.nombre).join(", "));

  // ------------------------------------------------ La tabla de cada generación
  /** Lo que vale hoy: 0, 50, 100 o 200 */
  const hoy = new Map<string, number>();
  for (const fila of efectividad) {
    hoy.set(
      `${fila.damage_type_id}-${fila.target_type_id}`,
      Number(fila.damage_factor),
    );
  }

  /**
   * Lo que valía antes. Cada fila dice "hasta esta generación valía tanto", así
   * que para una generación G manda la fila con la generación más pequeña que
   * llegue hasta ella.
   */
  const antes = new Map<string, { generacion: number; factor: number }[]>();
  for (const fila of efectividadPasada) {
    const clave = `${fila.damage_type_id}-${fila.target_type_id}`;
    const lista = antes.get(clave) ?? [];
    lista.push({
      generacion: Number(fila.generation_id),
      factor: Number(fila.damage_factor),
    });
    antes.set(clave, lista);
  }
  for (const lista of antes.values()) {
    lista.sort((a, b) => a.generacion - b.generacion);
  }

  const factorEn = (generacion: number, atacante: number, defensor: number) => {
    const clave = `${atacante}-${defensor}`;
    const cambio = antes.get(clave)?.find((fila) => fila.generacion >= generacion);
    return cambio?.factor ?? hoy.get(clave) ?? 100;
  };

  /** Una matriz por generación, indexada [atacante-1][defensor-1] */
  const tabla: Record<string, number[][]> = {};
  for (const generacion of GENERACIONES) {
    tabla[generacion] = Array.from({ length: ULTIMO_TIPO }, (_, a) =>
      Array.from({ length: ULTIMO_TIPO }, (_, d) =>
        factorEn(generacion, a + 1, d + 1),
      ),
    );
  }

  // ------------------------------------------------- Los tipos de cada pokémon
  const porPokemon: Record<string, number[]> = {};
  for (const fila of deCadaUno) {
    const id = fila.pokemon_id;
    const tipo = Number(fila.type_id);
    if (tipo > ULTIMO_TIPO) continue;
    const lista = porPokemon[id] ?? [];
    lista[Number(fila.slot) - 1] = tipo;
    porPokemon[id] = lista;
  }
  for (const id of Object.keys(porPokemon)) {
    porPokemon[id] = porPokemon[id].filter(Boolean);
  }

  /** Los que tuvieron otros tipos: { pokemonId: { hastaGeneracion: [tipos] } } */
  const pasado: Record<string, Record<string, number[]>> = {};
  for (const fila of pasados) {
    const id = fila.pokemon_id;
    const generacion = fila.generation_id;
    const tipo = Number(fila.type_id);
    if (tipo > ULTIMO_TIPO) continue;
    pasado[id] ??= {};
    const lista = pasado[id][generacion] ?? [];
    lista[Number(fila.slot) - 1] = tipo;
    pasado[id][generacion] = lista;
  }
  for (const porGeneracion of Object.values(pasado)) {
    for (const generacion of Object.keys(porGeneracion)) {
      porGeneracion[generacion] = porGeneracion[generacion].filter(Boolean);
    }
  }

  console.log(`  ${Object.keys(porPokemon).length} pokémon con tipos`);
  console.log(`  ${Object.keys(pasado).length} cambiaron de tipo con el tiempo`);

  // --------------------------------------------------- Un par de comprobaciones
  const comprueba = (
    que: string,
    esperado: number,
    obtenido: number,
  ) => {
    const bien = esperado === obtenido;
    console.log(`  ${bien ? "✓" : "✗"} ${que}: ${obtenido} (se espera ${esperado})`);
    if (!bien) process.exitCode = 1;
  };

  const idDe = (slug: string) =>
    listaDeTipos.find((tipo) => tipo.slug === slug)!.id;

  comprueba(
    "Fuego contra Acero, hoy",
    200,
    tabla[9][idDe("fire") - 1][idDe("steel") - 1],
  );
  comprueba(
    "Fantasma contra Acero en la 4ª (lo resistía)",
    50,
    tabla[4][idDe("ghost") - 1][idDe("steel") - 1],
  );
  comprueba(
    "Fantasma contra Acero hoy",
    100,
    tabla[9][idDe("ghost") - 1][idDe("steel") - 1],
  );
  comprueba(
    "Veneno contra Bicho en la 1ª (era supereficaz)",
    200,
    tabla[1][idDe("poison") - 1][idDe("bug") - 1],
  );
  comprueba("Charizard es Fuego/Volador", idDe("fire"), porPokemon["6"][0]);
  comprueba("Durant es Bicho/Acero", idDe("bug"), porPokemon["632"][0]);
  comprueba("Clefairy era Normal en la 4ª", idDe("normal"), pasado["35"]["5"][0]);

  writeFileSync(
    SALIDA,
    JSON.stringify({ tipos: listaDeTipos, tabla, porPokemon, pasado }),
  );
  console.log(`Escrito ${SALIDA}`);
}

main();
