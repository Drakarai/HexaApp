import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getStandings,
} from "@/lib/competition";
import { getFinalFourState } from "@/lib/final-four";
import { urlsDeImagen } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import { AddPokemonForm, TeamSlots } from "./team-editor";

export const metadata = { title: "Hall de la fama" };

const TEAM_SIZE = 6;
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function HallOfFamePage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const state = await getFinalFourState(competition.id);

  if (state.status !== "TERMINADA") {
    return (
      <>
        <PageHeader title="Hall de la fama" />
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            🏅
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            El locke todavía no ha terminado
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Cuando la Final Four tenga campeón, aquí quedará el equipo con el
            que cada uno acabó el locke: sus seis pokémon, con sus motes.
          </p>
          <Link href="/final-four" className="btn-ghost mt-5">
            Ver la Final Four
          </Link>
        </section>
      </>
    );
  }

  const [canManage, standings, entries] = await Promise.all([
    canManageCompetition(competition.id, user),
    getStandings(competition.id),
    prisma.hallOfFameEntry.findMany({
      where: { participant: { competitionId: competition.id } },
      orderBy: { position: "asc" },
    }),
  ]);

  // Direcciones de los sprites, no los sprites: ver lib/imagen-url.ts
  const sprites = await urlsDeImagen(
    "salon",
    entries.map((entry) => entry.id),
  );

  const teamOf = (participantId: string) =>
    entries
      .filter((entry) => entry.participantId === participantId)
      .map((entry) => ({
        id: entry.id,
        species: entry.species,
        nickname: entry.nickname,
        image: sprites(entry.id),
      }));

  // Primero el campeón, después el subcampeón, y el resto por clasificación
  const orden = new Map<string, number>();
  if (state.champion) orden.set(state.champion.participantId, -2);
  if (state.runnerUp) orden.set(state.runnerUp.participantId, -1);
  const jugadores = [...standings].sort(
    (a, b) =>
      (orden.get(a.participantId) ?? a.position) -
      (orden.get(b.participantId) ?? b.position),
  );

  return (
    <>
      <PageHeader
        title="Hall de la fama"
        subtitle={`Así terminó el ${competition.name}. El equipo con el que cada uno llegó al final, para el recuerdo.`}
      />

      <section className="card mb-6 text-center">
        <p className="text-5xl" aria-hidden>
          🏆
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand-400">
          Campeón
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Avatar
            name={state.champion!.displayName}
            color={state.champion!.color}
            image={state.champion!.avatarImage}
            size={48}
          />
          <p className="text-3xl font-black text-white">
            {state.champion!.displayName}
          </p>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {competition.name} · {formatDate(competition.startedAt)}
        </p>
      </section>

      <div className="space-y-4">
        {jugadores.map((row, index) => {
          const team = teamOf(row.participantId);
          const editable = canManage || row.userId === user.id;
          const esCampeon = state.champion?.participantId === row.participantId;

          return (
            <section
              key={row.participantId}
              className={cx(
                "card",
                esCampeon && "border-amber-400/30 bg-amber-400/[0.04]",
              )}
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="w-6 text-center text-lg">
                  {MEDALS[index] ?? (
                    <span className="text-sm text-slate-500">{index + 1}º</span>
                  )}
                </span>
                <Avatar
                  name={row.displayName}
                  color={row.color}
                  image={row.avatarImage}
                  size={34}
                />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-white">
                    {row.displayName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {row.points} puntos · {row.deaths} caídos
                    {row.gameVersion ? ` · ${row.gameVersion}` : ""}
                  </p>
                </div>
                <span className="ml-auto chip">
                  {team.length}/{TEAM_SIZE}
                </span>
              </div>

              <TeamSlots team={team} editable={editable} teamSize={TEAM_SIZE} />

              {editable ? (
                <AddPokemonForm
                  participantId={row.participantId}
                  remaining={TEAM_SIZE - team.length}
                />
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
