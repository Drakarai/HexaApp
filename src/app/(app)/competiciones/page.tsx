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
import { nombreDelJuego, versionesDeLaEdicion } from "@/lib/juegos";
import { cx, formatDate } from "@/lib/utils";
import {
  deleteCompetitionAction,
  quitarEspectadorAction,
  removeParticipantAction,
  retirarParticipanteAction,
  selectCompetitionAction,
  setCompetitionStatusAction,
  cambiarArranqueAction,
} from "@/app/actions/competitions";
import { getMisSolicitudes } from "@/lib/solicitudes";
import { comoEstaFuera, MOTIVOS_DE_SALIDA } from "@/lib/wipeos";
import { perderElLockeAction } from "@/app/actions/wipeos";
import { firmaDeColumna, urlsDeImagen } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { leerEstilo, perfilDeLocke } from "@/lib/perfiles-de-locke";
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
import { EnlacePublico } from "./enlace-publico";
import { RepartoDeJuegos } from "./reparto-de-juegos";
import { Icono } from "@/components/icono";
import { seccionActiva } from "@/components/menu-de-secciones";
import {
  CartuchoDeLaEdicion,
  CartuchoPequeno,
  PestanasDeCompeticiones,
  type EstadoDeEdicion,
} from "./cartucho";

export const metadata = { title: "Competiciones" };

type Seccion = "jugadores" | "ajustes" | "ediciones" | "nueva";

/**
 * Competiciones, en pestañas debajo de la ficha de la edición que se está
 * viendo: sus jugadores, sus ajustes (solo quien la lleva), todas las ediciones
 * y crear o pedir una nueva. Antes iba todo seguido en una columna.
 */
