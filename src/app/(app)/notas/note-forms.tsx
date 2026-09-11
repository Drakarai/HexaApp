"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  createNoteAction,
  deleteNoteAction,
  toggleNotePinAction,
  updateNoteAction,
} from "@/app/actions/notes";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { RichText } from "@/components/rich-text";
import { Pendientes } from "@/components/pendientes";
import { conCola } from "@/lib/acciones-sin-conexion";

export function NewNoteForm({
  competitionId,
  subjectId,
  subjectLabel,
}: {
  competitionId: string;
  subjectId: string;
  subjectLabel: string;
}) {
  // Una nota se escribe tanto en el sofá como en el metro: si no hay línea,
  // se queda en el móvil en vez de perderse al dar a guardar
  const guardar = useMemo(
    () =>
      conCola(createNoteAction, "nota", (formData) =>
        String(formData.get("title") ?? "").trim() || "Nota sin título",
      ),
    [],
  );
  const [state, formAction] = useActionState<FormState, FormData>(guardar, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Nueva nota en {subjectLabel}
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <input type="hidden" name="subjectId" value={subjectId} />
        <div>
          <label className="label">Título</label>
          <input name="title" className="input" required />
        </div>
        <div>
          <label className="label">Contenido</label>
          <textarea
            name="body"
            className="textarea"
            rows={5}
            placeholder="- Lleva Gengar, ojo con Bola sombra"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="pinned" className="accent-indigo-500" />
          Fijar arriba
        </label>
        <FormMessage state={state} />
        <SubmitButton>Guardar nota</SubmitButton>
      </form>

      <Pendientes tipo="nota" />
    </details>
  );
}

export function NoteCard({
  note,
}: {
  note: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    updatedLabel: string;
  };
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    updateNoteAction,
    null,
  );

  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <article className="card">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="noteId" value={note.id} />
          <div>
            <label className="label">Título</label>
            <input
              name="title"
              className="input"
              defaultValue={note.title}
              required
            />
          </div>
          <div>
            <label className="label">Contenido</label>
            <textarea
              name="body"
              className="textarea"
              rows={8}
              defaultValue={note.body}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="pinned"
              defaultChecked={note.pinned}
              className="accent-indigo-500"
            />
            Fijar arriba
          </label>
          <FormMessage state={state} />
          <div className="flex gap-2">
            <SubmitButton>Guardar</SubmitButton>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="card flex flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white">
          {note.pinned ? "📌 " : ""}
          {note.title}
        </h3>
        <div className="flex shrink-0 gap-1">
          <form action={toggleNotePinAction}>
            <input type="hidden" name="noteId" value={note.id} />
            <button
              type="submit"
              className="btn-ghost btn-sm"
              title={note.pinned ? "Dejar de fijar" : "Fijar"}
            >
              {note.pinned ? "📌" : "📍"}
            </button>
          </form>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setEditing(true)}
            title="Editar"
          >
            ✎
          </button>
          <form action={deleteNoteAction}>
            <input type="hidden" name="noteId" value={note.id} />
            <ConfirmSubmit message={`¿Borrar la nota "${note.title}"?`}>
              ✕
            </ConfirmSubmit>
          </form>
        </div>
      </div>
      <div className="flex-1">
        <RichText text={note.body} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Actualizada {note.updatedLabel}
      </p>
    </article>
  );
}
