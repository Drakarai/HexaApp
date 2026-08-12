"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addMatchAction,
  createMatchdayAction,
  setMatchResultAction,
} from "@/app/actions/matchdays";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

type Option = { id: string; displayName: string };

export function NewMatchdayForm({ competitionId }: { competitionId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createMatchdayAction,
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
        Crear jornada
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Nombre</label>
            <input name="label" className="input" placeholder="Jornada 1" required />
          </div>
          <div>
            <label className="label">Hito</label>
            <input name="milestone" className="input" placeholder="2da medalla" />
          </div>
          <div>
            <label className="label">Puntos por victoria</label>
            <input
              name="pointsForWin"
              type="number"
              min={0}
              max={10}
              defaultValue={1}
              className="input"
            />
          </div>
        </div>
        <FormMessage state={state} />
        <SubmitButton>Crear jornada</SubmitButton>
      </form>
    </details>
  );
}

export function AddMatchForm({
  matchdayId,
  participants,
}: {
  matchdayId: string;
  participants: Option[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addMatchAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="matchdayId" value={matchdayId} />
      <div className="min-w-32 flex-1">
        <label className="label">Jugador A</label>
        <select name="participantAId" className="input" defaultValue={participants[0]?.id}>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-32 flex-1">
        <label className="label">Jugador B</label>
        <select name="participantBId" className="input" defaultValue={participants[1]?.id}>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.displayName}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton className="btn-ghost">Añadir combate</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function MatchResultForm({
  match,
}: {
  match: {
    id: string;
    winnerId: string | null;
    pokemonDiff: number | null;
    replayUrl: string | null;
    notes: string | null;
    a: { id: string; name: string };
    b: { id: string; name: string };
  };
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-2"
        onClick={() => setOpen(true)}
      >
        {match.winnerId ? "✎ Cambiar resultado" : "✓ Anotar resultado"}
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await setMatchResultAction(formData);
        setOpen(false);
      }}
      className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-4"
    >
      <input type="hidden" name="matchId" value={match.id} />
      <div>
        <label className="label">Ganador</label>
        <select
          name="winnerId"
          className="input"
          defaultValue={match.winnerId ?? ""}
        >
          <option value="">Sin resultado</option>
          <option value={match.a.id}>{match.a.name}</option>
          <option value={match.b.id}>{match.b.name}</option>
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
          defaultValue={match.pokemonDiff ?? ""}
        />
      </div>
      <div>
        <label className="label">Fecha</label>
        <input name="playedAt" type="date" className="input" />
      </div>
      <div>
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={match.notes ?? ""} />
      </div>
      <div className="sm:col-span-4">
        <label className="label">Enlace del combate</label>
        <input
          name="replayUrl"
          className="input"
          inputMode="url"
          defaultValue={match.replayUrl ?? ""}
          placeholder="https://replay.pokemonshowdown.com/..."
        />
        <p className="mt-1 text-xs text-slate-500">
          Pega aquí la repetición de Showdown o el vídeo. Si lo dejas vacío, no
          sale el botón de &quot;Ver combate&quot;.
        </p>
      </div>
      <div className="flex gap-2 sm:col-span-4">
        <SubmitButton>Guardar resultado</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
