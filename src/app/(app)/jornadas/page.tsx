import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  getParticipants,
  soloActivos,
} from "@/lib/competition";
import { getMvpStates } from "@/lib/mvp";
import { combatesEsperandoRetirada } from "@/lib/retiradas";
import { comoEstaFuera, puedeVotarElMvp } from "@/lib/wipeos";
import { urlsDeImagen } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getMarcador } from "@/lib/marcador";
import { BolaDePartido } from "@/components/marcador-dual";
import {
  Avatar,
  ConfirmSubmit,
  EmptyState,
  EnlaceDeJugador,
} from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import {
  deleteMatchAction,
  deleteMatchdayAction,
  permitirCombateAction,
} from "@/app/actions/matchdays";
import { NewMatchdayForm, AddMatchForm, MatchResultForm } from "./matchday-forms";
import { MvpBadge, type MvpCandidateView } from "@/components/mvp-badge";
import { MatchTeams, type TeamSide } from "@/components/match-team";
import { ReplayLink } from "@/components/replay-link";
import { ChapaDeFormato } from "@/components/formato";
import { formatoDeCombate } from "@/lib/formatos-de-combate";
import { Royale } from "./royale";
import { NuevoRoyale } from "./matchday-forms";
import { Icono } from "@/components/icono";

export const metadata = { title: "Jornadas" };

