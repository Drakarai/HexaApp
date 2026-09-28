import Link from "next/link";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  soloLectura,
} from "@/lib/competition";
import { prisma } from "@/lib/db";
import { urlsDeCarteles, urlsDeImagen } from "@/lib/imagenes";
import { MatchTeams } from "@/components/match-team";
import { CartelDelFinal } from "./cartel-form";
import {
  getFinalFourState,
  MINIMO_DE_JUGADORES,
  NOMBRE_POR_DEFECTO,
} from "@/lib/final-four";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { cx } from "@/lib/utils";
import { resetBracketAction } from "@/app/actions/final-four";
import { BracketCard } from "./bracket";
import { GenerateBracketForm } from "./generate-form";
import { Icono } from "@/components/icono";
import { getCampeonDelLocke } from "@/lib/campeon";
import { getMarcador } from "@/lib/marcador";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";

export const metadata = { title: "Final Four" };

export default async function FinalFourPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const [canManage, state, carteles, yo] = await Promise.all([
    canManageCompetition(competition.id, user),
    getFinalFourState(competition.id),
    // Las direcciones del cartel, no las imágenes: ver lib/imagen-url.ts
    urlsDeCarteles([competition.id]),
    getMyParticipant(competition.id, user.id),
  ]);

  /**
   * En el dualocke la final **no decide el locke**: lo decide la mayoría de
   * jornadas, y esto solo desempata (ver lib/campeon.ts). Se dice arriba para
   * que nadie crea que lo que se juega aquí cambia el campeón.
   */
  const porJornadas = perfilDeLocke(competition.maxPlayers).victoria === "jornadas";
  const [ganador, marcador] = porJornadas
    ? await Promise.all([getCampeonDelLocke(competition.id, state), getMarcador(competition.id)])
    : [null, null];
  const porMayoria = ganador?.como === "jornadas" ? ganador : null;

  /**
   * Los equipos de la final, si ya hay cuadro. Uno por jugador: se piden todos
   * de una vez y se reparten aquí, que es una consulta en vez de cuatro.
   */
  const equipos =
    "finalFourId" in state
      ? await prisma.matchPokemon.findMany({
          where: { finalFourId: state.finalFourId },
          orderBy: { position: "asc" },
        })
      : [];
  // Direcciones de los sprites, no las imágenes: ver lib/imagen-url.ts
  const sprites = await urlsDeImagen(
    "equipo",
    equipos.map((pokemon) => pokemon.id),
  );
  const equipoDe = (participantId: string) =>
    equipos
      .filter((pokemon) => pokemon.participantId === participantId)
      .map((pokemon) => ({
        id: pokemon.id,
        species: pokemon.species,
        nickname: pokemon.nickname,
        boxImage: sprites(pokemon.id),
      }));

  /**
   * El nombre y la explicación salen del formato, que depende de cuántos
   * sigan jugando: "Final Four" de cuatro para arriba y "Jornada Final" de
   * tres para abajo. Ver lib/formatos-finales.ts.
   */
  const formato = "formato" in state ? state.formato : null;
  // Sin formato no hay cuadro que nombrar: "Final Four" con uno solo sonaba raro
  const sinCuadro = state.status === "POCA_GENTE" || state.status === "POR_ABANDONO";
  const nombre = formato?.nombre ?? (sinCuadro ? "La final" : NOMBRE_POR_DEFECTO);

  return (
    <>
      <PageHeader
        title={nombre}
        subtitle={
          // En el dual la final no reparte el locke: desempata (ver arriba)
          (porJornadas && formato
            ? "El desempate del dualocke: cara a cara al mejor de tres, y el tercero solo si hace falta."
            : null) ??
          formato?.explicacion ??
          (state.status === "POR_ABANDONO"
            ? "Esta vez no hubo final: el locke lo gana quien aguanta."
            : "El final del locke. Se decide entre los que mejor hayan quedado.")
        }
      />

      {porJornadas && state.status !== "POR_ABANDONO" ? (
        <p
          className={cx(
            "mb-6 rounded-xl border px-4 py-3 text-sm",
            porMayoria || marcador?.empate
              ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
              : "border-white/10 bg-white/[0.03] text-slate-300",
          )}
        >
          {porMayoria ? (
            <>
              <Icono emoji="🏆" /> <strong>{porMayoria.champion.displayName}</strong> ganó
              el locke por {porMayoria.jornadas?.ganadas}-{porMayoria.jornadas?.perdidas} en
              jornadas. La {nombre} se juega igual, por el honor, pero no cambia el
              campeón.
            </>
          ) : marcador?.empate ? (
            <>
              Empate en jornadas: <strong>esta {nombre} decide el locke</strong>.
            </>
          ) : (
            <>
              En el dualocke gana quien se lleve la mayoría de las jornadas. La{" "}
              {nombre} solo decide si acabáis empatados; si no, se juega igual,
              por el honor.
            </>
          )}
        </p>
      ) : null}

      {state.status === "POCA_GENTE" ? (
        <EmptyState
          title="No hay final que jugar"
          hint={`Queda${state.activos === 1 ? "" : "n"} ${state.activos} jugador${state.activos === 1 ? "" : "es"} en el locke: hacen falta al menos ${MINIMO_DE_JUGADORES}.`}
        />
      ) : null}

      {state.status === "POR_ABANDONO" ? (
        <section className="card text-center">
          <div className="flex justify-center">
            <Avatar
              name={state.champion.displayName}
              color={state.champion.color}
              image={state.champion.avatarImage}
              size={64}
              participantId={state.champion.participantId}
            />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-white">
            {state.champion.displayName} gana el locke
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Es el único que sigue en pie: los demás se retiraron o perdieron el
            locke, así que no hay final que jugar. El hall de la fama ya está
            abierto.
          </p>
          <Link href="/hall-de-la-fama" className="btn-ghost mt-5">
            Ir al hall de la fama
          </Link>
        </section>
      ) : null}

      {state.status === "SIN_JORNADAS" ? (
        <EmptyState
          title="Todavía no hay jornadas"
          hint={`La ${nombre} se desbloquea cuando estén jugados todos los combates de todas las jornadas.`}
        />
      ) : null}

      {state.status === "BLOQUEADA" ? (
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            <Icono emoji="🔒" />
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            Aún no toca
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            {state.total > state.jugados ? (
              <>
                Quedan <strong className="text-white">{state.total - state.jugados}</strong>{" "}
                combates de jornada por resolver.{" "}
              </>
            ) : null}
            {state.faltanPorCrear ? (
              <>
                Falta{state.faltanPorCrear === 1 ? "" : "n"} por crear{" "}
                <strong className="text-white">{state.faltanPorCrear}</strong> de las
                jornadas previstas
                {canManage ? " (si al final se juegan menos, bájalas en Ediciones)" : ""}.{" "}
              </>
            ) : null}
            Hasta que no esté todo no se sabe cómo queda la tabla, así que el
            cuadro sigue cerrado.
          </p>

          <div className="mx-auto mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${(state.jugados / state.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {state.jugados} de {state.total} combates jugados
          </p>

          <Link href="/jornadas" className="btn-ghost mt-5">
            Ir a jornadas
          </Link>
        </section>
      ) : null}

      {state.status === "SIN_CUADRO" ? (
        <GenerateBracketForm
          competitionId={competition.id}
          canManage={canManage}
          nombre={state.formato.nombre}
          esperan={state.formato.esperan}
          standings={state.standings
            .filter((row) => !row.retirado)
            .slice(0, state.formato.jugadores)
            .map((row) => ({
              participantId: row.participantId,
              displayName: row.displayName,
              points: row.points,
              deaths: row.deaths,
            }))}
        />
      ) : null}

      {state.status === "EN_JUEGO" || state.status === "TERMINADA" ? (
        <>
          {state.champion ? (
            <section className="card mb-6 text-center">
              <p className="text-5xl" aria-hidden>
                <Icono emoji="🏆" />
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand-400">
                {porMayoria ? `Ganó la ${nombre}` : `Campeón del ${competition.name}`}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <Avatar
                  name={state.champion.displayName}
                  color={state.champion.color}
                  image={state.champion.avatarImage}
                  size={48}
                />
                <p className="text-3xl font-black text-white">
                  {state.champion.displayName}
                </p>
              </div>
              {porMayoria ? (
                <p className="mt-2 text-sm text-slate-400">
                  El locke es de {porMayoria.champion.displayName}, que lo ganó en jornadas.
                </p>
              ) : state.runnerUp ? (
                <p className="mt-2 text-sm text-slate-400">
                  Subcampeón: {state.runnerUp.displayName}
                </p>
              ) : null}
              <Link href="/hall-de-la-fama" className="btn-primary mt-5">
                <Icono emoji="🏅" /> Ir al hall de la fama
              </Link>
            </section>
          ) : null}

          <div
            className={cx(
              "grid gap-4",
              state.formato.rondas.length === 3
                ? "lg:grid-cols-3"
                : state.formato.rondas.length === 2
                  ? "lg:grid-cols-2"
                  : "lg:grid-cols-1",
            )}
          >
            {state.formato.rondas.map((round) => (
              <section key={round}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">
                  {round}
                </h2>
                <div className="space-y-3">
                  {state.llaves
                    .filter((llave) => llave.round === round)
                    .map((llave) => (
                      <BracketCard
                        key={llave.key}
                        llave={llave}
                        competitionId={competition.id}
                        canManage={canManage}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>

          {/**
           * Los equipos del cuadro. **Uno por jugador y para toda la final**:
           * en la Final Four cada uno se presenta con un equipo y con ese juega
           * hasta que cae, así que no hay que apuntarlo combate a combate. De
           * aquí se lo lleva luego el hall de la fama de una pieza.
           */}
          <section className="mt-8">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-400">
              Los equipos
            </h2>
            <p className="muted mb-3">
              Con el que juega cada uno toda la final. Lo apunta su dueño, o la
              organización, y al acabar se puede traer al hall de la fama.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {state.seeds.map((jugador) => (
                <div key={jugador.participantId} className="card">
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-xs text-slate-500">
                      {jugador.seed}º
                    </span>
                    <Avatar
                      name={jugador.displayName}
                      color={jugador.color}
                      image={jugador.avatarImage}
                      size={24}
                    />
                    <span className="min-w-0 truncate text-sm font-semibold text-white">
                      {jugador.displayName}
                    </span>
                  </div>
                  <MatchTeams
                    matchId={state.finalFourId}
                    finalFourId={state.finalFourId}
                    rotulo={`El equipo de ${jugador.displayName} para ${nombre}`}
                    canManage={
                      canManage ||
                      // Su equipo del cuadro, salvo que la edición esté archivada
                      (jugador.participantId === yo?.id &&
                        !soloLectura(competition, canManage))
                    }
                    sides={[
                      {
                        participantId: jugador.participantId,
                        displayName: jugador.displayName,
                        color: jugador.color,
                        avatarImage: jugador.avatarImage,
                        team: equipoDe(jugador.participantId),
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          </section>

          {canManage ? (
            <form action={resetBracketAction} className="mt-6">
              <input type="hidden" name="competitionId" value={competition.id} />
              <ConfirmSubmit message="¿Borrar el cuadro entero y volver a sembrarlo con la clasificación y los jugadores de ahora?">
                Rehacer el cuadro
              </ConfirmSubmit>
            </form>
          ) : null}
        </>
      ) : null}

      {/* Va al final y fuera del `if` del cuadro: se puede poner desde el
          primer día, aunque la final esté todavía bloqueada */}
      {canManage ? (
        <CartelDelFinal
          competitionId={competition.id}
          nombre={nombre}
          imagenes={carteles(competition.id)}
        />
      ) : null}
    </>
  );
}
