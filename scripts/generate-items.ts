/**
 * Genera src/lib/objetos.json a partir de los datos abiertos de PokéAPI: el
 * nombre en español de cada objeto y el nombre de su sprite.
 *
 *   npx tsx scripts/generate-items.ts
 *
 * Es el hermano de generate-pokedex.ts y funciona igual: lee los CSV del
 * repositorio de PokéAPI, no su API. El fichero generado se sube, así que la
 * aplicación no depende de nadie para buscar objetos; las imágenes sí se bajan
 * de internet, pero solo cuando un administrador añade uno a una bolsa.
 *
 * Se dejan fuera los objetos sin nombre en español y los que no tienen sprite
 * propio, que en una lista solo estorban.
 */
import { writeFileSync } from "node:fs";

const CSV_BASE =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const SPRITES =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";
const SPANISH = "7";
const OUTPUT = "src/lib/objetos.json";

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
  const [items, itemNames, categories, categoryNames, pockets] =
    await Promise.all([
      fetchCsv("items"),
      fetchCsv("item_names"),
      fetchCsv("item_categories"),
      fetchCsv("item_category_prose"),
      fetchCsv("item_pocket_names"),
    ]);

  const nombrePorObjeto = new Map<string, string>();
  for (const row of itemNames) {
    if (row.local_language_id === SPANISH) {
      nombrePorObjeto.set(row.item_id, row.name);
    }
  }

  // La "bolsa" a la que pertenece cada categoría: pokéballs, MT, bayas…
  const bolsaPorCategoria = new Map<string, string>();
  for (const row of categories) {
    bolsaPorCategoria.set(row.id, row.pocket_id);
  }
  const nombreDeBolsa = new Map<string, string>();
  for (const row of pockets) {
    if (row.local_language_id === SPANISH) {
      nombreDeBolsa.set(row.item_pocket_id, row.name);
    }
  }
  // El nombre de la categoría, que es más fino que el de la bolsa
  const nombreDeCategoria = new Map<string, string>();
  for (const row of categoryNames) {
    if (row.local_language_id === SPANISH && row.name) {
      nombreDeCategoria.set(row.item_category_id, row.name);
    }
  }

  type Objeto = { slug: string; nombre: string; grupo: string };
  const salida: Objeto[] = [];

  for (const row of items) {
    const nombre = nombrePorObjeto.get(row.id);
    if (!nombre) continue;

    const pocketId = bolsaPorCategoria.get(row.category_id);
    const grupo =
      nombreDeCategoria.get(row.category_id) ??
      (pocketId ? nombreDeBolsa.get(pocketId) : null) ??
      "Otros";

    salida.push({ slug: row.identifier, nombre, grupo });
  }

  // PokéAPI lista muchos objetos de juegos que no tienen dibujo (los de las
  // últimas generaciones, los de Pokémon GO, los cristales Dinamax…). En una
  // lista con imágenes esos solo estorban, así que se comprueba uno a uno que
  // el sprite exista de verdad antes de dejarlo dentro.
  console.log(`Comprobando el dibujo de ${salida.length} objetos…`);
  let siguiente = 0;
  const conDibujo: Objeto[] = [];
  await Promise.all(
    Array.from({ length: 24 }, async () => {
      while (siguiente < salida.length) {
        const objeto = salida[siguiente++];
        const respuesta = await fetch(`${SPRITES}/${objeto.slug}.png`, {
          method: "HEAD",
        });
        if (respuesta.ok) conDibujo.push(objeto);
      }
    }),
  );

  /**
   * Un mismo nombre sale varias veces: los cristales Z están dos veces (el que
   * se lleva puesto y el de la bolsa) y "Bici" tres, una por color. En un
   * desplegable eso son tres filas idénticas entre las que no se puede elegir,
   * así que de cada nombre se queda una: la del slug sin sufijo de variante.
   */
  const porNombre = new Map<string, Objeto>();
  for (const objeto of conDibujo) {
    const anterior = porNombre.get(objeto.nombre);
    if (!anterior || objeto.slug.length < anterior.slug.length) {
      porNombre.set(objeto.nombre, objeto);
    }
  }

  const salidaFinal = [...porNombre.values()];
  salidaFinal.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ sprites: SPRITES, objetos: salidaFinal })}\n`,
  );
  console.log(`${salidaFinal.length} objetos escritos en ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
