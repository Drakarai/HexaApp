import { requireUser, esCreador } from "@/lib/auth";
import { getActiveCompetition, getParticipants } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";
import { spriteMini } from "@/lib/sprites-de-quinta";
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
            {/* En el móvil, una vitrina de tres en fila (se probaron una tira
                que se deslizaba y una lista; se eligió esta); en el ordenador,
                tarjetas en rejilla */}
            <div className="sm:hidden">
              <Vitrina galardones={galardones} deQuien={deQuien} />
            </div>
            <div className="hidden sm:block">
              <Rejilla galardones={galardones} deQuien={deQuien} />
            </div>
          </section>

          <Clasificaciones
            pokemon={pokemon.map((p) => ({
              clave: p.clave,
              participantId: p.participantId,
              nombre: p.mote ?? p.especie,
              // Sin imagen guardada, el sprite de su especie
              imagen: p.imagen ?? (p.pokemonId ? spriteMini(p.pokemonId, false) : null),
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

type Galardon = ReturnType<typeof galardonesDe>[number];
type Duenos = Map<string, { displayName: string }>;

function imagenDe(g: Galardon) {
  if (!g.pokemon) return null;
  return g.pokemon.imagen ?? (g.pokemon.pokemonId ? spriteMini(g.pokemon.pokemonId, false) : null);
}

function Sprite({ g, tamano }: { g: Galardon; tamano: string }) {
  const src = imagenDe(g);
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-lg bg-white/[0.04]", tamano)}>
      {src ? (
        <SpritePokemon src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <Icono emoji={g.icono} tamano={18} className="text-slate-500" />
      )}
    </span>
  );
}

/** En el ordenador: tarjetas en rejilla */
function Rejilla({ galardones, deQuien }: { galardones: Galardon[]; deQuien: Duenos }) {
  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-4" data-galardones>
      {galardones.map((g) => {
        const dueno = g.pokemon ? deQuien.get(g.pokemon.participantId) : null;
        return (
          <div
            key={g.id}
            data-galardon={g.id}
            className={cx("card flex items-center gap-2 p-2", !g.pokemon && "opacity-50")}
          >
            <Sprite g={g} tamano="h-10 w-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1 truncate text-[11px] text-amber-200/90">
                <Icono emoji={g.icono} tamano={12} /> {g.titulo}
              </p>
              {g.pokemon ? (
                <>
                  <p className="truncate text-sm font-semibold text-white">{g.pokemon.mote ?? g.pokemon.especie}</p>
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
  );
}

/** En el móvil: una vitrina de tres en fila, el pokémon en grande y el título encima */
function Vitrina({ galardones, deQuien }: { galardones: Galardon[]; deQuien: Duenos }) {
  return (
    <div className="grid grid-cols-3 gap-1.5" data-galardones>
      {galardones.map((g) => {
        const dueno = g.pokemon ? deQuien.get(g.pokemon.participantId) : null;
        return (
          <div
            key={g.id}
            data-galardon={g.id}
            className={cx("card flex flex-col items-center gap-0.5 p-1.5 text-center", !g.pokemon && "opacity-45")}
          >
            <p className="flex w-full items-center justify-center gap-1 truncate text-[10px] font-semibold text-amber-200/90">
              <Icono emoji={g.icono} tamano={11} /> <span className="truncate">{g.titulo}</span>
            </p>
            <Sprite g={g} tamano="h-12 w-12" />
            <p className="w-full truncate text-xs font-semibold text-white">
              {g.pokemon ? (g.pokemon.mote ?? g.pokemon.especie) : "—"}
            </p>
            <p className="w-full truncate text-[10px] text-slate-400">
              {g.pokemon ? `${g.que(g.valor)}` : "Sin dueño"}
            </p>
            {dueno ? <p className="w-full truncate text-[10px] text-slate-500">{dueno.displayName}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