export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  const user = await requireUser();
  const { seccion: pedida } = await searchParams;
  const admin = esCreador(user);
  // Un organizador monta sus lockes y da de alta a su gente, sin ser admin
  const organiza = puedeCrearLockes(user);
  const [competitions, active] = await Promise.all([
    listCompetitions(),
    getActiveCompetition(),
  ]);

  /**
   * El resto, **en una sola tanda**: antes el permiso, los participantes, en qué
   * lockes manda y juega quien mira y las fotos iban cada uno esperando al
   * anterior. Las fotos se buscan por el locke, sin esperar a los ids.
   */
  const [
    canManageActive,
    participants,
    users,
    misSolicitudes,
    espectadores,
    misFichas,
    firmasAvatar,
    logos,
  ] = await Promise.all([
    active ? canManageCompetition(active.id, user) : false,
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
    /**
     * En qué lockes juega y en cuáles es administrador quien mira: de la misma
     * tabla y con el mismo filtro, así que en una sola consulta. Al Creador le
     * sobra saber dónde manda (lo lleva todo), y a quien no organiza, dónde
     * juega (es para archivar al crear).
     */
    !admin || organiza
      ? prisma.participant.findMany({
          where: { userId: user.id },
          select: { competitionId: true, isAdmin: true },
        })
      : Promise.resolve([]),
    // Las fotos, por dirección: dentro de la página serían 36 KB por jugador
    active
      ? prisma.$queryRaw<{ id: string; v: string | null }[]>`
          select u."id", ${firmaDeColumna(`u."avatarImage"`)} as v
          from "User" u join "Participant" p on p."userId" = u."id"
          where p."competitionId" = ${active.id}
        `
      : Promise.resolve([]),
    // El logo de la edición, para verlo en su formulario
    urlsDeImagen("logo", active ? [active.id] : []),
  ]);

  /**
   * De qué lockes es administrador quien mira. Archivar y borrar dejaron de ser
   * cosa del Creador: son de quien lleva esa edición. El Creador los lleva
   * todos, así que para él la lista sobra.
   */
  const mando = admin
    ? null
    : new Set(
        // Viendo como otro papel no se manda en ninguno (ver VER_COMO)
        misFichas.filter((ficha) => ficha.isAdmin && !user.verComo).map((ficha) => ficha.competitionId),
      );
  const mandoEn = (competitionId: string) =>
    admin || Boolean(mando?.has(competitionId));

  /**
   * Los lockes que se pueden archivar al crear uno nuevo, **uno a uno y a la
   * vista**. Antes era una casilla de "archivar todo lo activo" que al Creador
   * le archivaba los lockes de toda la casa —los en solitario de cada uno y los
   * de los organizadores— de un plumazo. Vienen marcados los de grupo en los
   * que juega quien crea: es la edición anterior, la que se quiere cerrar.
   */
  const juegoEn = organiza
    ? new Set(misFichas.map((ficha) => ficha.competitionId))
    : new Set<string>();
  const archivables = competitions
    .filter(
      (competition) =>
        competition.status === COMPETITION_STATUS.ACTIVE &&
        // Los de la gente no: el Creador los ve para supervisar, no para cerrarlos
        competition.mio &&
        (mandoEn(competition.id) || competition.createdById === user.id),
    )
    .map((competition) => ({
      id: competition.id,
      name: competition.name,
      jugadores: competition._count.participants,
      marcado: juegoEn.has(competition.id) && competition.maxPlayers > 1,
    }));

  const firmaDeAvatar = new Map(firmasAvatar.map((fila) => [fila.id, fila.v]));
  const avatares = (userId: string) => urlDeImagen("avatar", userId, firmaDeAvatar.get(userId));
  const logoActual = active ? logos(active.id) : null;

  // Si el juego es una pareja, cada jugador lleva una de sus dos versiones
  const versiones = active ? versionesDeLaEdicion(active) : [];

  // Los tuyos y, para el Creador, los de la gente aparte (ver abajo)
  const mios = competitions.filter((competition) => competition.mio);
  const deOtros = competitions.filter((competition) => !competition.mio);
  const enMarchaDeOtros = deOtros.filter(
    (competition) => competition.status === COMPETITION_STATUS.ACTIVE,
  ).length;

  const estadoDe = (competition: { status: string; sinEmpezar: boolean }): EstadoDeEdicion =>
    competition.status !== COMPETITION_STATUS.ACTIVE
      ? "archivada"
      : competition.sinEmpezar
        ? "sin-empezar"
        : "en-curso";

  const tarjeta = (competition: (typeof competitions)[number]) => (
    <CartuchoPequeno
      key={competition.id}
      nombre={competition.name}
      puesto={competition.id === active?.id}
      estado={estadoDe(competition)}
      detalle={[
        competition.sinEmpezar ? "Sin empezar" : formatDate(competition.startedAt),
        competition.endedAt ? `→ ${formatDate(competition.endedAt)}` : null,
        `· ${competition._count.participants} jugadores`,
        // De quién es, en los de los demás: es lo primero que se busca
        !competition.mio && competition.deQuien ? `· de ${competition.deQuien}` : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
            {/* Para montarlo con tiempo: mientras no empieza no corren
                los días, y al empezar cuentan desde ese día */}
            {competition.status === COMPETITION_STATUS.ACTIVE ? (
              <form action={cambiarArranqueAction}>
                <input type="hidden" name="competitionId" value={competition.id} />
                <input
                  type="hidden"
                  name="sinEmpezar"
                  value={competition.sinEmpezar ? "no" : "si"}
                />
                <ConfirmSubmit
                  message={
                    competition.sinEmpezar
                      ? `¿Empezar "${competition.name}" hoy? Los días del locke cuentan desde hoy.`
                      : `¿Marcar "${competition.name}" como sin empezar? Los días dejan de contar, y al empezarlo contarán desde ese día.`
                  }
                  className={competition.sinEmpezar ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
                >
                  {competition.sinEmpezar ? "Empezar el locke" : "Aún no ha empezado"}
                </ConfirmSubmit>
              </form>
            ) : null}
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
            {/* Borrar, solo quien lo creó o el Creador (ver deleteCompetitionAction) */}
            {admin || (competition.createdById === user.id && !user.verComo) ? (
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
            ) : null}
          </>
        ) : null}
    </CartuchoPequeno>
  );

  const takenUserIds = new Set(participants.map((p) => p.userId));
  const availableUsers = users.filter((u) => !takenUserIds.has(u.id));
  // Para dar acceso de mirar sobran los que ya juegan y los que ya miran
  const mirandoYa = new Set(espectadores.map((e) => e.userId));
  const puedenMirar = availableUsers.filter((u) => !mirandoYa.has(u.id));

  const totalDeBajas = participants.reduce((suma, participant) => suma + participant._count.deaths, 0);
  const secciones: { valor: Seccion; rotulo: string; icono: string; cuenta?: number; aviso?: boolean }[] = [
    ...(active ? [{ valor: "jugadores" as const, rotulo: "Jugadores", icono: "🤼", cuenta: participants.length }] : []),
    ...(active && canManageActive ? [{ valor: "ajustes" as const, rotulo: "Ajustes", icono: "⚙️" }] : []),
    ...(competitions.length
      ? [{ valor: "ediciones" as const, rotulo: "Ediciones", icono: "🗂️", cuenta: competitions.length }]
      : []),
    {
      valor: "nueva",
      rotulo: organiza ? "Nueva" : "Pedir",
      icono: "🆕",
      // Lo que has pedido y aún no tiene respuesta: que se vea sin entrar
      aviso: misSolicitudes.some((solicitud) => solicitud.estado === "PENDIENTE"),
    },
  ];
  const activa = seccionActiva(secciones, pedida);

  return (
    <>
      <PageHeader
        title="Competiciones"
        subtitle="Cada edición va por su lado: al crear una nueva, la anterior se archiva con todo lo que tenía."
      />

      {active ? (
        <CartuchoDeLaEdicion
          nombre={active.name}
          detalle={
            [nombreDelJuego(active.gameId, active.game, active.juegoNoOficial), active.modality]
              .filter(Boolean)
              .join(" · ") || "Sin detalles"
          }
          descripcion={active.description}
          logo={logoActual}
          estado={estadoDe(active)}
          cifras={[
            `${participants.length}/${active.maxPlayers} jugadores`,
            `${totalDeBajas} ${totalDeBajas === 1 ? "baja" : "bajas"}`,
            ...(espectadores.length
              ? [`${espectadores.length} ${espectadores.length === 1 ? "espectador" : "espectadores"}`]
              : []),
          ]}
        />
      ) : null}

      <PestanasDeCompeticiones secciones={secciones} activa={activa} />

      {activa === "jugadores" && active ? (
        <>
          <section className="card">
            <h2 className="section-title mb-4">
              Jugadores ({participants.length}/{active.maxPlayers})
            </h2>
            {versiones.length ? (
              <RepartoDeJuegos
                competitionId={active.id}
                versiones={versiones}
                jugadores={participants
                  .filter((participant) => !participant.retiredAt)
                  .map((participant) => ({
                    id: participant.id,
                    nombre: participant.displayName,
                    color: participant.color,
                    version: participant.gameVersion,
                  }))}
                puedeRepartir={canManageActive}
              />
            ) : null}
            {participants.length === 0 ? (
              <EmptyState title="Todavía no hay jugadores apuntados" />
            ) : (
              <ul className="grid gap-2 lg:grid-cols-2">
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
                        participantId={participant.id}
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
                            message={`¿Sacar a ${participant.displayName} de la competición? Se borran sus muertes, sus puntos y todos sus combates de jornada, también los puntos que les dieron a sus rivales. Si ya ha jugado y lo deja, mejor "Retirar": se queda en la historia y sus combates pendientes los gana el rival.`}
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
                        versiones={versiones}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}


            {canManageActive ? (
              <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                {participants.length < active.maxPlayers ? (
                  <>
                    <AddParticipantForm
                      competitionId={active.id}
                      users={availableUsers}
                      versiones={versiones}
                    />
                    {organiza && !availableUsers.length ? (
                      <p className="muted text-xs">
                        No te quedan cuentas tuyas libres: apunta a alguien por su
                        usuario o crea una cuenta aquí abajo.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="muted">
                    La competición ya tiene sus {active.maxPlayers} jugadores.
                  </p>
                )}


              </div>
            ) : null}
          </section>

          {canManageActive || espectadores.length ? (
            <div className="card mt-4">
              <h2 className="section-title mb-1">
                Espectadores ({espectadores.length})
              </h2>
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

        </>
      ) : null}

      {activa === "ajustes" && active && canManageActive ? (
        <div className="space-y-4">
          <EditCompetitionForm
            abierto
            competition={{
              id: active.id,
              name: active.name,
              game: active.game,
              gameId: active.gameId,
              juegoNoOficial: active.juegoNoOficial,
              tipos: active.tipos,
              modality: active.modality,
              description: active.description,
              startingPoints: active.startingPoints,
              jornadasPrevistas: active.jornadasPrevistas,
              logo: logoActual,
              estilo: leerEstilo(active.estilo),
              maxPlayers: active.maxPlayers,
              apuntados: participants.length,
              jornadasDanTitulo: active.jornadasDanTitulo,
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

          {/* Solo donde hay tabla: en solitario o en un Soul Link no hay clasificación que enseñar */}
          {(() => {
            const perfilActivo = perfilDeLocke(active.maxPlayers, active.estilo);
            return perfilActivo.enSolitario || perfilActivo.cooperativo ? null : (
              <EnlacePublico competitionId={active.id} clave={active.enlacePublico} />
            );
          })()}
        </div>
      ) : null}

      {activa === "ediciones" ? (
        <>
          {/* Sin ninguna edición el rótulo se quedaba solo, sin nada debajo */}
          {mios.length ? (
            <section className="mb-6">
              <h2 className="antetitulo mb-3">Tu estantería</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{mios.map(tarjeta)}</div>
            </section>
          ) : null}

          {/**
           * Los lockes de la gente, que el Creador ve todos para supervisar. Van
           * plegados y aparte para que no le llenen ni esto ni el selector; se
           * abren solos si el que está mirando es uno de ellos.
           */}
          {deOtros.length ? (
            <details className="group mb-6" open={Boolean(active && deOtros.some((c) => c.id === active.id))}>
              <summary className="rotulo mb-3 flex cursor-pointer list-none items-center gap-2 marker:hidden">
                <span className="inline-block transition group-open:rotate-90">▸</span>
                Lockes de los demás ({deOtros.length}
                {enMarchaDeOtros ? ` · ${enMarchaDeOtros} en marcha` : ""})
              </summary>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{deOtros.map(tarjeta)}</div>
            </details>
          ) : null}

        </>
      ) : null}

      {activa === "nueva" ? (
        <>
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
                archivables={archivables}
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
      ) : null}
    </>
  );
}
