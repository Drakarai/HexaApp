"use client";

import { useActionState } from "react";
import {
  cerrarOtrasSesionesAction,
  changeMyPasswordAction,
  updateMyProfileAction,
  type FormState,
} from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { ImageInput } from "@/components/image-input";
import { IMAGE_SIZES } from "@/lib/image";

export function ProfileForms({
  displayName,
  avatarColor,
  sinLocke = false,
  avatarImage,
}: {
  displayName: string;
  avatarColor: string;
  /** Todavía no juega ninguno: la foto no sale en ninguna tabla aún */
  sinLocke?: boolean;
  avatarImage: string | null;
}) {
  const [profileState, profileAction] = useActionState<FormState, FormData>(
    updateMyProfileAction,
    null,
  );
  const [passwordState, passwordAction] = useActionState<FormState, FormData>(
    changeMyPasswordAction,
    null,
  );
  const [sesionesState, sesionesAction] = useActionState<FormState, FormData>(
    cerrarOtrasSesionesAction,
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
          <ImageInput
            name="avatarImage"
            label="Foto de perfil"
            defaultValue={avatarImage}
            maxSize={IMAGE_SIZES.avatar}
            shape="circle"
            hint={
              sinLocke
                ? "Se verá en la clasificación, el cementerio y las jornadas cuando juegues un locke."
                : "Se verá en la clasificación, el cementerio y las jornadas."
            }
          />
          <div className="w-28">
            <label className="label">Color</label>
            <input
              name="avatarColor"
              type="color"
              className="input h-9.5 p-1"
              defaultValue={avatarColor}
            />
            <p className="mt-1 text-xs text-slate-500">
              Se usa si no pones foto.
            </p>
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
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <FormMessage state={passwordState} />
          <SubmitButton>Cambiar contraseña</SubmitButton>
        </form>

        {/* Para el móvil perdido o la sesión que se quedó abierta en otro sitio */}
        <form action={sesionesAction} className="mt-5 space-y-2 border-t border-white/10 pt-4">
          <p className="text-sm text-slate-300">
            ¿Has entrado en un móvil u ordenador que no es tuyo? Echa tu cuenta de todos los
            demás sitios; aquí sigues dentro.
          </p>
          <FormMessage state={sesionesState} />
          <SubmitButton className="btn-ghost btn-sm" pendingLabel="Cerrando…">
            Cerrar sesión en los demás dispositivos
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
