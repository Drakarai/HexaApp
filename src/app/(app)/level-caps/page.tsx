import { Fragment } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
  soloActivos,
  soloLectura,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { ConfirmSubmit } from "@/components/ui";
import { LEVEL_CAP_KINDS, LEVEL_CAP_KIND_LABELS } from "@/lib/constants";
import { grupoDePlantillaDeJuego } from "@/lib/juegos";
import { firmaDeColumna, urlsDeMedallasDelLocke } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { primerosEnPasar } from "@/lib/coronas";
import { MatchTeams } from "@/components/match-team";
import { cx } from "@/lib/utils";
import { LevelCapArt } from "./level-cap-art";
import {
  deleteLevelCapAction,
  toggleJornadaDespuesAction,
} from "@/app/actions/level-caps";
import {
  checkpointAbierto,
  checkpointsDelLocke,
  getJornadasParaCheckpoints,
} from "@/lib/checkpoints";
import { MarcarGimnasio } from "./marcar-gimnasio";
import { Pendientes } from "@/components/pendientes";
import {
  NewLevelCapForm,
  EditLevelCapForm,
  TraerPlantilla,
} from "./level-cap-forms";
import { GymVideos, type VideoDeGimnasio } from "./gym-videos";
import { Resaltar } from "./resaltar";
import { Icono } from "@/components/icono";

export const metadata = { title: "Level caps" };

