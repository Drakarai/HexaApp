import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import { deleteDeathAction } from "@/app/actions/deaths";
import { NewDeathForm } from "./death-form";

export const metadata = { title: "Muertes — HexaApp" };

export default async function DeathsPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const { jugador } = await searchParams;
  const [canManage, participants] = await Promise.all([
    canManageCompetition(competition.id, user),
    getParticipants(competition.id),
  ]);

  const selected = participants.find((participant) => participant.id === jugador);
  const myParticipant = participants.find(
    (participant) => participant.userId === user.id,
  );

  const deaths = await prisma.death.findMany({
    where: {
      participant: {
        competitionId: competition.id,
        ...(selected ? { id: selected.id } : {}),
      },
    },
    orderBy: [{ diedAt: "desc" }, { createdAt: "desc" }],
    include: { participant: true },
  });

  const countByParticipant = new Map<string, number>();
  for (const participant of participants) countByParticipant.set(participant.id, 0);
  const allDeaths = selected
    ? await prisma.death.findMany({
        where: { participant: { competitionId: competition.id } },
        select: { participantId: true },
      })
    : deaths.map((death) => ({ participantId: death.participantId }));
  for (const death of allDeaths) {
    countByParticipant.set(
      death.participantId,
      (countByParticipant.get(death.participantId) ?? 0) + 1,
    );
  }

  return (
    <>
      <PageHeader
        title="Cementerio"
        subtitle="Cada pokémon caído queda registrado aquí. Los pokémon muertos cuentan como primer desempate de la clasificación."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/muertes"
          className={cx("chip", !selected && "border-brand-500/40 bg-brand-600/20 text-white")}
        >
          Todos ({allDeaths.length})
        </Link>
        {participants.map((participant) => (
          <Link
            key={participant.id}
            href={`/muertes?jugador=${participant.id}`}
            className={cx(
              "chip",
              selected?.id === participant.id &&
                "border-brand-500/40 bg-brand-600/20 text-white",
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: participant.color }}
              aria-hidden
            />
            {participant.displayName} ({countByParticipant.get(participant.id) ?? 0})
          </Link>
        ))}
      </div>

      {participants.length && (myParticipant || canManage) ? (
        <div className="mb-6">
          <NewDeathForm
            participants={participants.map((participant) => ({
              id: participant.id,
              displayName: participant.displayName,
            }))}
            defaultParticipantId={
              selected?.id ?? myParticipant?.id ?? participants[0].id
            }
            lockedToParticipantId={canManage ? null : (myParticipant?.id ?? null)}
          />
        </div>
      ) : null}

      {deaths.length === 0 ? (
        <EmptyState
          title={selected ? `${selected.displayName} no ha perdido a nadie` : "Sin bajas registradas"}
          hint="De momento todo bien."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Pokémon</th>
                  <th>Nv.</th>
                  <th>Dónde</th>
                  <th>Causa</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {deaths.map((death) => {
                  const editable =
                    canManage || death.participant.userId === user.id;
                  return (
                    <tr key={death.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={death.participant.displayName}
                            color={death.participant.color}
                            size={24}
                          />
                          <span className="whitespace-nowrap">
                            {death.participant.displayName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="font-medium text-white">
                          {death.nickname ?? death.species}
                        </span>
                        {death.nickname ? (
                          <span className="text-slate-500"> · {death.species}</span>
                        ) : null}
                        {death.notes ? (
                          <p className="text-xs text-slate-500">{death.notes}</p>
                        ) : null}
                      </td>
                      <td className="tabular-nums text-slate-400">
                        {death.level ?? "—"}
                      </td>
                      <td className="text-slate-400">{death.location ?? "—"}</td>
                      <td className="text-slate-400">{death.cause ?? "—"}</td>
                      <td className="whitespace-nowrap text-slate-400">
                        {formatDate(death.diedAt)}
                      </td>
                      <td className="text-right">
                        {editable ? (
                          <form action={deleteDeathAction}>
                            <input type="hidden" name="deathId" value={death.id} />
                            <ConfirmSubmit
                              message={`¿Borrar el registro de ${death.nickname ?? death.species}?`}
                            >
                              ✕
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
