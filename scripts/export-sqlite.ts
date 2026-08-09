/**
 * Vuelca a un JSON todo lo que haya en la base de datos SQLite local
 * (prisma/dev.db), para luego meterlo en la base de datos del servidor.
 *
 *   npx tsx scripts/export-sqlite.ts
 *
 * Lee el fichero directamente, sin pasar por Prisma, así que funciona aunque
 * el proyecto ya esté configurado para PostgreSQL.
 */
import { writeFileSync, existsSync } from "node:fs";
import { TABLES, EXPORT_FILE } from "./data-shape";

// El aviso de "SQLite is experimental" no aporta nada aquí. Se filtra antes de
// cargar el módulo, por eso la importación es dinámica.
const emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...rest: never[]) => {
  if (String(warning).includes("SQLite")) return;
  emitWarning(warning, ...rest);
};
const { DatabaseSync } = await import("node:sqlite");

const dbPath = process.argv[2] ?? "prisma/dev.db";

if (!existsSync(dbPath)) {
  console.error(`
No encuentro la base de datos en "${dbPath}".

Si tu fichero está en otro sitio, pásale la ruta:
  npx tsx scripts/export-sqlite.ts C:\\ruta\\a\\dev.db
`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const dump: Record<string, unknown[]> = {};
let total = 0;

for (const table of TABLES) {
  let rows: Record<string, unknown>[];
  try {
    rows = db.prepare(`SELECT * FROM "${table.name}"`).all() as Record<
      string,
      unknown
    >[];
  } catch {
    // Una base de datos de una versión anterior puede no tener alguna tabla
    console.warn(`  (aviso) la tabla ${table.name} no existe, la salto`);
    continue;
  }

  dump[table.name] = rows.map((row) => {
    const converted: Record<string, unknown> = { ...row };
    // SQLite guarda las fechas como número y los booleanos como 0/1
    for (const field of table.dates) {
      const value = row[field];
      if (typeof value === "number" || typeof value === "bigint") {
        converted[field] = new Date(Number(value)).toISOString();
      }
    }
    for (const field of table.booleans) {
      if (row[field] !== null && row[field] !== undefined) {
        converted[field] = Boolean(row[field]);
      }
    }
    return converted;
  });

  total += dump[table.name].length;
  console.log(`  ${table.name.padEnd(16)} ${dump[table.name].length}`);
}

db.close();
writeFileSync(EXPORT_FILE, JSON.stringify(dump, null, 2), "utf8");

console.log(`
Exportadas ${total} filas a ${EXPORT_FILE}

Siguiente paso, con DATABASE_URL apuntando ya al servidor:
  npm run db:push
  npx tsx scripts/import-json.ts
`);
