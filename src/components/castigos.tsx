import Link from "next/link";
import { Avatar } from "@/components/ui";
import { ocultarCastigoAction } from "@/app/actions/challenges";
import type { CastigoPendiente } from "@/lib/premios";
import { formatDate } from "@/lib/utils";

/**
 * Los castigos de los retos perdidos, anunciados a todo el grupo.
 *
 * Estaban solo dentro de la ficha de su reto, entre el premio, la diferencia y
 * los equipos, así que se perdían: de un castigo tiene que enterarse todo el
 * mundo, que para eso se apuesta. Aquí salen sueltos hasta que un
 * administrador los quita —el castigo no se borra, solo se deja de anunciar.
 */
export function Castigos({
  castigos,
  canManage,
}: {
  castigos: CastigoPendiente[];
  canManage: boolean;
}) {
  if (!castigos.length) return null;

  return (
    <section className="card mt-6 border-red-500/20 bg-red-500/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-title">Castigos por cumplir</h2>
        <Link href="/retos" className="text-xs text-brand-400 hover:underline">
          Ver los retos →
        </Link>
      </div>

      <ul className="space-y-2">
        {castigos.map((castigo) => (
          <li
            key={castigo.challengeId}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2"
          >
            <Avatar
              name={castigo.displayName}
              color={castigo.color}
              size={28}
              participantId={castigo.participantId}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-red-100">
                <span className="font-semibold">{castigo.displayName}</span>{" "}
                <span className="text-red-300/80">·</span> {castigo.castigo}
              </p>
              {castigo.cuando ? (
                <p className="text-xs text-slate-500">
                  Perdió el {formatDate(castigo.cuando)}
                </p>
              ) : null}
            </div>
            {canManage ? (
              <form action={ocultarCastigoAction}>
                <input
                  type="hidden"
                  name="challengeId"
                  value={castigo.challengeId}
                />
                <button
                  type="submit"
                  className="rounded-lg px-2 py-1 text-xs text-red-300/70 transition hover:bg-red-500/15 hover:text-red-100"
                  title="Dejar de anunciarlo"
                >
                  Cumplido ✓
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
