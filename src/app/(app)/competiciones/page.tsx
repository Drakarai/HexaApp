import { prisma } from "@/lib/db";
import { requireUser, esCreador, puedeCrearLockes } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  listCompetitions,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { COMPETITION_STATUS } from "@/lib/constants";
import { nombreDelJuego } from "@/lib/juegos";
import { cx, formatDate } from "@/lib/utils";
import {
  deleteCompetitionAction,
  quitarEspectadorAction,
  removeParticipantAction,
  retirarParticipanteAction,
  selectCompetitionAction,
  setCompetitionStatusAction,
} from "@/app/actions/competitions";
import { getMisSolicitudes } from "@/lib/solicitudes";
import { comoEstaFuera, MOTIVOS_DE_SALIDA } from "@/lib/wipeos";
import { perderElLockeAction } from "@/app/actions/wipeos";
import { urlsDeImagen } from "@/lib/imagenes";
import { NewUserForm } from "../admin/user-forms";
import { ChallengeDiffToggle } from "../admin/challenge-diff-toggle";
import {
  LockeEnSolitarioForm,
  MisSolicitudes,
} from "./solitario-forms";
import {
  NewCompetitionForm,
  EditCompetitionForm,
  AddEspectadorForm,
  AddParticipantForm,
  EditParticipantForm,
  CopiarDeOtraEdicionForm,
} from "./competition-forms";
import { AccionesDeJugador } from "./acciones-de-jugador";
import { Icono } from "@/components/icono";

export const metadata = { title: "Competiciones" };

