import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { ConfirmSubmit, EmptyState } from "@/components/ui";
import { LEVEL_CAP_KIND_LABELS } from "@/lib/constants";
import { cx, readableTextColor } from "@/lib/utils";
import {
  deleteLevelCapAction,
  toggleGymClearAction,
} from "@/app/actions/level-caps";
import { NewLevelCapForm, EditLevelCapForm } from "./level-cap-forms";

export const metadata = { title: "Level caps" };

export default async function LevelCapsPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const [canManage, participants, levelCaps] = await Promise.all([
    canManageCompetition(competition.id, user),
    getParticipants(competition.id),
    prisma.levelCap.findMany({
      where: { competitionId: competition.id },
      orderBy: { position: "asc" },
      include: { clears: true },
    }),
  ]);

  const clearedSet = new Set(
    levelCaps.flatMap((cap) =>
      cap.clears.map((clear) => `${cap.id}:${clear.participantId}`),
    ),
  );

  return (
    <>
      <PageHeader
        title="Level caps"
        subtitle="Nivel máximo permitido antes de cada gimnasio. Marca tu casilla cuando te pases el combate: nadie sigue hasta que estén todas."
      />

      {levelCaps.length === 0 ? (
        <EmptyState
          title="No hay level caps configurados"
          hint={canManage ? "Añádelos abajo." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {levelCaps.map((levelCap) => {
            const clearedCount = levelCap.clears.length;
            const allCleared =
              participants.length > 0 && clearedCount === participants.length;

            return (
              <article
                key={levelCap.id}
                className={cx(
                  "card",
                  allCleared && "border-emerald-500/30 bg-emerald-500/[0.04]",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600/20 text-lg font-black text-brand-400 ring-1 ring-brand-500/30">
                      {levelCap.cap}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">
                        {levelCap.label}
                        {levelCap.badge ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {levelCap.badge}
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {LEVEL_CAP_KIND_LABELS[levelCap.kind] ?? levelCap.kind}
                        {" · "}
                        {clearedCount}/{participants.length} superado
                        {clearedCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {canManage ? (
                    <form action={deleteLevelCapAction}>
                      <input
                        type="hidden"
                        name="levelCapId"
                        value={levelCap.id}
                      />
                      <ConfirmSubmit
                        message={`¿Borrar el level cap de ${levelCap.label}?`}
                      >
                        ✕
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </div>

                {levelCap.notes ? (
                  <p className="mt-3 text-sm text-slate-400">{levelCap.notes}</p>
                ) : null}

                {participants.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {participants.map((participant) => {
                      const cleared = clearedSet.has(
                        `${levelCap.id}:${participant.id}`,
                      );
                      const editable =
                        canManage || participant.userId === user.id;

                      return (
                        <form key={participant.id} action={toggleGymClearAction}>
                          <input
                            type="hidden"
                            name="levelCapId"
                            value={levelCap.id}
                          />
                          <input
                            type="hidden"
                            name="participantId"
                            value={participant.id}
                          />
                          <button
                            type="submit"
                            disabled={!editable}
                            title={
                              editable
                                ? cleared
                                  ? "Marcar como no superado"
                                  : "Marcar como superado"
                                : "Solo puedes marcar tus propios gimnasios"
                            }
                            className={cx(
                              "chip transition",
                              cleared
                                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                                : "opacity-70",
                              editable
                                ? "cursor-pointer hover:opacity-100"
                                : "cursor-not-allowed",
                            )}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: participant.color }}
                              aria-hidden
                            />
                            {participant.displayName}
                            <span aria-hidden>{cleared ? "✓" : "○"}</span>
                          </button>
                        </form>
                      );
                    })}
                  </div>
                ) : null}

                {canManage ? (
                  <EditLevelCapForm
                    levelCap={{
                      id: levelCap.id,
                      label: levelCap.label,
                      cap: levelCap.cap,
                      kind: levelCap.kind,
                      badge: levelCap.badge,
                      notes: levelCap.notes,
                    }}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {canManage ? (
        <div className="mt-8">
          <NewLevelCapForm competitionId={competition.id} />
        </div>
      ) : null}

      {participants.length ? (
        <p className="mt-6 text-xs text-slate-500">
          Leyenda:{" "}
          {participants.map((participant) => (
            <span
              key={participant.id}
              className="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[11px]"
              style={{
                background: participant.color,
                color: readableTextColor(participant.color),
              }}
            >
              {participant.displayName}
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}
