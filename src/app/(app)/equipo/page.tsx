import { SpritePokemon } from "@/components/sprite-pokemon";
import Link from "next/link";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  soloLectura,
} from "@/lib/competition";
import { getZonasParaElegir } from "@/lib/mapas";
import { regionesDelJuego } from "@/lib/juegos";
import { getEquiposDelLocke } from "@/lib/soul-link";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { Icono } from "@/components/icono";
import { EquiposYCajas } from "./tablero";
import { ApuntarEnCaja } from "./apuntar-form";
import { Pendientes } from "@/components/pendientes";

export const metadata = { title: "Equipo y PC" };

/**
 * El equipo y la caja. Aquí se mueve, se evoluciona y se da por muerto; el
 * cementerio y el mapa se enteran solos. Es otra cara de las capturas: lo que
 * se apunta en el Mapa de capturas cae aquí, y aquí se apunta lo que no tiene
 * mapa (un fangame desde cero).
 *
 * - En un **Soul Link**, los de **todos** a la vista, con sus vínculos: es la
 *   gracia del cooperativo ver cómo van las parejas.
 * - En los demás lockes, **solo el tuyo y privado**, como el mapa: ni quien
 *   administra ve el de otro. Los rivales no tienen por qué saber qué llevas.
 */
export default async function EquipoYPcPage({
  searchParams,
}: {
  searchParams: Promise<{ apuntar?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const perfil = perfilDeLocke(competition.maxPlayers, competition.estilo);
  const { apuntar } = await searchParams;
  /**
   * **Todo a la vez**: los tableros no esperan a saber qué participante eres
   * (lo tuyo se busca por tu cuenta en el locke) ni si administras (eso solo
   * decide al final qué se puede tocar). Antes eran dos idas y vueltas en fila.
   */
  const gestionaPedido = canManageCompetition(competition.id, user);
  const quienMira = gestionaPedido.then((gestiona) => ({
    userId: user.id,
    // Fuera del Soul Link, quien administra no tiene aquí más mano que nadie
    gestiona: perfil.cooperativo ? gestiona : false,
    soloLectura: soloLectura(competition, gestiona),
  }));
  const [yo, gestiona, datos, zonas] = await Promise.all([
    getMyParticipant(competition.id, user.id),
    gestionaPedido,
    perfil.cooperativo
      ? getEquiposDelLocke(competition, quienMira)
      : // Solo lo tuyo
        getEquiposDelLocke(competition, quienMira, { userId: user.id }),
    getZonasParaElegir(regionesDelJuego(competition.gameId)),
  ]);

  // Fuera del Soul Link la caja es de cada uno: sin ficha, no hay nada tuyo
  if (!perfil.cooperativo && !yo) {
    return (
      <>
        <PageHeader title="Equipo y PC" />
        <EmptyState
          dibujo="caja"
          title="No juegas esta edición"
          hint="El equipo y la caja son de cada jugador y privados, como el mapa: aquí no hay nada tuyo."
        />
      </>
    );
  }

  const cerrada = soloLectura(competition, gestiona);

  // Lo tuyo primero: es lo que se viene a tocar
  const tableros = [...datos.tableros].sort(
    (a, b) => Number(b.participantId === yo?.id) - Number(a.participantId === yo?.id),
  );
  const numeros = Object.fromEntries(datos.vinculos.map((v, i) => [v.clave, i + 1]));
  const puedenApuntar = cerrada
    ? []
    : datos.tableros.filter((t) => t.editable && !t.fuera);
  const nombre = new Map(datos.tableros.map((t) => [t.participantId, t.displayName]));
  // Los sueltos vivos de cada uno, para vincular a mano al apuntar
  const vinculados = new Set(datos.vinculos.flatMap((v) => v.miembros.map((m) => m.id)));
  const sueltos = datos.tableros.flatMap((t) =>
    t.vivos
      .filter((p) => !vinculados.has(p.id))
      .map((p) => ({
        id: p.id,
        participantId: p.participantId,
        rotulo: `${p.nickname ?? p.species}${p.sitio ? ` (${p.sitio})` : ""} · de ${nombre.get(p.participantId)}`,
      })),
  );

  const parejasVivas = datos.vinculos.filter((v) => v.miembros.every((m) => !m.muerta)).length;

  return (
    <>
      <PageHeader
        title="Equipo y PC"
        subtitle={
          perfil.cooperativo
            ? "Lo que lleva cada uno, a la vista de todos. Lo de la misma ruta va vinculado: si cae uno, cae su pareja."
            : "Tu equipo y tu caja. Son solo tuyos, como el mapa: nadie más los ve."
        }
        actions={
          // A la calculadora de tipos de las notas, para montar el equipo con lo de aquí
          yo ? (
            <Link href="/notas?planificar=1#cobertura" className="btn-ghost btn-sm">
              <Icono emoji="🛡️" /> Planificar equipo
            </Link>
          ) : undefined
        }
      />

      {puedenApuntar.length ? (
        <div className="mb-5">
          <ApuntarEnCaja
            zonas={zonas}
            jugadores={puedenApuntar.map((t) => ({ id: t.participantId, displayName: t.displayName }))}
            miId={yo && puedenApuntar.some((t) => t.participantId === yo.id) ? yo.id : null}
            sueltos={sueltos}
            esSoulLink={perfil.cooperativo}
            abierto={apuntar === "1"}
            competitionId={competition.id}
          />
        </div>
      ) : null}

      {/* Lo que se movió, evolucionó o cayó sin línea y aún no ha subido */}
      <Pendientes tipo="movimiento" />
      <Pendientes tipo="evolucion" />
      <Pendientes tipo="caida" />

      {datos.tableros.length ? (
        <EquiposYCajas tableros={tableros} numeros={numeros} esSoulLink={perfil.cooperativo} zonas={zonas} />
      ) : (
        <EmptyState
          dibujo="caja"
          title="Todavía no hay nadie apuntado"
          hint="Cuando haya jugadores en el locke, aquí saldrán sus equipos y sus cajas."
        />
      )}

      {perfil.cooperativo ? (
        <section className="card mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="section-title flex items-center gap-2">
              <Icono emoji="🔗" /> Vínculos
            </h2>
            <span className="chip">
              {parejasVivas} vivos · {datos.vinculos.length - parejasVivas} caídos
            </span>
          </div>
          {datos.vinculos.length ? (
            <ul className="divide-y divide-white/5">
              {datos.vinculos.map((vinculo) => {
                const caido = vinculo.miembros.some((m) => m.muerta);
                return (
                  <li key={vinculo.clave} className="flex items-center gap-3 py-2">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                      {numeros[vinculo.clave]}
                    </span>
                    <span className="w-28 shrink-0 truncate text-xs text-slate-500 sm:w-40">
                      {vinculo.sitio ?? "Sin ruta"}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      {vinculo.miembros.map((m) => (
                        <span key={m.id} className="flex min-w-0 items-center gap-1.5">
                          {m.imagen ? (
                            <SpritePokemon
                              src={m.imagen}
                              pokemonId={m.pokemonId}
                              shiny={m.shiny}
                              alt={m.species}
                              className={
                                m.muerta ? "h-8 w-8 object-contain opacity-50 grayscale" : "h-8 w-8 object-contain"
                              }
                            />
                          ) : null}
                          <span className="min-w-0 truncate text-sm text-slate-200">
                            {m.nickname ?? m.species}
                            <span className="text-xs text-slate-500"> · {nombre.get(m.participantId)}</span>
                          </span>
                        </span>
                      ))}
                    </span>
                    {caido ? <span className="chip text-[10px]">Caído</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              Todavía no hay parejas. En cuanto dos capturéis en la misma ruta, se
              vinculan solas.
            </p>
          )}
          {zonas.length ? (
            <p className="mt-3 text-xs text-slate-500">
              Las capturas del{" "}
              <Link href="/mapa" className="text-brand-400 hover:underline">
                Mapa de capturas
              </Link>{" "}
              entran aquí solas y se vinculan por la zona.
            </p>
          ) : null}
        </section>
      ) : zonas.length ? (
        <p className="mt-4 text-xs text-slate-500">
          Lo que apuntes en el{" "}
          <Link href="/mapa" className="text-brand-400 hover:underline">
            Mapa de capturas
          </Link>{" "}
          entra aquí solo, al equipo si hay hueco y si no a la caja.
        </p>
      ) : null}
    </>
  );
}
