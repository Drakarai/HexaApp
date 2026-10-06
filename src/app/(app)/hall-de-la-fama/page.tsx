import { createHash } from "node:crypto";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getStandings,
  soloLectura,
} from "@/lib/competition";
import { getFinalFourState, NOMBRE_POR_DEFECTO } from "@/lib/final-four";
import { getCampeonDelLocke } from "@/lib/campeon";
import { firmaDeColumna } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import { getResumenDelLocke } from "@/lib/resumen-del-locke";
import { getUltimoEquipo } from "@/lib/ultimo-equipo";
import { getLigaEnCooperativo } from "@/lib/soul-link";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { AddPokemonForm, TeamSlots } from "./team-editor";
import { Podio } from "./podio";
import { ResumenDelLocke } from "./resumen";
import { CompartirResumen } from "./compartir";
import { Icono } from "@/components/icono";
import { ordenDelHall } from "@/lib/hall";
import { findSpecies } from "@/lib/pokedex";
import { generacionDeTipos } from "@/lib/juegos";
import { GENERACION_POR_DEFECTO, tiposParaVer } from "@/lib/tipos";
import { pokemonDeLaImagen } from "@/lib/sprites-de-quinta";
import { BotonDeEntrada, EntradasPendientes, type EquipoDelHall } from "./entrada";

export const metadata = { title: "Hall de la fama" };

