/**
 * Genera src/lib/pokedex.json a partir de los datos abiertos de PokéAPI:
 * número de pokédex, nombre en español y formas alternas de cada pokémon.
 *
 *   npx tsx scripts/generate-pokedex.ts
 *
 * Solo hay que volver a ejecutarlo cuando salgan pokémon nuevos. El fichero
 * generado se sube al repositorio, así que la aplicación no depende de PokéAPI
 * para funcionar: solo descarga las imágenes cuando registras una baja.
 *
 * Nota sobre las formas: se usan las "variedades" de PokéAPI, que incluyen
 * Alola, Galar, Hisui, Paldea, megas, Gigamax, Rotom, Deoxys… pero no las
 * formas puramente decorativas (las letras de Unown, los patrones de Spinda o
 * Vivillon), que serían cientos de opciones inútiles en un desplegable.
 */
import { writeFileSync } from "node:fs";

const CSV_BASE =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const SPANISH = "7";
const OUTPUT = "src/lib/pokedex.json";

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

/** "Forma de Alola" -> "de Alola"; "Forma Cielo" -> "Cielo" */
function cleanFormLabel(raw: string) {
  return raw.replace(/^Forma\s+/i, "").trim();
}

/** "charizard-mega-x" con especie "charizard" -> "Mega X" */
function labelFromIdentifier(identifier: string, speciesSlug: string) {
  const rest = identifier.startsWith(`${speciesSlug}-`)
    ? identifier.slice(speciesSlug.length + 1)
    : identifier;
  return rest
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function main() {
  console.log("Descargando datos de PokéAPI…");
  const [speciesNames, pokemon, forms, formNames] = await Promise.all([
    fetchCsv("pokemon_species_names"),
    fetchCsv("pokemon"),
    fetchCsv("pokemon_forms"),
    fetchCsv("pokemon_form_names"),
  ]);

  // Nombre en español de cada especie
  const nameBySpecies = new Map<string, string>();
  for (const row of speciesNames) {
    if (row.local_language_id === SPANISH) {
      nameBySpecies.set(row.pokemon_species_id, row.name);
    }
  }

  // Nombre en español de cada forma
  const formNameByFormId = new Map<string, string>();
  for (const row of formNames) {
    if (row.local_language_id === SPANISH && row.form_name) {
      formNameByFormId.set(row.pokemon_form_id, row.form_name);
    }
  }

  // Forma por defecto de cada variedad, para poder sacar su nombre
  const formByPokemonId = new Map<string, string>();
  for (const row of forms) {
    if (row.is_default === "1") formByPokemonId.set(row.pokemon_id, row.id);
  }

  // Slug de la variedad principal de cada especie, para limpiar etiquetas
  const defaultSlugBySpecies = new Map<string, string>();
  for (const row of pokemon) {
    if (row.is_default === "1") {
      defaultSlugBySpecies.set(row.species_id, row.identifier);
    }
  }

  type Entry = { dex: number; name: string; forms?: [number, string][] };
  const bySpecies = new Map<string, Entry>();

  for (const row of pokemon) {
    const name = nameBySpecies.get(row.species_id);
    if (!name) continue; // especies sin traducción (formas de prueba, etc.)

    const dex = Number(row.species_id);
    const pokemonId = Number(row.id);
    const isDefault = row.is_default === "1";

    let label = "Normal";
    if (!isDefault) {
      const formId = formByPokemonId.get(row.id);
      const translated = formId ? formNameByFormId.get(formId) : undefined;
      label = translated
        ? cleanFormLabel(translated)
        : labelFromIdentifier(
            row.identifier,
            defaultSlugBySpecies.get(row.species_id) ?? "",
          );
      if (!label) label = row.identifier;
    }

    const entry = bySpecies.get(row.species_id) ?? { dex, name, forms: [] };
    entry.forms!.push([pokemonId, label]);
    bySpecies.set(row.species_id, entry);
  }

  const species = [...bySpecies.values()]
    .map((entry) => {
      // La forma normal primero, el resto en el orden de PokéAPI
      entry.forms!.sort((a, b) =>
        a[1] === "Normal" ? -1 : b[1] === "Normal" ? 1 : a[0] - b[0],
      );
      // Si solo tiene la forma normal y su id coincide con el número de
      // pokédex, la lista de formas no aporta nada y se omite
      if (
        entry.forms!.length === 1 &&
        entry.forms![0][0] === entry.dex &&
        entry.forms![0][1] === "Normal"
      ) {
        return { dex: entry.dex, name: entry.name };
      }
      return entry;
    })
    .sort((a, b) => a.dex - b.dex);

  const withForms = species.filter((entry) => "forms" in entry).length;

  writeFileSync(OUTPUT, JSON.stringify({ species }), "utf8");

  console.log(`
${OUTPUT} generado.

  Especies:            ${species.length}
  Con formas alternas: ${withForms}
  Tamaño:              ${Math.round(JSON.stringify({ species }).length / 1024)} KB
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
