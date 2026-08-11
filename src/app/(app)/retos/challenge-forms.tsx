"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createChallengeAction,
  setChallengeResultAction,
} from "@/app/actions/challenges";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

type Opcion = { id: string; displayName: string };

export function NewChallengeForm({
  competitionId,
  participants,
}: {
  competitionId: string;
  participants: Opcion[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createChallengeAction,
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
        Crear reto
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Jugador A</label>
            <select
              name="participantAId"
              className="input"
              defaultValue={participants[0]?.id}
            >
              {participants.map((jugador) => (
                <option key={jugador.id} value={jugador.id}>
                  {jugador.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Jugador B</label>
            <select
              name="participantBId"
              className="input"
              defaultValue={participants[1]?.id}
            >
              {participants.map((jugador) => (
                <option key={jugador.id} value={jugador.id}>
                  {jugador.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Premio</label>
            <input
              name="prize"
              className="input"
              placeholder="Elige un pokémon del rival"
            />
          </div>
          <div>
            <label className="label">Castigo</label>
            <input
              name="punishment"
              className="input"
              placeholder="Libera a su inicial"
            />
          </div>
        </div>
        <FormMessage state={state} />
        <SubmitButton>Crear reto</SubmitButton>
      </form>
    </details>
  );
}

export function ChallengeResultForm({
  reto,
}: {
  reto: {
    id: string;
    winnerId: string | null;
    pokemonDiff: number | null;
    prize: string | null;
    punishment: string | null;
    notes: string | null;
    a: { id: string; name: string };
    b: { id: string; name: string };
  };
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-2"
        onClick={() => setAbierto(true)}
      >
        {reto.winnerId ? "✎ Cambiar resultado" : "✓ Anotar resultado"}
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await setChallengeResultAction(formData);
        setAbierto(false);
      }}
      className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-3"
    >
      <input type="hidden" name="challengeId" value={reto.id} />
      <div>
        <label className="label">Ganador</label>
        <select
          name="winnerId"
          className="input"
          defaultValue={reto.winnerId ?? ""}
        >
          <option value="">Sin resultado</option>
          <option value={reto.a.id}>{reto.a.name}</option>
          <option value={reto.b.id}>{reto.b.name}</option>
        </select>
      </div>
      <div>
        <label className="label">Dif. pokémon</label>
        <input
          name="pokemonDiff"
          type="number"
          min={0}
          max={6}
          className="input"
          defaultValue={reto.pokemonDiff ?? ""}
        />
      </div>
      <div>
        <label className="label">Fecha</label>
        <input name="playedAt" type="date" className="input" />
      </div>
      <div>
        <label className="label">Premio</label>
        <input
          name="prize"
          className="input"
          defaultValue={reto.prize ?? ""}
          placeholder="Elige un pokémon del rival"
        />
      </div>
      <div>
        <label className="label">Castigo</label>
        <input
          name="punishment"
          className="input"
          defaultValue={reto.punishment ?? ""}
          placeholder="Libera a su inicial"
        />
      </div>
      <div>
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={reto.notes ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-3">
        <SubmitButton>Guardar resultado</SubmitButton>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setAbierto(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
