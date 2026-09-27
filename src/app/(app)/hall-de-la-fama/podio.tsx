import { Avatar } from "@/components/ui";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

export type { EnElPodio } from "@/lib/hall";
import type { EnElPodio } from "@/lib/hall";

const CAJONES = [
  {
    alto: "h-24",
    medalla: "🥇",
    borde: "border-amber-400/40 bg-amber-400/10",
    numero: "text-amber-300/70",
  },
  {
    alto: "h-16",
    medalla: "🥈",
    borde: "border-slate-300/30 bg-slate-300/10",
    numero: "text-slate-300/60",
  },
  {
    alto: "h-11",
    medalla: "🥉",
    borde: "border-orange-400/30 bg-orange-400/10",
    numero: "text-orange-300/60",
  },
];

/**
 * El podio del final del locke.
 *
 * Se dibuja en el orden de siempre —2º, 1º, 3º— **con orden de CSS**, no
 * reordenando la lista: así en el móvil, donde los cajones se ponen en fila
 * igual, el que lee un lector de pantalla sigue siendo 1º, 2º, 3º.
 *
 * Aguanta con uno solo (un locke de dos no tiene tercero) porque el número de
 * cajones sale de lo que se le pase, no de un tres escrito a mano.
 */
export function Podio({ podio }: { podio: EnElPodio[] }) {
  if (!podio.length) return null;
  const orden = [2, 1, 3];

  return (
    <section className="card mb-6">
      <ol className="flex items-end justify-center gap-2 sm:gap-4">
        {podio.map((quien) => {
          const cajon = CAJONES[quien.puesto - 1] ?? CAJONES[2];
          return (
            <li
              key={quien.participantId}
              className="flex min-w-0 flex-1 flex-col items-center"
              style={{ order: orden[quien.puesto - 1] ?? quien.puesto }}
            >
              <span className="text-2xl sm:text-3xl" aria-hidden>
                <Icono emoji={cajon.medalla} />
              </span>
              <div className="my-2">
                <Avatar
                  name={quien.displayName}
                  color={quien.color}
                  image={quien.avatarImage}
                  size={quien.puesto === 1 ? 56 : 44}
                  participantId={quien.participantId}
                />
              </div>
              <p
                className={cx(
                  "w-full truncate text-center font-bold text-white",
                  quien.puesto === 1 ? "text-base sm:text-lg" : "text-sm",
                )}
              >
                {quien.displayName}
              </p>
              {/* Sin truncar: "Tercero en la tabla" no cabe en una columna de
                  un tercio de móvil y se quedaba en "Tercero en la ta…" */}
              <p className="w-full text-center text-[11px] leading-tight text-slate-500">
                {quien.titulo}
              </p>
              {/**
               * El cajón, con su número dentro. Vacío eran tres rectángulos
               * oscuros que parecían algo que no había cargado; con el número
               * se lee de un vistazo que es un podio. Sigue siendo decorativo:
               * lo que cuenta está escrito arriba.
               */}
              <div
                className={cx(
                  "mt-2 flex w-full items-center justify-center rounded-t-lg border border-b-0",
                  cajon.alto,
                  cajon.borde,
                )}
                aria-hidden
              >
                <span
                  className={cx(
                    "font-black leading-none",
                    quien.puesto === 1 ? "text-3xl" : "text-2xl",
                    cajon.numero,
                  )}
                >
                  {quien.puesto}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-center text-xs text-slate-500">
        {podio[0].comoLoGano}
      </p>
    </section>
  );
}
