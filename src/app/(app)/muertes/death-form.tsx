"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createDeathAction } from "@/app/actions/deaths";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { SitioPicker } from "@/components/sitio-picker";
import type { ZonaParaElegir } from "@/lib/mapas";

export function NewDeathForm({
  participants,
  defaultParticipantId,
  lockedToParticipantId,
  zonas,
  abiertoDeEntrada = false,
}: {
  participants: Array<{ id: string; displayName: string }>;
  defaultParticipantId: string;
  /** Si el usuario no es admin, solo puede registrar sus propias muertes. */
  lockedToParticipantId: string | null;
  /** Las zonas del mapa de esta región, para decir dónde cayó */
  zonas: ZonaParaElegir[];
  /** Llega con el formulario ya desplegado, desde el botón de apuntar */
  abiertoDeEntrada?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createDeathAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const detallesRef = useRef<HTMLDetailsElement>(null);
  // La clave fuerza a recrear el selector de imagen tras guardar, para que la
  // vista previa no se quede con el sprite de la baja anterior.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setResetKey((key) => key + 1);
    }
  }, [state]);

  // Viniendo del botón de apuntar el formulario ya está abierto, pero queda
  // debajo de los filtros de jugador: sin esto habría que buscarlo bajando.
  useEffect(() => {
    if (abiertoDeEntrada) {
      detallesRef.current?.scrollIntoView({ block: "center" });
    }
  }, [abiertoDeEntrada]);

  return (
    <details className="card group" open={abiertoDeEntrada} ref={detallesRef}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Registrar una baja
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        {lockedToParticipantId ? (
          <input
            type="hidden"
            name="participantId"
            value={lockedToParticipantId}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {lockedToParticipantId ? null : (
            <div>
              <label className="label">Jugador</label>
              <select
                name="participantId"
                className="input"
                defaultValue={defaultParticipantId}
              >
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Mote</label>
            <input name="nickname" className="input" placeholder="Chispas" />
          </div>
          <div>
            <label className="label">Causa (opcional)</label>
            <input name="cause" className="input" placeholder="Crítico de Scyther" />
          </div>
        </div>

        <SitioPicker zonas={zonas} label="Dónde cayó (opcional)" />

        {/* La clave lo reinicia tras guardar, para que no se quede el pokémon
            anterior en el buscador ni en las vistas previas */}
        <SpeciesPicker key={resetKey} />

        <FormMessage state={state} />
        <SubmitButton>Registrar baja</SubmitButton>
      </form>
    </details>
  );
}
