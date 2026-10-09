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
import { Avatar, ConfirmSubmit } from "@/components/ui";
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
          {(() => {
            // Quien juega ve su tope; quien solo mira, el del grupo
            const hito = yo ? (miProximo ?? null) : delGrupo;
            const lohan = hito
              ? activos.filter((j) => clearedSet.has(`${hito.id}:${j.id}`))
              : [];
            return (
              <CartelDelTope
                hito={
                  hito
                    ? {
                        id: hito.id,
                        label: hito.label,
                        cap: hito.cap,
                        donde: hito.badge,
                        tipo: LEVEL_CAP_KIND_LABELS[hito.kind] ?? hito.kind,
                        imagen: medallas(hito.id)[0] ?? null,
                      }
                    : null
                }
                deQuien={yo ? "tuyo" : "grupo"}
                yaLoHan={lohan.map((j) => ({
                  id: j.id,
                  nombre: j.displayName,
                  color: j.color,
                  imagen: j.user.avatarImage,
                }))}
                activos={activos.length}
                llevas={levelCaps.filter((cap) => (yo ? clearedSet.has(`${cap.id}:${yo.id}`) : pasadoPorTodos(cap))).length}
                total={levelCaps.length}
                // Si vas por delante, dónde se ha quedado el grupo
                grupo={yo && !perfil.enSolitario && delGrupo && delGrupo.id !== hito?.id ? delGrupo : null}
              />
            );
          })()}

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
 * **El cartel del tope**: lo primero que se mira en esta pantalla es a qué
 * nivel se puede llevar el equipo, así que va arriba y en grande, como el
 * marcador de un estadio. Al lado, contra quién es y quién del grupo lo ha
 * pasado ya. La medalla, si la hay, de fondo. (Antes había un estuche con
 * todas las medallas en fila, y no gustó: mucho círculo para una sola cifra.)
 */
function CartelDelTope({
  hito,
  deQuien,
  yaLoHan,
  activos,
  llevas,
  total,
  grupo,
}: {
  hito: { id: string; label: string; cap: number; donde: string | null; tipo: string; imagen: string | null } | null;
  deQuien: "tuyo" | "grupo";
  yaLoHan: { id: string; nombre: string; color: string; imagen: string | null }[];
  activos: number;
  llevas: number;
  total: number;
  grupo: { id: string; label: string } | null;
}) {
  if (!hito) {
    return (
      <section className="card flex items-center gap-4">
        <span className="font-[family-name:var(--font-display)] text-5xl font-bold leading-none text-emerald-300">✓</span>
        <div>
          <p className="antetitulo">Sin tope</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {deQuien === "tuyo" ? "Lo has superado todo" : "El grupo lo ha superado todo"}
          </p>
          <p className="text-sm text-slate-400">Ya no hay level cap que respetar.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="card relative isolate overflow-hidden">
      {hito.imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hito.imagen}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-6 top-1/2 -z-10 h-48 w-48 -translate-y-1/2 object-contain opacity-[0.14] sm:right-6"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="shrink-0 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
            {deQuien === "tuyo" ? "Tu nivel máximo" : "Nivel máximo"}
          </p>
          <p className="font-[family-name:var(--font-display)] text-7xl font-bold leading-none tabular-nums text-white sm:text-8xl">
            {hito.cap}
          </p>
        </div>

        <div className="min-w-0 flex-1 border-white/10 sm:border-l sm:pl-6">
          <p className="text-sm text-slate-400">
            {deQuien === "tuyo" ? "hasta que te pases a" : "hasta que todos pasen a"}
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase leading-tight tracking-wide text-white">
            {hito.label}
          </p>
          <p className="text-sm text-slate-400">
            {/* «Alto Mando · Alto Mando» no: si el tipo es el nombre, sobra */}
            {[hito.tipo !== hito.label ? hito.tipo : null, hito.donde].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {yaLoHan.length ? (
              <>
                <span className="flex -space-x-2">
                  {yaLoHan.map((j) => (
                    <span key={j.id} className="rounded-full ring-2 ring-ink-900" title={j.nombre}>
                      <Avatar name={j.nombre} color={j.color} image={j.imagen} size={26} />
                    </span>
                  ))}
                </span>
                <span className="text-slate-300">
                  {yaLoHan.length === activos
                    ? "ya lo han pasado todos"
                    : `${yaLoHan.length} de ${activos} ya lo ${yaLoHan.length === 1 ? "ha" : "han"} pasado`}
                </span>
              </>
            ) : (
              <span className="text-slate-400">Nadie lo ha pasado todavía.</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 pt-3 text-xs text-slate-400">
        <span>
          {deQuien === "tuyo" ? "Llevas" : "El grupo lleva"} <strong className="text-slate-200">{llevas}</strong> de {total}
        </span>
        {grupo ? (
          <a href={`#cap-${grupo.id}`} className="hover:text-slate-200">
            El grupo sigue en {grupo.label}
          </a>
        ) : null}
        <a href={`#cap-${hito.id}`} className="ml-auto font-semibold text-brand-400 hover:underline">
          {deQuien === "tuyo" ? "Marcarlo al pasarlo ↓" : "Ver quién falta ↓"}
        </a>
      </div>
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