export default async function LevelCapsPage({
  searchParams,
}: {
  searchParams: Promise<{ apuntar?: string }>;
}) {
  const { apuntar } = await searchParams;
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const perfil = perfilDeLocke(competition.maxPlayers, competition.estilo);
  /**
   * Todo en la misma tanda: también los equipos del solitario, las firmas de
   * sus sprites y las medallas, que se buscan por el locke. Antes eran tres
   * idas y vueltas más, una detrás de otra.
   */
  const [canManage, participants, levelCaps, jornadas, equiposPorHito, firmasEquipo, medallas] = await Promise.all([
    canManageCompetition(competition.id, user),
    getParticipants(competition.id),
    prisma.levelCap.findMany({
      where: { competitionId: competition.id },
      orderBy: { position: "asc" },
      include: { clears: true, videos: true },
    }),
    getJornadasParaCheckpoints(competition.id),
    /**
     * El equipo con el que se pasó cada gimnasio. **Solo en solitario**: en un
     * locke de seis serían seis equipos por gimnasio y no lo apuntaría nadie.
     */
    perfil.enSolitario
      ? prisma.matchPokemon.findMany({
          where: { levelCap: { competitionId: competition.id } },
          orderBy: { position: "asc" },
        })
      : [],
    perfil.enSolitario
      ? prisma.$queryRaw<{ id: string; v: string | null }[]>`
          select mp."id", ${firmaDeColumna(`mp."boxImage"`)} as v
          from "MatchPokemon" mp join "LevelCap" l on l."id" = mp."levelCapId"
          where l."competitionId" = ${competition.id}
        `
      : [],
    // Direcciones de las medallas: ver lib/imagen-url.ts
    urlsDeMedallasDelLocke(competition.id),
  ]);

  // Archivada y sin administrarla: se ve quién pasó qué, pero no se marca nada
  const cerrada = soloLectura(competition, canManage);

  /** Los que siguen jugando: son los que tienen que superar cada gimnasio */
  const activos = soloActivos(participants);

  // Para el botón de traerse los hitos: la plantilla es de la pareja de juegos
  const nombreJuego = grupoDePlantillaDeJuego(competition.gameId)?.nombre ?? null;

  const firmaDeEquipo = new Map(firmasEquipo.map((fila) => [fila.id, fila.v]));
  const spritesDeEquipo = (id: string) => urlDeImagen("equipo", id, firmaDeEquipo.get(id));

  /**
   * La corona de quien se pasó cada gimnasio antes que nadie. En solitario no:
   * siendo uno, sería primero siempre.
   */
  // En un Soul Link tampoco: se juega a la vez, no a ver quién llega antes
  const coronas = perfil.sinJornadas
    ? new Map<string, Set<string>>()
    : primerosEnPasar(
        levelCaps.flatMap((cap) =>
          cap.clears.map((clear) => ({ ...clear, levelCapId: cap.id })),
        ),
      );

  /**
   * Los checkpoints de jornada. En solitario no hay jornadas, así que ni se
   * enseñan ni se pueden poner.
   */
  const checkpoints = perfil.sinJornadas
    ? []
    : checkpointsDelLocke(levelCaps, jornadas);
  const pasadoPorTodos = (levelCap: (typeof levelCaps)[number]) =>
    activos.length > 0 &&
    activos.every((jugador) =>
      levelCap.clears.some((clear) => clear.participantId === jugador.id),
    );
  const primeroSinPasar = levelCaps.findIndex((cap) => !pasadoPorTodos(cap));
  const abierto = checkpointAbierto(
    checkpoints,
    primeroSinPasar === -1 ? levelCaps.length : primeroSinPasar,
  );

  const clearedSet = new Set(
    levelCaps.flatMap((cap) =>
      cap.clears.map((clear) => `${cap.id}:${clear.participantId}`),
    ),
  );


  /**
   * El primero que me queda por marcar. Es a donde lleva el botón de apuntar:
   * viniendo de ahí, lo que se acaba de hacer es pasarse ese gimnasio.
   */
  const yo = participants.find((participante) => participante.userId === user.id);
  const miProximo = yo
    ? levelCaps.find((cap) => !clearedSet.has(`${cap.id}:${yo.id}`))
    : undefined;

  /**
   * Los vídeos de un gimnasio: solo de quien se lo ha pasado, porque el vídeo
   * es justamente el de pasárselo. Se listan también los que aún no lo han
   * puesto pero podrían, para que les salga el hueco de añadirlo.
   */
  const videosDe = (levelCap: (typeof levelCaps)[number]): VideoDeGimnasio[] => {
    const puestos = new Map(
      levelCap.videos.map((video) => [video.participantId, video.url]),
    );
    return participants
      .filter((participante) =>
        clearedSet.has(`${levelCap.id}:${participante.id}`),
      )
      .map((participante) => ({
        participantId: participante.id,
        displayName: participante.displayName,
        color: participante.color,
        url: puestos.get(participante.id) ?? null,
        editable: !cerrada && (canManage || participante.userId === user.id),
      }));
  };

  /**
   * El cuerpo de un hito: quién lo ha pasado, el equipo (en solitario), los
   * vídeos y el editor. Es igual plegado que sin plegar; lo que cambia es la
   * cabecera.
   */
  const cuerpo = (levelCap: (typeof levelCaps)[number], images: string[]) => (
    <>
      {levelCap.notes ? <p className="mt-3 text-sm text-slate-400">{levelCap.notes}</p> : null}

      {participants.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {participants.map((participant) => {
            const cleared = clearedSet.has(`${levelCap.id}:${participant.id}`);
            const retirado = participant.retiredAt !== null;
            const editable = !retirado && !cerrada && (canManage || participant.userId === user.id);

            return (
              <MarcarGimnasio
                key={participant.id}
                levelCapId={levelCap.id}
                participantId={participant.id}
                nombre={participant.displayName}
                color={participant.color}
                hito={levelCap.label}
                superado={cleared}
                editable={editable}
                retirado={retirado}
                primero={cleared && (coronas.get(levelCap.id)?.has(participant.id) ?? false)}
                celebrar={levelCap.kind === LEVEL_CAP_KINDS.CHAMPION}
              />
            );
          })}
        </div>
      ) : null}

      {/* El equipo con el que lo pasaste, como los de un combate */}
      {perfil.enSolitario && yo ? (
        <MatchTeams
          matchId={levelCap.id}
          levelCapId={levelCap.id}
          rotulo={levelCap.label}
          canManage={!cerrada && (canManage || yo.userId === user.id)}
          sides={[
            {
              participantId: yo.id,
              displayName: yo.displayName,
              color: yo.color,
              avatarImage: yo.user.avatarImage,
              team: equiposPorHito
                .filter((pokemon) => pokemon.levelCapId === levelCap.id)
                .map((pokemon) => ({
                  id: pokemon.id,
                  species: pokemon.species,
                  nickname: pokemon.nickname,
                  boxImage: spritesDeEquipo(pokemon.id),
                })),
            },
          ]}
        />
      ) : null}

      <GymVideos
        levelCapId={levelCap.id}
        label={levelCap.label}
        jugadores={videosDe(levelCap)}
        mio={cerrada ? null : (yo?.id ?? null)}
      />

      {canManage ? (
        <EditLevelCapForm
          levelCap={{
            id: levelCap.id,
            label: levelCap.label,
            cap: levelCap.cap,
            kind: levelCap.kind,
            badge: levelCap.badge,
            notes: levelCap.notes,
            images,
          }}
        />
      ) : null}
    </>
  );

  /** Los botones de quien administra: la jornada de después y borrar */
  const botonesDeAdmin = (levelCap: (typeof levelCaps)[number]) =>
    canManage ? (
      <div className="flex shrink-0 items-center gap-1">
        {perfil.sinJornadas ? null : (
          <form action={toggleJornadaDespuesAction}>
            <input type="hidden" name="levelCapId" value={levelCap.id} />
            {/* Solo el icono, encendido cuando está puesto: con rótulo empujaba
                la cabecera a dos filas en el móvil. Lo que hace se lee en la
                franja de debajo */}
            <button
              type="submit"
              className={cx("btn-ghost btn-sm", levelCap.jornadaDespues && "border-brand-400/50 bg-brand-600/20 text-brand-200")}
              aria-pressed={levelCap.jornadaDespues}
              aria-label={
                levelCap.jornadaDespues
                  ? "Quitar la jornada de después de este hito"
                  : "Poner jornada después de este hito"
              }
              title={
                levelCap.jornadaDespues
                  ? "Quitar la jornada de después de este hito"
                  : "Jornada después: cuando todos pasen este hito, toca jornada"
              }
            >
              <Icono emoji="⚔️" />
            </button>
          </form>
        )}
        <form action={deleteLevelCapAction}>
          <input type="hidden" name="levelCapId" value={levelCap.id} />
          <ConfirmSubmit message={`¿Borrar el level cap de ${levelCap.label}?`}>✕</ConfirmSubmit>
        </form>
      </div>
    ) : null;

  /** El hito al que va el grupo: el primero que no han pasado todos */
  const delGrupo = primeroSinPasar === -1 ? null : levelCaps[primeroSinPasar];

  return (
    <>
      <PageHeader
        title="Level caps"
        subtitle={
          // En solitario no hay a quién esperar
          perfil.enSolitario
            ? "Nivel máximo permitido antes de cada gimnasio. Marca tu casilla cuando te pases el combate."
            : "Nivel máximo permitido antes de cada gimnasio. Marca tu casilla cuando te pases el combate: nadie sigue hasta que estén todas."
        }
      />

      {apuntar === "1" && miProximo ? <Resaltar id={`cap-${miProximo.id}`} /> : null}

      <Pendientes tipo="gimnasio" />

      {levelCaps.length === 0 ? (
        <div className="card text-center">
          <p className="text-4xl" aria-hidden>
            <Icono emoji="🎯" />
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">No hay level caps configurados</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            {canManage
              ? "Tráete los del juego de un tirón y ajústalos, o añádelos a mano abajo."
              : "Un administrador tiene que configurarlos."}
          </p>
          {canManage && nombreJuego ? (
            <div className="mx-auto max-w-sm">
              <TraerPlantilla competitionId={competition.id} nombreDelJuego={nombreJuego} hayAlguno={false} />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <EstucheDeMedallas
            hitos={levelCaps.map((cap) => ({
              id: cap.id,
              label: cap.label,
              cap: cap.cap,
              imagen: medallas(cap.id)[0] ?? null,
              // Quien juega ve las suyas; quien solo mira, las de todo el grupo
              conseguida: yo ? clearedSet.has(`${cap.id}:${yo.id}`) : pasadoPorTodos(cap),
            }))}
            siguiente={yo ? (miProximo ?? null) : delGrupo}
            deQuien={yo ? "tuyo" : "grupo"}
            grupo={!yo || perfil.enSolitario ? null : delGrupo}
          />

          {/**
           * **La ruta**: los hitos en un camino de arriba abajo, cada uno con
           * su parada en la raya de la izquierda. Los que ha pasado todo el
           * mundo se quedan plegados en una línea, que lo que importa es lo que
           * queda; se abren para ver los vídeos o corregir algo.
           */}
          <ol className="relative mt-6 space-y-3 before:absolute before:bottom-4 before:left-[11px] before:top-4 before:w-px before:bg-white/10">
            {levelCaps.map((levelCap) => {
              /**
               * Solo cuentan los que siguen jugando: si un retirado tuviera que
               * marcar su casilla, el grupo entero se quedaría esperando a
               * alguien que ya no va a jugar. Sus marcas de antes se respetan.
               */
              const clearedCount = levelCap.clears.filter((clear) =>
                activos.some((jugador) => jugador.id === clear.participantId),
              ).length;
              const allCleared = activos.length > 0 && clearedCount === activos.length;
              const images = medallas(levelCap.id);
              const esElSiguiente = (yo ? miProximo : delGrupo)?.id === levelCap.id;
              const checkpoint = checkpoints.find((punto) => punto.hito.id === levelCap.id);

              const cabecera = (
                <div className="flex min-w-0 items-center gap-3.5">
                  <LevelCapArt images={images} cap={levelCap.cap} label={levelCap.label} allCleared={allCleared} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">
                      {levelCap.label}
                      {levelCap.badge ? (
                        <span className="ml-2 text-xs font-normal text-slate-500">{levelCap.badge}</span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {LEVEL_CAP_KIND_LABELS[levelCap.kind] ?? levelCap.kind}
                      {" · "}
                      {allCleared
                        ? "superado por todos"
                        : `${clearedCount}/${activos.length} superado${clearedCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
              );

              return (
                <Fragment key={levelCap.id}>
                  <li className="relative pl-9">
                    {/* La parada en el camino: hecha, la de ahora o por venir */}
                    <span
                      aria-hidden
                      className={cx(
                        "absolute left-[5px] top-7 flex h-[13px] w-[13px] items-center justify-center rounded-full border-2",
                        allCleared
                          ? "border-emerald-400 bg-emerald-400"
                          : esElSiguiente
                            ? "border-brand-400 bg-ink-950 ring-4 ring-brand-500/25"
                            : "border-slate-600 bg-ink-950",
                      )}
                    />
                    {allCleared ? (
                      <details
                        id={`cap-${levelCap.id}`}
                        className="card group relative isolate overflow-hidden border-emerald-500/20 bg-emerald-500/[0.03] py-3"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          {cabecera}
                          <span className="shrink-0 text-xs text-slate-500">
                            <span className="group-open:hidden">Ver ▾</span>
                            <span className="hidden group-open:inline">Plegar ▴</span>
                          </span>
                        </summary>
                        {canManage ? <div className="mt-3 flex justify-end">{botonesDeAdmin(levelCap)}</div> : null}
                        {cuerpo(levelCap, images)}
                      </details>
                    ) : (
                      <article
                        id={`cap-${levelCap.id}`}
                        className={cx(
                          "card relative isolate overflow-hidden transition",
                          esElSiguiente && "border-brand-400/40 shadow-[0_0_0_1px_rgb(129_140_248/0.15)]",
                        )}
                      >
                        {esElSiguiente ? (
                          <p className="antetitulo mb-3">{yo ? "Tu próximo combate" : "Por aquí va el grupo"}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          {cabecera}
                          {botonesDeAdmin(levelCap)}
                        </div>
                        {cuerpo(levelCap, images)}
                      </article>
                    )}
                  </li>
                  {checkpoint ? (
                    <li className="relative pl-9">
                      <FranjaDeJornada
                        numero={checkpoint.numero}
                        hito={levelCap.label}
                        jornada={checkpoint.jornada?.label ?? null}
                        estado={
                          checkpoint.jugada
                            ? "jugada"
                            : abierto?.hito.id === levelCap.id
                              ? "toca"
                              : pasadoPorTodos(levelCap)
                                ? "debida"
                                : "espera"
                        }
                      />
                    </li>
                  ) : null}
                </Fragment>
              );
            })}
          </ol>
        </>
      )}

      {canManage ? (
        <div className="mt-8">
          <NewLevelCapForm competitionId={competition.id} />
          {nombreJuego && levelCaps.length ? (
            <TraerPlantilla competitionId={competition.id} nombreDelJuego={nombreJuego} hayAlguno />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * **El estuche de medallas**, como el de los juegos: todas en fila, encendidas
 * las conseguidas y la siguiente marcada, con su nivel debajo. De un vistazo
 * se sabe por dónde vas sin bajar por la lista.
 */
function EstucheDeMedallas({
  hitos,
  siguiente,
  deQuien,
  grupo,
}: {
  hitos: { id: string; label: string; cap: number; imagen: string | null; conseguida: boolean }[];
  siguiente: { id: string; label: string; cap: number } | null;
  deQuien: "tuyo" | "grupo";
  /** Por dónde va el grupo, si no es por donde vas tú */
  grupo: { id: string; label: string } | null;
}) {
  const conseguidas = hitos.filter((h) => h.conseguida).length;
  return (
    <section className="card relative overflow-hidden bg-gradient-to-br from-ink-850 to-ink-900">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="antetitulo">{deQuien === "tuyo" ? "Tu estuche" : "El estuche del grupo"}</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {siguiente ? (
              <>
                {deQuien === "tuyo" ? "Te toca" : "Toca"} {siguiente.label}
                <span className="text-slate-400"> · nivel {siguiente.cap}</span>
              </>
            ) : (
              "Todo superado"
            )}
          </p>
          {grupo && grupo.id !== siguiente?.id ? (
            <a href={`#cap-${grupo.id}`} className="text-xs text-slate-400 hover:text-slate-200">
              El grupo sigue en {grupo.label}
            </a>
          ) : null}
        </div>
        <p className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-white">
          {conseguidas}
          <span className="text-lg text-slate-500">/{hitos.length}</span>
        </p>
      </div>
      <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {hitos.map((hito) => {
          const esLaSiguiente = hito.id === siguiente?.id;
          return (
            <li key={hito.id} className="shrink-0">
              <a href={`#cap-${hito.id}`} className="group flex w-14 flex-col items-center gap-1" title={hito.label}>
                <span
                  className={cx(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 transition",
                    hito.conseguida
                      ? "border-amber-300/70 bg-amber-300/10"
                      : esLaSiguiente
                        ? "border-brand-400 bg-brand-600/15 ring-4 ring-brand-500/20"
                        : "border-dashed border-white/15 bg-ink-950/60",
                  )}
                >
                  {hito.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hito.imagen}
                      alt=""
                      className={cx(
                        "h-9 w-9 object-contain",
                        !hito.conseguida && "opacity-30 grayscale",
                      )}
                    />
                  ) : (
                    <span
                      className={cx(
                        "font-[family-name:var(--font-display)] text-lg font-bold",
                        hito.conseguida ? "text-amber-200" : esLaSiguiente ? "text-brand-200" : "text-slate-500",
                      )}
                    >
                      {hito.conseguida ? "✓" : hito.cap}
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center text-[11px] text-slate-400 group-hover:text-slate-200">
                  {hito.label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * La franja que separa los gimnasios donde toca jornada. Va a lo ancho de la
 * rejilla para que se lea como un corte en el camino, no como otra tarjeta.
 */
function FranjaDeJornada({
  numero,
  hito,
  jornada,
  estado,
}: {
  numero: number;
  hito: string;
  /** El nombre de su jornada, o null si todavía no está creada */
  jornada: string | null;
  /** toca: es la de ahora · debida: todos pasaron pero manda otra de antes */
  estado: "jugada" | "toca" | "debida" | "espera";
}) {
  const nombre = jornada ?? `Jornada ${numero}`;
  return (
    <Link
      href="/jornadas"
      className={cx(
        "flex items-center gap-3 rounded-xl border border-dashed px-4 py-2.5 text-sm transition xl:col-span-2",
        estado === "toca"
          ? "border-brand-400/60 bg-brand-600/15 text-white hover:bg-brand-600/25"
          : estado === "jugada"
            ? "border-emerald-500/25 text-slate-400 hover:border-emerald-500/40"
            : "border-white/10 text-slate-400 hover:border-white/20",
      )}
    >
      <Icono emoji="⚔️" />
      <span className="min-w-0 flex-1">
        <strong className="font-semibold text-slate-100">{nombre}</strong>
        <span className="text-slate-500">
          {" · "}
          {estado === "jugada"
            ? "jugada"
            : estado === "toca"
              ? "toca ahora, antes del siguiente gimnasio"
              : estado === "debida"
                ? "pendiente, después de la de antes"
                : `cuando todos pasen ${hito}`}
          {jornada ? "" : " · sin crear todavía"}
        </span>
      </span>
      {estado === "toca" ? (
        <span className="chip shrink-0 border-brand-400/40 text-brand-200">Ahora</span>
      ) : estado === "jugada" ? (
        <span className="shrink-0 text-emerald-400">✓</span>
      ) : null}
    </Link>
  );
}
