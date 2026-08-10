import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
  getTicketBalances,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { RouletteWheel } from "@/components/roulette-wheel";
import { ConfirmSubmit, EmptyState } from "@/components/ui";
import { cx, formatDateTime } from "@/lib/utils";
import {
  clearSpinHistoryAction,
  deleteOptionAction,
  deleteRouletteAction,
  resetRouletteOptionsAction,
  toggleOptionAction,
} from "@/app/actions/roulette";
import {
  NewRouletteForm,
  AddOptionForm,
  RouletteSettingsForm,
} from "./roulette-forms";
import { MyTickets, TicketsPanel } from "./tickets";

export const metadata = { title: "Ruleta" };

export default async function RoulettePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const { r } = await searchParams;
  const [canManage, roulettes, participants, balances] = await Promise.all([
    canManageCompetition(competition.id, user),
    prisma.roulette.findMany({
      where: { competitionId: competition.id },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { options: true, spins: true } } },
    }),
    getParticipants(competition.id),
    getTicketBalances(competition.id),
  ]);

  const myParticipant = participants.find(
    (participant) => participant.userId === user.id,
  );
  const myTickets = myParticipant ? (balances.get(myParticipant.id) ?? 0) : 0;
  // Los administradores giran siempre; el resto, solo con ticket
  const canSpin = canManage || myTickets > 0;

  const selectedId = roulettes.find((roulette) => roulette.id === r)?.id ??
    roulettes[0]?.id;

  const selected = selectedId
    ? await prisma.roulette.findUnique({
        where: { id: selectedId },
        include: {
          options: { orderBy: { position: "asc" } },
          spins: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { spunBy: { select: { displayName: true } } },
          },
        },
      })
    : null;

  return (
    <>
      <PageHeader
        title="Ruleta"
        subtitle="Sorteos personalizables: retos, castigos, emparejamientos, lo que quieras. Los pesos hacen que unas opciones salgan más que otras."
      />

      {roulettes.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {roulettes.map((roulette) => (
            <Link
              key={roulette.id}
              href={`/ruleta?r=${roulette.id}`}
              className={cx(
                "chip",
                roulette.id === selectedId &&
                  "border-brand-500/40 bg-brand-600/20 text-white",
              )}
            >
              🎡 {roulette.name} ({roulette._count.options})
            </Link>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">{selected.name}</h2>
                {selected.description ? (
                  <p className="muted mt-1">{selected.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {selected.allowRepeats
                    ? "Las opciones pueden repetirse"
                    : "Sin repetición: la opción se desactiva al salir"}
                </p>
              </div>
              {canManage ? (
                <form action={deleteRouletteAction}>
                  <input type="hidden" name="rouletteId" value={selected.id} />
                  <ConfirmSubmit
                    message={`¿Borrar la ruleta "${selected.name}" y su historial?`}
                  >
                    ✕
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>

            <MyTickets balance={myTickets} isManager={canManage} />

            <RouletteWheel
              rouletteId={selected.id}
              spinSeconds={selected.spinSeconds}
              canSpin={canSpin}
              options={selected.options
                .filter((option) => option.enabled)
                .map((option) => ({
                  id: option.id,
                  label: option.label,
                  color: option.color ?? "#6366f1",
                  weight: option.weight,
                }))}
            />
          </section>

          <div className="space-y-6">
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title">Opciones</h2>
                {canManage ? (
                  <form action={resetRouletteOptionsAction}>
                    <input type="hidden" name="rouletteId" value={selected.id} />
                    <button type="submit" className="btn-ghost btn-sm">
                      Reactivar todas
                    </button>
                  </form>
                ) : null}
              </div>

              {selected.options.length === 0 ? (
                <EmptyState title="Esta ruleta no tiene opciones" />
              ) : (
                <ul className="space-y-2">
                  {selected.options.map((option) => (
                    <li
                      key={option.id}
                      className={cx(
                        "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2",
                        !option.enabled && "opacity-45",
                      )}
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded"
                        style={{ background: option.color ?? "#6366f1" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-white">
                        {option.label}
                      </span>
                      <span className="chip">×{option.weight}</span>
                      {canManage ? (
                        <>
                          <form action={toggleOptionAction}>
                            <input
                              type="hidden"
                              name="optionId"
                              value={option.id}
                            />
                            <button
                              type="submit"
                              className="btn-ghost btn-sm"
                              title={option.enabled ? "Desactivar" : "Activar"}
                            >
                              {option.enabled ? "👁" : "🚫"}
                            </button>
                          </form>
                          <form action={deleteOptionAction}>
                            <input
                              type="hidden"
                              name="optionId"
                              value={option.id}
                            />
                            <ConfirmSubmit message={`¿Borrar "${option.label}"?`}>
                              ✕
                            </ConfirmSubmit>
                          </form>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {canManage ? (
                <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                  <AddOptionForm rouletteId={selected.id} />
                  <RouletteSettingsForm
                    roulette={{
                      id: selected.id,
                      name: selected.name,
                      description: selected.description,
                      allowRepeats: selected.allowRepeats,
                      spinSeconds: selected.spinSeconds,
                    }}
                  />
                </div>
              ) : null}
            </section>

            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title">Historial</h2>
                {canManage && selected.spins.length ? (
                  <form action={clearSpinHistoryAction}>
                    <input type="hidden" name="rouletteId" value={selected.id} />
                    <ConfirmSubmit
                      message="¿Borrar todo el historial de esta ruleta?"
                      className="btn-ghost btn-sm"
                    >
                      Limpiar
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </div>
              {selected.spins.length === 0 ? (
                <EmptyState title="Sin giros todavía" />
              ) : (
                <ol className="space-y-2">
                  {selected.spins.map((spin) => (
                    <li
                      key={spin.id}
                      className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                    >
                      <p className="text-sm font-medium text-white">
                        {spin.optionLabel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(spin.createdAt)}
                        {spin.spunBy ? ` · ${spin.spunBy.displayName}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No hay ninguna ruleta creada"
          hint={canManage ? "Crea la primera abajo." : undefined}
        />
      )}

      {canManage && participants.length ? (
        <div className="mt-6">
          <TicketsPanel
            competitionId={competition.id}
            rows={participants.map((participant) => ({
              participantId: participant.id,
              displayName: participant.displayName,
              color: participant.color,
              avatarImage: participant.user.avatarImage,
              balance: balances.get(participant.id) ?? 0,
            }))}
          />
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-6">
          <NewRouletteForm competitionId={competition.id} />
        </div>
      ) : null}
    </>
  );
}
