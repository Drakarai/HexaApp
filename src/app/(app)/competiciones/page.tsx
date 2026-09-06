import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  listCompetitions,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { COMPETITION_STATUS } from "@/lib/constants";
import { nombreDelJuego } from "@/lib/juegos";
import { cx, formatDate } from "@/lib/utils";
import {
  deleteCompetitionAction,
  removeParticipantAction,
  retirarParticipanteAction,
  selectCompetitionAction,
  setCompetitionStatusAction,
} from "@/app/actions/competitions";
import {
  NewCompetitionForm,
  EditCompetitionForm,
  AddParticipantForm,
  EditParticipantForm,
} from "./competition-forms";

export const metadata = { title: "Competiciones" };

export default async function CompetitionsPage() {
  const user = await requireUser();
  const admin = isAdmin(user);
  const [competitions, active] = await Promise.all([
    listCompetitions(),
    getActiveCompetition(),
  ]);

  const canManageActive = active
    ? await canManageCompetition(active.id, user)
    : false;

  const [participants, users] = await Promise.all([
    active
      ? prisma.participant.findMany({
          where: { competitionId: active.id },
          orderBy: { displayName: "asc" },
          include: {
            user: { select: { username: true, avatarImage: true } },
            _count: { select: { deaths: true } },
          },
        })
      : Promise.resolve([]),
    admin
      ? prisma.user.findMany({
          orderBy: { displayName: "asc" },
          select: { id: true, displayName: true, username: true },
        })
      : Promise.resolve([]),
  ]);

  const takenUserIds = new Set(participants.map((p) => p.userId));
  const availableUsers = users.filter((u) => !takenUserIds.has(u.id));

  return (
    <>
      <PageHeader
        title="Competiciones"
        subtitle="Cada edición es independiente: al crear una nueva, la anterior se archiva con todos sus datos intactos como recuerdo."
      />

      {active ? (
        <section className="card mb-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">{active.name}</h2>
              <p className="muted mt-1">
                {[
                  nombreDelJuego(active.gameId, active.game),
                  active.modality,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Sin detalles"}
              </p>
            </div>
            <span className="chip">
              {active.status === COMPETITION_STATUS.ACTIVE
                ? "🟢 En curso"
                : "🗄️ Archivada"}
            </span>
          </div>

          {active.description ? (
            <p className="mb-4 text-sm text-slate-400">{active.description}</p>
          ) : null}

          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">
            Jugadores ({participants.length}/{active.maxPlayers})
          </h3>

          {participants.length === 0 ? (
            <EmptyState title="Todavía no hay jugadores apuntados" />
          ) : (
            <ul className="space-y-2">
              {participants.map((participant) => (
                <li
                  key={participant.id}
                  className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar
                      name={participant.displayName}
                      color={participant.color}
                      image={participant.user.avatarImage}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cx(
                          "truncate font-medium text-white",
                          participant.retiredAt && "text-slate-400 line-through",
                        )}
                      >
                        {participant.displayName}
                        {participant.isAdmin ? (
                          <span className="ml-2 text-xs text-amber-400">
                            admin
                          </span>
                        ) : null}
                        {participant.retiredAt ? (
                          <span className="ml-2 text-xs text-slate-500">
                            retirado
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        @{participant.user.username}
                        {participant.gameVersion
                          ? ` · ${participant.gameVersion}`
                          : ""}
                        {` · ${participant._count.deaths} bajas`}
                      </p>
                    </div>
                    {canManageActive ? (
                      <form action={retirarParticipanteAction}>
                        <input
                          type="hidden"
                          name="participantId"
                          value={participant.id}
                        />
                        {participant.retiredAt ? (
                          <ConfirmSubmit
                            className="btn-ghost btn-sm"
                            message={`¿${participant.displayName} vuelve al locke? Los combates que ya se dieron por retirada se quedan como están.`}
                          >
                            Readmitir
                          </ConfirmSubmit>
                        ) : (
                          <ConfirmSubmit
                            className="btn-ghost btn-sm text-amber-300"
                            message={`¿Retirar a ${participant.displayName} del locke? No se borra nada suyo, pero deja de contar para los gimnasios y el MVP, y sus combates de jornada sin jugar los ganará el rival por retirada.`}
                          >
                            Retirar
                          </ConfirmSubmit>
                        )}
                      </form>
                    ) : null}
                    {canManageActive ? (
                      <form action={removeParticipantAction}>
                        <input
                          type="hidden"
                          name="participantId"
                          value={participant.id}
                        />
                        <ConfirmSubmit
                          message={`¿Sacar a ${participant.displayName} de la competición? Se borrarán sus muertes y puntos de esta edición.`}
                        >
                          ✕
                        </ConfirmSubmit>
                      </form>
                    ) : null}
                  </div>

                  {canManageActive ? (
                    <EditParticipantForm
                      participant={{
                        id: participant.id,
                        displayName: participant.displayName,
                        gameVersion: participant.gameVersion,
                        color: participant.color,
                        isAdmin: participant.isAdmin,
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canManageActive ? (
            <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
              {participants.length < active.maxPlayers ? (
                availableUsers.length || !admin ? (
                  <AddParticipantForm
                    competitionId={active.id}
                    users={availableUsers}
                  />
                ) : (
                  <p className="muted">
                    No quedan usuarios libres. Crea uno nuevo en Administración.
                  </p>
                )
              ) : (
                <p className="muted">
                  La competición ya tiene sus {active.maxPlayers} jugadores.
                </p>
              )}

              <EditCompetitionForm
                competition={{
                  id: active.id,
                  name: active.name,
                  game: active.game,
                  gameId: active.gameId,
                  modality: active.modality,
                  description: active.description,
                  startingPoints: active.startingPoints,
                }}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">
          Histórico
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {competitions.map((competition) => (
            <article
              key={competition.id}
              className={cx(
                "card-tight",
                competition.id === active?.id && "border-brand-500/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">
                    {competition.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatDate(competition.startedAt)}
                    {competition.endedAt
                      ? ` → ${formatDate(competition.endedAt)}`
                      : ""}
                    {` · ${competition._count.participants} jugadores`}
                  </p>
                </div>
                <span className="chip shrink-0">
                  {competition.status === COMPETITION_STATUS.ACTIVE
                    ? "🟢"
                    : "🗄️"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={selectCompetitionAction}>
                  <input
                    type="hidden"
                    name="competitionId"
                    value={competition.id}
                  />
                  <button type="submit" className="btn-ghost btn-sm">
                    {competition.id === active?.id ? "Viendo" : "Ver"}
                  </button>
                </form>

                {admin ? (
                  <>
                    <form action={setCompetitionStatusAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          competition.status === COMPETITION_STATUS.ACTIVE
                            ? COMPETITION_STATUS.ARCHIVED
                            : COMPETITION_STATUS.ACTIVE
                        }
                      />
                      <button type="submit" className="btn-ghost btn-sm">
                        {competition.status === COMPETITION_STATUS.ACTIVE
                          ? "Archivar"
                          : "Reactivar"}
                      </button>
                    </form>
                    <form action={deleteCompetitionAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <ConfirmSubmit
                        message={`¿Borrar "${competition.name}" para siempre? Se pierden reglas, muertes, puntos y notas de esa edición.`}
                      >
                        Borrar
                      </ConfirmSubmit>
                    </form>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {admin ? (
        <NewCompetitionForm
          competitions={competitions.map((competition) => ({
            id: competition.id,
            name: competition.name,
          }))}
        />
      ) : null}
    </>
  );
}
