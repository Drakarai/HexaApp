import Link from "next/link";
import { Avatar, EmptyState } from "@/components/ui";
import type { Marcador } from "@/lib/marcador";
import type { CampeonDeLiga } from "@/lib/liga";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

/**
 * El marcador de un locke de dos.
 *
 * Aquí no hay clasificación que valga: lo que se mira es quién va ganando más
 * jornadas y cuántas le faltan. Y al lado, la otra victoria, que es pasarse la
 * Liga Pokémon: son dos cosas distintas y las dos cuentan.
 */
export function MarcadorDual({
  marcador,
  /** En el resumen solo cabe el marcador, sin el desglose jornada a jornada */
  compacto = false,
}: {
  marcador: Marcador;
  compacto?: boolean;
}) {
  const { jugadores, jornadas, hacenFalta, campeonId, bolaDePartido } = marcador;
  const nombreDe = (id: string | null) =>
    jugadores.find((jugador) => jugador.participantId === id)?.displayName ?? null;

  return (
    <>
      <section className={compacto ? "" : "card mb-4"}>
        {compacto ? null : (
          <>
            <h2 className="section-title mb-1">El marcador</h2>
            <p className="muted mb-4">
              Cada jornada es un combate al mejor de tres. Gana el locke en
              combates el primero que se lleve {hacenFalta} jornadas.
            </p>
          </>
        )}

        <div className="flex items-stretch gap-2">
          {jugadores.map((jugador, indice) => (
            <div key={jugador.participantId} className="contents">
              {indice ? (
                <div className="flex items-center px-1 text-xs text-slate-600">
                  vs
                </div>
              ) : null}
              <div
                className={cx(
                  "flex-1 rounded-xl border p-4 text-center",
                  jugador.participantId === campeonId
                    ? "border-amber-400/50 bg-amber-400/10"
                    : "border-white/10 bg-white/[0.03]",
                )}
              >
                <div className="flex justify-center">
                  <Avatar
                    name={jugador.displayName}
                    color={jugador.color}
                    image={jugador.avatarImage}
                    size={44}
                  />
                </div>
                <p className="mt-2 truncate text-sm font-medium text-white">
                  {jugador.displayName}
                </p>
                <p className="mt-1 text-4xl font-black text-white">
                  {jugador.ganadas}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {jugador.participantId === campeonId
                    ? <><Icono emoji="🏆" /> Gana el locke</>
                    : jugador.leFaltan === 1
                    ? "Le vale una más"
                    : `Le faltan ${jugador.leFaltan}`}
                </p>
              </div>
            </div>
          ))}
        </div>

        {campeonId ? (
          <p className="mt-4 text-center text-sm text-amber-300">
            {nombreDe(campeonId)} ya se ha llevado el locke en combates.
          </p>
        ) : bolaDePartido.length ? (
          <div className="mt-4">
            <BolaDePartido quienes={bolaDePartido} />
          </div>
        ) : compacto ? (
          <p className="mt-3 text-center text-xs text-slate-500">
            Gana el locke el primero que se lleve {hacenFalta} jornadas.
          </p>
        ) : null}
      </section>

      {compacto ? null : (
      <section className="card mb-4">
        <h2 className="section-title mb-1">Jornada a jornada</h2>
        <p className="muted mb-4">
          Una jornada es de quien gane dos combates: con un 2-0 no hace falta
          jugar el tercero.
        </p>

        {jornadas.length ? (
          <ul className="space-y-2">
            {jornadas.map((jornada) => (
              <li
                key={jornada.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {jornada.label}
                  </p>
                  {jornada.milestone ? (
                    <p className="truncate text-xs text-slate-500">
                      {jornada.milestone}
                    </p>
                  ) : null}
                </div>
                <p className="font-mono text-sm text-slate-300">
                  {jugadores
                    .map((jugador) => jornada.porJugador[jugador.participantId] ?? 0)
                    .join(" - ")}
                </p>
                <span className="chip shrink-0">
                  {jornada.ganadorId
                    ? <><Icono emoji="🏅" /> {nombreDe(jornada.ganadorId)}</>
                    : jornada.faltan
                    ? `Faltan ${jornada.faltan}`
                    : "Sin decidir"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Todavía no hay jornadas"
            hint="Créalas desde la sección Jornadas."
          />
        )}
      </section>
      )}
    </>
  );
}

/**
 * El aviso de que la jornada que viene puede cerrar el locke.
 *
 * Sin esto había que entrar al marcador y leer el "le vale una más" en letra
 * pequeña para enterarse de que el siguiente combate vale doble. Es un adorno:
 * no cambia ninguna regla, solo la cuenta.
 */
export function BolaDePartido({
  quienes,
}: {
  quienes: Array<{ participantId: string; displayName: string }>;
}) {
  if (!quienes.length) return null;

  return (
    <p className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
      <span aria-hidden><Icono emoji="⚡" /></span>
      <span>
        <strong className="font-semibold">Bola de partido.</strong>{" "}
        {quienes.length === 1
          ? `Si ${quienes[0].displayName} gana la próxima jornada, se lleva el locke.`
          : "El que gane la próxima jornada se lleva el locke."}
      </span>
    </p>
  );
}

/**
 * Quién se ha pasado la Liga Pokémon. Va aparte del marcador a propósito:
 * ganar el juego y ganar los combates son dos victorias distintas, y se puede
 * tener una sin la otra.
 */
export function CampeonesDeLiga({
  campeones,
}: {
  campeones: CampeonDeLiga[];
}) {
  return (
    <section className="card">
      <h2 className="section-title mb-1">La Liga Pokémon</h2>
      <p className="muted mb-4">
        Pasarse la Liga es ganar el locke del juego, que no es lo mismo que
        ganarlo en combates. Pueden conseguirlo varios.
      </p>

      {campeones.length ? (
        <ul className="flex flex-wrap gap-2">
          {campeones.map((campeon) => (
            <li key={campeon.participantId}>
              <Link
                href={`/jugador/${campeon.participantId}`}
                className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 py-1 pl-1 pr-3 text-sm text-amber-100 transition hover:bg-amber-400/20"
              >
                <Avatar
                  name={campeon.displayName}
                  color={campeon.color}
                  size={26}
                />
                <span
                  className={cx(
                    "truncate",
                    campeon.retirado && "line-through opacity-70",
                  )}
                >
                  {campeon.displayName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Todavía no la ha superado nadie"
          hint="Se marca sola al pasar el último hito de los level caps."
        />
      )}
    </section>
  );
}