const TEAM_SIZE = 6;
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function HallOfFamePage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  /**
   * Lo que decide si el hall se abre, **todo a la vez**: el estado del final,
   * el progreso en solitario, la Liga en un Soul Link y el campeón (que sale
   * del mismo estado del final, con `cache()`). Antes iban uno detrás de otro.
   */
  const perfil = perfilDeLocke(competition.maxPlayers, competition.estilo);
  const estadoPedido = getFinalFourState(competition.id);
  const [state, progreso, liga, campeon] = await Promise.all([
    estadoPedido,
    perfil.enSolitario ? getProgresoEnSolitario(competition.id) : null,
    perfil.cooperativo ? getLigaEnCooperativo(competition.id) : null,
    perfil.sinJornadas ? null : getCampeonDelLocke(competition.id, estadoPedido),
  ]);
  // El final del locke no siempre se llama igual: ver lib/formatos-finales.ts
  const nombreFinal =
    ("formato" in state ? state.formato?.nombre : null) ?? NOMBRE_POR_DEFECTO;

  /**
   * En solitario no hay final que ganar, así que lo que cierra el locke es
   * **pasarse la Liga**. Sin esto el hall no se abriría nunca en una partida de
   * una persona, porque exige campeón de la Final Four.
   */
  const terminadoEnSolitario = Boolean(progreso?.ligaSuperada);
  // En un Soul Link, lo mismo pero entre todos: todos los que siguen (`liga`)

  if (liga && !liga.superada) {
    const faltan = liga.jugadores.filter((j) => !j.ligaPasada).map((j) => j.displayName);
    return (
      <>
        <PageHeader title="Hall de la fama" />
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            <Icono emoji="🏅" />
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            Todavía no os habéis pasado la Liga todos
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Un Soul Link se supera entre todos: cuando los que siguen marquen el
            último hito, aquí quedará el equipo con el que lo terminó cada uno.
            {faltan.length ? ` Falta: ${faltan.join(", ")}.` : ""}
          </p>
          <Link href="/level-caps" className="btn-ghost mt-5">
            Ver los level caps
          </Link>
        </section>
      </>
    );
  }

  if (perfil.enSolitario && !terminadoEnSolitario) {
    return (
      <>
        <PageHeader title="Hall de la fama" />
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            <Icono emoji="🏅" />
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            Todavía no te has pasado la Liga
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            En un locke en solitario el final es ese. Cuando marques el último
            hito, aquí quedará el equipo con el que lo terminaste.
          </p>
          <Link href="/level-caps" className="btn-ghost mt-5">
            Ver los level caps
          </Link>
        </section>
      </>
    );
  }

  if (!perfil.sinJornadas && !campeon) {
    return (
      <>
        <PageHeader title="Hall de la fama" />
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            <Icono emoji="🏅" />
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            El locke todavía no ha terminado
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            {perfil.victoria === "jornadas"
              ? "Cuando alguien se lleve la mayoría de las jornadas (o la Jornada Final, si acabáis empatados)"
              : `Cuando la ${nombreFinal} tenga campeón`}
            , aquí quedará el equipo con el que cada uno acabó el locke: sus
            seis pokémon, con sus motes.
          </p>
          <Link
            href={perfil.victoria === "jornadas" ? "/puntos" : "/final-four"}
            className="btn-ghost mt-5"
          >
            {perfil.victoria === "jornadas" ? "Ver el marcador" : `Ver la ${nombreFinal}`}
          </Link>
        </section>
      </>
    );
  }

  /**
   * El estado de la final ya estrechado. En solitario no hay final, así que es
   * null y el podio de campeón y subcampeón simplemente no se pinta: lo que
   * cierra el locke ahí es la Liga.
   */
  const elFinal = state.status === "TERMINADA" ? state : null;

  const [canManage, standings, entries, resumen, firmas] = await Promise.all([
    canManageCompetition(competition.id, user),
    getStandings(competition.id),
    prisma.hallOfFameEntry.findMany({
      where: { participant: { competitionId: competition.id } },
      orderBy: { position: "asc" },
    }),
    getResumenDelLocke(competition.id),
    // Las firmas de los sprites, por el locke: a la vez que las entradas
    prisma.$queryRaw<{ id: string; va: string | null; vb: string | null }[]>`
      select h."id",
             ${firmaDeColumna(`h."image"`)} as va,
             ${firmaDeColumna(`h."detailImage"`)} as vb
      from "HallOfFameEntry" h join "Participant" p on p."id" = h."participantId"
      where p."competitionId" = ${competition.id}
    `,
  ]);

  // Direcciones de los sprites, no los sprites: ver lib/imagen-url.ts
  const firmaDe = new Map(firmas.map((fila) => [fila.id, fila]));
  const sprites = (id: string) => urlDeImagen("salon", id, firmaDe.get(id)?.va);
  const fichas = (id: string) => urlDeImagen("salon-ficha", id, firmaDe.get(id)?.vb);

  /**
   * De qué jornada se le puede traer el equipo a cada uno. Solo se mira para
   * los que lo tienen vacío: para los demás el atajo no se ofrece, así que
   * preguntarlo sería una consulta tirada.
   */
  const sinEquipo = standings
    .map((row) => row.participantId)
    .filter((id) => !entries.some((entry) => entry.participantId === id));
  const ultimosEquipos = new Map(
    await Promise.all(
      sinEquipo.map(async (id) => {
        const equipo = await getUltimoEquipo(id, competition.id);
        return [id, equipo?.deDonde ?? null] as const;
      }),
    ),
  );

  // La forma exacta la dice la imagen, si es del almacén; si no, la especie
  const pokemonDeLaEntrada = (id: string, especie: string) =>
    pokemonDeLaImagen(sprites(id))?.pokemonId ?? findSpecies(especie, true)?.dex ?? null;
  const generacion = generacionDeTipos(competition) ?? GENERACION_POR_DEFECTO;

  const teamOf = (participantId: string) =>
    entries
      .filter((entry) => entry.participantId === participantId)
      .map((entry) => ({
        id: entry.id,
        species: entry.species,
        pokemonId: pokemonDeLaEntrada(entry.id, entry.species),
        tipos: tiposParaVer(pokemonDeLaEntrada(entry.id, entry.species), generacion),
        nickname: entry.nickname,
        image: sprites(entry.id),
        detailImage: fichas(entry.id),
      }));

  const { jugadores, podio } = ordenDelHall(standings, elFinal, campeon);

  // Cada equipo tal y como lo necesita su entrada al hall, en el orden del hall
  const equiposDelHall: EquipoDelHall[] = jugadores.map((row) => ({
    participantId: row.participantId,
    displayName: row.displayName,
    color: row.color,
    campeon: campeon?.champion.participantId === row.participantId,
    equipo: teamOf(row.participantId),
  }));

  /**
   * La huella de la imagen del resumen: **todo lo que sale en ella**. Antes era
   * un recuento (equipos, bajas, combates, wipeos), y cambiar algo que no
   * estuviera ahí —las fechas, al arreglar cuándo acaba un locke— dejaba al
   * navegador enseñando la foto vieja con la misma dirección.
   */
  const huellaDelResumen = createHash("sha1")
    .update(
      JSON.stringify({
        resumen,
        podio,
        equipos: entries.map((e) => [e.id, e.participantId, e.species, e.nickname]),
        edicion: [competition.name, competition.game, competition.updatedAt],
      }),
    )
    .digest("hex")
    .slice(0, 12);

  return (
    <>
      <PageHeader
        title="Hall de la fama"
        subtitle={
          perfil.enSolitario
            ? `Así terminó el ${competition.name}. El equipo con el que te pasaste la Liga, para el recuerdo.`
            : liga
            ? `Así terminó el ${competition.name}. El equipo con el que cada uno se pasó la Liga, para el recuerdo.`
            : `Así terminó el ${competition.name}. El equipo con el que cada uno llegó al final, para el recuerdo.`
        }
      />

      {/* El podio solo tiene sentido si hubo final. En solitario no hay a
          quién ganar y lo que cierra el locke es pasarse la Liga. */}
      {podio.length ? (
        <Podio podio={podio} />
      ) : (
        <section className="card mb-6 text-center">
          <p className="text-5xl" aria-hidden>
            <Icono emoji="🏆" />
          </p>
          <p className="antetitulo mt-2">
            Locke terminado
          </p>
          <p className="mt-3 text-3xl font-black text-white">
            {liga
              ? liga.jugadores.map((j) => j.displayName).join(" y ")
              : progreso?.displayName}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {liga ? "Se pasaron la Liga juntos" : "Se pasó la Liga"} · {competition.name} ·{" "}
            {formatDate(competition.startedAt)}
          </p>
        </section>
      )}

      <EntradasPendientes
        equipos={equiposDelHall}
        edicion={competition.name}
        tamano={TEAM_SIZE}
      />

      <ResumenDelLocke resumen={resumen} cooperativo={perfil.cooperativo} />

      {/* La versión para mandar al grupo. La dirección lleva la huella de lo
          que se pinta en ella, para no enseñar una guardada vieja */}
      <CompartirResumen
        url={`/api/resumen/${competition.id}?v=${huellaDelResumen}`}
        fichero={`resumen-${competition.slug}.png`}
        titulo={competition.name}
        alto={perfil.enSolitario ? 1080 : 1350}
      />

      <div className="space-y-4">
        {jugadores.map((row, index) => {
          const team = teamOf(row.participantId);
          const editable =
            !soloLectura(competition, canManage) &&
            (canManage || row.userId === user.id);
          const esCampeon =
            campeon?.champion.participantId === row.participantId;

          /**
           * Sin equipo apuntado la tarjeta se queda en una línea. Antes se
           * pintaban igual los seis huecos vacíos, y hasta que no los rellenaba
           * todo el mundo la página era medio ladrillo en blanco. Quien puede
           * rellenarlo sigue viendo su formulario; el resto, solo el aviso.
           */
          const vacia = team.length === 0;

          return (
            <section
              key={row.participantId}
              className={cx(
                "card",
                esCampeon && "border-amber-400/30 bg-amber-400/[0.04]",
                vacia && !editable && "py-3 opacity-60",
              )}
            >
              <div
                className={cx(
                  "flex flex-wrap items-center gap-3",
                  vacia ? "mb-0" : "mb-4",
                )}
              >
                <span className="w-6 text-center text-lg">
                  {MEDALS[index] ? <Icono emoji={MEDALS[index]} /> : (
                    <span className="text-sm text-slate-500">{index + 1}º</span>
                  )}
                </span>
                <Avatar
                  name={row.displayName}
                  color={row.color}
                  image={row.avatarImage}
                  size={34}
                  participantId={row.participantId}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-white">
                    {row.displayName}
                  </h2>
                  <p className="truncate text-xs text-slate-500">
                    {vacia
                      ? "Todavía no ha apuntado su equipo"
                      : `${perfil.cooperativo ? "" : `${row.points} puntos · `}${row.deaths} caídos${
                          row.gameVersion ? ` · ${row.gameVersion}` : ""
                        }`}
                  </p>
                </div>
                {vacia ? null : (
                  <>
                    <BotonDeEntrada
                      equipo={equiposDelHall.find((e) => e.participantId === row.participantId)!}
                      edicion={competition.name}
                    />
                    <span className="chip shrink-0">
                      {team.length}/{TEAM_SIZE}
                    </span>
                  </>
                )}
              </div>

              {vacia ? null : (
                <TeamSlots
                  team={team}
                  editable={editable}
                  teamSize={TEAM_SIZE}
                  destacado={esCampeon}
                  dueno={{
                    nombre: row.displayName,
                    color: row.color,
                    imagen: row.avatarImage,
                    participantId: row.participantId,
                  }}
                />
              )}

              {editable ? (
                <AddPokemonForm
                  participantId={row.participantId}
                  remaining={TEAM_SIZE - team.length}
                  ultimoEquipoDe={
                    vacia ? ultimosEquipos.get(row.participantId) : null
                  }
                />
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
