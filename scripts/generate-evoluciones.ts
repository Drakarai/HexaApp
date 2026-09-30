/**
 * Genera src/lib/evoluciones.json a partir de los datos abiertos de PokéAPI:
 * de qué especie evoluciona cada una.
 *
 *   npx tsx scripts/generate-evoluciones.ts
 *
 * Como la pokédex, solo hay que volver a pasarlo cuando salgan pokémon nuevos:
 * el fichero se sube al repositorio y la aplicación no depende de PokéAPI.
 *
 * Se guarda **al revés de como se usa** ("Quilava viene de Cyndaquil") porque
 * así es como lo trae PokéAPI y cabe en una línea por especie; las evoluciones
 * de cada una se sacan al cargar, en `lib/evoluciones.ts`. Las ramas salen
 * solas: Eevee es "de quien vienen" ocho especies.
 */
import { writeFileSync } from "node:fs";

const CSV =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv";
const OUTPUT = "src/lib/evoluciones.json";

async function main() {
  console.log("Descargando pokemon_species.csv…");
  const respuesta = await fetch(CSV);
  if (!respuesta.ok) throw new Error(`No se pudo descargar (${respuesta.status})`);
  // Este CSV no lleva comas dentro de los campos: basta con partir
  const [cabecera, ...filas] = (await respuesta.text()).trim().split(/\r?\n/);
  const columnas = cabecera.split(",");
  const col = (nombre: string) => columnas.indexOf(nombre);

  const de: Record<string, number> = {};
  for (const fila of filas) {
    const campos = fila.split(",");
    const id = campos[col("id")];
    const origen = campos[col("evolves_from_species_id")];
    if (origen) de[id] = Number(origen);
  }

  writeFileSync(OUTPUT, JSON.stringify({ de }));
  console.log(`${Object.keys(de).length} evoluciones → ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
