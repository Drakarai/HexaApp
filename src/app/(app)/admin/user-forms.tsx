"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createUserAction,
  resetUserPasswordAction,
} from "@/app/actions/users";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { ROLES } from "@/lib/constants";

/**
 * Alta de una cuenta. El desplegable de rol **solo lo ve un administrador
 * global**: un organizador da de alta a su gente como jugadores, y el
 * servidor lo comprueba igual aunque el desplegable aparezca.
 */
export function NewUserForm({ puedeElegirRol = true }: { puedeElegirRol?: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createUserAction,
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
        Crear usuario
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Usuario</label>
            <input
              name="username"
              className="input"
              placeholder="draka"
              autoCapitalize="none"
              required
            />
          </div>
          <div>
            <label className="label">Nombre visible</label>
            <input name="displayName" className="input" required />
          </div>
          <div>
            <label className="label">Contraseña inicial</label>
            <input name="password" type="text" className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {puedeElegirRol ? (
              <div>
                <label className="label">Rol</label>
                <select name="role" className="input" defaultValue={ROLES.PLAYER}>
                  <option value={ROLES.PLAYER}>Jugador</option>
                  <option value={ROLES.CREADOR}>Creador</option>
                </select>
              </div>
            ) : null}
            <div>
              <label className="label">Color</label>
              <input
                name="avatarColor"
                type="color"
                defaultValue="#6366f1"
                className="input h-9.5 p-1"
              />
            </div>
          </div>
        </div>
        <FormMessage state={state} />
        <SubmitButton>Crear usuario</SubmitButton>
      </form>
    </details>
  );
}

export function ResetPasswordForm({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    resetUserPasswordAction,
    null,
  );

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-2"
        onClick={() => setOpen(true)}
      >
        🔑 Cambiar contraseña
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-white/10 pt-3">
      <input type="hidden" name="userId" value={userId} />
      <label className="label">Nueva contraseña de @{username}</label>
      <div className="flex flex-wrap gap-2">
        <input
          name="password"
          type="text"
          className="input max-w-xs"
          minLength={6}
          required
        />
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
