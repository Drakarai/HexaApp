"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createDeathAction } from "@/app/actions/deaths";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { ImageInput } from "@/components/image-input";
import { IMAGE_SIZES } from "@/lib/image";

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
  // La clave fuerza a recrear el selector de imagen tras guardar, para que la
  // vista previa no se quede con el sprite de la baja anterior.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setResetKey((key) => key + 1);
    }
  }, [state]);

  return (
    <details className="card group">
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

        <div className="grid gap-3 sm:grid-cols-4">
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
          <div>
            <label className="label">Causa (opcional)</label>
            <input name="cause" className="input" placeholder="Crítico de Scyther" />
          </div>
        </div>

        <ImageInput
          key={resetKey}
          name="boxImage"
          label="Sprite para la caja"
          maxSize={IMAGE_SIZES.box}
          hint="La imagen que se verá en la cuadrícula. Luego podrás poner otra distinta en la ficha."
        />

        <FormMessage state={state} />
        <SubmitButton>Registrar baja</SubmitButton>
      </form>
    </details>
  );
}
