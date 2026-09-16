"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { apuntarLockeDeAntesAction } from "@/app/actions/lockes-de-antes";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

export type CuentaParaElegir = {
  id: string;
  displayName: string;
  username: string;
};

/**
 * Apuntar un locke que se jugó antes de que existiera la aplicación.
 *
 * Solo pide lo que de verdad se recuerda: nombre, juego, cuándo fue y quién
 * ganó. Lo demás —bajas, combates, puntos— no se pregunta porque no se puede
 * saber, y en el palmarés esas líneas salen con las cifras en blanco.
 */
export function ApuntarLockeDeAntesForm({
  cuentas,
  deEntrada,
}: {
  cuentas: CuentaParaElegir[];
  /**
   * Quiénes vienen marcados de entrada: los del locke que se está jugando
   * ahora. Un locke de antes lo jugó casi siempre la misma gente, y marcarlo
   * todo por defecto colaba cuentas que no pintaban nada —la de Administrador,
   * sin ir más lejos—, que además es quien acabaría viéndolo.
   */
  deEntrada: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    apuntarLockeDeAntesAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [ganadorId, setGanadorId] = useState(cuentas[0]?.id ?? "");

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setAbierto(false);
    }
  }, [state]);

  if (!cuentas.length) return null;

  return (
    <details
      className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-3"
      open={abierto}
      onToggle={(event) => setAbierto(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        ▸ Apuntar un locke de antes
      </summary>

      <form ref={formRef} action={formAction} className="mt-3 space-y-3">
        <p className="text-xs text-slate-500">
          Para los lockes que jugasteis antes de tener esto. Solo quedará la
          línea del palmarés: de aquello no hay bajas ni combates que contar.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input
              name="nombre"
              className="input"
              placeholder="Hexalocke 1"
              required
            />
          </div>
          <div>
            <label className="label">Juego (opcional)</label>
            <input name="juego" className="input" placeholder="HeartGold" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Cuándo fue</label>
            <input name="cuando" type="date" className="input" required />
          </div>
          <div>
            <label className="label">Lo ganó</label>
            <select
              name="ganadorId"
              className="input"
              value={ganadorId}
              onChange={(event) => setGanadorId(event.target.value)}
            >
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Subcampeón (opcional)</label>
            <select name="subcampeonId" className="input" defaultValue="">
              <option value="">Nadie / no me acuerdo</option>
              {cuentas
                .filter((cuenta) => cuenta.id !== ganadorId)
                .map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.displayName}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="label">Quiénes lo jugaron</legend>
          {/**
           * No es decorativo: **decide quién ve este locke en su palmarés**. Si
           * lo viera todo el mundo, alguien que monta su propio locke se
           * encontraría el histórico de un grupo con el que no tiene nada que
           * ver. Al ganador se le añade solo en el servidor.
           */}
          <p className="mb-2 text-xs text-slate-500">
            Solo ellos lo verán en su palmarés. Vienen marcados los del locke
            de ahora; al ganador se le apunta solo.
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {cuentas.map((cuenta) => (
              <label
                key={cuenta.id}
                className="flex items-center gap-2 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  name="jugadoresIds"
                  value={cuenta.id}
                  defaultChecked={deEntrada.includes(cuenta.id)}
                />
                <span className="min-w-0 truncate">
                  {cuenta.displayName}{" "}
                  <span className="text-slate-500">@{cuenta.username}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label">Notas (opcional)</label>
          <input
            name="notas"
            className="input"
            placeholder="Se jugó en un grupo de WhatsApp…"
          />
        </div>

        <FormMessage state={state} />
        <SubmitButton className="btn-primary btn-sm">
          Apuntar en el palmarés
        </SubmitButton>
      </form>
    </details>
  );
}
