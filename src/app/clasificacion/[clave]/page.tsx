import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStandings } from "@/lib/competition";
import { getMarcador } from "@/lib/marcador";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { nombreDelJuego } from "@/lib/juegos";
import { comoEstaFuera } from "@/lib/wipeos";
import { Logo } from "@/components/logo";
import { cx, readableTextColor } from "@/lib/utils";

/**
 * La **clasificación pública** de un locke: para que la siga gente de fuera
 * sin cuenta, con el enlace que crea quien lo lleva (Competiciones → Ajustes).
 *
 * Es lo único de la aplicación que se ve sin sesión, así que enseña **solo la
 * tabla**: nombres, puntos, combates y bajas. Nada de fotos (sus direcciones
 * piden sesión y son de cada uno), ni enlaces hacia dentro, ni equipos, ni
 * mapas. Los buscadores no la indexan. Una clave que no existe —o que se
 * cambió— da un «no encontrado», igual que una dirección cualquiera.
 */

async function lockeDe(clave: string) {
  // Las claves son de 32 letras: lo demás ni se busca
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(clave)) return null;
  return prisma.competition.findFirst({
    where: { enlacePublico: clave },
    select: {
      id: true,
      name: true,
      game: true,
      gameId: true,
      juegoNoOficial: true,
      modality: true,
      maxPlayers: true,
      estilo: true,
      status: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ clave: string }> }): Promise<Metadata> {
  const locke = await lockeDe((await params).clave);
  return {
    title: locke ? `${locke.name} · Clasificación` : "No encontrado",
    robots: { index: false, follow: false },
  };
}

export default async function ClasificacionPublica({ params }: { params: Promise<{ clave: string }> }) {
  const locke = await lockeDe((await params).clave);
  if (!locke) notFound();
  const perfil = perfilDeLocke(locke.maxPlayers, locke.estilo);
  // En solitario o en un Soul Link no hay tabla que enseñar
  if (perfil.enSolitario || perfil.cooperativo) notFound();

  const [filas, marcador] = await Promise.all([
    getStandings(locke.id),
    perfil.victoria === "jornadas" ? getMarcador(locke.id) : null,
  ]);
  const juego = [nombreDelJuego(locke.gameId, locke.game, locke.juegoNoOficial), locke.modality].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
        <Logo id="logo-publico" tamano={22} />
        HexaApp · en directo
      </div>
      <h1 className="font-[Barlow_Condensed] text-4xl font-bold uppercase leading-none tracking-wide text-white">
        {locke.name}
      </h1>
      {juego ? <p className="mt-2 text-sm text-slate-400">{juego}</p> : null}
      {locke.status !== "ACTIVE" ? <p className="mt-1 text-xs text-slate-500">Edición terminada</p> : null}

      {marcador ? (
        <section className="card mt-6">
          <h2 className="section-title mb-4">Marcador</h2>
          <div className="flex items-center justify-center gap-4">
            {marcador.jugadores.map((j, i) => (
              <div key={j.participantId} className={cx("flex items-center gap-4", i === 1 && "flex-row-reverse")}>
                <Inicial nombre={j.displayName} color={j.color} />
                <span className="font-[Barlow_Condensed] text-5xl font-bold tabular-nums text-white">{j.ganadas}</span>
                {i === 0 ? <span className="text-2xl text-slate-600">–</span> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm text-slate-400">
            {!marcador.danTitulo
              ? "El título es de quien se pase el juego; las jornadas desempatan"
              : marcador.campeonId
              ? `Ha ganado ${marcador.jugadores.find((j) => j.participantId === marcador.campeonId)?.displayName ?? "?"}`
              : `Gana quien llegue a ${marcador.hacenFalta} jornadas`}
          </p>
        </section>
      ) : null}

      <section className="card mt-6">
        <h2 className="section-title mb-4">Clasificación</h2>
        <ol className="space-y-2">
          {filas.map((fila) => {
            const fuera = comoEstaFuera(fila);
            return (
              <li
                key={fila.participantId}
                className={cx(
                  "flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5",
                  fila.retirado && "opacity-60",
                )}
              >
                <span className="w-6 text-center font-[Barlow_Condensed] text-xl font-bold tabular-nums text-slate-400">
                  {fila.retirado ? "—" : fila.position}
                </span>
                <Inicial nombre={fila.displayName} color={fila.color} />
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate font-semibold text-white", fila.retirado && "line-through")}>
                    {fila.displayName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {fila.wins}-{fila.losses} · dif. {fila.pokemonDiff > 0 ? "+" : ""}
                    {fila.pokemonDiff} · {fila.deaths} {fila.deaths === 1 ? "caído" : "caídos"}
                    {fuera ? ` · ${fuera.etiqueta}` : ""}
                  </span>
                </span>
                {perfil.victoria === "puntos" ? (
                  <span className="text-right">
                    <span className="block font-[Barlow_Condensed] text-2xl font-bold leading-none tabular-nums text-white">
                      {fila.points}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">pts</span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <p className="mt-6 text-center text-xs text-slate-500">
        Se pone al día cada vez que recargas. Solo se ve la clasificación: lo demás es de quien juega.
      </p>
    </main>
  );
}

/** La inicial sobre su color, en vez de la foto: las fotos son de cada uno y piden sesión */
function Inicial({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{ background: color, color: readableTextColor(color) }}
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}
