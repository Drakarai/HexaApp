import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  getParticipants,
  soloActivos,
  soloLectura,
} from "@/lib/competition";
import { getMvpStates } from "@/lib/mvp";
import { combatesEsperandoRetirada } from "@/lib/retiradas";
import { comoEstaFuera, puedeVotarElMvp } from "@/lib/wipeos";
import { firmasDeEquiposDeJornadas } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { alMejorDeDeLaJornada, perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getMarcador, ganadorDeLaJornada } from "@/lib/marcador";
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
import { NewMatchdayForm, AddMatchForm, MatchResultForm, ElegirSerie } from "./matchday-forms";
import { MvpBadge, type MvpCandidateView } from "@/components/mvp-badge";
import { MatchTeams, type TeamSide } from "@/components/match-team";
import { ReplayLink } from "@/components/replay-link";
import { ChapaDeFormato } from "@/components/formato";
import { formatoDeCombate } from "@/lib/formatos-de-combate";
import { Royale } from "./royale";
import { NuevoRoyale } from "./matchday-forms";
import { Icono } from "@/components/icono";
import { getPapelera, DIAS_EN_LA_PAPELERA } from "@/lib/papelera";
import { PapeleraDeJornadas } from "./papelera";

export const metadata = { title: "Jornadas" };

