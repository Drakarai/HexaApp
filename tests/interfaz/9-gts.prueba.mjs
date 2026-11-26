/**
 * **La GTS**: encenderla en Editar datos, ponerse un checkpoint abierto, poner
 * un pokémon, que otro lo vea en modo oculto y ofrezca uno suyo, aceptarlo y
 * que cada uno acabe en la caja del otro, con un boleto menos.
 *
 * Lo que la interfaz tardaría mucho en montar (el checkpoint, los gimnasios
 * pasados y dos pokémon en la caja) se prepara en la base de pruebas, y al
 * acabar se deja todo como estaba.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { abrirNavegador, entrar, ir, sinProblemas } from "./comun.mjs";

const DB = process.env.PRUEBAS_DB;

function sql(consulta) {
  const r = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-tAc", consulta], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}

const LOCKE = `(select id from "Competition" where slug = 'hexalocke-2')`;
const jugador = (usuario) =>
  `(select p.id from "Participant" p join "User" u on u.id = p."userId" where u.username = '${usuario}' and p."competitionId" = ${LOCKE})`;

/** Los checkpoints hasta el primero cuya jornada no se ha acabado, y ese lo han pasado Draka y Pablo */
function prepararLaGts() {
  const acabadas = Number(
    sql(`select count(*) from "Matchday" m where m."competitionId" = ${LOCKE}
      and exists (select 1 from "Match" x where x."matchdayId" = m.id)
      and not exists (select 1 from "Match" x where x."matchdayId" = m.id and x."winnerId" is null)`),
  );
  sql(`update "LevelCap" set "jornadaDespues" = true where id in (
    select id from "LevelCap" where "competitionId" = ${LOCKE} order by position limit ${acabadas + 1})`);
  const hito = `(select id from "LevelCap" where "competitionId" = ${LOCKE} order by position offset ${acabadas} limit 1)`;
  for (const usuario of ["draka", "pablo"]) {
    sql(`insert into "GymClear" (id, "participantId", "levelCapId") values ('gts-prueba-${usuario}', ${jugador(usuario)}, ${hito})
      on conflict do nothing`);
  }
  sql(`insert into "Capture" (id, "participantId", species, nickname, "pokemonId", lugar, hueco) values
    ('gts-prueba-chispas', ${jugador("draka")}, 'Cyndaquil', 'Chispas', 155, 'caja', 29),
    ('gts-prueba-burbuja', ${jugador("pablo")}, 'Totodile', 'Burbuja', 158, 'caja', 29)`);
}

function deshacerLaGts() {
  sql(`delete from "GtsDeposito" where "competitionId" = ${LOCKE}`);
  sql(`delete from "Capture" where id like 'gts-prueba-%'`);
  sql(`delete from "GymClear" where id like 'gts-prueba-%'`);
  sql(`update "LevelCap" set "jornadaDespues" = false where "competitionId" = ${LOCKE}`);
  sql(`update "Competition" set gts = false, "gtsAVista" = false, "gtsVeto" = false where id = ${LOCKE}`);
}

let navegador;
before(async () => {
  navegador = await abrirNavegador();
});
after(() => navegador?.close());

