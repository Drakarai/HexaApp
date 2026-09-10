import Link from "next/link";
import type { ProgresoEnSolitario } from "@/lib/solitario";
import { cx } from "@/lib/utils";

/**
 * La portada de una partida en solitario.
 *
 * Donde en un locke de grupo va la clasificación, aquí va **cómo llevas tu
 * run**: cuántos hitos has pasado, cuál es el siguiente y con qué nivel máximo,
 * cuántos has perdido por el camino y por cuánto mapa has pasado. No hay tabla
 * porque no hay contra quién: lo que se mira es el progreso.
 */
export function ResumenEnSolitario({
  progreso,
}: {
  progreso: ProgresoEnSolitario;
}) {
  const { hitos, siguiente, caidos, zonas, ligaSuperada } = progreso;
  const porcentaje = hitos.total
    ? Math.round((hitos.hechos / hitos.total) * 100)
    : 0;

  return (
    <>
      {ligaSuperada ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          <span aria-hidden>🏆</span>
          <span>
            <strong className="font-semibold">Locke terminado.</strong> Te has
            pasado la Liga con {caidos}{" "}
            {caidos === 1 ? "caído" : "caídos"} por el camino. Rellena tu equipo
            en el hall de la fama.
          </span>
        </p>
      ) : null}

      <div className="mb-4">
        <div className="mb-2 flex items-end justify-between gap-2">
          <p className="text-sm text-slate-300">
            {hitos.hechos} de {hitos.total} hitos
          </p>
          <p className="text-xs text-slate-500">{porcentaje}%</p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-white/10"
          role="img"
          aria-label={`${hitos.hechos} de ${hitos.total} hitos superados`}
        >
          <div
            className={cx(
              "h-full rounded-full transition-[width]",
              ligaSuperada ? "bg-amber-400" : "bg-brand-500",
            )}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {siguiente ? (
        <Link
          href="/level-caps"
          className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-brand-500/40 hover:bg-ink-850"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-lg font-black text-white">
            {siguiente.cap}
          </span>
          <span className="min-w-0">
            <span className="block text-xs uppercase tracking-wide text-slate-500">
              Te toca
            </span>
            <span className="block truncate font-medium text-white">
              {siguiente.label}
            </span>
            {siguiente.notes ? (
              <span className="block truncate text-xs text-slate-500">
                {siguiente.notes}
              </span>
            ) : null}
          </span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Dato href="/muertes" valor={caidos} etiqueta="Pokémon caídos" icono="💀" />
        <Dato
          href="/mapa"
          valor={zonas.total ? `${zonas.visitadas}/${zonas.total}` : zonas.visitadas}
          etiqueta="Zonas con captura"
          icono="🗺️"
        />
      </div>
    </>
  );
}

function Dato({
  href,
  valor,
  etiqueta,
  icono,
}: {
  href: string;
  valor: number | string;
  etiqueta: string;
  icono: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-brand-500/40 hover:bg-ink-850"
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">
        <span className="mr-1" aria-hidden>
          {icono}
        </span>
        {etiqueta}
      </p>
      <p className="mt-1 text-2xl font-bold text-white">{valor}</p>
    </Link>
  );
}
