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
import { getFormatoFinal } from "@/lib/final-four";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, EmptyState } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import { CarouselBackdrop } from "@/components/image-carousel";
import { COMPETITION_STATUS } from "@/lib/constants";
import { getActivity } from "@/lib/activity";
import { urlsDeMedallas } from "@/lib/imagenes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { copiarSiTocaDeFondo } from "@/lib/copia-automatica";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getMarcador } from "@/lib/marcador";
import { MarcadorDual } from "@/components/marcador-dual";
import { getCastigosPendientes } from "@/lib/premios";
import { Castigos } from "@/components/castigos";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { ResumenEnSolitario } from "@/components/resumen-solitario";

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

  const [standings, levelCaps, activity, recentSpins, nextMatchday, myParticipant, formatoFinal, marcador, castigos, canManage, progreso] =
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
      porJornadas ? getMarcador(competition.id) : null,
      // Los castigos de los retos perdidos, que son cosa de todos
      getCastigosPendientes(competition.id),
      canManageCompetition(competition.id, user),
      // En solitario la portada enseña el progreso de la run, no una tabla
      perfil.enSolitario ? getProgresoEnSolitario(competition.id) : null,
    ]);

  /** Quién va primero, dicho como toque: por puntos o por jornadas ganadas */
  const lider = marcador ? marcador.jugadores[0] : standings[0];
  const pieDelLider = marcador
    ? `${marcador.jugadores[0]?.ganadas ?? 0} jornadas ganadas`
    : standings[0]
    ? `${standings[0].points} puntos`
    : "Sin clasificación";

  const totalPlayers = standings.length;
  /** Los que siguen: un retirado ni avanza gimnasios ni tiene que esperar */
  const activos = standings.filter((row) => !row.retirado).length;
  const retirados = totalPlayers - activos;
  const totalDeaths = standings.reduce((sum, row) => sum + row.deaths, 0);
  // Siguiente hito: el primero que no ha superado todo el mundo
  const currentCap =
    levelCaps.find((cap) => cap._count.clears < Math.max(1, activos)) ??
    levelCaps[levelCaps.length - 1];

  // Direcciones de las medallas del level cap actual: ver lib/imagen-url.ts
  const medallasDelCap = currentCap
    ? (await urlsDeMedallas([currentCap.id]))(currentCap.id)
    : [];

  return (
    <>
      <PageHeader
        title={competition.name}
        subtitle={
          [competition.game, competition.modality].filter(Boolean).join(" · ") ||
          undefined
        }
        actions={
          competition.status === COMPETITION_STATUS.ARCHIVED ? (
            <span className="chip">🗄️ Archivada</span>
          ) : (
            <span className="chip">🟢 En curso</span>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Level cap actual"
          value={currentCap ? String(currentCap.cap) : "—"}
          hint={currentCap?.label ?? "Sin level caps configurados"}
          href="/level-caps"
          images={medallasDelCap}
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
              : retirados
              ? `${retirados} retirado${retirados === 1 ? "" : "s"} · empiezan con ${competition.startingPoints} puntos`
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
                : "No queda ninguno"
            }
            href="/level-caps"
          />
        ) : (
          <StatCard
            label="Líder"
            value={lider?.displayName ?? "—"}
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
          <h2 className="section-title mb-4">Próxima jornada</h2>
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
          ) : (
            <EmptyState
              title="No hay combates pendientes"
              hint="Crea una jornada nueva desde la sección Jornadas."
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
              Girar →
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
        className="absolute -bottom-3 -right-3 -z-10 h-20 w-20 opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"
      />
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p> : null}
    </Link>
  );
}
