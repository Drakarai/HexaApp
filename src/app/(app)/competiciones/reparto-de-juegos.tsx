import { repartirVersionesAction } from "@/app/actions/competitions";
import { ConfirmSubmit } from "@/components/ui";
import { Icono } from "@/components/icono";

type Jugador = { id: string; nombre: string; color: string; version: string | null };

/**
 * **Quién lleva cada juego** cuando la edición es una pareja (HeartGold y
 * SoulSilver…), con el botón de repartirlos al azar. Va arriba de Jugadores, a
 * la vista: antes era una línea al final, debajo del formulario de apuntar, y
 * el usuario la pidió como si no existiera.
 *
 * Solo se pinta si hay pareja; con un juego solo no hay nada que repartir. Lo
 * ven todos, que saber quién lleva qué le sirve a cualquiera, pero repartir es
 * de quien lleva el locke (y se comprueba otra vez en la acción).
 */
export function RepartoDeJuegos({
  competitionId,
  versiones,
  jugadores,
  puedeRepartir,
}: {
  competitionId: string;
  versiones: string[];
  /** Los que siguen jugando: a los retirados ya no se les reparte nada */
  jugadores: Jugador[];
  puedeRepartir: boolean;
}) {
  const de = (version: string) => jugadores.filter((jugador) => jugador.version === version);
  // Los que no llevan ninguna de las dos: sin elegir, o con algo escrito de antes
  const sinJuego = jugadores.filter((jugador) => !jugador.version || !versiones.includes(jugador.version));
  const yaRepartido = jugadores.length > 0 && !sinJuego.length;

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">
          <Icono emoji="🎮" /> Los juegos: {versiones.join(" y ")}
        </p>
        {puedeRepartir && jugadores.length > 1 ? (
          <form action={repartirVersionesAction}>
            <input type="hidden" name="competitionId" value={competitionId} />
            <ConfirmSubmit
              className="btn-ghost btn-sm"
              message={`¿Repartir ${versiones.join(" y ")} al azar? Cambia el juego de todos los que siguen jugando.`}
            >
              <Icono emoji="🎲" /> {yaRepartido ? "Volver a repartir" : "Repartir al azar"}
            </ConfirmSubmit>
          </form>
        ) : null}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {versiones.map((version) => (
          <ListaDeVersion key={version} titulo={version} jugadores={de(version)} />
        ))}
      </div>
      {sinJuego.length ? (
        <div className="mt-2">
          <ListaDeVersion titulo="Sin juego todavía" jugadores={sinJuego} apagado />
        </div>
      ) : null}
      {puedeRepartir ? (
        <p className="muted mt-2 text-xs">
          Al azar y a partes iguales; si son impares, uno lleva un jugador más.
          A mano, en «Editar» de cada jugador.
        </p>
      ) : null}
    </div>
  );
}

function ListaDeVersion({
  titulo,
  jugadores,
  apagado = false,
}: {
  titulo: string;
  jugadores: Jugador[];
  apagado?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <p className={apagado ? "text-xs text-slate-500" : "text-xs font-semibold text-slate-300"}>
        {titulo} <span className="text-slate-500">· {jugadores.length}</span>
      </p>
      {jugadores.length ? (
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-200">
          {jugadores.map((jugador) => (
            <li key={jugador.id} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: jugador.color }}
                aria-hidden
              />
              {jugador.nombre}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Nadie</p>
      )}
    </div>
  );
}
