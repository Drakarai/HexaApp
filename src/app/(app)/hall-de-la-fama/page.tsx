import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getStandings,
} from "@/lib/competition";
import { getFinalFourState, NOMBRE_POR_DEFECTO } from "@/lib/final-four";
import { urlsDeImagen } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import { getCampeonesDeLiga } from "@/lib/liga";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { CampeonesDeLiga } from "@/components/marcador-dual";
import { AddPokemonForm, TeamSlots } from "./team-editor";

export const metadata = { title: "Hall de la fama" };

const TEAM_SIZE = 6;
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function HallOfFamePage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const state = await getFinalFourState(competition.id);
  // El final del locke no siempre se llama igual: ver lib/formatos-finales.ts
  const nombreFinal =
    ("formato" in state ? state.formato?.nombre : null) ?? NOMBRE_POR_DEFECTO;

  /**
   * En solitario no hay final que ganar, así que lo que cierra el locke es
   * **pasarse la Liga**. Sin esto el hall no se abriría nunca en una partida de
   * una persona, porque exige campeón de la Final Four.
   */
  const perfil = perfilDeLocke(competition.maxPlayers);
  const progreso = perfil.enSolitario
    ? await getProgresoEnSolitario(competition.id)
    : null;
  const terminadoEnSolitario = Boolean(progreso?.ligaSuperada);

  if (perfil.enSolitario && !terminadoEnSolitario) {
    return (
      <>
        <PageHeader title="Hall de la fama" />
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            🏅
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            Todavía no te has pasado la Liga
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            En un locke en solitario el final es ese. Cuando marques el último
            hito, aquí quedará el equipo con el que lo terminaste.
          </p>
          <Link href="/level-caps" className="btn-ghost mt-5">
            Ver los level caps
          </Link>
        </section>
      </>
    );
  }

  if (!perfil.enSolitario && state.status !== "TERMINADA") {
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
            Cuando la {nombreFinal} tenga campeón, aquí quedará el equipo con
            el que cada uno acabó el locke: sus seis pokémon, con sus motes.
          </p>
          <Link href="/final-four" className="btn-ghost mt-5">
            Ver la {nombreFinal}
          </Link>
        </section>
      </>
    );
  }

  /**
   * El estado de la final ya estrechado. En solitario no hay final, así que es
   * null y el podio de campeón y subcampeón simplemente no se pinta: lo que
   * cierra el locke ahí es la Liga.
   */
  const elFinal = state.status === "TERMINADA" ? state : null;

  const [canManage, standings, entries, campeonesDeLiga] = await Promise.all([
    canManageCompetition(competition.id, user),
    getStandings(competition.id),
    prisma.hallOfFameEntry.findMany({
      where: { participant: { competitionId: competition.id } },
      orderBy: { position: "asc" },
    }),
    getCampeonesDeLiga(competition.id),
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
  if (elFinal?.champion) orden.set(elFinal.champion.participantId, -2);
  if (elFinal?.runnerUp) orden.set(elFinal.runnerUp.participantId, -1);
  const jugadores = [...standings].sort(
    (a, b) =>
      (orden.get(a.participantId) ?? a.position) -
      (orden.get(b.participantId) ?? b.position),
  );

  return (
    <>
      <PageHeader
        title="Hall de la fama"
        subtitle={
          perfil.enSolitario
            ? `Así terminó el ${competition.name}. El equipo con el que te pasaste la Liga, para el recuerdo.`
            : `Así terminó el ${competition.name}. El equipo con el que cada uno llegó al final, para el recuerdo.`
        }
      />

      {/* El podio solo tiene sentido si hubo final. En solitario lo que cierra
          el locke es la Liga, y eso se cuenta en el bloque de abajo. */}
      {elFinal?.champion ? (
        <section className="card mb-6 text-center">
          <p className="text-5xl" aria-hidden>
            🏆
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand-400">
            Campeón
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <Avatar
              name={elFinal.champion.displayName}
              color={elFinal.champion.color}
              image={elFinal.champion.avatarImage}
              size={48}
            />
            <p className="text-3xl font-black text-white">
              {elFinal.champion.displayName}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {competition.name} · {formatDate(competition.startedAt)}
          </p>
        </section>
      ) : (
        <section className="card mb-6 text-center">
          <p className="text-5xl" aria-hidden>
            🏆
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand-400">
            Locke terminado
          </p>
          <p className="mt-3 text-3xl font-black text-white">
            {progreso?.displayName}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Se pasó la Liga · {competition.name} ·{" "}
            {formatDate(competition.startedAt)}
          </p>
        </section>
      )}

      {/* La otra victoria: pasarse la Liga es ganar el locke del juego, y la
          puede tener alguien que no ganó ni un combate */}
      <div className="mb-6">
        <CampeonesDeLiga campeones={campeonesDeLiga} />
      </div>

      <div className="space-y-4">
        {jugadores.map((row, index) => {
          const team = teamOf(row.participantId);
          const editable = canManage || row.userId === user.id;
          const esCampeon = elFinal?.champion?.participantId === row.participantId;

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
