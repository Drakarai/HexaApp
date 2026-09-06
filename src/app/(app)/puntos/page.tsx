import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getStandings,
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
import { getGraficoClasificacion } from "@/lib/grafico-clasificacion";
import { PointsChart } from "@/components/points-chart";

export const metadata = { title: "Puntos" };

export default async function PointsPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const [canManage, standings, grafico, formatoFinal, history] = await Promise.all([
    canManageCompetition(competition.id, user),
    getStandings(competition.id),
    getGraficoClasificacion(competition.id),
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
  ]);

  // Cada uno puede tocar su propio as; los administradores, el de todos
  const editableAces = canManage
    ? standings.map((row) => row.participantId)
    : standings
        .filter((row) => row.userId === user.id)
        .map((row) => row.participantId);

  return (
    <>
      <PageHeader
        title="Puntos y clasificación"
        subtitle={`Todo el mundo empieza con ${competition.startingPoints} puntos. Los dos primeros se clasifican directos para la Final Four.`}
      />

      {grafico ? (
        <section className="card mb-4">
          <h2 className="section-title mb-1">Cómo ha ido la cosa</h2>
          <p className="muted mb-4">
            El puesto de cada uno jornada a jornada. Dentro de cada bola, sus
            puntos en ese momento. Los puestos salen con los mismos desempates
            que la tabla —puntos, luego menos caídos, luego mejor diferencia—,
            así que dos con los mismos puntos pueden ir uno encima del otro;
            toca una bola para ver por qué. Cuando van igualados de verdad en
            las tres cosas, comparten bola.
          </p>
          <PointsChart etapas={grafico.etapas} jugadores={grafico.jugadores} />
        </section>
      ) : null}

      <section className="card">
        <h2 className="section-title mb-4">Clasificación global</h2>
        <StandingsTable
          qualifiedSlots={formatoFinal?.esperan ?? 2}
          rows={standings}
          highlightUserId={user.id}
          editableParticipantIds={editableAces}
        />

        {canManage ? (
          <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
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
        ) : null}
      </section>

      {canManage ? (
        <div className="mt-6">
          <PointsForms
            competitionId={competition.id}
            participants={standings.map((row) => ({
              id: row.participantId,
              displayName: row.displayName,
            }))}
          />
        </div>
      ) : null}

      <section className="card mt-6">
        <h2 className="section-title mb-4">Historial de movimientos</h2>
        {history.length === 0 ? (
          <EmptyState title="Todavía no se han movido puntos" />
        ) : (
          <ul className="space-y-2">
            {history.map((entry) => (
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
                {canManage && !entry.sourceMatchId ? (
                  <form action={deletePointEntryAction}>
                    <input type="hidden" name="entryId" value={entry.id} />
                    <ConfirmSubmit message="¿Deshacer este movimiento de puntos?">
                      ✕
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
