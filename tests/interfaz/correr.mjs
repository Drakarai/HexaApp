/**
 * Las **pruebas de la interfaz**: la aplicación de verdad, en un navegador de
 * verdad, recorriendo lo básico como lo haría un jugador. Las de `tests/*.test.ts`
 * prueban las reglas del locke; estas, que las pantallas no se caigan y que
 * lo de todos los días funcione: entrar, apuntar una captura, abrir su ficha,
 * marcar un gimnasio, apuntar un resultado, el buscador…
 *
 *   npm run build            # una vez, o cuando cambie el código
 *   npm run test:interfaz
 *
 * Lo hace todo solo y **sin tocar la base de datos de trabajo**:
 *
 * 1. Rehace desde cero una base aparte, `hexaapp_pruebas`, en el mismo
 *    servidor de PostgreSQL que la de `.env`, y la siembra con el Hexalocke 2
 *    de ejemplo. Se niega si la base de `.env` no está en esta máquina: no se
 *    va a crear ni borrar nada en un servidor de fuera.
 * 2. Levanta la aplicación compilada contra ella en el puerto 3100.
 * 3. Pasa las pruebas de `tests/interfaz/*.prueba.mjs`, una detrás de otra.
 * 4. Apaga la aplicación, pase lo que pase.
 *
 * No van dentro de `npm run build` porque Vercel no tiene navegador, y por la
 * misma razón Playwright no es una dependencia del proyecto: se usa el que
 * haya instalado (ver `guia/navegador.mjs`).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUERTO = Number(process.env.PRUEBAS_PUERTO ?? 3100);
const NOMBRE = "hexaapp_pruebas";

function deEnv(clave) {
  if (process.env[clave]) return process.env[clave];
  const linea = readFileSync(join(RAIZ, ".env"), "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${clave}=`));
  return linea?.slice(clave.length + 1).trim().replace(/^"|"$/g, "");
}

function fallar(texto) {
  console.error(`\n✗ ${texto}\n`);
  process.exit(1);
}

const deTrabajo = deEnv("DIRECT_URL") ?? deEnv("DATABASE_URL");
if (!deTrabajo) fallar("No encuentro DATABASE_URL ni en el entorno ni en .env.");
const url = new URL(deTrabajo);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  fallar(`La base de .env está en ${url.hostname}: las pruebas solo crean y borran bases en esta máquina.`);
}
const dePruebas = new URL(url);
dePruebas.pathname = `/${NOMBRE}`;
const delServidor = new URL(url);
delServidor.pathname = "/postgres";

if (!existsSync(join(RAIZ, ".next", "BUILD_ID"))) fallar("No hay compilación: haz antes `npm run build`.");

function paso(texto, orden, args, env = {}) {
  process.stdout.write(`· ${texto}… `);
  const r = spawnSync(orden, args, { cwd: RAIZ, env: { ...process.env, ...env }, encoding: "utf8" });
  if (r.status !== 0) {
    console.log("mal");
    fallar(`${texto}:\n${(r.stderr || r.stdout || "").slice(-2000)}`);
  }
  console.log("hecho");
}

const conLaDePruebas = { DATABASE_URL: dePruebas.href, DIRECT_URL: dePruebas.href };

// Solo se borra la base de pruebas, por su nombre: nunca la de .env
paso("Base de pruebas desde cero", "psql", [
  delServidor.href,
  "-v",
  "ON_ERROR_STOP=1",
  "-c",
  `DROP DATABASE IF EXISTS ${NOMBRE} WITH (FORCE)`,
  "-c",
  `CREATE DATABASE ${NOMBRE}`,
]);
paso("Sus tablas", "npx", ["prisma", "db", "push", "--skip-generate"], conLaDePruebas);
paso("Los datos de ejemplo", "npx", ["tsx", "prisma/seed.ts"], conLaDePruebas);

process.stdout.write(`· La aplicación en el puerto ${PUERTO}… `);
const app = spawn("npx", ["next", "start", "-p", String(PUERTO)], {
  cwd: RAIZ,
  // Con el Showdown de mentira: las repeticiones no salen a internet (ver guia/showdown-falso.cjs)
  env: {
    ...process.env,
    ...conLaDePruebas,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(join(RAIZ, "guia", "showdown-falso.cjs"))}`.trim(),
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let registro = "";
app.stdout.on("data", (d) => (registro += d));
app.stderr.on("data", (d) => (registro += d));
const apagar = () => {
  try {
    // Al grupo entero: npx deja a next colgando de él
    process.kill(-app.pid, "SIGTERM");
  } catch {
    // Ya estaba apagada
  }
};
process.on("exit", apagar);
process.on("SIGINT", () => process.exit(130));

const BASE = `http://localhost:${PUERTO}`;
let lista = false;
for (let i = 0; i < 60 && !lista; i++) {
  await new Promise((r) => setTimeout(r, 500));
  lista = await fetch(`${BASE}/login`).then((r) => r.ok, () => false);
}
if (!lista) fallar(`La aplicación no arranca:\n${registro.slice(-2000)}`);
console.log("lista");

const pruebas = readdirSync(join(RAIZ, "tests", "interfaz"))
  .filter((f) => f.endsWith(".prueba.mjs") && (!process.argv[2] || f.includes(process.argv[2])))
  .sort()
  .map((f) => join("tests", "interfaz", f));

const resultado = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", "--test-reporter=spec", ...pruebas],
  { cwd: RAIZ, stdio: "inherit", env: { ...process.env, PRUEBAS_URL: BASE } },
);
if (resultado.status !== 0 && process.env.PRUEBAS_REGISTRO) console.log(registro.slice(-4000));
process.exit(resultado.status ?? 1);
