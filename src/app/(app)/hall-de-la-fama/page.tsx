import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getStandings,
} from "@/lib/competition";
import { getFinalFourState, NOMBRE_POR_DEFECTO } from "@/lib/final-four";
import { urlsDeImagen } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import { getResumenDelLocke } from "@/lib/resumen-del-locke";
import { getUltimoEquipo } from "@/lib/ultimo-equipo";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { AddPokemonForm, TeamSlots } from "./team-editor";
import { Podio, type EnElPodio } from "./podio";
import { ResumenDelLocke } from "./resumen";

export const metadata = { title: "Hall de la fama" };

const TEAM_SIZE = 6;
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function HallOfFamePage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const state = await getFinalFourState(competition.id);
  // El final del locke no siempre se llama igual: ver lib/formatos-finales.ts
  const nombreFinal =
    ("formato" in state ? state.formato?.nombre : null) ?? NOMBRE_POR_DEFECTO;

  /**
   * En solitario no hay final que ganar, así que lo que cierra el locke es
   * **pasarse la Liga**. Sin esto el hall no se abriría nunca en una partida de
   * una persona, porque exige campeón de la Final Four.
   */
  const perfil = perfilDeLocke(competition.maxPlayers);
  const progreso = perfil.enSolitario
    ? await getProgresoEnSolitario(competition.id)
    : null;
  const terminadoEnSolitario = Boolean(progreso?.ligaSuperada);

  if (perfil.enSolitario && !terminadoEnSolitario) {
    return (
      <>
        <PageHeader title="Hall de la fama" />
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            🏅
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

  if (!perfil.enSolitario && state.status !== "TERMINADA") {
    return (
      <>
        <PageHeader title="Hall de la fama" />
        <section className="card text-center">
          <p className="text-4xl" aria-hidden>
            🏅
          </p>
          <h2 className="mt-3 text-lg font-semibold text-white">
            El locke todavía no ha terminado
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Cuando la {nombreFinal} tenga campeón, aquí quedará el equipo con
            el que cada uno acabó el locke: sus seis pokémon, con sus motes.
          </p>
          <Link href="/final-four" className="btn-ghost mt-5">
            Ver la {nombreFinal}
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

  const [canManage, standings, entries, resumen] = await Promise.all([
    canManageCompetition(competition.id, user),
    getStandings(competition.id),
    prisma.hallOfFameEntry.findMany({
      where: { participant: { competitionId: competition.id } },
      orderBy: { position: "asc" },
    }),
    getResumenDelLocke(competition.id),
  ]);

  // Direcciones de los sprites, no los sprites: ver lib/imagen-url.ts
  const ids = entries.map((entry) => entry.id);
  const [sprites, fichas] = await Promise.all([
    urlsDeImagen("salon", ids),
    urlsDeImagen("salon-ficha", ids),
  ]);

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

  const teamOf = (participantId: string) =>
    entries
      .filter((entry) => entry.participantId === participantId)
      .map((entry) => ({
        id: entry.id,
        species: entry.species,
        nickname: entry.nickname,
        image: sprites(entry.id),
        detailImage: fichas(entry.id),
      }));

  /**
   * **El orden del hall no es la clasificación: es cómo acabó el locke.**
   *
   * Antes era la tabla con el campeón y el subcampeón puestos a mano encima, y
   * eso dejaba a quien perdió el locke a media carrera por delante de quien
   * jugó la final, solo porque le habían dado tiempo a sumar puntos. Tres
   * grupos, en este orden:
   *
   *  1. **Los que jugaron el cuadro**, por lo lejos que llegaron.
   *  2. **Los que seguían jugando** pero no se clasificaron, por la tabla.
   *  3. **Los que se fueron**, por quién aguantó más: el último en irse arriba.
   */
  const siembra = new Map(
    (elFinal?.seeds ?? []).map((jugador) => [jugador.participantId, jugador.seed]),
  );

  /**
   * Hasta dónde llegó cada uno. La ronda se mide por el orden en que aparece
   * en el cuadro (cruces, semifinales, final) y no por la llave, que si no el
   * que cae en la segunda semifinal quedaría por encima del de la primera sin
   * haber hecho nada distinto. Ganar la última suma medio punto: es el campeón.
   */
  const rondas: string[] = [];
  for (const llave of elFinal?.llaves ?? []) {
    if (!rondas.includes(llave.round)) rondas.push(llave.round);
  }
  const hastaDonde = new Map<string, number>();
  for (const llave of elFinal?.llaves ?? []) {
    const nivel = rondas.indexOf(llave.round);
    for (const lado of [llave.a, llave.b]) {
      if (!lado) continue;
      const suyo = nivel + (llave.winnerId === lado.participantId ? 0.5 : 0);
      hastaDonde.set(
        lado.participantId,
        Math.max(hastaDonde.get(lado.participantId) ?? -1, suyo),
      );
    }
  }

  const grupoDe = (row: (typeof standings)[number]) =>
    siembra.has(row.participantId) ? 0 : row.retirado ? 2 : 1;

  const jugadores = [...standings].sort((a, b) => {
    const grupoA = grupoDe(a);
    const grupoB = grupoDe(b);
    if (grupoA !== grupoB) return grupoA - grupoB;

    if (grupoA === 0) {
      const llegoA = hastaDonde.get(a.participantId) ?? -1;
      const llegoB = hastaDonde.get(b.participantId) ?? -1;
      // A igualdad de ronda manda la siembra, que es la tabla con la que
      // entraron: es lo único que los separa sin inventarse nada
      return llegoB - llegoA || (siembra.get(a.participantId) ?? 99) - (siembra.get(b.participantId) ?? 99);
    }

    if (grupoA === 1) return a.position - b.position;

    // Los que se fueron: primero el que más tarde lo dejó
    return (b.retiredAt?.getTime() ?? 0) - (a.retiredAt?.getTime() ?? 0);
  });

  /**
   * Cómo se ganó el locke, con nombres: "Draka ganó la final a Pablo por 2-1".
   * Todas las llaves del cuadro son al mejor de tres, así que el marcador de la
   * serie ya está contado en la propia llave (ver `lib/formatos-finales.ts`).
   */
  const comoLoGano = (() => {
    if (!elFinal?.champion) return "";
    const campeon = elFinal.champion.displayName;
    const rival = elFinal.runnerUp?.displayName;
    const laFinal = elFinal.llaves.find(
      (llave) => llave.key === elFinal.formato.campeon,
    );
    if (!laFinal || !rival) return `${campeon} ganó la final.`;

    const [ganadas, perdidas] =
      laFinal.a?.participantId === elFinal.champion.participantId
        ? [laFinal.ganadasA, laFinal.ganadasB]
        : [laFinal.ganadasB, laFinal.ganadasA];
    return `${campeon} ganó la final a ${rival} por ${ganadas}-${perdidas}.`;
  })();

  /**
   * El podio, **solo con quien llegó a la final**. El 1º y el 2º salen de la
   * final; el 3º sale de la tabla, que no es lo mismo y por eso se dice: en el
   * cuadro no se juega un combate por el tercer puesto.
   *
   * Lo de mirar la siembra no sobra: sin ella, en un locke de dos se colaba de
   * tercero el siguiente de la clasificación, que era alguien que estaba fuera
   * del locke y no jugó la final.
   */
  const sembrados = new Set(
    elFinal?.seeds.map((jugador) => jugador.participantId) ?? [],
  );
  const podio: EnElPodio[] = elFinal?.champion
    ? jugadores
        .filter((row) => sembrados.has(row.participantId))
        .slice(0, 3)
        .map((row, index) => ({
          participantId: row.participantId,
          displayName: row.displayName,
          color: row.color,
          avatarImage: row.avatarImage,
          puesto: index + 1,
          // El tercero sale del cuadro, no de la tabla: es el que más lejos
          // llegó de los que no jugaron la final. No hay combate por el
          // tercer puesto, así que a igualdad de ronda decide la siembra.
          titulo: ["Campeón", "Subcampeón", "Tercero"][index],
          comoLoGano,
        }))
    : [];

  return (
    <>
      <PageHeader
        title="Hall de la fama"
        subtitle={
          perfil.enSolitario
            ? `Así terminó el ${competition.name}. El equipo con el que te pasaste la Liga, para el recuerdo.`
            : `Así terminó el ${competition.name}. El equipo con el que cada uno llegó al final, para el recuerdo.`
        }
      />

      {/* El podio solo tiene sentido si hubo final. En solitario no hay a
          quién ganar y lo que cierra el locke es pasarse la Liga. */}
      {elFinal?.champion ? (
        <Podio podio={podio} />
      ) : (
        <section className="card mb-6 text-center">
          <p className="text-5xl" aria-hidden>
            🏆
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand-400">
            Locke terminado
          </p>
          <p className="mt-3 text-3xl font-black text-white">
            {progreso?.displayName}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Se pasó la Liga · {competition.name} ·{" "}
            {formatDate(competition.startedAt)}
          </p>
        </section>
      )}

      <ResumenDelLocke resumen={resumen} />

      <div className="space-y-4">
        {jugadores.map((row, index) => {
          const team = teamOf(row.participantId);
          const editable = canManage || row.userId === user.id;
          const esCampeon = elFinal?.champion?.participantId === row.participantId;

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
                  {MEDALS[index] ?? (
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
                      : `${row.points} puntos · ${row.deaths} caídos${
                          row.gameVersion ? ` · ${row.gameVersion}` : ""
                        }`}
                  </p>
                </div>
                {vacia ? null : (
                  <span className="chip shrink-0">
                    {team.length}/{TEAM_SIZE}
                  </span>
                )}
              </div>

              {vacia ? null : (
                <TeamSlots
                  team={team}
                  editable={editable}
                  teamSize={TEAM_SIZE}
                  destacado={esCampeon}
                  duenoName={row.displayName}
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
