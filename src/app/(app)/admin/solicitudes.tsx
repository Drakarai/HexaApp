"use client";

import {
  aceptarSolicitudAction,
  rechazarSolicitudAction,
} from "@/app/actions/solicitudes";
import { Avatar } from "@/components/ui";
import { nombreDelJuego } from "@/lib/juegos";
import { formatDate } from "@/lib/utils";

/**
 * Las peticiones de locke en solitario que esperan respuesta.
 *
 * Se resuelven aquí con un botón en vez de por WhatsApp, y el mismo campo de
 * texto vale para las dos: al aceptar es un recado y al rechazar es el motivo,
 * que es lo que el otro necesita leer para saber a qué atenerse.
 */
export function SolicitudesPendientes({
  solicitudes,
}: {
  solicitudes: Array<{
    id: string;
    name: string;
    gameId: string | null;
    maxPlayers: number;
    modality: string | null;
    description: string | null;
    createdAt: Date;
    user: { id: string; displayName: string; username: string };
  }>;
}) {
  if (!solicitudes.length) return null;

  return (
    <section className="card mb-6 border-amber-400/30 bg-amber-400/[0.03]">
      <h2 className="section-title mb-1">
        Lockes en solitario por responder ({solicitudes.length})
      </h2>
      <p className="muted mb-4">
        Al aceptar se crea la edición con esa persona dentro como única jugadora
        y administradora de la suya. No se archiva ninguna de las que estén en
        curso.
      </p>

      <ul className="space-y-3">
        {solicitudes.map((solicitud) => (
          <li
            key={solicitud.id}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Avatar
                name={solicitud.user.displayName}
                color="#f59e0b"
                size={30}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  {solicitud.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {solicitud.user.displayName} (@{solicitud.user.username}) ·{" "}
                  {formatDate(solicitud.createdAt)}
                  {nombreDelJuego(solicitud.gameId, null)
                    ? ` · ${nombreDelJuego(solicitud.gameId, null)}`
                    : ""}
                  {solicitud.modality ? ` · ${solicitud.modality}` : ""}
                  {solicitud.maxPlayers > 1
                    ? ` · para ${solicitud.maxPlayers} jugadores`
                    : " · en solitario"}
                </p>
              </div>
            </div>

            {solicitud.description ? (
              <p className="mt-2 text-sm text-slate-400">
                {solicitud.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/5 pt-3">
              <div className="min-w-52 flex-1">
                <label className="label">Un recado, o el motivo si dices que no</label>
                <input
                  name="respuesta"
                  form={`solicitud-${solicitud.id}`}
                  className="input"
                  placeholder="Opcional"
                />
              </div>
              {/* Los dos botones mandan el mismo formulario a acciones
                  distintas con formAction: así el texto se escribe una vez */}
              <form
                id={`solicitud-${solicitud.id}`}
                action={aceptarSolicitudAction}
                className="flex gap-2"
              >
                <input type="hidden" name="solicitudId" value={solicitud.id} />
                <button type="submit" className="btn-primary btn-sm">
                  Aceptar
                </button>
                <button
                  type="submit"
                  formAction={rechazarSolicitudAction}
                  className="btn-ghost btn-sm text-red-300"
                >
                  Rechazar
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