export default async function CompetitionsPage() {
  const user = await requireUser();
  const admin = esCreador(user);
  // Un organizador monta sus lockes y da de alta a su gente, sin ser admin
  const organiza = puedeCrearLockes(user);
  const [competitions, active] = await Promise.all([
    listCompetitions(),
    getActiveCompetition(),
  ]);

  const canManageActive = active
    ? await canManageCompetition(active.id, user)
    : false;

  const [participants, users, misSolicitudes, espectadores] = await Promise.all([
    active
      ? prisma.participant.findMany({
          where: { competitionId: active.id },
          orderBy: { displayName: "asc" },
          include: {
            user: { select: { id: true, username: true } },
            _count: { select: { deaths: true } },
          },
        })
      : Promise.resolve([]),
    organiza
      ? prisma.user.findMany({
          /**
           * Un organizador solo ve **las cuentas que él dio de alta** y la suya:
           * la lista entera de la casa no es asunto suyo, y con esto puede
           * montar su locke con su gente sin ver a nadie más.
           */
          where: admin
            ? {}
            : { OR: [{ creadoPorId: user.id }, { id: user.id }] },
          orderBy: { displayName: "asc" },
          select: { id: true, displayName: true, username: true },
        })
      : Promise.resolve([]),
    getMisSolicitudes(user.id),
    active
      ? prisma.spectator.findMany({
          where: { competitionId: active.id },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, displayName: true, username: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  /**
   * De qué lockes es administrador quien mira. Archivar y borrar dejaron de ser
   * cosa del Creador: son de quien lleva esa edición. El Creador los lleva
   * todos, así que para él la lista sobra.
   */
  const mando = admin
    ? null
    : new Set(
        (
          await prisma.participant.findMany({
            where: { userId: user.id, isAdmin: true },
            select: { competitionId: true },
          })
        ).map((ficha) => ficha.competitionId),
      );
  const mandoEn = (competitionId: string) =>
    admin || Boolean(mando?.has(competitionId));

  // Las fotos, por dirección: dentro de la página serían 36 KB por jugador
  const [avatares, logos] = await Promise.all([
    urlsDeImagen(
      "avatar",
      participants.map((participant) => participant.user.id),
    ),
    // El logo de la edición, para verlo en su formulario
    urlsDeImagen("logo", active ? [active.id] : []),
  ]);
  const logoActual = active ? logos(active.id) : null;

  const takenUserIds = new Set(participants.map((p) => p.userId));
  const availableUsers = users.filter((u) => !takenUserIds.has(u.id));
  // Para dar acceso de mirar sobran los que ya juegan y los que ya miran
  const mirandoYa = new Set(espectadores.map((e) => e.userId));
  const puedenMirar = availableUsers.filter((u) => !mirandoYa.has(u.id));

  return (
    <>
      <PageHeader
        title="Competiciones"
        subtitle="Cada edición es independiente: al crear una nueva, la anterior puede archivarse y se queda con todos sus datos como recuerdo."
      />

      {active ? (
        <section className="card mb-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">{active.name}</h2>
              <p className="muted mt-1">
                {[
                  nombreDelJuego(active.gameId, active.game),
                  active.modality,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Sin detalles"}
              </p>
            </div>
            <span className="chip">
              {active.status === COMPETITION_STATUS.ACTIVE ? (
                <><Icono emoji="🟢" /> En curso</>
              ) : (
                <><Icono emoji="🗄️" /> Archivada</>
              )}
            </span>
          </div>

          {active.description ? (
            <p className="mb-4 text-sm text-slate-400">{active.description}</p>
          ) : null}

          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">
            Jugadores ({participants.length}/{active.maxPlayers})
          </h3>

          {participants.length === 0 ? (
            <EmptyState title="Todavía no hay jugadores apuntados" />
          ) : (
            <ul className="space-y-2">
              {participants.map((participant) => (
                <li
                  key={participant.id}
                  className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  {/**
                   * Los datos arriba y los botones debajo, no todo en la misma
                   * línea: con cuatro controles al lado, en un móvil el nombre
                   * se quedaba en una letra y el usuario en una arroba suelta.
                   */}
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={participant.displayName}
                      color={participant.color}
                      image={avatares(participant.user.id)}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {/* El tachado es del nombre; las chapas se leen enteras */}
                        <span
                          className={cx(
                            participant.retiredAt &&
                              "text-slate-400 line-through",
                          )}
                        >
                          {participant.displayName}
                        </span>
                        {participant.isAdmin ? (
                          <span className="ml-2 text-xs text-amber-400">
                            admin
                          </span>
                        ) : null}
                        {comoEstaFuera(participant) ? (
                          <span
                            className={cx(
                              "ml-2 text-xs",
                              comoEstaFuera(participant)!.color,
                            )}
                          >
                            <Icono emoji={comoEstaFuera(participant)!.icono} />{" "}
                            {comoEstaFuera(participant)!.etiqueta}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        @{participant.user.username}
                        {participant.gameVersion
                          ? ` · ${participant.gameVersion}`
                          : ""}
                        {` · ${participant._count.deaths} bajas`}
                      </p>
                    </div>
                  </div>

                  {canManageActive ? (
                    <AccionesDeJugador nombre={participant.displayName}>
                      {/**
                       * Cuando está fuera por wipeo manda el botón de abajo:
                       * los dos lo devolverían al locke, y dos botones que
                       * hacen lo mismo con nombres distintos solo confunden.
                       */}
                      {participant.motivoDeSalida !== MOTIVOS_DE_SALIDA.WIPEO ? (
                      <form action={retirarParticipanteAction}>
                        <input
                          type="hidden"
                          name="participantId"
                          value={participant.id}
                        />
                        {participant.retiredAt ? (
                          <ConfirmSubmit
                            className="btn-ghost btn-sm"
                            message={`¿${participant.displayName} vuelve al locke? Los combates que ya se dieron por retirada se quedan como están.`}
                          >
                            Readmitir
                          </ConfirmSubmit>
                        ) : (
                          <ConfirmSubmit
                            className="btn-ghost btn-sm text-amber-300"
                            message={`¿Retirar a ${participant.displayName} del locke? No se borra nada suyo, pero deja de contar para los gimnasios y el MVP, y sus combates de jornada sin jugar los ganará el rival por retirada.`}
                          >
                            Retirar
                          </ConfirmSubmit>
                        )}
                      </form>
                      ) : null}
                      {/**
                       * Perder el locke va aparte de retirarse: para la
                       * competición es lo mismo, pero no es lo mismo dejarlo
                       * que que te barran. Solo sale si no está ya fuera por lo
                       * otro.
                       */}
                      {!participant.retiredAt ||
                      participant.motivoDeSalida === MOTIVOS_DE_SALIDA.WIPEO ? (
                        <form action={perderElLockeAction}>
                        <input
                          type="hidden"
                          name="participantId"
                          value={participant.id}
                        />
                        {participant.retiredAt ? (
                          <ConfirmSubmit
                            className="btn-ghost btn-sm"
                            message={`¿${participant.displayName} recupera el locke? Los combates que ya se dieron por perdidos se quedan como están.`}
                          >
                            Devolverle el locke
                          </ConfirmSubmit>
                        ) : (
                          <ConfirmSubmit
                            className="btn-ghost btn-sm text-red-300"
                            message={`¿${participant.displayName} pierde el locke? Queda fuera igual que quien se retira —sus combates sin jugar los gana el rival— pero se enseña como locke perdido, no como retirada. Se puede deshacer.`}
                          >
                            <Icono emoji="💥" /> Perdió el locke
                          </ConfirmSubmit>
                          )}
                        </form>
                      ) : null}
                      <form action={removeParticipantAction}>
                        <input
                          type="hidden"
                          name="participantId"
                          value={participant.id}
                        />
                        <ConfirmSubmit
                          message={`¿Sacar a ${participant.displayName} de la competición? Se borrarán sus muertes y puntos de esta edición.`}
                        >
                          ✕
                        </ConfirmSubmit>
                      </form>
                    </AccionesDeJugador>
                  ) : null}

                  {canManageActive ? (
                    <EditParticipantForm
                      participant={{
                        id: participant.id,
                        displayName: participant.displayName,
                        gameVersion: participant.gameVersion,
                        color: participant.color,
                        isAdmin: participant.isAdmin,
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canManageActive || espectadores.length ? (
            <div className="mt-5 border-t border-white/10 pt-4">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-400">
                Espectadores ({espectadores.length})
              </h3>
              <p className="muted mb-3">
                Este locke solo lo ven quienes lo juegan o lo han jugado. Aquí
                se le puede dejar mirar a alguien de fuera: lo ve entero, pero
                no puede tocar nada.
              </p>

              {espectadores.length ? (
                <ul className="mb-3 space-y-2">
                  {espectadores.map((espectador) => (
                    <li
                      key={espectador.id}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                    >
                      <Avatar
                        name={espectador.user.displayName}
                        color="#64748b"
                        size={28}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {espectador.user.displayName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          @{espectador.user.username} · solo mira
                        </p>
                      </div>
                      {canManageActive ? (
                        <form action={quitarEspectadorAction}>
                          <input
                            type="hidden"
                            name="competitionId"
                            value={active.id}
                          />
                          <input
                            type="hidden"
                            name="userId"
                            value={espectador.userId}
                          />
                          <ConfirmSubmit
                            message={`¿Quitarle el acceso a ${espectador.user.displayName}? Dejará de ver este locke.`}
                          >
                            ✕
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {canManageActive && organiza ? (
                <AddEspectadorForm
                  competitionId={active.id}
                  users={puedenMirar}
                />
              ) : null}
            </div>
          ) : null}

          {canManageActive ? (
            <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
              {participants.length < active.maxPlayers ? (
                availableUsers.length || !organiza ? (
                  <AddParticipantForm
                    competitionId={active.id}
                    users={availableUsers}
                  />
                ) : (
                  <p className="muted">
                    No quedan cuentas libres. Crea una aquí abajo.
                  </p>
                )
              ) : (
                <p className="muted">
                  La competición ya tiene sus {active.maxPlayers} jugadores.
                </p>
              )}

              <EditCompetitionForm
                competition={{
                  id: active.id,
                  name: active.name,
                  game: active.game,
                  gameId: active.gameId,
                  modality: active.modality,
                  description: active.description,
                  startingPoints: active.startingPoints,
                  jornadasPrevistas: active.jornadasPrevistas,
                  logo: logoActual,
                }}
              />

              <CopiarDeOtraEdicionForm
                destinoId={active.id}
                destinoNombre={active.name}
                otras={competitions
                  .filter((otra) => otra.id !== active.id)
                  .map((otra) => ({
                    id: otra.id,
                    name: otra.name,
                    mismoJuego: otra.gameId === active.gameId,
                  }))}
              />

              {/**
               * Este ajuste vivía en Administración, que es del Creador, pero
               * es de la edición: lo decide quien lleva el locke.
               */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Ajustes de {active.name}
                </p>
                <ChallengeDiffToggle
                  competitionId={active.id}
                  competitionName={active.name}
                  activo={active.challengeDiffCounts}
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">
          Histórico
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {competitions.map((competition) => (
            <article
              key={competition.id}
              className={cx(
                "card-tight",
                competition.id === active?.id && "border-brand-500/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">
                    {competition.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatDate(competition.startedAt)}
                    {competition.endedAt
                      ? ` → ${formatDate(competition.endedAt)}`
                      : ""}
                    {` · ${competition._count.participants} jugadores`}
                  </p>
                </div>
                <span className="chip shrink-0">
                  <Icono
                    emoji={competition.status === COMPETITION_STATUS.ACTIVE ? "🟢" : "🗄️"}
                  />
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={selectCompetitionAction}>
                  <input
                    type="hidden"
                    name="competitionId"
                    value={competition.id}
                  />
                  <button type="submit" className="btn-ghost btn-sm">
                    {competition.id === active?.id ? "Viendo" : "Ver"}
                  </button>
                </form>

                {mandoEn(competition.id) ? (
                  <>
                    <form action={setCompetitionStatusAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          competition.status === COMPETITION_STATUS.ACTIVE
                            ? COMPETITION_STATUS.ARCHIVED
                            : COMPETITION_STATUS.ACTIVE
                        }
                      />
                      <button type="submit" className="btn-ghost btn-sm">
                        {competition.status === COMPETITION_STATUS.ACTIVE
                          ? "Archivar"
                          : "Reactivar"}
                      </button>
                    </form>
                    <form action={deleteCompetitionAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <ConfirmSubmit
                        message={`¿Borrar "${competition.name}" para siempre? Se pierden reglas, muertes, puntos y notas de esa edición.`}
                      >
                        Borrar
                      </ConfirmSubmit>
                    </form>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <MisSolicitudes solicitudes={misSolicitudes} />

      {/* Un locke para uno mismo: el admin lo crea y el resto lo pide */}
      <div className="mb-6">
        <LockeEnSolitarioForm puedeCrearDirecto={organiza} />
      </div>

      {organiza ? (
        <div className="space-y-4">
          <NewCompetitionForm
            competitions={competitions.map((competition) => ({
              id: competition.id,
              name: competition.name,
            }))}
          />
          {/**
           * El alta de cuentas vive aquí y no en Administración porque un
           * organizador no entra en Administración: es de administradores
           * globales, y esto es justo lo que sí necesita para montar su locke.
           */}
          {admin ? null : <NewUserForm puedeElegirRol={false} />}
        </div>
      ) : null}
    </>
  );
}
