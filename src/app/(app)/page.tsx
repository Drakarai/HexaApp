import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  getStandings,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { StandingsTable } from "@/components/standings-table";
import {
  getFinalFourState,
  getFormatoFinal,
  NOMBRE_POR_DEFECTO,
} from "@/lib/final-four";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, EmptyState } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import { CarouselBackdrop } from "@/components/image-carousel";
import { COMPETITION_STATUS } from "@/lib/constants";
import { getActivity } from "@/lib/activity";
import { urlsDeCarteles, urlsDeImagen, urlsDeMedallas } from "@/lib/imagenes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { copiarSiTocaDeFondo } from "@/lib/copia-automatica";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getMarcador } from "@/lib/marcador";
import { MarcadorDual } from "@/components/marcador-dual";
import { getCastigosPendientes } from "@/lib/premios";
import { Castigos } from "@/components/castigos";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { ResumenEnSolitario } from "@/components/resumen-solitario";
import {
  getGraficoClasificacion,
  movimientosEnLaTabla,
} from "@/lib/grafico-clasificacion";
import { MOTIVOS_DE_SALIDA } from "@/lib/wipeos";
import { Icono } from "@/components/icono";

export default async function DashboardPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();

  // La copia del día, si toca. Va después de mandar la página: nadie espera.
  copiarSiTocaDeFondo();

  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  /**
   * En un locke de dos, la portada no enseña una clasificación sino el
   * marcador: quién va ganando más jornadas y cuántas le faltan.
   */
  const perfil = perfilDeLocke(competition.maxPlayers);
  const porJornadas = perfil.victoria === "jornadas";

  const [standings, levelCaps, activity, recentSpins, nextMatchday, myParticipant, formatoFinal, estadoFinal, marcador, castigos, canManage, progreso, grafico] =
    await Promise.all([
      getStandings(competition.id),
      prisma.levelCap.findMany({
        where: { competitionId: competition.id },
        orderBy: { position: "asc" },
        include: { _count: { select: { clears: true } } },
      }),
      getActivity(competition.id, 7),
      prisma.rouletteSpin.findMany({
        where: { roulette: { competitionId: competition.id } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { roulette: { select: { name: true } } },
      }),
      prisma.matchday.findFirst({
        where: { competitionId: competition.id, matches: { some: { winnerId: null } } },
        orderBy: { position: "asc" },
        include: {
          matches: {
            orderBy: { position: "asc" },
            include: { participantA: true, participantB: true },
          },
        },
      }),
      // El mismo que ya ha pedido el layout: `getMyParticipant` va con
      // `cache()`, así que esto no es otro viaje a la base de datos
      getMyParticipant(competition.id, user.id),
      // Cuántos llevan medalla de clasificado depende del formato de la final
      getFormatoFinal(competition.id),
      /**
       * Cómo va el final. Se pide siempre, aunque casi nunca haga falta: va en
       * la misma tanda que todo lo demás —o sea, no cuesta una ida y vuelta
       * más— y sin él no se puede saber si la tarjeta del hito tiene que dejar
       * de enseñar el último level cap. Por dentro reaprovecha `getStandings`,
       * que esta página ya ha pedido.
       */
      getFinalFourState(competition.id),
      porJornadas ? getMarcador(competition.id) : null,
      // Los castigos de los retos perdidos, que son cosa de todos
      getCastigosPendientes(competition.id),
      canManageCompetition(competition.id, user),
      // En solitario la portada enseña el progreso de la run, no una tabla
      perfil.enSolitario ? getProgresoEnSolitario(competition.id) : null,
      /**
       * Para las flechas de la tabla: cómo iba cada uno la jornada anterior.
       * Va en la misma tanda que el resto, así que no se espera más por ella.
       * Sin tabla —dualocke o solitario— no hace falta.
       */
      porJornadas || perfil.enSolitario
        ? null
        : getGraficoClasificacion(competition.id),
    ]);

  /**
   * Quién va primero, dicho como toque: por puntos o por jornadas ganadas.
   *
   * Con empate arriba no hay líder: antes salía el primero de la lista, que
   * con todo a cero es el primero por orden alfabético —un dualocke recién
   * empezado ya tenía "líder" con 0-0—. En la tabla cuenta como empate lo que
   * no deshacen los desempates: puntos, caídos y diferencia.
   */
  const empatadosArriba = marcador
    ? marcador.jugadores.filter(
        (jugador) => jugador.ganadas === marcador.jugadores[0]?.ganadas,
      ).length
    : standings.filter(
        (row) =>
          !row.retirado &&
          row.points === standings[0]?.points &&
          row.deaths === standings[0]?.deaths &&
          row.pokemonDiff === standings[0]?.pokemonDiff,
      ).length;
  const lider =
    empatadosArriba > 1 ? null : marcador ? marcador.jugadores[0] : standings[0];
  const pieDelLider = marcador
    ? empatadosArriba > 1
      ? `${marcador.jugadores[0]?.ganadas ?? 0} jornadas cada uno`
      : `${marcador.jugadores[0]?.ganadas ?? 0} jornadas ganadas`
    : standings[0]
    ? empatadosArriba > 1
      ? `${empatadosArriba} empatados a ${standings[0].points} puntos`
      : `${standings[0].points} puntos`
    : "Sin clasificación";

  const totalPlayers = standings.length;
  /** Los que siguen: un retirado ni avanza gimnasios ni tiene que esperar */
  const activos = standings.filter((row) => !row.retirado).length;
  /**
   * Los que están fuera, contados por su motivo: la aplicación distingue en
   * todas partes entre retirarse y perder el locke, y aquí los metía a todos
   * en "retirados".
   */
  const fuera = standings.filter((row) => row.retirado);
  const perdidos = fuera.filter(
    (row) => row.motivoDeSalida === MOTIVOS_DE_SALIDA.WIPEO,
  ).length;
  const retirados = fuera.length - perdidos;
  const quienesFaltan = [
    retirados ? `${retirados} retirado${retirados === 1 ? "" : "s"}` : null,
    perdidos ? `${perdidos} ${perdidos === 1 ? "lo perdió" : "lo perdieron"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const totalDeaths = standings.reduce((sum, row) => sum + row.deaths, 0);
  // Siguiente hito: el primero que no ha superado todo el mundo
  const capPendiente =
    levelCaps.find((cap) => cap._count.clears < Math.max(1, activos)) ?? null;
  /**
   * Cuando ya no queda ningún level cap por superar, **la tarjeta cambia de
   * tema**: deja de enseñar el último hito, que se quedaba ahí congelado
   * diciendo lo mismo para siempre, y pasa a ser la del final del locke.
   */
  const tocaElFinal =
    levelCaps.length > 0 &&
    !capPendiente &&
    /**
     * …y que haya un final al que mirar. En un locke en solitario no lo hay, y
     * sin jornadas jugadas tampoco: ahí se queda el último hito, que es lo
     * único que se puede contar.
     */
    !perfil.enSolitario &&
    estadoFinal.status !== "POCA_GENTE" &&
    estadoFinal.status !== "SIN_JORNADAS";
  const currentCap = capPendiente ?? levelCaps[levelCaps.length - 1];

  // Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts
  const [medallas, carteles, logos] = await Promise.all([
    urlsDeMedallas(currentCap ? [currentCap.id] : []),
    tocaElFinal ? urlsDeCarteles([competition.id]) : null,
    // El logo de la edición, de fondo junto al nombre
    urlsDeImagen("logo", [competition.id]),
  ]);
  const medallasDelCap = currentCap ? medallas(currentCap.id) : [];

  /**
   * Lo que le toca a **quien mira**: su rival de la llave que tenga por jugar.
   * Es lo que hacía la medalla —decirte qué tienes delante— ahora que los
   * gimnasios se han acabado.
   */
  const miLlave =
    tocaElFinal && myParticipant && estadoFinal.status === "EN_JUEGO"
      ? (estadoFinal.llaves.find(
          (llave) =>
            !llave.winnerId &&
            (llave.a?.participantId === myParticipant.id ||
              llave.b?.participantId === myParticipant.id),
        ) ?? null)
      : null;
  const miRival = miLlave
    ? miLlave.a?.participantId === myParticipant?.id
      ? miLlave.b
      : miLlave.a
    : null;
  const campeon =
    estadoFinal.status === "TERMINADA" ? estadoFinal.champion : null;
  /**
   * Con campeón, el locke se ha acabado aunque nadie lo haya archivado todavía,
   * y la portada lo tiene que decir: antes seguía poniendo "En curso" y pidiendo
   * que se creara otra jornada.
   */
  const terminado =
    Boolean(campeon) && competition.status !== COMPETITION_STATUS.ARCHIVED;

  /** La tarjeta de la izquierda: el hito que toca, o el final si ya no hay */
  const tarjetaDelHito = tocaElFinal
    ? {
        label: formatoFinal?.nombre ?? NOMBRE_POR_DEFECTO,
        value: campeon
          ? campeon.displayName
          : miRival
          ? miRival.displayName
          : miLlave
          ? "Por saber"
          : estadoFinal.status === "SIN_CUADRO"
          ? "Sin cuadro"
          : estadoFinal.status === "BLOQUEADA"
          ? `${estadoFinal.jugados}/${estadoFinal.total}`
          : "En juego",
        hint: campeon
          ? "Campeón del locke"
          : miRival
          ? `Tu rival · ${miLlave!.title}`
          : miLlave
          ? `${miLlave.aPending ?? miLlave.bPending ?? "Se sabrá pronto"} · ${miLlave.title}`
          : estadoFinal.status === "SIN_CUADRO"
          ? "Falta sembrarlo"
          : estadoFinal.status === "BLOQUEADA"
          ? "combates de jornada jugados"
          : "Los gimnasios ya están todos",
        /**
         * La foto del rival manda sobre el cartel: es lo que hay que mirar. Sin
         * rival —o acabado el locke— se enseña el cartel, y el campeón el suyo.
         */
        images: campeon?.avatarImage
          ? [campeon.avatarImage]
          : miRival?.avatarImage
          ? [miRival.avatarImage]
          : (carteles?.(competition.id) ?? []),
        href: "/final-four",
      }
    : {
        label: "Level cap actual",
        value: currentCap ? String(currentCap.cap) : "—",
        hint: currentCap?.label ?? "Sin level caps configurados",
        images: medallasDelCap,
        href: "/level-caps",
      };

  return (
    <>
      <PageHeader
        title={competition.name}
        fondo={logos(competition.id)}
        subtitle={
          [competition.game, competition.modality].filter(Boolean).join(" · ") ||
          undefined
        }
        actions={
          competition.status === COMPETITION_STATUS.ARCHIVED ? (
            <span className="chip"><Icono emoji="🗄️" /> Archivada</span>
          ) : terminado ? (
            <span className="chip"><Icono emoji="🏆" /> Terminado</span>
          ) : (
            <span className="chip"><Icono emoji="🟢" /> En curso</span>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={tarjetaDelHito.label}
          value={tarjetaDelHito.value}
          hint={tarjetaDelHito.hint}
          href={tarjetaDelHito.href}
          images={tarjetaDelHito.images}
        />
        <StatCard
          label={perfil.enSolitario ? "Jugando" : "Jugadores"}
          value={
            perfil.enSolitario
              ? (progreso?.displayName ?? "—")
              : `${activos}/${competition.maxPlayers}`
          }
          hint={
            perfil.enSolitario
              ? perfil.nombre
              : quienesFaltan
              ? // Con gente fuera, eso es lo que importa: los puntos de salida
                // ya no le dicen nada a nadie y no cabían en la tarjeta
                quienesFaltan
              : `Empiezan con ${competition.startingPoints} puntos`
          }
          href="/competiciones"
        />
        <StatCard
          label="Pokémon caídos"
          value={String(totalDeaths)}
          hint={perfil.enSolitario ? "En tu partida" : "En toda la competición"}
          href="/muertes"
        />
        {progreso ? (
          <StatCard
            label="Hitos"
            value={`${progreso.hitos.hechos}/${progreso.hitos.total}`}
            hint={
              progreso.siguiente
                ? `Te toca ${progreso.siguiente.label}`
                : progreso.hitos.total
                ? "No queda ninguno"
                : "Sin level caps todavía"
            }
            href="/level-caps"
          />
        ) : (
          <StatCard
            label="Líder"
            value={lider?.displayName ?? (empatadosArriba > 1 ? "Empate" : "—")}
            hint={pieDelLider}
            href="/puntos"
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={progreso ? "card lg:col-span-3" : "card lg:col-span-2"}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">
              {progreso ? "Tu partida" : marcador ? "Marcador" : "Clasificación"}
            </h2>
            {progreso ? null : (
              <Link href="/puntos" className="text-xs text-brand-400 hover:underline">
                Ver detalle →
              </Link>
            )}
          </div>
          {progreso ? (
            <ResumenEnSolitario progreso={progreso} />
          ) : marcador ? (
            <MarcadorDual marcador={marcador} compacto />
          ) : (
            <>
              <StandingsTable
                qualifiedSlots={formatoFinal?.esperan ?? 2}
                rows={standings}
                highlightUserId={user.id}
                movimientos={movimientosEnLaTabla(grafico, standings)}
                editableParticipantIds={
                  myParticipant ? [myParticipant.id] : []
                }
              />
              <p className="mt-3 text-xs text-slate-500">
                Desempates: puntos → menos pokémon muertos → diferencia de
                pokémon en jornadas.
              </p>
            </>
          )}
        </section>

        {/* En solitario no hay jornadas: el hueco sobra.
            El `self-start` es para que no se estire hasta lo que mida la
            clasificación: con seis jugadores y dos combates, la tarjeta
            quedaba con media pantalla de vacío debajo. */}
        <section className={progreso ? "hidden" : "card self-start"}>
          <h2 className="section-title mb-4">
            {nextMatchday
              ? "Próxima jornada"
              : campeon
              ? "Se acabó"
              : estadoFinal.status === "EN_JUEGO"
              ? (formatoFinal?.nombre ?? NOMBRE_POR_DEFECTO)
              : "Próxima jornada"}
          </h2>
          {nextMatchday ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-white">{nextMatchday.label}</p>
                {nextMatchday.milestone ? (
                  <p className="text-xs text-slate-500">{nextMatchday.milestone}</p>
                ) : null}
              </div>
              <ul className="space-y-2">
                {nextMatchday.matches.map((match) => (
                  <li
                    key={match.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="truncate">{match.participantA.displayName}</span>
                    <span className="text-xs text-slate-500">vs</span>
                    <span className="truncate text-right">
                      {match.participantB.displayName}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/jornadas"
                className="btn-ghost btn-sm w-full justify-center"
              >
                Ir a jornadas
              </Link>
            </div>
          ) : campeon ? (
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <Avatar
                  name={campeon.displayName}
                  color={campeon.color}
                  image={campeon.avatarImage}
                  size={56}
                  participantId={campeon.participantId}
                />
              </div>
              <p className="text-sm text-slate-300">
                <Icono emoji="🏆" /> <strong className="text-white">{campeon.displayName}</strong>{" "}
                ha ganado el locke.
              </p>
              <Link
                href="/hall-de-la-fama"
                className="btn-ghost btn-sm w-full justify-center"
              >
                Ir al hall de la fama
              </Link>
            </div>
          ) : estadoFinal.status === "EN_JUEGO" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Las jornadas están jugadas: lo que queda se decide en el cuadro.
              </p>
              <Link
                href="/final-four"
                className="btn-ghost btn-sm w-full justify-center"
              >
                Ir al cuadro
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No hay combates pendientes"
              hint={
                // Crear jornadas solo puede quien administra: al resto se le
                // decía que lo hiciera él
                canManage
                  ? "Crea una jornada nueva desde la sección Jornadas."
                  : "Cuando haya otra jornada, saldrá aquí."
              }
            />
          )}
        </section>

        <section className={progreso ? "card lg:col-span-3" : "card lg:col-span-2"}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Actividad reciente</h2>
            <Link
              href="/actividad"
              className="text-xs text-brand-400 hover:underline"
            >
              Ver todo →
            </Link>
          </div>
          <ActivityFeed entries={activity} compact />
        </section>

        <section className={progreso ? "hidden" : "card self-start"}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Ruleta</h2>
            <Link href="/ruleta" className="text-xs text-brand-400 hover:underline">
              {/* Un espectador no gira: para él es solo ir a mirar */}
              {myParticipant || canManage ? "Girar →" : "Ver →"}
            </Link>
          </div>
          {recentSpins.length ? (
            <ul className="space-y-2">
              {recentSpins.map((spin) => (
                <li key={spin.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="text-sm font-medium text-white">
                    {spin.optionLabel}
                  </p>
                  <p className="text-xs text-slate-500">
                    {spin.roulette.name} · {formatDateTime(spin.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin giros todavía" />
          )}
        </section>
      </div>

      <Castigos castigos={castigos} canManage={canManage} />

      {myParticipant ? (
        <p className="mt-6 text-xs text-slate-500">
          Juegas como <strong className="text-slate-300">{myParticipant.displayName}</strong>
          {myParticipant.gameVersion ? ` · ${myParticipant.gameVersion}` : ""} ·
          desde {formatDate(competition.startedAt)}
        </p>
      ) : (
        <p className="mt-6 text-xs text-slate-500">
          Estás viendo esta competición como espectador: no eres uno de sus
          jugadores.
        </p>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
  images = [],
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  /** Ilustraciones opcionales que se asoman al fondo, alternándose */
  images?: string[];
}) {
  return (
    <Link
      href={href}
      className="card-tight relative isolate overflow-hidden transition hover:border-brand-500/40 hover:bg-ink-850"
    >
      <CarouselBackdrop
        images={images}
        /* 35 y no 25: con las fotos de perfil oscuras no se veía casi nada */
        className="absolute -bottom-3 -right-3 -z-10 h-20 w-20 opacity-35 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"
      />
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-white tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p> : null}
    </Link>
  );
}
