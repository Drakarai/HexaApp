import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
  soloActivos,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { ConfirmSubmit, EmptyState } from "@/components/ui";
import { LEVEL_CAP_KIND_LABELS } from "@/lib/constants";
import { juegoPorId } from "@/lib/juegos";
import { urlsDeMedallas } from "@/lib/imagenes";
import { cx, readableTextColor } from "@/lib/utils";
import { LevelCapArt } from "./level-cap-art";
import {
  deleteLevelCapAction,
  toggleGymClearAction,
} from "@/app/actions/level-caps";
import {
  NewLevelCapForm,
  EditLevelCapForm,
  TraerPlantilla,
} from "./level-cap-forms";
import { GymVideos, type VideoDeGimnasio } from "./gym-videos";
import { Resaltar } from "./resaltar";

export const metadata = { title: "Level caps" };

export default async function LevelCapsPage({
  searchParams,
}: {
  searchParams: Promise<{ apuntar?: string }>;
}) {
  const { apuntar } = await searchParams;
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const [canManage, participants, levelCaps] = await Promise.all([
    canManageCompetition(competition.id, user),
    getParticipants(competition.id),
    prisma.levelCap.findMany({
      where: { competitionId: competition.id },
      orderBy: { position: "asc" },
      include: { clears: true, videos: true },
    }),
  ]);

  /** Los que siguen jugando: son los que tienen que superar cada gimnasio */
  const activos = soloActivos(participants);

  // Para el botón de traerse los hitos del juego, si la edición tiene uno
  const nombreJuego = juegoPorId(competition.gameId)?.name ?? null;

  const clearedSet = new Set(
    levelCaps.flatMap((cap) =>
      cap.clears.map((clear) => `${cap.id}:${clear.participantId}`),
    ),
  );

  // Direcciones de las medallas: ver lib/imagen-url.ts
  const medallas = await urlsDeMedallas(levelCaps.map((cap) => cap.id));

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
        editable: canManage || participante.userId === user.id,
      }));
  };

  return (
    <>
      <PageHeader
        title="Level caps"
        subtitle="Nivel máximo permitido antes de cada gimnasio. Marca tu casilla cuando te pases el combate: nadie sigue hasta que estén todas."
      />

      {apuntar === "1" && miProximo ? (
        <Resaltar id={`cap-${miProximo.id}`} />
      ) : null}

      {levelCaps.length === 0 ? (
        <div className="card text-center">
          <p className="text-4xl" aria-hidden>
            🎯
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            No hay level caps configurados
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            {canManage
              ? "Tráete los del juego de un tirón y ajústalos, o añádelos a mano abajo."
              : "Un administrador tiene que configurarlos."}
          </p>
          {canManage && nombreJuego ? (
            <div className="mx-auto max-w-sm">
              <TraerPlantilla
                competitionId={competition.id}
                nombreDelJuego={nombreJuego}
                hayAlguno={false}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {levelCaps.map((levelCap) => {
            /**
             * Solo cuentan los que siguen jugando: si un retirado tuviera que
             * marcar su casilla, el grupo entero se quedaría esperando a
             * alguien que ya no va a jugar. Sus marcas de antes se respetan.
             */
            const clearedCount = levelCap.clears.filter((clear) =>
              activos.some((jugador) => jugador.id === clear.participantId),
            ).length;
            const allCleared =
              activos.length > 0 && clearedCount === activos.length;
            const images = medallas(levelCap.id);

            return (
              <article
                key={levelCap.id}
                id={`cap-${levelCap.id}`}
                className={cx(
                  "card relative isolate overflow-hidden transition",
                  allCleared && "border-emerald-500/30 bg-emerald-500/[0.04]",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <LevelCapArt
                      images={images}
                      cap={levelCap.cap}
                      label={levelCap.label}
                      allCleared={allCleared}
                    />

                    <div>
                      <h3 className="font-semibold text-white">
                        {levelCap.label}
                        {levelCap.badge ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {levelCap.badge}
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {LEVEL_CAP_KIND_LABELS[levelCap.kind] ?? levelCap.kind}
                        {" · "}
                        {clearedCount}/{activos.length} superado
                        {clearedCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {canManage ? (
                    <form action={deleteLevelCapAction}>
                      <input
                        type="hidden"
                        name="levelCapId"
                        value={levelCap.id}
                      />
                      <ConfirmSubmit
                        message={`¿Borrar el level cap de ${levelCap.label}?`}
                      >
                        ✕
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </div>

                {levelCap.notes ? (
                  <p className="mt-3 text-sm text-slate-400">{levelCap.notes}</p>
                ) : null}

                {participants.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {participants.map((participant) => {
                      const cleared = clearedSet.has(
                        `${levelCap.id}:${participant.id}`,
                      );
                      const retirado = participant.retiredAt !== null;
                      const editable =
                        !retirado && (canManage || participant.userId === user.id);

                      return (
                        <form key={participant.id} action={toggleGymClearAction}>
                          <input
                            type="hidden"
                            name="levelCapId"
                            value={levelCap.id}
                          />
                          <input
                            type="hidden"
                            name="participantId"
                            value={participant.id}
                          />
                          <button
                            type="submit"
                            disabled={!editable}
                            title={
                              retirado
                                ? `${participant.displayName} se retiró del locke`
                                : editable
                                  ? cleared
                                    ? "Marcar como no superado"
                                    : "Marcar como superado"
                                  : "Solo puedes marcar tus propios gimnasios"
                            }
                            className={cx(
                              "chip transition",
                              retirado
                                ? "text-slate-500 line-through opacity-50"
                                : cleared
                                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                                  : "opacity-70",
                              editable
                                ? "cursor-pointer hover:opacity-100"
                                : "cursor-not-allowed",
                            )}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: participant.color }}
                              aria-hidden
                            />
                            {participant.displayName}
                            <span aria-hidden>
                              {retirado ? "—" : cleared ? "✓" : "○"}
                            </span>
                          </button>
                        </form>
                      );
                    })}
                  </div>
                ) : null}

                <GymVideos
                  levelCapId={levelCap.id}
                  label={levelCap.label}
                  jugadores={videosDe(levelCap)}
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
              </article>
            );
          })}
        </div>
      )}

      {canManage ? (
        <div className="mt-8">
          <NewLevelCapForm competitionId={competition.id} />
          {nombreJuego && levelCaps.length ? (
            <TraerPlantilla
              competitionId={competition.id}
              nombreDelJuego={nombreJuego}
              hayAlguno
            />
          ) : null}
        </div>
      ) : null}

      {participants.length ? (
        <p className="mt-6 text-xs text-slate-500">
          Leyenda:{" "}
          {participants.map((participant) => (
            <span
              key={participant.id}
              className="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[11px]"
              style={{
                background: participant.color,
                color: readableTextColor(participant.color),
              }}
            >
              {participant.displayName}
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}
