import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import { getActiveCompetition, getStandings } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { StandingsTable } from "@/components/standings-table";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, EmptyState } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import { CarouselBackdrop } from "@/components/image-carousel";
import { COMPETITION_STATUS } from "@/lib/constants";
import { getActivity } from "@/lib/activity";
import { urlsDeMedallas } from "@/lib/imagenes";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();

  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const [standings, levelCaps, activity, recentSpins, nextMatchday, myParticipant] =
    await Promise.all([
      getStandings(competition.id),
      prisma.levelCap.findMany({
        where: { competitionId: competition.id },
        orderBy: { position: "asc" },
        include: { _count: { select: { clears: true } } },
      }),
      getActivity(competition.id, 7),
      prisma.rouletteSpin.findMany({
        where: { roulette: { competitionId: competition.id } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { roulette: { select: { name: true } } },
      }),
      prisma.matchday.findFirst({
        where: { competitionId: competition.id, matches: { some: { winnerId: null } } },
        orderBy: { position: "asc" },
        include: {
          matches: {
            orderBy: { position: "asc" },
            include: { participantA: true, participantB: true },
          },
        },
      }),
      prisma.participant.findUnique({
        where: {
          competitionId_userId: { competitionId: competition.id, userId: user.id },
        },
      }),
    ]);

  const totalPlayers = standings.length;
  const totalDeaths = standings.reduce((sum, row) => sum + row.deaths, 0);
  // Siguiente hito: el primero que no ha superado todo el mundo
  const currentCap =
    levelCaps.find((cap) => cap._count.clears < Math.max(1, totalPlayers)) ??
    levelCaps[levelCaps.length - 1];

  // Direcciones de las medallas del level cap actual: ver lib/imagen-url.ts
  const medallasDelCap = currentCap
    ? (await urlsDeMedallas([currentCap.id]))(currentCap.id)
    : [];

  return (
    <>
      <PageHeader
        title={competition.name}
        subtitle={
          [competition.game, competition.modality].filter(Boolean).join(" · ") ||
          undefined
        }
        actions={
          competition.status === COMPETITION_STATUS.ARCHIVED ? (
            <span className="chip">🗄️ Archivada</span>
          ) : (
            <span className="chip">🟢 En curso</span>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Level cap actual"
          value={currentCap ? String(currentCap.cap) : "—"}
          hint={currentCap?.label ?? "Sin level caps configurados"}
          href="/level-caps"
          images={medallasDelCap}
        />
        <StatCard
          label="Jugadores"
          value={`${totalPlayers}/${competition.maxPlayers}`}
          hint={`Empiezan con ${competition.startingPoints} puntos`}
          href="/competiciones"
        />
        <StatCard
          label="Pokémon caídos"
          value={String(totalDeaths)}
          hint="En toda la competición"
          href="/muertes"
        />
        <StatCard
          label="Líder"
          value={standings[0]?.displayName ?? "—"}
          hint={
            standings[0] ? `${standings[0].points} puntos` : "Sin clasificación"
          }
          href="/puntos"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Clasificación</h2>
            <Link href="/puntos" className="text-xs text-brand-400 hover:underline">
              Ver detalle →
            </Link>
          </div>
          <StandingsTable
            rows={standings}
            highlightUserId={user.id}
            editableParticipantIds={
              myParticipant ? [myParticipant.id] : []
            }
          />
          <p className="mt-3 text-xs text-slate-500">
            Desempates: puntos → menos pokémon muertos → diferencia de pokémon en
            jornadas.
          </p>
        </section>

        <section className="card">
          <h2 className="section-title mb-4">Próxima jornada</h2>
          {nextMatchday ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-white">{nextMatchday.label}</p>
                {nextMatchday.milestone ? (
                  <p className="text-xs text-slate-500">{nextMatchday.milestone}</p>
                ) : null}
              </div>
              <ul className="space-y-2">
                {nextMatchday.matches.map((match) => (
                  <li
                    key={match.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="truncate">{match.participantA.displayName}</span>
                    <span className="text-xs text-slate-500">vs</span>
                    <span className="truncate text-right">
                      {match.participantB.displayName}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/jornadas"
                className="btn-ghost btn-sm w-full justify-center"
              >
                Ir a jornadas
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No hay combates pendientes"
              hint="Crea una jornada nueva desde la sección Jornadas."
            />
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Actividad reciente</h2>
            <Link
              href="/actividad"
              className="text-xs text-brand-400 hover:underline"
            >
              Ver todo →
            </Link>
          </div>
          <ActivityFeed entries={activity} compact />
        </section>

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Ruleta</h2>
            <Link href="/ruleta" className="text-xs text-brand-400 hover:underline">
              Girar →
            </Link>
          </div>
          {recentSpins.length ? (
            <ul className="space-y-2">
              {recentSpins.map((spin) => (
                <li key={spin.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="text-sm font-medium text-white">
                    {spin.optionLabel}
                  </p>
                  <p className="text-xs text-slate-500">
                    {spin.roulette.name} · {formatDateTime(spin.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin giros todavía" />
          )}
        </section>
      </div>

      {myParticipant ? (
        <p className="mt-6 text-xs text-slate-500">
          Juegas como <strong className="text-slate-300">{myParticipant.displayName}</strong>
          {myParticipant.gameVersion ? ` · ${myParticipant.gameVersion}` : ""} ·
          desde {formatDate(competition.startedAt)}
        </p>
      ) : (
        <p className="mt-6 text-xs text-slate-500">
          Estás viendo esta competición como espectador: no eres uno de sus
          jugadores.
        </p>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
  images = [],
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  /** Ilustraciones opcionales que se asoman al fondo, alternándose */
  images?: string[];
}) {
  return (
    <Link
      href={href}
      className="card-tight relative isolate overflow-hidden transition hover:border-brand-500/40 hover:bg-ink-850"
    >
      <CarouselBackdrop
        images={images}
        className="absolute -bottom-3 -right-3 -z-10 h-20 w-20 opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"
      />
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p> : null}
    </Link>
  );
}
