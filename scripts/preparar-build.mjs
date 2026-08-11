/**
 * Se ejecuta justo antes de compilar, y solo hace una cosa: asegurarse de que
 * existe `DIRECT_URL`. Si no está, la deja apuntando a lo mismo que
 * `DATABASE_URL`.
 *
 * Por qué hace falta. Cuando la base de datos va por el *pooler* de Neon, la
 * aplicación habla con un portero que reparte conexiones ya abiertas. Eso va
 * muy bien para atender páginas, pero **crear tablas no funciona a través del
 * portero**, así que Prisma necesita además la dirección directa: eso es
 * `DIRECT_URL`.
 *
 * Y si alguien no la configura, esto evita que el despliegue reviente: sin
 * pooler las dos direcciones son la misma, así que usar `DATABASE_URL` para
 * ambas es exactamente lo que había antes.
 */
import { appendFileSync, readFileSync, existsSync } from "node:fs";

const FICHERO = ".env";
const contenido = existsSync(FICHERO) ? readFileSync(FICHERO, "utf8") : "";

/** Lee una variable del entorno o, si no está, del fichero .env. */
function leer(nombre) {
  const delEntorno = process.env[nombre]?.trim();
  if (delEntorno) return delEntorno;

  const linea = contenido.match(
    new RegExp(`^\\s*${nombre}\\s*=\\s*(.+)$`, "m"),
  )?.[1];
  return linea?.trim().replace(/^["']|["']$/g, "") || null;
}

if (leer("DIRECT_URL")) {
  console.log("[build] DIRECT_URL configurada: se usará para crear las tablas.");
} else {
  const principal = leer("DATABASE_URL");
  if (!principal) {
    console.log("[build] Aviso: no hay DATABASE_URL, Prisma se quejará ahora.");
  } else {
    // Prisma lee el .env del proyecto, así que dejándola aquí la encuentra
    appendFileSync(FICHERO, `\nDIRECT_URL="${principal}"\n`);
    console.log(
      "[build] Sin DIRECT_URL: se usa DATABASE_URL también para crear tablas.",
    );
  }
}
