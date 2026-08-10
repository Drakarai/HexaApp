"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createLevelCapAction,
  updateLevelCapAction,
} from "@/app/actions/level-caps";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { ImageListInput } from "@/components/image-list-input";
import { IMAGE_SIZES } from "@/lib/image";
import { LEVEL_CAP_KIND_LABELS } from "@/lib/constants";

const KINDS = Object.entries(LEVEL_CAP_KIND_LABELS);

export function NewLevelCapForm({ competitionId }: { competitionId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createLevelCapAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Reinicia el selector de imagen tras guardar, para que no se quede la
  // medalla del level cap anterior
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
        Añadir level cap
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Líder / hito</label>
            <input name="label" className="input" placeholder="Pegaso" required />
          </div>
          <div>
            <label className="label">Nivel máximo</label>
            <input
              name="cap"
              type="number"
              min={1}
              max={100}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select name="kind" className="input" defaultValue="GYM">
              {KINDS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Medalla / ciudad</label>
            <input name="badge" className="input" placeholder="Medalla Céfiro" />
          </div>
          <div>
            <label className="label">Notas</label>
            <input name="notes" className="input" />
          </div>
        </div>
        <ImageListInput
          key={resetKey}
          name="images"
          label="Medallas o líderes"
          maxSize={IMAGE_SIZES.badge}
          hint="Se ve grande junto al nivel, y de fondo difuminado en la tarjeta."
        />
        <FormMessage state={state} />
        <SubmitButton>Añadir</SubmitButton>
      </form>
    </details>
  );
}

export function EditLevelCapForm({
  levelCap,
}: {
  levelCap: {
    id: string;
    label: string;
    cap: number;
    kind: string;
    badge: string | null;
    notes: string | null;
    images: string[];
  };
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-4"
        onClick={() => setOpen(true)}
      >
        ✎ Editar
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateLevelCapAction(formData);
        setOpen(false);
      }}
      className="mt-4 space-y-3 border-t border-white/10 pt-4"
    >
      <input type="hidden" name="levelCapId" value={levelCap.id} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">Líder / hito</label>
          <input name="label" className="input" defaultValue={levelCap.label} />
        </div>
        <div>
          <label className="label">Nivel máximo</label>
          <input
            name="cap"
            type="number"
            min={1}
            max={100}
            className="input"
            defaultValue={levelCap.cap}
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select name="kind" className="input" defaultValue={levelCap.kind}>
            {KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Medalla / ciudad</label>
          <input name="badge" className="input" defaultValue={levelCap.badge ?? ""} />
        </div>
        <div>
          <label className="label">Notas</label>
          <input name="notes" className="input" defaultValue={levelCap.notes ?? ""} />
        </div>
      </div>
      <ImageListInput
        name="images"
        label="Medallas o líderes"
        defaultValues={levelCap.images}
        maxSize={IMAGE_SIZES.badge}
        hint="Se ve grande junto al nivel, y de fondo difuminado en la tarjeta."
      />
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
