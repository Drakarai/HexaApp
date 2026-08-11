import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
} from "@/lib/competition";
import { urlsDeImagen } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { MatchTeams, type TeamSide } from "@/components/match-team";
import { cx, formatDate } from "@/lib/utils";
import { deleteChallengeAction } from "@/app/actions/challenges";
import { NewChallengeForm, ChallengeResultForm } from "./challenge-forms";

export const metadata = { title: "Retos" };

export default async function RetosPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const [canManage, participants, retos] = await Promise.all([
    canManageCompetition(competition.id, user),
    getParticipants(competition.id),
    prisma.challengeMatch.findMany({
      where: { competitionId: competition.id },
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      include: { team: { orderBy: { position: "asc" } } },
    }),
  ]);

  const porId = new Map(participants.map((jugador) => [jugador.id, jugador]));
  const opciones = participants.map((jugador) => ({
    id: jugador.id,
    displayName: jugador.displayName,
  }));

  // Direcciones de los sprites, no los sprites: ver lib/imagen-url.ts
  const sprites = await urlsDeImagen(
    "equipo",
    retos.flatMap((reto) => reto.team.map((pokemon) => pokemon.id)),
  );

  const lado = (participantId: string, equipo: typeof retos[number]["team"]): TeamSide => {
    const jugador = porId.get(participantId);
    return {
      participantId,
      displayName: jugador?.displayName ?? "?",
      color: jugador?.color ?? "#64748b",
      avatarImage: jugador?.user.avatarImage ?? null,
      team: equipo
        .filter((pokemon) => pokemon.participantId === participantId)
        .map((pokemon) => ({
          id: pokemon.id,
          species: pokemon.species,
          nickname: pokemon.nickname,
          boxImage: sprites(pokemon.id),
        })),
    };
  };

  return (
    <>
      <PageHeader
        title="Retos"
        subtitle="Piques sueltos entre dos jugadores, con su premio y su castigo. Cuentan para el historial de victorias, pero no dan puntos."
      />

      {retos.length === 0 ? (
        <EmptyState
          title="Todavía no hay retos"
          hint={canManage ? "Crea el primero abajo." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {retos.map((reto) => {
            const a = porId.get(reto.participantAId);
            const b = porId.get(reto.participantBId);
            const jugado = Boolean(reto.winnerId);

            return (
              <section
                key={reto.id}
                className={cx(
                  "card",
                  jugado && "border-emerald-500/20 bg-emerald-500/[0.02]",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:w-auto sm:flex-1">
                    <Jugador
                      participantId={reto.participantAId}
                      name={a?.displayName ?? "?"}
                      color={a?.color ?? "#64748b"}
                      image={a?.user.avatarImage ?? null}
                      winner={reto.winnerId === reto.participantAId}
                    />
                    <span className="shrink-0 text-xs text-slate-500">vs</span>
                    <Jugador
                      participantId={reto.participantBId}
                      name={b?.displayName ?? "?"}
                      color={b?.color ?? "#64748b"}
                      image={b?.user.avatarImage ?? null}
                      winner={reto.winnerId === reto.participantBId}
                    />
                  </div>
                  <div className="flex w-full items-center gap-2 text-xs text-slate-500 sm:w-auto">
                    {reto.pokemonDiff !== null ? (
                      <span className="chip">dif. {reto.pokemonDiff}</span>
                    ) : null}
                    {reto.playedAt ? (
                      <span>{formatDate(reto.playedAt)}</span>
                    ) : (
                      <span className="text-amber-400/80">Pendiente</span>
                    )}
                    {canManage ? (
                      <form action={deleteChallengeAction}>
                        <input type="hidden" name="challengeId" value={reto.id} />
                        <ConfirmSubmit message="¿Borrar este reto?">✕</ConfirmSubmit>
                      </form>
                    ) : null}
                  </div>
                </div>

                {reto.prize || reto.punishment ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {reto.prize ? (
                      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-sm text-emerald-100">
                        <span className="mr-1" aria-hidden>
                          🏅
                        </span>
                        <span className="text-emerald-300/80">Premio: </span>
                        {reto.prize}
                      </p>
                    ) : null}
                    {reto.punishment ? (
                      <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-sm text-red-100">
                        <span className="mr-1" aria-hidden>
                          ☠️
                        </span>
                        <span className="text-red-300/80">Castigo: </span>
                        {reto.punishment}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {reto.notes ? (
                  <p className="mt-1.5 text-xs text-slate-500">{reto.notes}</p>
                ) : null}

                <MatchTeams
                  matchId={reto.id}
                  esReto
                  canManage={canManage}
                  sides={[
                    lado(reto.participantAId, reto.team),
                    lado(reto.participantBId, reto.team),
                  ]}
                />

                {canManage ? (
                  <ChallengeResultForm
                    reto={{
                      id: reto.id,
                      winnerId: reto.winnerId,
                      pokemonDiff: reto.pokemonDiff,
                      prize: reto.prize,
                      punishment: reto.punishment,
                      notes: reto.notes,
                      a: { id: reto.participantAId, name: a?.displayName ?? "?" },
                      b: { id: reto.participantBId, name: b?.displayName ?? "?" },
                    }}
                  />
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {canManage && opciones.length >= 2 ? (
        <div className="mt-6">
          <NewChallengeForm
            competitionId={competition.id}
            participants={opciones}
          />
        </div>
      ) : null}
    </>
  );
}

function Jugador({
  participantId,
  name,
  color,
  image,
  winner,
}: {
  participantId: string;
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
      <Avatar
        name={name}
        color={color}
        image={image}
        size={20}
        participantId={participantId}
      />
      <span className="truncate">{name}</span>
      {winner ? <span aria-hidden>👑</span> : null}
    </span>
  );
}
