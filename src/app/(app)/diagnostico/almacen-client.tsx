"use client";

import { useActionState } from "react";
import {
  deduplicarAction,
  limpiarHuerfanasAction,
} from "@/app/actions/almacen";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

/**
 * Los dos botones del almacén de imágenes.
 *
 * El de repartir se puede pulsar las veces que haga falta: solo toca lo que
 * todavía lleva la imagen dentro de la fila, así que la segunda vez no hace
 * nada. El de limpiar tira lo que ya no usa nadie.
 */
export function MantenimientoDelAlmacen() {
  const [repartido, repartir] = useActionState<FormState, FormData>(
    deduplicarAction,
    null,
  );
  const [limpiado, limpiar] = useActionState<FormState, FormData>(
    limpiarHuerfanasAction,
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
            📦 Guardar cada imagen una sola vez
          </SubmitButton>
        </form>
        <form action={limpiar}>
          <SubmitButton className="btn-ghost btn-sm">
            🧹 Tirar las que ya no usa nadie
          </SubmitButton>
        </form>
      </div>
      <div className="mt-2 space-y-1">
        <FormMessage state={repartido} />
        <FormMessage state={limpiado} />
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
