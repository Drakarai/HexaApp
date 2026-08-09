"use client";

import { useActionState } from "react";
import { createFirstAdminAction } from "@/app/actions/setup";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

export function SetupForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    createFirstAdminAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="displayName">
          Tu nombre
        </label>
        <input
          id="displayName"
          name="displayName"
          className="input"
          placeholder="Draka"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="username">
          Usuario para entrar
        </label>
        <input
          id="username"
          name="username"
          className="input"
          placeholder="draka"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          minLength={6}
          autoComplete="new-password"
          required
        />
        <p className="mt-1 text-xs text-slate-500">Mínimo 6 caracteres.</p>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
        <input
          type="checkbox"
          name="sample"
          defaultChecked
          className="mt-0.5 accent-indigo-500"
        />
        <span>
          Cargar la competición de ejemplo
          <span className="block text-xs text-slate-500">
            Crea el Hexalocke 2 con sus reglas, los 10 level caps y dos ruletas.
            Todo es editable y puedes borrarlo cuando quieras.
          </span>
        </span>
      </label>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingLabel="Creando…">
        Crear mi cuenta y empezar
      </SubmitButton>
    </form>
  );
}
