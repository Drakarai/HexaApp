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
import { EmptyState } from "@/components/ui";
import { cx, formatDate, toDateInputValue } from "@/lib/utils";
import { NewDeathForm } from "./death-form";
import { DeathBox, type BoxDeath } from "./death-box";

export const metadata = { title: "Cementerio — HexaApp" };

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

  const [deaths, counts] = await Promise.all([
    prisma.death.findMany({
      where: {
        participant: {
          competitionId: competition.id,
          ...(selected ? { id: selected.id } : {}),
        },
      },
      orderBy: [{ diedAt: "asc" }, { createdAt: "asc" }],
      include: {
        participant: {
          include: { user: { select: { avatarImage: true } } },
        },
      },
    }),
    prisma.death.groupBy({
      by: ["participantId"],
      where: { participant: { competitionId: competition.id } },
      _count: { _all: true },
    }),
  ]);

  const countFor = (participantId: string) =>
    counts.find((row) => row.participantId === participantId)?._count._all ?? 0;
  const total = counts.reduce((sum, row) => sum + row._count._all, 0);

  const boxDeaths: BoxDeath[] = deaths.map((death) => ({
    id: death.id,
    species: death.species,
    nickname: death.nickname,
    cause: death.cause,
    level: death.level,
    location: death.location,
    notes: death.notes,
    boxImage: death.boxImage,
    detailImage: death.detailImage,
    diedAtLabel: formatDate(death.diedAt),
    diedAtInput: toDateInputValue(death.diedAt),
    editable: canManage || death.participant.userId === user.id,
    participant: {
      id: death.participant.id,
      displayName: death.participant.displayName,
      color: death.participant.color,
      avatarImage: death.participant.user.avatarImage,
    },
  }));

  return (
    <>
      <PageHeader
        title="Cementerio"
        subtitle="La caja de los caídos. Pincha en cualquier casilla para abrir su ficha y ponerle imagen."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/muertes"
          className={cx(
            "chip",
            !selected && "border-brand-500/40 bg-brand-600/20 text-white",
          )}
        >
          Todos ({total})
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
            {participant.displayName} ({countFor(participant.id)})
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

      {boxDeaths.length === 0 ? (
        <EmptyState
          title={
            selected
              ? `${selected.displayName} no ha perdido a nadie`
              : "La caja está vacía"
          }
          hint="De momento todo bien."
        />
      ) : (
        <DeathBox deaths={boxDeaths} grouped={!selected} />
      )}
    </>
  );
}
