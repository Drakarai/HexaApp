"use client";

import { useActionState } from "react";
import {
  changeMyPasswordAction,
  updateMyProfileAction,
  type FormState,
} from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

export function ProfileForms({
  displayName,
  avatarColor,
}: {
  displayName: string;
  avatarColor: string;
}) {
  const [profileState, profileAction] = useActionState<FormState, FormData>(
    updateMyProfileAction,
    null,
  );
  const [passwordState, passwordAction] = useActionState<FormState, FormData>(
    changeMyPasswordAction,
    null,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card">
        <h2 className="section-title mb-4">Datos</h2>
        <form action={profileAction} className="space-y-3">
          <div>
            <label className="label">Nombre visible</label>
            <input
              name="displayName"
              className="input"
              defaultValue={displayName}
              required
            />
          </div>
          <div className="w-28">
            <label className="label">Color</label>
            <input
              name="avatarColor"
              type="color"
              className="input h-9.5 p-1"
              defaultValue={avatarColor}
            />
          </div>
          <FormMessage state={profileState} />
          <SubmitButton>Guardar</SubmitButton>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">Contraseña</h2>
        <form action={passwordAction} className="space-y-3">
          <div>
            <label className="label">Contraseña actual</label>
            <input
              name="currentPassword"
              type="password"
              className="input"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              name="newPassword"
              type="password"
              className="input"
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          <FormMessage state={passwordState} />
          <SubmitButton>Cambiar contraseña</SubmitButton>
        </form>
      </section>
    </div>
  );
}
