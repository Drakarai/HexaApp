"use client";

import { useActionState, useRef, useEffect } from "react";
import { createDeathAction } from "@/app/actions/deaths";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

export function NewDeathForm({
  participants,
  defaultParticipantId,
  lockedToParticipantId,
}: {
  participants: Array<{ id: string; displayName: string }>;
  defaultParticipantId: string;
  /** Si el usuario no es admin, solo puede registrar sus propias muertes. */
  lockedToParticipantId: string | null;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createDeathAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Registrar una muerte
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
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
            <label className="label">Especie</label>
            <input name="species" className="input" placeholder="Quilava" required />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Nivel</label>
            <input name="level" type="number" min={1} max={100} className="input" />
          </div>
          <div>
            <label className="label">Dónde</label>
            <input name="location" className="input" placeholder="Gimnasio de Azalea" />
          </div>
          <div>
            <label className="label">Causa</label>
            <input name="cause" className="input" placeholder="Crítico de Scyther" />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input name="diedAt" type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <input name="notes" className="input" placeholder="Opcional" />
        </div>

        <FormMessage state={state} />
        <SubmitButton>Registrar baja</SubmitButton>
      </form>
    </details>
  );
}