describe("GTS", () => {
  let draka;
  let pablo;
  before(async () => {
    prepararLaGts();
    draka = await entrar(navegador, "draka");
    pablo = await entrar(navegador, "pablo");
  });
  after(async () => {
    await draka?.cerrar();
    await pablo?.cerrar();
    deshacerLaGts();
  });

  test("apagada no hay GTS, y se enciende en Editar datos", async () => {
    const { pagina } = draka;
    await ir(pagina, "/gts");
    await pagina.getByText("Este locke no tiene GTS").waitFor();

    await ir(pagina, "/competiciones?seccion=ajustes");
    const campo = pagina.locator("[data-campo-gts]").last();
    const editar = pagina.locator("details", { has: campo }).last();
    if ((await editar.getAttribute("open")) === null) await editar.locator("summary").first().click();
    await campo.locator('input[name="gts"]').check();
    await Promise.all([
      pagina.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/competiciones")),
      editar.getByRole("button", { name: "Guardar" }).click(),
    ]);
    assert.equal(sql(`select gts from "Competition" where id = ${LOCKE}`), "t");
  });

  test("se pone, el otro lo ve oculto, ofrece y al aceptarlo se cambian", async () => {
    await ir(draka.pagina, "/gts");
    await draka.pagina.getByText("La GTS está abierta").waitFor();
    // Dos, más uno por jornada acabada (otras pruebas acaban alguna)
    const boletos = () => draka.pagina.locator("[data-mis-boletos]").innerText().then((t) => Number(t.split(/\s/)[0]));
    const antes = await boletos();
    assert.ok(antes >= 2);

    // Poner a Chispas
    await draka.pagina.getByRole("button", { name: "Poner un pokémon en la GTS" }).click();
    const poner = draka.pagina.locator("[data-poner]");
    await poner.getByLabel("Qué buscas a cambio").fill("Algo de agua");
    await poner.getByRole("button", { name: "Chispas" }).click();
    await poner.getByRole("button", { name: "Ponerlo" }).click();
    await draka.pagina.getByText("Chispas está en la GTS").waitFor();

    // Pablo lo ve, sin la ficha (oculta), y ofrece a Burbuja
    await ir(pablo.pagina, "/gts");
    const deposito = pablo.pagina.locator("[data-deposito]", { hasText: "Chispas" });
    await deposito.getByText("Busca: Algo de agua").waitFor();
    await deposito.getByText("El resto de su ficha se ve al recibirlo").waitFor();
    await deposito.getByRole("button", { name: "Ofrecer uno tuyo" }).click();
    await deposito.getByRole("button", { name: "Burbuja" }).click();
    await deposito.getByRole("button", { name: "Ofrecer", exact: true }).click();
    await pablo.pagina.getByText("Oferta mandada").waitFor();

    // Draka acepta
    await ir(draka.pagina, "/gts");
    const oferta = draka.pagina.locator("[data-deposito-mio] [data-oferta]", { hasText: "Burbuja" });
    await oferta.getByRole("button", { name: "Aceptar" }).click();
    await draka.pagina.getByText("¡Intercambio hecho!").waitFor();
    // La animación del intercambio sale sola, y se salta
    const animacion = draka.pagina.locator("[data-animacion-intercambio]");
    await animacion.waitFor();
    await animacion.getByRole("button", { name: /Saltar|Seguir/ }).click();
    await animacion.waitFor({ state: "detached" });
    await draka.pagina.locator("[data-intercambio]").first().waitFor();
    assert.equal(await boletos(), antes - 1);

    // Cada uno en la caja del otro, en el hueco del que se fue
    assert.equal(sql(`select "participantId" = ${jugador("pablo")} from "Capture" where id = 'gts-prueba-chispas'`), "t");
    assert.equal(sql(`select "participantId" = ${jugador("draka")} from "Capture" where id = 'gts-prueba-burbuja'`), "t");
    assert.match(sql(`select historia::text from "Capture" where id = 'gts-prueba-chispas'`), /"tipo": "gts"/);

    sinProblemas(draka.problemas, "la GTS de Draka");
    sinProblemas(pablo.problemas, "la GTS de Pablo");
  });

  test("a quien no ha pasado el level cap todavía no se le abre", async () => {
    const hector = await entrar(navegador, "hector");
    try {
      await ir(hector.pagina, "/gts");
      await hector.pagina.getByText("Todavía no se te ha abierto").waitFor();
      assert.equal(await hector.pagina.getByRole("button", { name: "Poner un pokémon en la GTS" }).count(), 0);
      sinProblemas(hector.problemas, "la GTS de Héctor");
    } finally {
      await hector.cerrar();
    }
  });
});
