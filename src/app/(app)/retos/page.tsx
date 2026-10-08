import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
} from "@/lib/competition";
import { comoEstaFuera } from "@/lib/wipeos";
import { urlsDeImagen } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import {
  Avatar,
  ConfirmSubmit,
  EmptyState,
  EnlaceDeJugador,
} from "@/components/ui";
import { MatchTeams, type TeamSide } from "@/components/match-team";
import { ReplayLink } from "@/components/replay-link";
import { ChapaDeFormato } from "@/components/formato";
import { formatoDeCombate } from "@/lib/formatos-de-combate";
import { cx, formatDate } from "@/lib/utils";
import { getCatalogo } from "@/lib/bolsa";
import {
  deleteChallengeAction,
  ocultarCastigoAction,
} from "@/app/actions/challenges";
import {
  NewChallengeForm,
  ChallengeResultForm,
  PremioEnObjetos,
} from "./challenge-forms";
import { Icono } from "@/components/icono";

export const metadata = { title: "Retos" };

export default async function RetosPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  // Antes que lo demás: el catálogo solo se pide si esa persona puede tocarlo
  const canManage = await canManageCompetition(competition.id, user);

  const [participants, retos, catalogo] = await Promise.all([
    getParticipants(competition.id),
    prisma.challengeMatch.findMany({
      where: { competitionId: competition.id },
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      include: {
        team: { orderBy: { position: "asc" } },
        premios: { include: { item: { omit: { image: true } } } },
      },
    }),
    // Para elegir qué objetos se lleva quien gane
    canManage ? getCatalogo() : Promise.resolve([]),
  ]);

  // Direcciones de las imágenes de los objetos del premio, no las imágenes
  const imagenesDeObjeto = await urlsDeImagen(
    "objeto",
    retos.flatMap((reto) => reto.premios.map((premio) => premio.itemId)),
  );

  const porId = new Map(participants.map((jugador) => [jugador.id, jugador]));
  /**
   * Un reto lo monta la organización, así que aquí también se puede hacer la
   * excepción con alguien que está fuera del locke. Se ofrece, pero marcado y
   * el último: que se vea lo que se está haciendo.
   */
  const comoOpcion = (jugador: (typeof participants)[number]) => {
    const salida = comoEstaFuera(jugador);
    return {
      id: jugador.id,
      displayName: salida
        ? `${jugador.displayName} (${salida.etiqueta})`
        : jugador.displayName,
    };
  };
  const opciones = [
    ...participants.filter((jugador) => !jugador.retiredAt).map(comoOpcion),
    ...participants.filter((jugador) => jugador.retiredAt).map(comoOpcion),
  ];

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
        subtitle="Piques sueltos entre dos, con premio y castigo. Cuentan para el historial, pero no dan puntos."
      />

      {retos.length === 0 ? (
        <EmptyState
          dibujo="espadas"
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
                  "card relative overflow-hidden",
                  jugado && "border-emerald-500/20",
                )}
              >
                {/**
                 * **El cartel del duelo**: los dos frente a frente con el «VS» en
                 * medio, como el anuncio de un combate. El que gana se lleva la
                 * corona y el que pierde se apaga. Antes eran dos nombres
                 * pequeños en una línea y el reto no parecía un reto.
                 */}
                <div className="-mx-5 -mt-5 mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/5 bg-white/[0.02] px-5 pb-3 pt-5">
                  <Jugador
                    participantId={reto.participantAId}
                    name={a?.displayName ?? "?"}
                    color={a?.color ?? "#64748b"}
                    image={a?.user.avatarImage ?? null}
                    winner={reto.winnerId === reto.participantAId}
                    perdio={jugado && reto.winnerId !== reto.participantAId}
                  />
                  <div className="flex flex-col items-center gap-1 px-1 text-center">
                    <span className="font-[family-name:var(--font-display)] text-3xl font-bold italic leading-none text-slate-500">
                      VS
                    </span>
                    {reto.playedAt ? (
                      <span className="text-[11px] text-slate-400">
                        {formatDate(reto.playedAt)}
                        {reto.pokemonDiff !== null ? ` · dif. ${reto.pokemonDiff}` : ""}
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <Jugador
                    participantId={reto.participantBId}
                    name={b?.displayName ?? "?"}
                    color={b?.color ?? "#64748b"}
                    image={b?.user.avatarImage ?? null}
                    winner={reto.winnerId === reto.participantBId}
                    perdio={jugado && reto.winnerId !== reto.participantBId}
                    derecha
                  />
                </div>

                <div className="mb-1 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                  <ChapaDeFormato formato={reto.formato} />
                  <ReplayLink url={reto.replayUrl} />
                </div>

                {reto.prize || reto.punishment ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {reto.prize ? (
                      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-sm text-emerald-100">
                        <span className="mr-1" aria-hidden>
                          <Icono emoji="🏅" />
                        </span>
                        <span className="text-emerald-300/80">Premio: </span>
                        {reto.prize}
                      </p>
                    ) : null}
                    {reto.punishment ? (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-sm text-red-100">
                        <p>
                          <span className="mr-1" aria-hidden>
                            <Icono emoji="☠️" />
                          </span>
                          <span className="text-red-300/80">Castigo: </span>
                          {reto.punishment}
                        </p>
                        {canManage && jugado ? (
                          <form action={ocultarCastigoAction} className="mt-1">
                            <input
                              type="hidden"
                              name="challengeId"
                              value={reto.id}
                            />
                            <button
                              type="submit"
                              className="text-xs text-red-300/70 underline underline-offset-2 transition hover:text-red-100"
                            >
                              {reto.castigoVisible
                                ? "Dejar de anunciarlo en la portada"
                                : "Volver a anunciarlo en la portada"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {reto.premios.length && !canManage ? (
                  <p className="mt-2 text-xs text-emerald-300/80">
                    <Icono emoji="🎒" /> También se lleva:{" "}
                    {reto.premios
                      .map(
                        (premio) =>
                          `${premio.quantity > 1 ? `${premio.quantity} × ` : ""}${premio.item.name}`,
                      )
                      .join(", ")}
                  </p>
                ) : null}

                {canManage ? (
                  <details className="group mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    <summary className="cursor-pointer list-none text-xs font-medium text-slate-400">
                      <span className="mr-1.5 inline-block transition group-open:rotate-90">▸</span>
                      <Icono emoji="🎒" /> Objetos del premio
                      <span className="text-slate-500">
                        {" · "}
                        {reto.premios.length
                          ? reto.premios
                              .map((premio) => `${premio.quantity > 1 ? `${premio.quantity} × ` : ""}${premio.item.name}`)
                              .join(", ")
                          : "ninguno"}
                      </span>
                    </summary>
                  <PremioEnObjetos
                    challengeId={reto.id}
                    premios={reto.premios.map((premio) => ({
                      id: premio.id,
                      quantity: premio.quantity,
                      entregadoA: premio.entregadoA,
                      item: {
                        name: premio.item.name,
                        image: imagenesDeObjeto(premio.itemId),
                      },
                    }))}
                    catalogo={catalogo.map((objeto) => ({
                      id: objeto.id,
                      name: objeto.name,
                    }))}
                    yaEntregado={
                      reto.winnerId
                        ? (porId.get(reto.winnerId)?.displayName ?? null)
                        : null
                    }
                  />
                  </details>
                ) : null}

                {reto.notes ? (
                  <p className="mt-1.5 text-xs text-slate-500">{reto.notes}</p>
                ) : null}

                <MatchTeams
                  matchId={reto.id}
                  esReto
                  canManage={canManage}
                  repeticion={reto.replayUrl}
                  maximo={formatoDeCombate(reto.formato).equipo}
                  aLaVez={formatoDeCombate(reto.formato).aLaVez}
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
                      replayUrl: reto.replayUrl,
                      formato: reto.formato,
                      prize: reto.prize,
                      punishment: reto.punishment,
                      notes: reto.notes,
                      a: { id: reto.participantAId, name: a?.displayName ?? "?" },
                      b: { id: reto.participantBId, name: b?.displayName ?? "?" },
                    }}
                  />
                ) : null}

                {/* Abajo y aparte: arriba se montaba encima del de la derecha */}
                {canManage ? (
                  <form action={deleteChallengeAction} className="mt-3 flex justify-end border-t border-white/5 pt-3">
                    <input type="hidden" name="challengeId" value={reto.id} />
                    <ConfirmSubmit message="¿Borrar este reto?" title="Borrar el reto">
                      ✕ Borrar
                    </ConfirmSubmit>
                  </form>
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
  perdio,
  derecha = false,
}: {
  participantId: string;
  name: string;
  color: string;
  image: string | null;
  winner: boolean;
  perdio: boolean;
  /** El de la derecha va al revés, mirando al de la izquierda */
  derecha?: boolean;
}) {
  return (
    <EnlaceDeJugador
      participantId={participantId}
      name={name}
      className={cx(
        "min-w-0 flex-col gap-1.5 rounded-xl p-2 text-center transition sm:flex-row sm:text-left",
        derecha && "sm:flex-row-reverse sm:text-right",
        winner ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "hover:bg-white/5",
        perdio && "opacity-55",
      )}
    >
      <span className="relative shrink-0">
        <Avatar name={name} color={color} image={image} size={44} />
        {winner ? (
          <span aria-label="Ganó" className="absolute -right-1.5 -top-2.5 text-lg">
            <Icono emoji="👑" />
          </span>
        ) : null}
      </span>
      <span
        className={cx(
          "min-w-0 max-w-full truncate font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide",
          winner ? "text-emerald-200" : "text-white",
        )}
      >
        {name}
      </span>
    </EnlaceDeJugador>
  );
}
