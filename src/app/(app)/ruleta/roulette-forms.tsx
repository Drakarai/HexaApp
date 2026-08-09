"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addOptionAction,
  createRouletteAction,
  updateRouletteAction,
} from "@/app/actions/roulette";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

export function NewRouletteForm({ competitionId }: { competitionId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createRouletteAction,
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
        Crear una ruleta nueva
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input
              name="name"
              className="input"
              placeholder="Castigos de la jornada"
              required
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input name="description" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Opciones (una por línea)</label>
          <textarea
            name="options"
            className="textarea"
            rows={6}
            placeholder={"Monotipo la próxima ruta\nSin objetos en el gimnasio\nRegalar un pokémon"}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="allowRepeats"
            defaultChecked
            className="accent-indigo-500"
          />
          Permitir que una opción salga más de una vez
        </label>
        <FormMessage state={state} />
        <SubmitButton>Crear ruleta</SubmitButton>
      </form>
    </details>
  );
}

export function AddOptionForm({ rouletteId }: { rouletteId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addOptionAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="rouletteId" value={rouletteId} />
      <div className="min-w-40 flex-1">
        <label className="label">Nueva opción</label>
        <input name="label" className="input" placeholder="Texto de la opción" required />
      </div>
      <div className="w-20">
        <label className="label">Peso</label>
        <input
          name="weight"
          type="number"
          min={1}
          max={100}
          defaultValue={1}
          className="input"
        />
      </div>
      <div className="w-16">
        <label className="label">Color</label>
        <input
          name="color"
          type="color"
          defaultValue="#6366f1"
          className="input h-9.5 p-1"
        />
      </div>
      <SubmitButton className="btn-ghost">Añadir</SubmitButton>
    </form>
  );
}

export function RouletteSettingsForm({
  roulette,
}: {
  roulette: {
    id: string;
    name: string;
    description: string | null;
    allowRepeats: boolean;
    spinSeconds: number;
  };
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setOpen(true)}
      >
        ⚙ Ajustes de la ruleta
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateRouletteAction(formData);
        setOpen(false);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="rouletteId" value={roulette.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input name="name" className="input" defaultValue={roulette.name} />
        </div>
        <div>
          <label className="label">Descripción</label>
          <input
            name="description"
            className="input"
            defaultValue={roulette.description ?? ""}
          />
        </div>
      </div>
      <div className="w-40">
        <label className="label">Duración del giro (s)</label>
        <input
          name="spinSeconds"
          type="number"
          min={1}
          max={30}
          className="input"
          defaultValue={roulette.spinSeconds}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="allowRepeats"
          defaultChecked={roulette.allowRepeats}
          className="accent-indigo-500"
        />
        Permitir repeticiones
      </label>
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
