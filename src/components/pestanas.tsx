"use client";

import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";

export type Pestana<T extends string> = { valor: T; rotulo: string; icono?: string; cuenta?: number };

/**
 * Pestañas de una pantalla o de una ficha: la misma pastilla que «Por peligro /
 * Por tipo» de la cobertura, para que todas las que hay en la aplicación se
 * parezcan. Se usa para partir lo que ha crecido demasiado (la ficha de un
 * pokémon, Diagnóstico, el editor de equipos) en trozos que quepan de un
 * vistazo.
 */
export function Pestanas<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
  ancha = false,
  className,
}: {
  opciones: Pestana<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
  etiqueta: string;
  /** Que ocupe todo el ancho, repartido a partes iguales */
  ancha?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className={cx(
        "flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-1",
        ancha ? "w-full" : "w-fit max-w-full",
        className,
      )}
    >
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambiar(opcion.valor)}
            className={cx(
              "flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
              ancha && "flex-1",
              activa
                ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {opcion.icono ? <Icono emoji={opcion.icono} tamano={14} /> : null}
            {opcion.rotulo}
            {opcion.cuenta ? (
              <span className="rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums text-slate-300">
                {opcion.cuenta}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
