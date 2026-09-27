"use client";

import { useActionState } from "react";
import {
  aligerarCopiasAction,
  deduplicarAction,
  limpiarHuerfanasAction,
} from "@/app/actions/almacen";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { Icono } from "@/components/icono";

/**
 * Los dos botones del almacén de imágenes.
 *
 * El de repartir se puede pulsar las veces que haga falta: solo toca lo que
 * todavía lleva la imagen dentro de la fila, así que la segunda vez no hace
 * nada. El de limpiar tira lo que ya no usa nadie.
 */
export function MantenimientoDelAlmacen({
  copiasPesadas,
}: {
  /** Cuántas copias guardadas llevan todavía las imágenes dentro */
  copiasPesadas: number;
}) {
  const [repartido, repartir] = useActionState<FormState, FormData>(
    deduplicarAction,
    null,
  );
  const [limpiado, limpiar] = useActionState<FormState, FormData>(
    limpiarHuerfanasAction,
    null,
  );
  const [aligerado, aligerar] = useActionState<FormState, FormData>(
    aligerarCopiasAction,
    null,
  );

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
        Mantenimiento
      </h3>
      <div className="flex flex-wrap gap-2">
        <form action={repartir}>
          <SubmitButton className="btn-primary btn-sm">
            <Icono emoji="📦" /> Guardar cada imagen una sola vez
          </SubmitButton>
        </form>
        <form action={limpiar}>
          <SubmitButton className="btn-ghost btn-sm">
            <Icono emoji="🧹" /> Tirar las que ya no usa nadie
          </SubmitButton>
        </form>
      </div>
      <div className="mt-2 space-y-1">
        <FormMessage state={repartido} />
        <FormMessage state={limpiado} />
      </div>

      {copiasPesadas ? (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3">
          <p className="text-sm text-slate-200">
            <strong>
              {copiasPesadas}{" "}
              {copiasPesadas === 1 ? "copia lleva" : "copias llevan"} las
              imágenes dentro.
            </strong>{" "}
            Son de antes del almacén, y guardan otra vez todas las imágenes que
            ya están aquí al lado. Es lo que más ocupa de toda la base de datos.
          </p>
          <form action={aligerar} className="mt-2">
            <SubmitButton className="btn-primary btn-sm">
              <Icono emoji="🪶" /> Aligerar una copia
            </SubmitButton>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Va de una en una porque cada copia son decenas de megas: pulsa una
            vez por copia. No se pierde ninguna y se siguen pudiendo restaurar y
            descargar igual.
          </p>
        </div>
      ) : null}
      <div className="mt-2">
        <FormMessage state={aligerado} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        El mismo sprite se guardaba una vez por fila: Garchomp entero en cada
        combate, en cada baja y en cada bote. Esto lo deja guardado una sola vez
        y hace que las filas apunten a él. No se pierde ninguna imagen, y se
        puede pulsar las veces que quieras.
      </p>
    </div>
  );
}
