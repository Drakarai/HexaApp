import { requireUser, esCreador } from "@/lib/auth";
import { getActiveCompetition, getParticipants } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { galardonesDe, getEstadisticasDelLocke } from "@/lib/estadisticas";
import { LeerLasQueFaltan } from "./leer-las-que-faltan";
import { Clasificaciones } from "./clasificaciones";

export const metadata = { title: "Estadísticas" };

export default async function EstadisticasPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const perfil = perfilDeLocke(competition.maxPlayers, competition.estilo);
  if (perfil.sinJornadas) {
    return (
      <>
        <PageHeader title="Estadísticas" />
        <EmptyState
          title="Aquí no hay combates"
          hint="Las estadísticas salen de las repeticiones de jornadas, retos y la final, y este locke no tiene."
        />
      </>
    );
  }

  const [{ pokemon, conRepeticion, jugados, sinLeer }, participantes] = await Promise.all([
    getEstadisticasDelLocke(competition.id, user.id),
    getParticipants(competition.id),
  ]);
  const deQuien = new Map(participantes.map((p) => [p.id, p]));
  // Primero los que tienen dueño: los vacíos al final y apagados, que no estorben
  const galardones = galardonesDe(pokemon).sort((a, b) => Number(!a.pokemon) - Number(!b.pokemon));

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle={
          jugados
            ? `De jornadas, retos y la final. Con números, ${conRepeticion} de ${jugados} combate${jugados === 1 ? "" : "s"}: los que no tienen repetición solo cuentan como combate.`
            : "Cuando se jueguen combates con repetición, aquí sale quién ha hecho qué."
        }
      />

      {sinLeer.length ? <LeerLasQueFaltan competitionId={competition.id} cuantas={sinLeer.length} /> : null}

      {!pokemon.length ? (
        <EmptyState
          title="Todavía no hay números"
          hint="Apunta los equipos y la repetición de los combates y los pokémon empezarán a sumar."
        />
      ) : (
        <>
          <section className="mb-5" aria-labelledby="galardones">
            <h2 id="galardones" className="antetitulo mb-2">
              Galardones
            </h2>
            {/* En el móvil, una tira que se desliza: once tarjetas una debajo de
                otra eran media pantalla antes de llegar a las clasificaciones */}
            <div
              className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4"
              data-galardones
            >
              {galardones.map((g) => {
                const dueno = g.pokemon ? deQuien.get(g.pokemon.participantId) : null;
                return (
                  <div
                    key={g.id}
                    data-galardon={g.id}
                    className={cx(
                      "card flex w-44 shrink-0 snap-start items-center gap-2 p-2 sm:w-auto",
                      !g.pokemon && "opacity-50",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                      {g.pokemon?.imagen ? (
                        <SpritePokemon src={g.pokemon.imagen} alt="" loading="lazy" className="h-full w-full object-contain" />
                      ) : (
                        <Icono emoji={g.icono} tamano={18} className="text-slate-500" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="flex items-center gap-1 truncate text-[11px] text-amber-200/90">
                        <Icono emoji={g.icono} tamano={12} /> {g.titulo}
                      </p>
                      {g.pokemon ? (
                        <>
                          <p className="truncate text-sm font-semibold text-white">
                            {g.pokemon.mote ?? g.pokemon.especie}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {g.que(g.valor)}
                            {dueno ? ` · ${dueno.displayName}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">Sin dueño</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <Clasificaciones
            pokemon={pokemon.map((p) => ({
              clave: p.clave,
              participantId: p.participantId,
              nombre: p.mote ?? p.especie,
              imagen: p.imagen,
              numeros: p.numeros,
            }))}
            jugadores={participantes.map((p) => ({
              id: p.id,
              nombre: p.displayName,
              color: p.color,
              avatar: p.user.avatarImage,
            }))}
          />
        </>
      )}
    </>
  );
}
