"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  adjustAllPointsAction,
  adjustPointsAction,
} from "@/app/actions/points";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

export function PointsForms({
  competitionId,
  participants,
}: {
  competitionId: string;
  participants: Array<{ id: string; displayName: string }>;
}) {
  const [singleState, singleAction] = useActionState<FormState, FormData>(
    adjustPointsAction,
    null,
  );
  const [allState, allAction] = useActionState<FormState, FormData>(
    adjustAllPointsAction,
    null,
  );
  const singleRef = useRef<HTMLFormElement>(null);
  const allRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (singleState?.success) singleRef.current?.reset();
  }, [singleState]);

  useEffect(() => {
    if (allState?.success) allRef.current?.reset();
  }, [allState]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card">
        <h2 className="section-title mb-4">Sumar o restar puntos</h2>
        <form ref={singleRef} action={singleAction} className="space-y-3">
          <input type="hidden" name="competitionId" value={competitionId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Jugador</label>
              <select name="participantId" className="input" required>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Puntos</label>
              <input
                name="delta"
                type="number"
                className="input"
                placeholder="1 o -1"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Motivo</label>
            <input
              name="reason"
              className="input"
              placeholder="Victoria en la jornada 2"
              required
            />
          </div>
          <FormMessage state={singleState} />
          <SubmitButton>Aplicar</SubmitButton>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">Aplicar a todos</h2>
        <p className="muted mb-3">
          Útil para bonificaciones o penalizaciones colectivas.
        </p>
        <form ref={allRef} action={allAction} className="space-y-3">
          <input type="hidden" name="competitionId" value={competitionId} />
          <div>
            <label className="label">Puntos para cada jugador</label>
            <input
              name="delta"
              type="number"
              className="input"
              placeholder="1 o -1"
              required
            />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input
              name="reason"
              className="input"
              placeholder="Ajuste global"
              required
            />
          </div>
          <FormMessage state={allState} />
          <SubmitButton className="btn-ghost">Aplicar a todos</SubmitButton>
        </form>
      </section>
    </div>
  );
}
