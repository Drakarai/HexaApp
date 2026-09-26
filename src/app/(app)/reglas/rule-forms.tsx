"use client";

import { useActionState, useState } from "react";
import { createRuleAction, updateRuleAction } from "@/app/actions/rules";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

const BODY_HINT =
  'Cada línea que empiece por "- " se muestra como viñeta. Usa **texto** para negrita.';

export function NewRuleForm({ competitionId }: { competitionId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createRuleAction,
    null,
  );

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Añadir sección de reglas
      </summary>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Título</label>
            <input name="title" className="input" required />
          </div>
          <div>
            <label className="label">Categoría</label>
            <input
              name="category"
              className="input"
              placeholder="Básicas, Jornadas, Puntos…"
            />
          </div>
        </div>
        <div>
          <label className="label">Contenido</label>
          <textarea name="body" className="textarea" rows={6} />
          <p className="mt-1 text-xs text-slate-500">{BODY_HINT}</p>
        </div>
        <FormMessage state={state} />
        <SubmitButton>Añadir sección</SubmitButton>
      </form>
    </details>
  );
}

export function EditRuleForm({
  rule,
  empezado,
}: {
  rule: { id: string; title: string; body: string; category: string | null };
  /** Con el locke en marcha, un cambio se avisa a todos (si no se desmarca) */
  empezado: boolean;
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
        await updateRuleAction(formData);
        setOpen(false);
      }}
      className="mt-4 space-y-3 border-t border-white/10 pt-4"
    >
      <input type="hidden" name="ruleId" value={rule.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Título</label>
          <input name="title" className="input" defaultValue={rule.title} required />
        </div>
        <div>
          <label className="label">Categoría</label>
          <input
            name="category"
            className="input"
            defaultValue={rule.category ?? ""}
          />
        </div>
      </div>
      <div>
        <label className="label">Contenido</label>
        <textarea
          name="body"
          className="textarea"
          rows={8}
          defaultValue={rule.body}
        />
        <p className="mt-1 text-xs text-slate-500">{BODY_HINT}</p>
      </div>
      {empezado ? (
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="avisar"
            defaultChecked
            className="mt-0.5 accent-indigo-500"
          />
          <span>
            Avisar a todos del cambio
            <span className="block text-xs text-slate-500">
              Quítalo si solo corriges una errata: así no le sale a nadie como
              regla cambiada.
            </span>
          </span>
        </label>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
