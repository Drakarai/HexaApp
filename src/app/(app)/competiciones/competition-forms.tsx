"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addParticipantAction,
  createCompetitionAction,
  darEspectadorAction,
  updateCompetitionAction,
  updateParticipantAction,
} from "@/app/actions/competitions";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { JuegoPicker } from "@/components/juego-picker";

export function NewCompetitionForm({
  competitions,
}: {
  competitions: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createCompetitionAction,
    null,
  );

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Crear una competición nueva
      </summary>
      <form action={formAction} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input name="name" className="input" placeholder="Hexalocke 3" required />
          </div>
          <div className="sm:col-span-2">
            <JuegoPicker />
          </div>
          <div>
            <label className="label">Modalidad</label>
            <input name="modality" className="input" placeholder="Random" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Puntos iniciales</label>
              <input
                name="startingPoints"
                type="number"
                defaultValue={5}
                className="input"
              />
            </div>
            <div>
              <label className="label">Jugadores</label>
              <input
                name="maxPlayers"
                type="number"
                min={2}
                max={20}
                defaultValue={6}
                className="input"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea name="description" className="textarea" rows={3} />
        </div>

        {competitions.length ? (
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div>
              <label className="label">Copiar configuración de</label>
              <select name="copyFromId" className="input" defaultValue="">
                <option value="">No copiar nada</option>
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Se copia la configuración, no los resultados: la edición anterior
                se conserva entera.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Check name="copyRules" label="Reglas" defaultChecked />
              <Check name="copyLevelCaps" label="Level caps" defaultChecked />
              <Check name="copyParticipants" label="Jugadores" defaultChecked />
              <Check name="copyRoulettes" label="Ruletas" />
            </div>
          </div>
        ) : null}

        <Check
          name="archivePrevious"
          label="Archivar las competiciones que estén activas ahora mismo"
          defaultChecked
        />

        <FormMessage state={state} />
        <SubmitButton>Crear competición</SubmitButton>
      </form>
    </details>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-indigo-500"
      />
      {label}
    </label>
  );
}

export function EditCompetitionForm({
  competition,
}: {
  competition: {
    id: string;
    name: string;
    game: string | null;
    gameId: string | null;
    modality: string | null;
    description: string | null;
    startingPoints: number;
  };
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateCompetitionAction,
    null,
  );

  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Editar datos de la competición
      </summary>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competition.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input name="name" className="input" defaultValue={competition.name} />
          </div>
          <div className="sm:col-span-2">
            <JuegoPicker
              defaultGameId={competition.gameId}
              defaultGame={competition.game}
            />
          </div>
          <div>
            <label className="label">Modalidad</label>
            <input
              name="modality"
              className="input"
              defaultValue={competition.modality ?? ""}
            />
          </div>
          <div>
            <label className="label">Puntos iniciales</label>
            <input
              name="startingPoints"
              type="number"
              className="input"
              defaultValue={competition.startingPoints}
            />
          </div>
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea
            name="description"
            className="textarea"
            rows={3}
            defaultValue={competition.description ?? ""}
          />
        </div>
        <FormMessage state={state} />
        <SubmitButton>Guardar</SubmitButton>
      </form>
    </details>
  );
}

export function AddParticipantForm({
  competitionId,
  users,
}: {
  competitionId: string;
  users: Array<{ id: string; displayName: string; username: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addParticipantAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  if (!users.length) {
    return (
      <p className="muted">
        No hay usuarios disponibles para añadir a esta competición.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Usuario</label>
          <select name="userId" className="input" required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} (@{user.username})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nombre en el locke</label>
          <input name="displayName" className="input" placeholder="Opcional" />
        </div>
        <div>
          <label className="label">Edición</label>
          <input name="gameVersion" className="input" placeholder="HeartGold" />
        </div>
        <div>
          <label className="label">Color</label>
          <input
            name="color"
            type="color"
            defaultValue="#6366f1"
            className="input h-9.5 p-1"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="isAdmin" className="accent-indigo-500" />
        Puede administrar esta competición
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn-ghost">Añadir jugador</SubmitButton>
    </form>
  );
}

export function EditParticipantForm({
  participant,
}: {
  participant: {
    id: string;
    displayName: string;
    gameVersion: string | null;
    color: string;
    isAdmin: boolean;
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
        ✎ Editar
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateParticipantAction(formData);
        setOpen(false);
      }}
      className="mt-3 space-y-3 border-t border-white/10 pt-3"
    >
      <input type="hidden" name="participantId" value={participant.id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Nombre</label>
          <input
            name="displayName"
            className="input"
            defaultValue={participant.displayName}
          />
        </div>
        <div>
          <label className="label">Edición</label>
          <input
            name="gameVersion"
            className="input"
            defaultValue={participant.gameVersion ?? ""}
          />
        </div>
        <div>
          <label className="label">Color</label>
          <input
            name="color"
            type="color"
            className="input h-9.5 p-1"
            defaultValue={participant.color}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="isAdmin"
          defaultChecked={participant.isAdmin}
          className="accent-indigo-500"
        />
        Puede administrar esta competición
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

/**
 * Dar acceso de solo mirar a alguien que no juega esta edición. Va aparte del
 * alta de jugadores porque es justo lo contrario: entra para ver, no para
 * jugar, y no ocupa plaza del locke.
 */
export function AddEspectadorForm({
  competitionId,
  users,
}: {
  competitionId: string;
  users: Array<{ id: string; displayName: string; username: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    darEspectadorAction,
    null,
  );

  if (!users.length) {
    return (
      <p className="muted">
        No queda ningún usuario a quien dar acceso: o juegan este locke o ya lo
        miran.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <label className="label">Dejar mirar a</label>
          <select name="userId" className="input" required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} (@{user.username})
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className="btn-ghost">Dar acceso</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