export default async function MatchdaysPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  /**
   * **Todo en la misma tanda**, también lo que depende de las jornadas: los
   * sprites de los equipos y el MVP se piden por el locke y no por los ids de
   * las jornadas, así que no hay que esperar a tenerlas. Antes eran cuatro
   * idas y vueltas en fila en la pantalla que más se abre.
   */
  const firmasDeEquipos = firmasDeEquiposDeJornadas(competition.id);
  const jornadasPedidas = prisma.matchday.findMany({
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
    });
  const [
    canManage,
    myParticipant,
    participants,
    matchdays,
    esperando,
    marcador,
    [firmasSprite],
    mvpStates,
    papelera,
  ] = await Promise.all([
    canManageCompetition(competition.id, user),
    getMyParticipant(competition.id, user.id),
    getParticipants(competition.id),
    jornadasPedidas,
    combatesEsperandoRetirada(competition.id),
    // Solo en los lockes que se ganan por jornadas: ver lib/marcador.ts
    perfilDeLocke(competition.maxPlayers, competition.estilo).victoria === "jornadas"
      ? getMarcador(competition.id)
      : null,
    firmasDeEquipos,
    getMvpStates(
      competition.id,
      jornadasPedidas.then((jornadas) => jornadas.map((jornada) => jornada.id)),
      { userId: user.id },
      firmasDeEquipos,
    ),
    // La papelera solo la ve quien administra, pero va en la misma tanda
    getPapelera(competition.id),
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

  // El dualocke: cada jornada es un combate o una serie al mejor de tres
  const perfil = perfilDeLocke(competition.maxPlayers, competition.estilo);

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

  // Direcciones de los sprites de los equipos: ver lib/imagen-url.ts
  const sprites = (id: string) => urlDeImagen("equipo", id, firmasSprite.get(id));

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
        subtitle="Los combates de cada jornada. Al marcar al ganador, su punto se suma solo."
      />

      {/* Con el juego mandando no hay «bola de partido»: las jornadas no dan el título */}
      {marcador?.danTitulo && marcador.bolaDePartido.length ? (
        <div className="mb-4">
          <BolaDePartido quienes={marcador.bolaDePartido} />
        </div>
      ) : null}

      {matchdays.length === 0 ? (
        <EmptyState
          dibujo="espadas"
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
             * Una serie al mejor de tres, como las llaves de la final: un
             * equipo por jugador para toda la serie y los combates debajo.
             * Solo si todos los combates son de la misma pareja; si alguien ha
             * montado otra cosa a mano, se pintan como siempre.
             */
            const alMejorDe = alMejorDeDeLaJornada(matchday.alMejorDe, perfil);
            const primero = matchday.matches[0];
            const esSerie =
              alMejorDe > 1 &&
              !formato.multiple &&
              Boolean(primero) &&
              matchday.matches.every(
                (m) =>
                  (m.participantAId === primero.participantAId && m.participantBId === primero.participantBId) ||
                  (m.participantAId === primero.participantBId && m.participantBId === primero.participantAId),
              );
            // Con algo apuntado, la jornada ya no cambia de formato
            const escrita = matchday.matches.some(
              (m) => m.winnerId || m.pokemonDiff !== null || m.replayUrl || m.notes || m.playedAt || m.porRetirada || m.team.length,
            );

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
              : esSerie
                ? // De una serie, quien se la lleva, no quién ganó cada combate
                  [ganadorDeLaJornada(matchday.matches).ganadorId]
                    .filter((id) => id)
                    .map((id) => (id === primero!.participantAId ? primero!.participantA : primero!.participantB))
                : matchday.matches
                  .filter((match) => match.winnerId)
                  .map((match) =>
                    match.winnerId === match.participantAId
                      ? match.participantA
                      : match.participantB,
                  );

            /**
             * Quién descansa: los que siguen en el locke, ya estaban cuando se
             * creó la jornada y no tienen combate en ella. Con cinco o con
             * tres, a uno le toca, y antes solo se decía en el aviso al
             * crearla: luego había que adivinarlo.
             */
            const descansan =
              !formato.multiple && matchday.matches.length
                ? participants.filter(
                    (p) =>
                      !p.retiredAt &&
                      p.joinedAt <= matchday.createdAt &&
                      !matchday.matches.some(
                        (m) => m.participantAId === p.id || m.participantBId === p.id,
                      ),
                  )
                : [];

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
                {/* Sin flex-wrap fuera: con la caja del MVP, lo de la izquierda
                    llenaba la fila y el ✕ se caía solo a una línea aparte */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
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
                        {descansan.length
                          ? ` · Descansa${descansan.length === 1 ? "" : "n"} ${descansan.map((p) => p.displayName).join(", ")}`
                          : ""}
                      </p>
                      {matchday.condiciones ? (
                        <p className="mt-1 text-xs text-amber-200/80">
                          <Icono emoji="📋" /> {matchday.condiciones}
                        </p>
                      ) : null}
                      {/* En un dualocke: un combate o al mejor de tres, mientras no haya nada apuntado */}
                      {perfil.serieAlMejorDe && !formato.multiple ? (
                        <div className="mt-1.5">
                          {canManage && !soloLectura(competition, canManage) ? (
                            <ElegirSerie matchdayId={matchday.id} alMejorDe={alMejorDe} bloqueada={Boolean(escrita)} />
                          ) : (
                            <span className="chip">{alMejorDe === 1 ? "Un combate" : `Al mejor de ${alMejorDe}`}</span>
                          )}
                        </div>
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
                            myParticipant &&
                              puedeVotarElMvp(myParticipant) &&
                              // Archivada: la votación se queda como quedó
                              !soloLectura(competition, canManage),
                          ),
                          canManage,
                        }}
                      />
                    ) : null}
                  </div>
                  {canManage ? (
                    <form action={deleteMatchdayAction} className="shrink-0">
                      <input type="hidden" name="matchdayId" value={matchday.id} />
                      <ConfirmSubmit
                        message={`¿Borrar "${matchday.label}" con todos sus combates? Se queda ${DIAS_EN_LA_PAPELERA} días en la papelera, por si acaso.`}
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
                          miParticipanteId={
                            soloLectura(competition, canManage)
                              ? null
                              : (myParticipant?.id ?? null)
                          }
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
                  ) : esSerie ? (
                    <SerieDeJornada
                      combates={matchday.matches}
                      alMejorDe={alMejorDe}
                      canManage={canManage}
                      sprites={sprites}
                      avatar={(id) => avatarByParticipant.get(id) ?? null}
                      esperando={esperando}
                      formato={matchday.formato}
                    />
                  ) : (
                    // En pantalla ancha, de dos en dos: a una columna el combate
                    // ocupaba la mitad y el resto era aire
                    <ul className="grid gap-2 xl:grid-cols-2 xl:items-start">
                      {matchday.matches.map((match) => (
                        <li
                          key={match.id}
                          className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5"
                        >
                          {/* Como un marcador: los dos a los lados y el
                              resultado en medio, que es lo que se busca */}
                          <MarcadorDelCombate
                            a={{
                              id: match.participantAId,
                              name: match.participantA.displayName,
                              color: match.participantA.color,
                              image: avatarByParticipant.get(match.participantAId) ?? null,
                            }}
                            b={{
                              id: match.participantBId,
                              name: match.participantB.displayName,
                              color: match.participantB.color,
                              image: avatarByParticipant.get(match.participantBId) ?? null,
                            }}
                            winnerId={match.winnerId}
                            diferencia={match.pokemonDiff}
                          />
                          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
                            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
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
                            repeticion={match.replayUrl}
                            estadisticas={
                              match.replayUrl ? { refs: [{ tipo: "jornada", id: match.id }] } : undefined
                            }
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

                  {/* En una serie los combates los pone ella (el tercero, si hace falta) */}
                  {canManage && !formato.multiple && !esSerie && participantOptions.length >= 2 ? (
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
          <NewMatchdayForm competitionId={competition.id} conSerie={Boolean(perfil.serieAlMejorDe)} />
        </div>
      ) : null}

      {canManage ? (
        <PapeleraDeJornadas
          borradas={papelera.map((b) => ({
            id: b.id,
            label: b.label,
            quien: b.quien,
            cuando: formatDate(b.borradaAt),
            quedan: Math.max(
              1,
              DIAS_EN_LA_PAPELERA - Math.floor((Date.now() - b.borradaAt.getTime()) / 86_400_000),
            ),
          }))}
        />
      ) : null}
    </>
  );
}

type CombateDeLaSerie = {
  id: string;
  participantAId: string;
  participantBId: string;
  participantA: { id: string; displayName: string; color: string };
  participantB: { id: string; displayName: string; color: string };
  winnerId: string | null;
  pokemonDiff: number | null;
  replayUrl: string | null;
  playedAt: Date | null;
  notes: string | null;
  porRetirada: boolean;
  formato: string | null;
  team: { id: string; participantId: string; species: string; nickname: string | null }[];
};

/**
 * Una jornada de dualocke al mejor de tres, como una llave de la final: los
 * dos con cómo va la serie, **un equipo por jugador para toda la serie** y sus
 * combates debajo. El equipo cuelga del primer combate; los demás solo llevan
 * su resultado. (Las series de antes de esto tenían un equipo por combate: si
 * un combate posterior trae el suyo, se enseña con él.)
 */
function SerieDeJornada({
  combates,
  alMejorDe,
  canManage,
  sprites,
  avatar,
  esperando,
  formato,
}: {
  combates: CombateDeLaSerie[];
  alMejorDe: number;
  canManage: boolean;
  sprites: (id: string) => string | null;
  avatar: (participantId: string) => string | null;
  esperando: Set<string>;
  formato: string;
}) {
  const primero = combates[0];
  const { ganadorId, porJugador } = ganadorDeLaJornada(combates);
  const lados = [primero.participantA, primero.participantB];
  const deFormato = formatoDeCombate(primero.formato ?? formato);
  // Para sacar el equipo de una repetición vale la de cualquier combate de la serie
  const repeticion = combates.find((c) => c.replayUrl)?.replayUrl ?? null;

  return (
    <div
      className={cx(
        "rounded-xl border p-3",
        ganadorId ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="rotulo">La serie</p>
        <p className="shrink-0 text-[11px] text-slate-500">Al mejor de {alMejorDe} · mismo equipo</p>
      </div>
      <div className="space-y-1.5">
        {lados.map((lado) => {
          const gano = ganadorId === lado.id;
          return (
            <div
              key={lado.id}
              className={cx(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                gano
                  ? "bg-emerald-500/15 font-semibold text-emerald-100 ring-1 ring-emerald-500/30"
                  : ganadorId
                    ? "text-slate-500 opacity-70"
                    : "text-slate-200",
              )}
            >
              <Avatar
                name={lado.displayName}
                color={lado.color}
                image={avatar(lado.id)}
                size={22}
                participantId={lado.id}
              />
              <span className="min-w-0 flex-1 truncate">{lado.displayName}</span>
              {gano ? <span aria-hidden><Icono emoji="👑" /></span> : null}
              <span className={cx("w-5 shrink-0 text-center text-base font-black", gano ? "text-emerald-200" : "text-slate-400")}>
                {porJugador[lado.id] ?? 0}
              </span>
            </div>
          );
        })}
      </div>

      <MatchTeams
        matchId={primero.id}
        canManage={canManage}
        repeticion={repeticion}
        // Al tocar un pokémon, lo suyo en toda la serie; el botón, combate a combate
        estadisticas={
          repeticion
            ? {
                refs: combates.filter((c) => c.replayUrl).map((c) => ({ tipo: "jornada" as const, id: c.id })),
                titulo: "Estadísticas de la serie",
              }
            : undefined
        }
        maximo={deFormato.equipo}
        aLaVez={deFormato.aLaVez}
        sides={[
          teamSide(primero.participantA, primero.team, sprites, avatar(primero.participantAId)),
          teamSide(primero.participantB, primero.team, sprites, avatar(primero.participantBId)),
        ]}
      />

      <ol className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
        {combates.map((combate, indice) => {
          const ganador =
            combate.winnerId === combate.participantAId
              ? combate.participantA
              : combate.winnerId === combate.participantBId
                ? combate.participantB
                : null;
          return (
            <li key={combate.id} className={cx("rounded-lg px-2 py-1.5", ganador ? "bg-white/[0.04]" : "bg-white/[0.02]")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="w-4 shrink-0 font-bold text-slate-600">{indice + 1}</span>
                <span className="min-w-24 flex-1 truncate text-slate-300">
                  {ganador ? (
                    <>
                      <span aria-hidden><Icono emoji="👑" /></span> {ganador.displayName}
                    </>
                  ) : esperando.has(combate.id) ? (
                    <span className="italic text-amber-200/80">Por retirada, al acabar la jornada</span>
                  ) : (
                    <span className="italic text-slate-500">Sin jugar</span>
                  )}
                </span>
                {combate.porRetirada ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-200">
                    <Icono emoji="🏳️" /> Por retirada
                  </span>
                ) : null}
                {combate.pokemonDiff !== null ? <span className="shrink-0 text-slate-500">dif. {combate.pokemonDiff}</span> : null}
                {combate.playedAt ? <span className="shrink-0 text-slate-500">{formatDate(combate.playedAt)}</span> : null}
                <ReplayLink url={combate.replayUrl} />
                {canManage && indice > 0 ? (
                  <form action={deleteMatchAction}>
                    <input type="hidden" name="matchId" value={combate.id} />
                    <ConfirmSubmit message={`¿Quitar el ${indice + 1}º combate de la serie?`}>✕</ConfirmSubmit>
                  </form>
                ) : null}
              </div>
              {combate.notes ? <p className="mt-0.5 pl-6 text-[11px] text-slate-500">{combate.notes}</p> : null}
              {/* Una serie de antes, con su equipo en este combate */}
              {indice > 0 && combate.team.length ? (
                <MatchTeams
                  matchId={combate.id}
                  canManage={false}
                  repeticion={combate.replayUrl}
                  maximo={deFormato.equipo}
                  aLaVez={deFormato.aLaVez}
                  sides={[
                    teamSide(combate.participantA, combate.team, sprites, avatar(combate.participantAId)),
                    teamSide(combate.participantB, combate.team, sprites, avatar(combate.participantBId)),
                  ]}
                />
              ) : null}
              {canManage ? (
                <MatchResultForm
                  match={{
                    id: combate.id,
                    winnerId: combate.winnerId,
                    pokemonDiff: combate.pokemonDiff,
                    replayUrl: combate.replayUrl,
                    notes: combate.notes,
                    a: { id: combate.participantAId, name: combate.participantA.displayName },
                    b: { id: combate.participantBId, name: combate.participantB.displayName },
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {!ganadorId && combates.length < alMejorDe ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Si queda 1-1, el tercero se añade solo.
        </p>
      ) : null}
    </div>
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

type LadoDelMarcador = { id: string; name: string; color: string; image: string | null };

/**
 * Un combate como un marcador de deportes: cada uno a su lado y en medio el
 * resultado. Lo que se apunta es la diferencia de pokémon, así que el ganador
 * marca esa diferencia y el perdedor cero (se quedó sin ninguno); sin
 * diferencia apuntada, una V y una D. Sin jugar, «VS».
 */
function MarcadorDelCombate({
  a,
  b,
  winnerId,
  diferencia,
}: {
  a: LadoDelMarcador;
  b: LadoDelMarcador;
  winnerId: string | null;
  diferencia: number | null;
}) {
  const tanto = (lado: LadoDelMarcador) =>
    lado.id === winnerId ? (diferencia ?? "V") : diferencia !== null ? 0 : "D";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
      <LadoDeMarcador lado={a} gana={winnerId === a.id} pierde={Boolean(winnerId) && winnerId !== a.id} />
      <span
        className={cx(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xl font-black tabular-nums sm:text-2xl",
          winnerId
            ? "border-white/10 bg-black/40 text-white"
            : "border-amber-500/20 bg-amber-500/5 text-sm tracking-widest text-amber-300/80 sm:text-base",
        )}
        title={winnerId && diferencia !== null ? "Pokémon que le quedaban a cada uno" : undefined}
      >
        {winnerId ? (
          <>
            <span className={winnerId === a.id ? "text-emerald-300" : "text-slate-500"}>{tanto(a)}</span>
            <span className="text-slate-600">:</span>
            <span className={winnerId === b.id ? "text-emerald-300" : "text-slate-500"}>{tanto(b)}</span>
          </>
        ) : (
          "VS"
        )}
      </span>
      <LadoDeMarcador lado={b} gana={winnerId === b.id} pierde={Boolean(winnerId) && winnerId !== b.id} derecha />
    </div>
  );
}

function LadoDeMarcador({
  lado,
  gana,
  pierde,
  derecha,
}: {
  lado: LadoDelMarcador;
  gana: boolean;
  pierde: boolean;
  derecha?: boolean;
}) {
  return (
    <EnlaceDeJugador
      participantId={lado.id}
      name={lado.name}
      className={cx(
        // En móvil, la foto encima del nombre: así el nombre tiene todo el ancho
        "flex-col gap-1 text-center sm:gap-2",
        derecha ? "sm:flex-row sm:text-left" : "sm:flex-row-reverse sm:text-right",
        pierde && "opacity-55",
      )}
    >
      <span className={cx("shrink-0 rounded-full", gana && "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-ink-900")}>
        <Avatar name={lado.name} color={lado.color} image={lado.image} size={36} />
      </span>
      <span className={cx("max-w-full truncate text-sm", gana ? "font-bold text-white" : "text-slate-300")}>
        {gana ? <Icono emoji="👑" className="mr-1" /> : null}
        {lado.name}
      </span>
    </EnlaceDeJugador>
  );
}
