import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { canManageCompetition, getActiveCompetition } from "@/lib/competition";
import { getFinalFourState } from "@/lib/final-four";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { resetBracketAction } from "@/app/actions/final-four";
import { BracketCard } from "./bracket";
import { GenerateBracketForm } from "./generate-form";

export const metadata = { title: "Final Four" };

export default async function FinalFourPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const [canManage, state] = await Promise.all([
    canManageCompetition(competition.id, user),
    getFinalFourState(competition.id),
  ]);

  return (
    <>
      <PageHeader
        title="Final Four"
        subtitle="Los dos primeros esperan en semifinales. Del 3º al 6º se juegan las otras dos plazas. Quien gane la final es el campeón oficial del locke."
      />

      {state.status === "SIN_JORNADAS" ? (
        <EmptyState
          title="Todavía no hay jornadas"
          hint="La Final Four se desbloquea cuando estén jugados todos los combates de todas las jornadas."
        />
      ) : null}

      {state.status === "BLOQUEADA" ? (
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            🔒
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            Aún no toca
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Quedan <strong className="text-white">{state.total - state.jugados}</strong>{" "}
            combates de jornada por resolver. Hasta que no estén todos no se
            sabe cómo queda la tabla, así que el cuadro sigue cerrado.
          </p>

          <div className="mx-auto mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${(state.jugados / state.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {state.jugados} de {state.total} combates jugados
          </p>

          <Link href="/jornadas" className="btn-ghost mt-5">
            Ir a jornadas
          </Link>
        </section>
      ) : null}

      {state.status === "SIN_CUADRO" ? (
        <GenerateBracketForm
          competitionId={competition.id}
          canManage={canManage}
          standings={state.standings.slice(0, 6).map((row) => ({
            participantId: row.participantId,
            displayName: row.displayName,
            points: row.points,
            deaths: row.deaths,
          }))}
        />
      ) : null}

      {state.status === "EN_JUEGO" || state.status === "TERMINADA" ? (
        <>
          {state.champion ? (
            <section className="card mb-6 text-center">
              <p className="text-5xl" aria-hidden>
                🏆
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand-400">
                Campeón del {competition.name}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <Avatar
                  name={state.champion.displayName}
                  color={state.champion.color}
                  image={state.champion.avatarImage}
                  size={48}
                />
                <p className="text-3xl font-black text-white">
                  {state.champion.displayName}
                </p>
              </div>
              {state.runnerUp ? (
                <p className="mt-2 text-sm text-slate-400">
                  Subcampeón: {state.runnerUp.displayName}
                </p>
              ) : null}
              <Link href="/hall-de-la-fama" className="btn-primary mt-5">
                🏅 Ir al hall de la fama
              </Link>
            </section>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {(["Cruces", "Semifinales", "Final"] as const).map((round) => (
              <section key={round}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">
                  {round}
                </h2>
                <div className="space-y-3">
                  {state.matches
                    .filter((match) => match.round === round)
                    .map((match) => (
                      <BracketCard
                        key={match.key}
                        match={match}
                        competitionId={competition.id}
                        canManage={canManage}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>

          {canManage ? (
            <form action={resetBracketAction} className="mt-6">
              <input type="hidden" name="competitionId" value={competition.id} />
              <ConfirmSubmit message="¿Borrar el cuadro entero y volver a sembrarlo con la clasificación de ahora?">
                Rehacer el cuadro
              </ConfirmSubmit>
            </form>
          ) : null}
        </>
      ) : null}
    </>
  );
}
