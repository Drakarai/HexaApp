import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getStandings,
  soloLectura,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { StandingsTable } from "@/components/standings-table";
import { getFormatoFinal } from "@/lib/final-four";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { cx, formatDateTime } from "@/lib/utils";
import {
  deletePointEntryAction,
  quickAdjustPointsAction,
} from "@/app/actions/points";
import { PointsForms } from "./points-forms";
import { ConfigDePuestos, RepartirPremiosFinales } from "./puestos-forms";
import { leerPremiosPorPuesto, leerPuntosPorPuesto } from "@/lib/puestos";
import {
  getGraficoClasificacion,
  movimientosEnLaTabla,
} from "@/lib/grafico-clasificacion";
import { PointsChart } from "@/components/points-chart";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getMarcador } from "@/lib/marcador";
import { getCampeonesDeLiga } from "@/lib/liga";
import { MarcadorDual, CampeonesDeLiga } from "@/components/marcador-dual";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { ResumenEnSolitario } from "@/components/resumen-solitario";

export const metadata = { title: "Puntos" };

/** Los últimos movimientos que se ven sin desplegar nada */
const A_LA_VISTA = 8;

export default async function PointsPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  /**
   * Con dos jugadores esta pantalla es otra cosa: no una clasificación por
   * puntos sino el marcador de jornadas ganadas. Lo decide el perfil del locke,
   * que se fija al crear la edición.
   */
  const perfil = perfilDeLocke(competition.maxPlayers, competition.estilo);
  const porJornadas = perfil.victoria === "jornadas";
  // En un Soul Link no hay puntos: lo que hace de "tabla" es el Equipo y PC
  if (perfil.cooperativo) redirect("/equipo");
  /**
   * En solitario esta pantalla no está en el menú, pero se puede llegar por la
   * dirección: en vez de una clasificación de una fila, enseña la partida.
   */
  const progreso = perfil.enSolitario
    ? await getProgresoEnSolitario(competition.id)
    : null;

  const [canManage, standings, grafico, formatoFinal, history, marcador, campeonesDeLiga] = await Promise.all([
    canManageCompetition(competition.id, user),
    getStandings(competition.id),
    porJornadas ? null : getGraficoClasificacion(competition.id),
    // Cuántos llevan medalla de clasificado depende del formato de la final
    getFormatoFinal(competition.id),
    prisma.pointEntry.findMany({
      where: { competitionId: competition.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        participant: true,
        createdBy: { select: { displayName: true } },
      },
    }),
    porJornadas ? getMarcador(competition.id) : null,
    getCampeonesDeLiga(competition.id),
  ]);

  // Cada uno puede tocar su propio as; los administradores, el de todos
  const editableAces = canManage
    ? standings.map((row) => row.participantId)
    : soloLectura(competition, canManage)
      ? [] // archivada: el as de cada uno se queda como estaba
      : standings
          .filter((row) => row.userId === user.id)
          .map((row) => row.participantId);

  /** Un movimiento del historial, con su botón de deshacer si se puede */
  const movimiento = (entry: (typeof history)[number]) => (
    <li
      key={entry.id}
      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
    >
      <span
        className={cx(
          "w-12 shrink-0 text-center text-sm font-bold tabular-nums",
          entry.delta > 0 ? "text-emerald-400" : "text-red-400",
        )}
      >
        {entry.delta > 0 ? "+" : ""}
        {entry.delta}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">
          {entry.participant.displayName}
          <span className="text-slate-400"> · {entry.reason}</span>
        </p>
        <p className="text-xs text-slate-500">
          {formatDateTime(entry.createdAt)}
          {entry.createdBy ? ` · por ${entry.createdBy.displayName}` : ""}
          {entry.sourceMatchId ? " · automático (jornada)" : ""}
        </p>
      </div>
      {canManage && !entry.sourceMatchId && !entry.sourceMatchdayId ? (
        <form action={deletePointEntryAction}>
          <input type="hidden" name="entryId" value={entry.id} />
          <ConfirmSubmit message="¿Deshacer este movimiento de puntos?">
            ✕
          </ConfirmSubmit>
        </form>
      ) : null}
    </li>
  );

  return (
    <>
      <PageHeader
        title={perfil.enSolitario ? "Mi partida" : porJornadas ? "Marcador" : "Puntos y clasificación"}
        subtitle={
          perfil.enSolitario
            ? "Un locke en solitario no tiene clasificación: lo que hay es tu progreso, y se gana pasándote la Liga."
            : porJornadas
            ? "En un locke de dos no hay tabla que valga: gana quien se lleve más jornadas."
            : `Todo el mundo empieza con ${competition.startingPoints} puntos. Los que se saltan la primera ronda de la final se clasifican directos.`
        }
      />

      {progreso ? (
        <section className="card mb-4">
          <ResumenEnSolitario progreso={progreso} />
        </section>
      ) : null}

      {marcador ? <MarcadorDual marcador={marcador} filas={standings} editables={editableAces} /> : null}

      {/**
       * Con una sola jornada jugada la gráfica son dos columnas —"Inicio" y
       * "J1"— y trescientos píxeles para contar lo que la tabla de abajo ya
       * dice. Aparece cuando hay **dos jornadas que comparar**, que es cuando
       * empieza a haber un recorrido.
       */}
      {grafico && grafico.etapas.length > 2 ? (
        <section className="card mb-4">
          <h2 className="section-title mb-1">Cómo ha ido la cosa</h2>
          {/* Lo que se ve de un vistazo, y el porqué de los puestos plegado:
              eran ocho líneas de texto antes del gráfico, en el móvil una
              pantalla entera */}
          <p className="muted">
            El puesto de cada uno jornada a jornada, con sus puntos dentro de cada bola.
          </p>
          <details className="group mb-4 mt-1">
            <summary className="cursor-pointer list-none text-xs text-brand-400 marker:hidden hover:underline">
              <span aria-hidden className="mr-1 inline-block transition group-open:rotate-90">▸</span>
              ¿Por qué dos con los mismos puntos no comparten puesto?
            </summary>
            <p className="muted mt-2">
              Los puestos salen con los mismos desempates que la tabla —puntos, luego menos
              caídos, luego mejor diferencia—, así que dos con los mismos puntos pueden ir uno
              encima del otro; toca una bola para ver por qué. Cuando van igualados de verdad en
              las tres cosas, comparten bola.
            </p>
          </details>
          <PointsChart
            etapas={grafico.etapas}
            etapasDeLosQueSiguen={grafico.etapasDeLosQueSiguen}
            salidas={grafico.salidas}
            jugadores={grafico.jugadores}
          />
        </section>
      ) : null}

      {porJornadas || perfil.enSolitario ? null : (
      <section className="card">
        <h2 className="section-title mb-4">Clasificación global</h2>
        <StandingsTable
          qualifiedSlots={formatoFinal?.esperan ?? 2}
          rows={standings}
          highlightUserId={user.id}
          editableParticipantIds={editableAces}
          movimientos={movimientosEnLaTabla(grafico, standings)}
        />

      </section>
      )}

      {porJornadas || perfil.enSolitario ? null : (
        <SeccionDePuestos competitionId={competition.id} canManage={canManage && !soloLectura(competition, canManage)} />
      )}

      <div className="mt-4">
        <CampeonesDeLiga campeones={campeonesDeLiga} />
      </div>

      {/**
       * Lo de tocar puntos, **plegado en una sola caja**: el ajuste rápido de
       * ±1, sumar o restar con motivo y aplicar a todos. Iba todo abierto entre
       * la clasificación y el historial y alargaba la pantalla de quien la
       * administra; se usa de vez en cuando, no cada vez que se entra.
       */}
      {canManage && !perfil.enSolitario ? (
        <details className="card group mt-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-200 marker:hidden">
            <span className="inline-block transition group-open:rotate-90">▸</span>
            Ajustar puntos
            <span className="font-normal text-slate-500">· a uno, con motivo o a todos</span>
          </summary>
          <div className="mt-4 space-y-5">
      <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Ajuste rápido
                </p>
                <div className="flex flex-wrap gap-2">
                  {standings.map((row) => (
                    <div
                      key={row.participantId}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
                    >
                      <Avatar
                        name={row.displayName}
                        color={row.color}
                        image={row.avatarImage}
                        size={22}
                        participantId={row.participantId}
                      />
                      <span className="mx-1 text-sm text-slate-200">
                        {row.displayName}
                      </span>
                      <form action={quickAdjustPointsAction}>
                        <input
                          type="hidden"
                          name="competitionId"
                          value={competition.id}
                        />
                        <input
                          type="hidden"
                          name="participantId"
                          value={row.participantId}
                        />
                        <input type="hidden" name="delta" value="-1" />
                        <button
                          className="btn-ghost btn-sm px-2"
                          title="Restar 1 punto"
                          type="submit"
                        >
                          −
                        </button>
                      </form>
                      <span className="w-7 text-center text-sm font-bold tabular-nums text-white">
                        {row.points}
                      </span>
                      <form action={quickAdjustPointsAction}>
                        <input
                          type="hidden"
                          name="competitionId"
                          value={competition.id}
                        />
                        <input
                          type="hidden"
                          name="participantId"
                          value={row.participantId}
                        />
                        <input type="hidden" name="delta" value="1" />
                        <button
                          className="btn-ghost btn-sm px-2"
                          title="Sumar 1 punto"
                          type="submit"
                        >
                          +
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            <PointsForms
              competitionId={competition.id}
              participants={standings.map((row) => ({
                id: row.participantId,
                displayName: row.displayName,
              }))}
            />
          </div>
        </details>
      ) : null}

      <section className={perfil.enSolitario ? "hidden" : "card mt-6"}>
        <h2 className="section-title mb-4">Historial de movimientos</h2>
        {history.length === 0 ? (
          <EmptyState dibujo="trofeo" title="Todavía no se han movido puntos" />
        ) : (
          <>
            <ul className="space-y-2">{history.slice(0, A_LA_VISTA).map(movimiento)}</ul>
            {/* Los de antes, plegados: se buscan poco y eran la mitad de la pantalla */}
            {history.length > A_LA_VISTA ? (
              <details className="group mt-3">
                <summary className="cursor-pointer list-none text-sm text-brand-400 marker:hidden hover:underline">
                  <span className="group-open:hidden">Ver los {history.length - A_LA_VISTA} anteriores</span>
                  <span className="hidden group-open:inline">Ocultar los anteriores</span>
                </summary>
                <ul className="mt-2 space-y-2">{history.slice(A_LA_VISTA).map(movimiento)}</ul>
              </details>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

/**
 * **La clasificación por puestos** (ver lib/puestos.ts): qué da cada puesto,
 * los premios de la clasificación final y, para quien administra, dónde se
 * configura todo.
 */
async function SeccionDePuestos({ competitionId, canManage }: { competitionId: string; canManage: boolean }) {
  const [locke, objetos, ruletas, finales, jugadores] = await Promise.all([
    prisma.competition.findUniqueOrThrow({
      where: { id: competitionId },
      select: { puntosPorPuesto: true, premiosPorPuesto: true, retoPorJornada: true },
    }),
    prisma.item.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.roulette.findMany({ where: { competitionId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.premioDePuesto.findMany({ where: { competitionId, matchdayId: null }, orderBy: { puesto: "asc" } }),
    prisma.participant.findMany({ where: { competitionId }, select: { id: true, displayName: true } }),
  ]);
  const puntos = leerPuntosPorPuesto(locke.puntosPorPuesto);
  const premios = leerPremiosPorPuesto(locke.premiosPorPuesto);
  const nombreDeObjeto = new Map(objetos.map((o) => [o.id, o.name]));
  const nombreDeRuleta = new Map(ruletas.map((r) => [r.id, r.name]));
  const nombreDe = new Map(jugadores.map((j) => [j.id, j.displayName]));
  const queDa = (i: number) =>
    [
      ...(premios[i]?.objetos ?? []).map((id) => nombreDeObjeto.get(id)).filter(Boolean),
      premios[i]?.ruleta && nombreDeRuleta.get(premios[i].ruleta!) ? `tirada en ${nombreDeRuleta.get(premios[i].ruleta!)}` : null,
    ]
      .filter(Boolean)
      .join(" + ") || "nada";

  if (!puntos && !canManage) return null;
  return (
    <>
      {puntos ? (
        <section className="card mt-4" data-puestos>
          <h2 className="section-title mb-1">Puntos por puesto</h2>
          <p className="muted mb-3">
            Cada jornada tiene su tabla: primero ganar, luego la diferencia de pokémon, luego los críticos hechos menos
            los recibidos y luego la general. Cada puesto suma sus puntos y se lleva sus premios; la tabla de cada
            jornada está en Jornadas.{locke.retoPorJornada ? " Hay que jugar al menos un reto por jornada: quien no, juega con el equipo a la vista." : ""}
          </p>
          <ul className="space-y-1 text-sm">
            {puntos.map((p, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="w-8 font-semibold text-white">{i + 1}º</span>
                <span className="w-16 text-brand-200">{p === 1 ? "1 punto" : `${p} puntos`}</span>
                <span className="text-slate-400">{queDa(i)}</span>
              </li>
            ))}
          </ul>
          <h3 className="rotulo mb-2 mt-4">Premios de la clasificación final</h3>
          {finales.length ? (
            <ul className="space-y-1 text-sm text-slate-300">
              {finales.map((f) => (
                <li key={f.id}>
                  {f.puesto}º {nombreDe.get(f.participantId) ?? "?"}: {queDa(f.puesto - 1)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted text-sm">Se reparten al acabar, con la clasificación general.</p>
          )}
          {canManage ? <RepartirPremiosFinales competitionId={competitionId} yaRepartidos={finales.length > 0} /> : null}
        </section>
      ) : null}
      {canManage ? (
        <ConfigDePuestos
          competitionId={competitionId}
          puntos={puntos}
          premios={premios}
          retoPorJornada={locke.retoPorJornada}
          objetos={objetos.map((o) => ({ id: o.id, nombre: o.name }))}
          ruletas={ruletas.map((r) => ({ id: r.id, nombre: r.name }))}
        />
      ) : null}
    </>
  );
}