export default async function MatchdaysPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const [canManage, myParticipant, participants, matchdays, esperando, marcador] = await Promise.all([
    canManageCompetition(competition.id, user),
    getMyParticipant(competition.id, user.id),
    getParticipants(competition.id),
    prisma.matchday.findMany({
      where: { competitionId: competition.id },
      orderBy: { position: "asc" },
      include: {
        matches: {
          orderBy: { position: "asc" },
          include: {
            // Sin los datos del jugador: los 6 ya vienen de getParticipants,
            // y repetirlos por combate multiplicaba el peso de la página
            participantA: { select: { id: true, displayName: true, color: true } },
            participantB: { select: { id: true, displayName: true, color: true } },
            team: { orderBy: { position: "asc" } },
          },
        },
        royales: {
          orderBy: { position: "asc" },
          include: {
            puestos: {
              include: {
                participant: { select: { id: true, displayName: true, color: true } },
              },
            },
            equipos: { orderBy: { position: "asc" } },
          },
        },
      },
    }),
    combatesEsperandoRetirada(competition.id),
    // Solo en los lockes que se ganan por jornadas: ver lib/marcador.ts
    perfilDeLocke(competition.maxPlayers).victoria === "jornadas"
      ? getMarcador(competition.id)
      : null,
  ]);

  /**
   * Para emparejar mandan los que siguen jugando, pero los que están fuera
   * también se ofrecen, al final y marcados: es la **excepción a la norma**.
   * El emparejador automático sigue sin contar con ellos, y si la
   * organización monta el combate a mano es porque le ha dado permiso.
   */
  const comoOpcion = (participant: (typeof participants)[number]) => {
    const salida = comoEstaFuera(participant);
    return {
      id: participant.id,
      displayName: salida
        ? `${participant.displayName} (${salida.etiqueta})`
        : participant.displayName,
    };
  };
  const participantOptions = [
    ...soloActivos(participants).map(comoOpcion),
    ...participants.filter((p) => p.retiredAt).map(comoOpcion),
  ];

  /** Quiénes están fuera, para saber en qué combates cabe la excepción */
  const estaFuera = new Set(
    participants.filter((p) => p.retiredAt).map((p) => p.id),
  );

  const avatarByParticipant = new Map(
    participants.map((participant) => [
      participant.id,
      participant.user.avatarImage,
    ]),
  );

  // Las dos a la vez: la votación del MVP no necesita los sprites, y pedidas
  // en fila era una ida y vuelta de más en la pantalla que más se abre.
  const [sprites, mvpStates] = await Promise.all([
    // Direcciones de los sprites de los equipos: ver lib/imagen-url.ts
    urlsDeImagen("equipo", [
      ...matchdays.flatMap((jornada) =>
        jornada.matches.flatMap((combate) => combate.team.map((p) => p.id)),
      ),
      ...matchdays.flatMap((jornada) =>
        jornada.royales.flatMap((royale) => royale.equipos.map((p) => p.id)),
      ),
    ]),
    getMvpStates(
      competition.id,
      matchdays.map((matchday) => matchday.id),
      myParticipant?.id ?? null,
    ),
  ]);

  /** Añade la foto de perfil del dueño, que no viaja con el recuento */
  const withAvatar = (
    candidate: Omit<MvpCandidateView, "ownerAvatar">,
  ): MvpCandidateView => ({
    ...candidate,
    ownerAvatar: avatarByParticipant.get(candidate.ownerId) ?? null,
  });

  return (
    <>
      <PageHeader
        title="Jornadas"
        subtitle="Emparejamientos de cada jornada. Al marcar un ganador se le suma automáticamente el punto de la victoria."
      />

      {marcador?.bolaDePartido.length ? (
        <div className="mb-4">
          <BolaDePartido quienes={marcador.bolaDePartido} />
        </div>
      ) : null}

      {matchdays.length === 0 ? (
        <EmptyState
          title="No hay jornadas creadas"
          hint={canManage ? "Crea la primera abajo." : undefined}
        />
      ) : (
        <div className="space-y-4">
          {matchdays.map((matchday) => {
            const played = matchday.matches.filter((match) => match.winnerId).length;
            const mvpState = mvpStates.get(matchday.id);
            const formato = formatoDeCombate(matchday.formato);
            const temática = formato.id !== "singles";

            /**
             * Terminada. En una jornada de royales no hay combates que contar:
             * lo que la cierra es que todos tengan sus puestos repartidos.
             */
            const complete = formato.multiple
              ? matchday.royales.length > 0 &&
                matchday.royales.every((royale) =>
                  royale.puestos.some((fila) => fila.puesto !== null),
                )
              : matchday.matches.length > 0 &&
                played === matchday.matches.length;

            /** Quién ganó cada cosa, para el renglón de la jornada plegada */
            const ganadores = formato.multiple
              ? matchday.royales.flatMap((royale) =>
                  royale.puestos
                    .filter((fila) => fila.puesto === 1)
                    .map((fila) => fila.participant),
                )
              : matchday.matches
                  .filter((match) => match.winnerId)
                  .map((match) =>
                    match.winnerId === match.participantAId
                      ? match.participantA
                      : match.participantB,
                  );

            return (
              <section
                key={matchday.id}
                className={cx(
                  "card",
                  complete && "border-emerald-500/25 bg-emerald-500/[0.03]",
                )}
                /* Una jornada temática va teñida de su color: en una lista de
                   cinco, la rara se distingue sin leer nada */
                style={
                  temática && !complete
                    ? { borderColor: `${formato.color}59` }
                    : undefined
                }
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="section-title">{matchday.label}</h2>
                        <ChapaDeFormato formato={matchday.formato} detalle />
                      </div>
                      <p className="text-xs text-slate-500">
                        {matchday.milestone ? `${matchday.milestone} · ` : ""}
                        {formato.multiple
                          ? `${matchday.royales.length} ${matchday.royales.length === 1 ? "royale" : "royales"}`
                          : `${played}/${matchday.matches.length} combates jugados`}{" "}
                        · {matchday.pointsForWin} pto/victoria
                      </p>
                      {matchday.condiciones ? (
                        <p className="mt-1 text-xs text-amber-200/80">
                          <Icono emoji="📋" /> {matchday.condiciones}
                        </p>
                      ) : null}
                    </div>
                    {mvpState ? (
                      <MvpBadge
                        mvp={{
                          matchdayId: matchday.id,
                          matchdayLabel: matchday.label,
                          reason: matchday.mvpReason,
                          candidates: mvpState.candidates.map(withAvatar),
                          winner: mvpState.winner
                            ? withAvatar(mvpState.winner)
                            : null,
                          tied: mvpState.tied.map(withAvatar),
                          myVoteId: mvpState.myVoteId,
                          votesCast: mvpState.votesCast,
                          voterCount: mvpState.voterCount,
                          // El que perdió el locke sigue votando; el que se
                          // retiró, no: ver lib/wipeos.ts
                          canVote: Boolean(
                            myParticipant && puedeVotarElMvp(myParticipant),
                          ),
                          canManage,
                        }}
                      />
                    ) : null}
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

                {/**
                 * El cuerpo se pliega. Una jornada terminada ya no se toca y
                 * ocupaba lo mismo que una en marcha: con cinco jornadas había
                 * que bajar cuatro pantallas para llegar a la de hoy. Plegada
                 * deja su renglón de quién ganó, que es lo que se consulta.
                 */}
                <details open={!complete} className="group">
                  {/* En una jornada en marcha no hay nada que plegar: la barra
                      sobraría, así que se esconde y esto se queda abierto */}
                  <summary
                    className={cx(
                      "flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-1 py-1 text-xs text-slate-500 marker:hidden hover:text-slate-300",
                      !complete && "hidden",
                    )}
                  >
                    <span
                      aria-hidden
                      className="inline-block text-slate-600 transition group-open:rotate-90"
                    >
                      ▸
                    </span>
                    {complete && ganadores.length ? (
                      <>
                        <span>Ganaron</span>
                        {ganadores.map((quien, posicion) => (
                          <span
                            key={`${quien.id}-${posicion}`}
                            className="inline-flex items-center gap-1 text-slate-300"
                          >
                            {/* Sin enlace: dentro de un summary, pinchar el
                                avatar abriría el perfil en vez de desplegar */}
                            <Avatar
                              name={quien.displayName}
                              color={quien.color}
                              image={avatarByParticipant.get(quien.id) ?? null}
                              size={16}
                            />
                            {quien.displayName}
                          </span>
                        ))}
                      </>
                    ) : (
                      <span>{formato.multiple ? "Los royales" : "Los combates"}</span>
                    )}
                    <span className="text-slate-600 group-open:hidden">· ver</span>
                    <span className="hidden text-slate-600 group-open:inline">
                      · ocultar
                    </span>
                  </summary>

                  <div className={complete ? "mt-3" : undefined}>
                  {matchday.royales.length ? (
                    <div className="mb-4 space-y-3">
                      {matchday.royales.map((royale) => (
                        <Royale
                          key={royale.id}
                          canManage={canManage}
                          miParticipanteId={myParticipant?.id ?? null}
                          maximo={formato.equipo}
                          royale={{
                            id: royale.id,
                            label: royale.label,
                            cronica: royale.cronica,
                            replayUrl: royale.replayUrl,
                            playedAt: royale.playedAt,
                            jugadores: royale.puestos
                              .slice()
                              .sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99))
                              .map((fila) => ({
                                puestoId: fila.id,
                                participantId: fila.participantId,
                                displayName: fila.participant.displayName,
                                color: fila.participant.color,
                                avatarImage:
                                  avatarByParticipant.get(fila.participantId) ?? null,
                                puesto: fila.puesto,
                                vivos: fila.vivos,
                                notes: fila.notes,
                                equipo: royale.equipos
                                  .filter((p) => p.participantId === fila.participantId)
                                  .map((pokemon) => ({
                                    id: pokemon.id,
                                    species: pokemon.species,
                                    nickname: pokemon.nickname,
                                    boxImage: sprites(pokemon.id),
                                  })),
                              })),
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {formato.multiple ? (
                    canManage ? (
                      <div className="mt-2">
                        <NuevoRoyale matchdayId={matchday.id} />
                      </div>
                    ) : null
                  ) : matchday.matches.length === 0 ? (
                    <p className="muted">Sin emparejamientos todavía.</p>
                  ) : (
                    <ul className="space-y-2">
                      {matchday.matches.map((match) => (
                        <li
                          key={match.id}
                          className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5"
                        >
                          {/* En móvil los datos del combate bajan a su propia
                              línea: si comparten fila con los nombres, estos se
                              quedan sin sitio y se cortan a una letra. */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            {/* En pantallas muy estrechas los dos nombres pasan
                                a dos líneas antes que recortarse */}
                            <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:w-auto sm:flex-1">
                              <PlayerChip
                                participantId={match.participantAId}
                                name={match.participantA.displayName}
                                color={match.participantA.color}
                                image={avatarByParticipant.get(match.participantAId) ?? null}
                                winner={match.winnerId === match.participantAId}
                              />
                              <span className="shrink-0 text-xs text-slate-500">
                                vs
                              </span>
                              <PlayerChip
                                participantId={match.participantBId}
                                name={match.participantB.displayName}
                                color={match.participantB.color}
                                image={avatarByParticipant.get(match.participantBId) ?? null}
                                winner={match.winnerId === match.participantBId}
                              />
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 text-xs text-slate-500 sm:w-auto">
                              {/* Solo si este combate se juega distinto al resto
                                  de su jornada; si no, ya lo dice la cabecera */}
                              {match.formato && match.formato !== matchday.formato ? (
                                <ChapaDeFormato formato={match.formato} />
                              ) : null}
                              <ReplayLink url={match.replayUrl} />
                              {/* Bien visible: no es una victoria como las
                                  demás y tiene que verse de un vistazo */}
                              {match.porRetirada ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-200">
                                  <Icono emoji="🏳️" /> Por retirada de{" "}
                                  {match.winnerId === match.participantAId
                                    ? match.participantB.displayName
                                    : match.participantA.displayName}
                                </span>
                              ) : null}
                              {/* La excepción: alguien que está fuera lo juega
                                  igual porque la organización lo ha permitido */}
                              {match.excepcion ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200/90"
                                  title="Uno de los dos está fuera del locke y lo juega con permiso de la organización. No se dará por retirada."
                                >
                                  <Icono emoji="🤝" /> Con permiso
                                </span>
                              ) : null}
                              {/* Esperando a que acabe el resto de la jornada
                                  para darse por ganado: ver lib/retiradas.ts */}
                              {esperando.has(match.id) ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200/90"
                                  title="Se dará por ganado cuando estén jugados los demás combates de esta jornada"
                                >
                                  <Icono emoji="🏳️" /> Por retirada, al acabar la jornada
                                </span>
                              ) : null}
                              {match.pokemonDiff !== null ? (
                                <span className="chip">
                                  dif. {match.pokemonDiff}
                                </span>
                              ) : null}
                              {match.playedAt ? (
                                <span>{formatDate(match.playedAt)}</span>
                              ) : esperando.has(match.id) ? null : (
                                <span className="text-amber-400/80">Pendiente</span>
                              )}
                              {/**
                               * El permiso se da y se quita aquí porque lo
                               * normal es que el wipeo llegue con el combate ya
                               * puesto. Solo sale si hace falta: si los dos
                               * siguen jugando no hay nada que permitir.
                               */}
                              {canManage &&
                              (estaFuera.has(match.participantAId) ||
                                estaFuera.has(match.participantBId)) ? (
                                <form action={permitirCombateAction}>
                                  <input
                                    type="hidden"
                                    name="matchId"
                                    value={match.id}
                                  />
                                  <ConfirmSubmit
                                    className="btn-ghost btn-sm text-sky-300/80"
                                    message={
                                      match.excepcion
                                        ? "¿Quitar el permiso? El combate volverá a darse por retirada cuando acabe la jornada."
                                        : "¿Dejar que lo jueguen? Uno de los dos está fuera del locke: el combate no se dará por retirada y contará como cualquier otro."
                                    }
                                  >
                                    {match.excepcion
                                      ? "Quitar el permiso"
                                      : <><Icono emoji="🤝" /> Dejar que lo jueguen</>}
                                  </ConfirmSubmit>
                                </form>
                              ) : null}
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

                          <MatchTeams
                            matchId={match.id}
                            canManage={canManage}
                            maximo={formatoDeCombate(match.formato ?? matchday.formato).equipo}
                            aLaVez={formatoDeCombate(match.formato ?? matchday.formato).aLaVez}
                            sides={[
                              teamSide(
                                match.participantA,
                                match.team,
                                sprites,
                                avatarByParticipant.get(match.participantAId) ?? null,
                              ),
                              teamSide(
                                match.participantB,
                                match.team,
                                sprites,
                                avatarByParticipant.get(match.participantBId) ?? null,
                              ),
                            ]}
                          />

                          {canManage ? (
                            <MatchResultForm
                              match={{
                                id: match.id,
                                winnerId: match.winnerId,
                                pokemonDiff: match.pokemonDiff,
                                replayUrl: match.replayUrl,
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

                  {canManage && !formato.multiple && participantOptions.length >= 2 ? (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <AddMatchForm
                        matchdayId={matchday.id}
                        participants={participantOptions}
                      />
                    </div>
                  ) : null}
                  </div>
                </details>
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

/** El lado de un combate: el jugador y los pokémon que sacó. */
function teamSide(
  participant: { id: string; displayName: string; color: string },
  team: {
    id: string;
    participantId: string;
    species: string;
    nickname: string | null;
  }[],
  sprites: (id: string) => string | null,
  avatar: string | null,
): TeamSide {
  return {
    participantId: participant.id,
    displayName: participant.displayName,
    color: participant.color,
    avatarImage: avatar,
    team: team
      .filter((pokemon) => pokemon.participantId === participant.id)
      .map((pokemon) => ({
        id: pokemon.id,
        species: pokemon.species,
        nickname: pokemon.nickname,
        boxImage: sprites(pokemon.id),
      })),
  };
}

function PlayerChip({
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
    <EnlaceDeJugador
      participantId={participantId}
      name={name}
      className={cx(
        "gap-1.5 rounded-lg px-2 py-1 text-sm",
        winner
          ? "bg-emerald-500/15 font-semibold text-emerald-200 ring-1 ring-emerald-500/30"
          : "text-slate-300 hover:bg-white/5",
      )}
    >
      <Avatar name={name} color={color} image={image} size={20} />
      <span className="truncate">{name}</span>
      {winner ? <span aria-hidden><Icono emoji="👑" /></span> : null}
    </EnlaceDeJugador>
  );
}
