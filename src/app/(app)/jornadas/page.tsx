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
import {
  deleteMatchAction,
  deleteMatchdayAction,
} from "@/app/actions/matchdays";
import { NewMatchdayForm, AddMatchForm, MatchResultForm } from "./matchday-forms";
import { MvpBadge, type MvpOwner } from "@/components/mvp-badge";

export const metadata = { title: "Jornadas" };

export default async function MatchdaysPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const [canManage, participants, matchdays] = await Promise.all([
    canManageCompetition(competition.id, user),
    getParticipants(competition.id),
    prisma.matchday.findMany({
      where: { competitionId: competition.id },
      orderBy: { position: "asc" },
      // La ilustración grande del MVP se pide solo al abrir su ficha
      omit: { mvpDetailImage: true },
      include: {
        matches: {
          orderBy: { position: "asc" },
          include: {
            participantA: {
              include: { user: { select: { avatarImage: true } } },
            },
            participantB: {
              include: { user: { select: { avatarImage: true } } },
            },
          },
        },
      },
    }),
  ]);

  const participantOptions = participants.map((participant) => ({
    id: participant.id,
    displayName: participant.displayName,
  }));

  // Los dueños posibles del MVP, con lo justo para pintar la chapa
  const mvpOwners: MvpOwner[] = participants.map((participant) => ({
    participantId: participant.id,
    displayName: participant.displayName,
    color: participant.color,
    avatarImage: participant.user.avatarImage,
  }));
  const ownersById = new Map(
    mvpOwners.map((owner) => [owner.participantId, owner]),
  );

  // Se pregunta aparte porque la ilustración grande no se trae con la lista
  const withMvpArt = new Set(
    (
      await prisma.matchday.findMany({
        where: { competitionId: competition.id, mvpDetailImage: { not: null } },
        select: { id: true },
      })
    ).map((row) => row.id),
  );

  return (
    <>
      <PageHeader
        title="Jornadas"
        subtitle="Emparejamientos de cada jornada. Al marcar un ganador se le suma automáticamente el punto de la victoria."
      />

      {matchdays.length === 0 ? (
        <EmptyState
          title="No hay jornadas creadas"
          hint={canManage ? "Crea la primera abajo." : undefined}
        />
      ) : (
        <div className="space-y-4">
          {matchdays.map((matchday) => {
            const played = matchday.matches.filter((match) => match.winnerId).length;
            const complete =
              matchday.matches.length > 0 && played === matchday.matches.length;

            return (
              <section
                key={matchday.id}
                className={cx(
                  "card",
                  complete && "border-emerald-500/25 bg-emerald-500/[0.03]",
                )}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div>
                      <h2 className="section-title">{matchday.label}</h2>
                      <p className="text-xs text-slate-500">
                        {matchday.milestone ? `${matchday.milestone} · ` : ""}
                        {played}/{matchday.matches.length} combates jugados ·{" "}
                        {matchday.pointsForWin} pto/victoria
                      </p>
                    </div>
                    <MvpBadge
                      mvp={{
                        matchdayId: matchday.id,
                        matchdayLabel: matchday.label,
                        species: matchday.mvpSpecies,
                        nickname: matchday.mvpNickname,
                        reason: matchday.mvpReason,
                        image: matchday.mvpImage,
                        hasDetailImage: withMvpArt.has(matchday.id),
                        owner: matchday.mvpParticipantId
                          ? (ownersById.get(matchday.mvpParticipantId) ?? null)
                          : null,
                        editable: canManage,
                      }}
                      participants={mvpOwners}
                    />
                  </div>
                  {canManage ? (
                    <form action={deleteMatchdayAction}>
                      <input type="hidden" name="matchdayId" value={matchday.id} />
                      <ConfirmSubmit
                        message={`¿Borrar "${matchday.label}" con todos sus combates?`}
                      >
                        ✕
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </div>

                {matchday.matches.length === 0 ? (
                  <p className="muted">Sin emparejamientos todavía.</p>
                ) : (
                  <ul className="space-y-2">
                    {matchday.matches.map((match) => (
                      <li
                        key={match.id}
                        className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <PlayerChip
                              name={match.participantA.displayName}
                              color={match.participantA.color}
                              image={match.participantA.user.avatarImage}
                              winner={match.winnerId === match.participantAId}
                            />
                            <span className="text-xs text-slate-500">vs</span>
                            <PlayerChip
                              name={match.participantB.displayName}
                              color={match.participantB.color}
                              image={match.participantB.user.avatarImage}
                              winner={match.winnerId === match.participantBId}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {match.pokemonDiff !== null ? (
                              <span className="chip">
                                dif. {match.pokemonDiff}
                              </span>
                            ) : null}
                            {match.playedAt ? (
                              <span>{formatDate(match.playedAt)}</span>
                            ) : (
                              <span className="text-amber-400/80">Pendiente</span>
                            )}
                            {canManage ? (
                              <form action={deleteMatchAction}>
                                <input
                                  type="hidden"
                                  name="matchId"
                                  value={match.id}
                                />
                                <ConfirmSubmit message="¿Borrar este combate?">
                                  ✕
                                </ConfirmSubmit>
                              </form>
                            ) : null}
                          </div>
                        </div>

                        {match.notes ? (
                          <p className="mt-1.5 text-xs text-slate-500">
                            {match.notes}
                          </p>
                        ) : null}

                        {canManage ? (
                          <MatchResultForm
                            match={{
                              id: match.id,
                              winnerId: match.winnerId,
                              pokemonDiff: match.pokemonDiff,
                              notes: match.notes,
                              a: {
                                id: match.participantAId,
                                name: match.participantA.displayName,
                              },
                              b: {
                                id: match.participantBId,
                                name: match.participantB.displayName,
                              },
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {canManage && participantOptions.length >= 2 ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <AddMatchForm
                      matchdayId={matchday.id}
                      participants={participantOptions}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {canManage ? (
        <div className="mt-6">
          <NewMatchdayForm competitionId={competition.id} />
        </div>
      ) : null}
    </>
  );
}

function PlayerChip({
  name,
  color,
  image,
  winner,
}: {
  name: string;
  color: string;
  image: string | null;
  winner: boolean;
}) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm",
        winner
          ? "bg-emerald-500/15 font-semibold text-emerald-200 ring-1 ring-emerald-500/30"
          : "text-slate-300",
      )}
    >
      <Avatar name={name} color={color} image={image} size={20} />
      <span className="truncate">{name}</span>
      {winner ? <span aria-hidden>👑</span> : null}
    </span>
  );
}
