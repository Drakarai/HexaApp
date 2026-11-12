import Link from "next/link";
import { requireUser, esCreador } from "@/lib/auth";
import { getActiveCompetition, getParticipants } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Avatar, EmptyState } from "@/components/ui";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { cx } from "@/lib/utils";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import {
  galardonesDe,
  getEstadisticasDelLocke,
  type Numeros,
  type PokemonConNumeros,
} from "@/lib/estadisticas";
import { LeerLasQueFaltan } from "./leer-las-que-faltan";

export const metadata = { title: "Estadísticas" };

/** Las clasificaciones, en el orden en que interesan */
const TABLAS: { campo: keyof Numeros; titulo: string; unidad: (n: number) => string }[] = [
  { campo: "kos", titulo: "Más KOs", unidad: (n) => `${n} KO${n === 1 ? "" : "s"}` },
  { campo: "danoHecho", titulo: "Más daño hecho", unidad: (n) => `${Math.round(n)} %` },
  { campo: "criticosHechos", titulo: "Más críticos", unidad: (n) => `${n}` },
  { campo: "supereficaces", titulo: "Más golpes muy eficaces", unidad: (n) => `${n}` },
  { campo: "criticosRecibidos", titulo: "Más críticos recibidos", unidad: (n) => `${n}` },
  { campo: "danoRecibido", titulo: "Más daño encajado", unidad: (n) => `${Math.round(n)} %` },
  { campo: "combates", titulo: "Más combates", unidad: (n) => `${n}` },
  { campo: "fallos", titulo: "Más ataques fallados", unidad: (n) => `${n}` },
];

const CUANTOS = 5;

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const perfil = perfilDeLocke(competition.maxPlayers, competition.estilo);
  if (perfil.sinJornadas) {
    return (
      <>
        <PageHeader title="Estadísticas" />
        <EmptyState
          title="Aquí no hay combates de jornada"
          hint="Las estadísticas salen de las repeticiones de las jornadas, y este locke no tiene."
        />
      </>
    );
  }

  const { jugador } = await searchParams;
  const [{ pokemon, conRepeticion, jugados, sinLeer }, participantes] = await Promise.all([
    getEstadisticasDelLocke(competition.id, user.id),
    getParticipants(competition.id),
  ]);
  const deQuien = new Map(participantes.map((p) => [p.id, p]));
  const filtrado = jugador && deQuien.has(jugador) ? jugador : null;
  const galardones = galardonesDe(pokemon);
  const delFiltro = filtrado ? pokemon.filter((p) => p.participantId === filtrado) : pokemon;

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle={
          jugados
            ? `Sacadas de ${conRepeticion} de ${jugados} combate${jugados === 1 ? "" : "s"} jugados: los que no tienen repetición solo cuentan como combate.`
            : "Cuando se jueguen combates con repetición, aquí sale quién ha hecho qué."
        }
      />

      {sinLeer.length ? <LeerLasQueFaltan competitionId={competition.id} cuantas={sinLeer.length} /> : null}

      {!pokemon.length ? (
        <EmptyState
          title="Todavía no hay números"
          hint="Apunta los equipos y la repetición de los combates de jornada y los pokémon empezarán a sumar."
        />
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Galardones</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3" data-galardones>
              {galardones.map((g) => {
                const dueno = g.pokemon ? deQuien.get(g.pokemon.participantId) : null;
                return (
                  <div key={g.id} className="card flex items-center gap-2 p-2.5 sm:gap-3 sm:p-3">
                    <Imagen pokemon={g.pokemon} tamano="h-10 w-10 sm:h-14 sm:w-14" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-400">
                        {g.icono} {g.titulo}
                      </p>
                      {g.pokemon ? (
                        <>
                          <p className="truncate font-semibold text-white">{g.pokemon.mote ?? g.pokemon.especie}</p>
                          <p className="truncate text-xs text-slate-400">
                            {g.que(g.valor)}
                            {dueno ? ` · de ${dueno.displayName}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">Sin dueño todavía</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <nav className="mb-3 flex flex-wrap gap-1.5" aria-label="De quién">
            <Link
              href="/estadisticas"
              className={cx("btn-sm", filtrado ? "btn-ghost" : "btn-primary")}
            >
              Todos
            </Link>
            {participantes.map((p) => (
              <Link
                key={p.id}
                href={`/estadisticas?jugador=${p.id}`}
                className={cx("btn-sm", filtrado === p.id ? "btn-primary" : "btn-ghost")}
              >
                {p.displayName}
              </Link>
            ))}
          </nav>

          <div className="grid gap-3 md:grid-cols-2">
            {TABLAS.map((tabla) => {
              const top = delFiltro
                .filter((p) => (p.numeros[tabla.campo] ?? 0) > 0)
                .sort((a, b) => (b.numeros[tabla.campo] ?? 0) - (a.numeros[tabla.campo] ?? 0))
                .slice(0, CUANTOS);
              return (
                <section key={tabla.campo} className="card p-3">
                  <h3 className="mb-2 text-sm font-semibold text-slate-200">{tabla.titulo}</h3>
                  {top.length ? (
                    <ol className="space-y-1.5">
                      {top.map((p, i) => {
                        const dueno = deQuien.get(p.participantId);
                        return (
                          <li key={p.clave} className="flex items-center gap-2 text-sm">
                            <span className="w-4 text-right text-xs text-slate-500">{i + 1}</span>
                            <Imagen pokemon={p} tamano="h-8 w-8" />
                            <span className="min-w-0 flex-1 truncate">{p.mote ?? p.especie}</span>
                            {dueno && !filtrado ? (
                              <Avatar
                                name={dueno.displayName}
                                color={dueno.color}
                                image={dueno.user.avatarImage}
                                size={18}
                              />
                            ) : null}
                            <span className="w-16 text-right font-semibold tabular-nums">
                              {tabla.unidad(p.numeros[tabla.campo] ?? 0)}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-500">Nadie todavía.</p>
                  )}
                </section>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            El daño va en % de la vida del rival, sumado: 200 % son dos pokémon enteros. Cada pokémon junta lo de
            todos sus combates, también los de antes de evolucionar.
          </p>
        </>
      )}
    </>
  );
}

function Imagen({ pokemon, tamano }: { pokemon: PokemonConNumeros | null; tamano: string }) {
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-lg bg-white/[0.04]", tamano)}>
      {pokemon?.imagen ? (
        <SpritePokemon src={pokemon.imagen} alt="" loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <span className="text-xs text-slate-600" aria-hidden>
          ?
        </span>
      )}
    </span>
  );
}
