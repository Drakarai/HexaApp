/**
 * Mete en la base de datos actual (la de DATABASE_URL) el JSON generado por
 * export-sqlite.ts. Pensado para la mudanza de SQLite al servidor.
 *
 *   npx tsx scripts/import-json.ts
 *
 * Es seguro repetirlo: las filas que ya existan se saltan, no se duplican.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { TABLES, EXPORT_FILE } from "./data-shape";

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2] ?? EXPORT_FILE;
  if (!existsSync(file)) {
    console.error(`
No encuentro "${file}". Genéralo primero en la carpeta antigua con:
  npx tsx scripts/export-sqlite.ts
`);
    process.exit(1);
  }

  const dump = JSON.parse(readFileSync(file, "utf8")) as Record<
    string,
    Record<string, unknown>[]
  >;

  console.log(`\nImportando en ${process.env.DATABASE_URL?.split("@").pop() ?? "?"}\n`);

  let total = 0;
  for (const table of TABLES) {
    const rows = dump[table.name];
    if (!rows?.length) continue;

    // Las fechas viajan como texto ISO en el JSON
    const data = rows.map((row) => {
      const converted: Record<string, unknown> = { ...row };
      for (const field of table.dates) {
        if (typeof row[field] === "string") {
          converted[field] = new Date(row[field] as string);
        }
      }
      return converted;
    });

    // El modelo se elige en tiempo de ejecución, de ahí el paso por unknown
    const delegate = prisma[table.model as keyof typeof prisma] as unknown as {
      createMany: (args: {
        data: unknown[];
        skipDuplicates: boolean;
      }) => Promise<{ count: number }>;
    };

    const result = await delegate.createMany({ data, skipDuplicates: true });
    total += result.count;
    const skipped = rows.length - result.count;
    console.log(
      `  ${table.name.padEnd(16)} ${result.count}${skipped ? ` (${skipped} ya estaban)` : ""}`,
    );
  }

  console.log(`\nListo: ${total} filas importadas.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
