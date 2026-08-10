"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  clearMatchdayMvpAction,
  getMatchdayMvpDetailImageAction,
  updateMatchdayMvpAction,
} from "@/app/actions/mvp";
import type { FormState } from "@/app/actions/auth";
import { Avatar, ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";

export type MvpOwner = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
};

export type MvpInfo = {
  matchdayId: string;
  matchdayLabel: string;
  species: string | null;
  nickname: string | null;
  reason: string | null;
  image: string | null;
  hasDetailImage: boolean;
  owner: MvpOwner | null;
  /** Solo los administradores nombran al MVP */
  editable: boolean;
};

/**
 * Chapa del MVP, al lado del nombre de la jornada: sprite, mote y dueño. Al
 * pincharla se abre su ficha, con la ilustración grande y el porqué.
 */
export function MvpBadge({
  mvp,
  participants,
}: {
  mvp: MvpInfo;
  /** Jugadores entre los que elegir dueño (solo hace falta al editar) */
  participants: MvpOwner[];
}) {
  const [open, setOpen] = useState(false);

  if (!mvp.species && !mvp.editable) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          mvp.species
            ? `MVP de ${mvp.matchdayLabel}: ${mvp.nickname ?? mvp.species}`
            : "Nombrar al MVP de la jornada"
        }
        className={
          mvp.species
            ? "flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 py-1 pl-1 pr-2.5 text-left transition hover:border-amber-400/60 hover:bg-amber-400/15"
            : "flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-2.5 py-1.5 text-left text-xs text-slate-500 transition hover:border-white/40 hover:text-slate-300"
        }
      >
        {mvp.species ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-850/80">
              {mvp.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={mvp.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-sm opacity-60" aria-hidden>
                  ★
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                MVP
              </span>
              <span className="block truncate text-sm font-semibold text-white">
                {mvp.nickname ?? mvp.species}
              </span>
              {mvp.owner ? (
                <span className="block truncate text-[11px] text-slate-400">
                  de {mvp.owner.displayName}
                </span>
              ) : null}
            </span>
          </>
        ) : (
          <>+ MVP de la jornada</>
        )}
      </button>

      {open ? (
        <MvpCard
          mvp={mvp}
          participants={participants}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function MvpCard({
  mvp,
  participants,
  onClose,
}: {
  mvp: MvpInfo;
  participants: MvpOwner[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(!mvp.species);
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const [state, formAction] = useActionState<FormState, FormData>(
    updateMatchdayMvpAction,
    null,
  );

  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    if (!mvp.hasDetailImage) return;
    getMatchdayMvpDetailImageAction(mvp.matchdayId).then((image) => {
      if (!cancelled) setDetailImage(image);
    });
    return () => {
      cancelled = true;
    };
  }, [mvp.matchdayId, mvp.hasDetailImage]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Portal, como en la ficha del as: las tarjetas llevan backdrop-blur y eso
  // rompe el posicionamiento fijo de lo que tienen dentro.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              MVP de la jornada
            </p>
            <p className="text-sm text-slate-400">{mvp.matchdayLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost btn-sm"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {mvp.species && !editing ? (
          <>
            <div
              className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/5"
              style={{ background: `${mvp.owner?.color ?? "#f59e0b"}14` }}
            >
              {detailImage ?? mvp.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={detailImage ?? mvp.image ?? ""}
                  alt={mvp.species}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-4xl opacity-30" aria-hidden>
                  ★
                </span>
              )}
            </div>

            <h3 className="mt-4 text-xl font-bold text-white">
              {mvp.nickname ?? mvp.species}
            </h3>
            <p className="muted">{mvp.species}</p>

            {mvp.owner ? (
              <div className="mt-3 flex items-center gap-2">
                <Avatar
                  name={mvp.owner.displayName}
                  color={mvp.owner.color}
                  image={mvp.owner.avatarImage}
                  size={24}
                />
                <span className="text-sm text-slate-300">
                  {mvp.owner.displayName}
                </span>
              </div>
            ) : null}

            {mvp.reason ? (
              <p className="mt-3 border-l-2 border-amber-400/40 pl-3 text-sm italic leading-relaxed text-slate-300">
                {mvp.reason}
              </p>
            ) : null}

            {mvp.editable ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => setEditing(true)}
                >
                  ✎ Cambiar el MVP
                </button>
                <form action={clearMatchdayMvpAction} onSubmit={() => onClose()}>
                  <input
                    type="hidden"
                    name="matchdayId"
                    value={mvp.matchdayId}
                  />
                  <ConfirmSubmit message="¿Quitar el MVP de esta jornada?">
                    Quitar
                  </ConfirmSubmit>
                </form>
              </div>
            ) : null}
          </>
        ) : mvp.editable ? (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="matchdayId" value={mvp.matchdayId} />

            <SpeciesPicker
              defaultSpecies={mvp.species ?? ""}
              defaultBoxImage={mvp.image}
              defaultDetailImage={detailImage}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Dueño</label>
                <select
                  name="participantId"
                  className="input"
                  defaultValue={mvp.owner?.participantId ?? participants[0]?.participantId}
                  required
                >
                  {participants.map((participant) => (
                    <option
                      key={participant.participantId}
                      value={participant.participantId}
                    >
                      {participant.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Mote</label>
                <input
                  name="nickname"
                  className="input"
                  defaultValue={mvp.nickname ?? ""}
                  placeholder="Chispas"
                />
              </div>
            </div>

            <div>
              <label className="label">¿Por qué es el MVP? (opcional)</label>
              <textarea
                name="reason"
                className="textarea"
                rows={3}
                defaultValue={mvp.reason ?? ""}
                placeholder="Barrió él solo la jornada con un solo PS"
              />
            </div>

            <FormMessage state={state} />
            <div className="flex gap-2">
              <SubmitButton>Guardar MVP</SubmitButton>
              {mvp.species ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
