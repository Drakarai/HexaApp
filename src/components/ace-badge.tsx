"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { clearAceAction, updateAceAction } from "@/app/actions/aces";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { cx } from "@/lib/utils";

export type AceInfo = {
  participantId: string;
  playerName: string;
  color: string;
  species: string | null;
  nickname: string | null;
  reason: string | null;
  /** Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts */
  image: string | null;
  detailImage: string | null;
  /** Si el que mira puede cambiarlo (su dueño o un administrador) */
  editable: boolean;
};

/**
 * Sprite del pokémon as. Al pincharlo se abre su ficha, donde su dueño puede
 * cambiar de pokémon, ponerle mote y contar por qué es su as.
 */
export function AceBadge({
  ace,
  size = 26,
  showEmpty = false,
}: {
  ace: AceInfo;
  size?: number;
  /** Enseña un hueco para elegirlo cuando todavía no hay as */
  showEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!ace.species && !(showEmpty && ace.editable)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          ace.species
            ? `As de ${ace.playerName}: ${ace.nickname ?? ace.species}`
            : "Elegir tu pokémon as"
        }
        className={cx(
          "flex shrink-0 items-center justify-center rounded-lg transition hover:scale-110",
          ace.species ? "bg-ink-850/80" : "border border-dashed border-white/20",
        )}
        style={{ width: size, height: size }}
      >
        {ace.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={ace.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <span
            className="text-xs opacity-60"
            style={{ fontSize: Math.max(10, size * 0.5) }}
            aria-hidden
          >
            {ace.species ? "★" : "+"}
          </span>
        )}
      </button>

      {open ? <AceCard ace={ace} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AceCard({ ace, onClose }: { ace: AceInfo; onClose: () => void }) {
  const [editing, setEditing] = useState(!ace.species);
  const [state, formAction] = useActionState<FormState, FormData>(
    updateAceAction,
    null,
  );

  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

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

  // Se saca del árbol con un portal: las tarjetas llevan backdrop-blur, y eso
  // haría que un position:fixed se posicionara respecto a la tarjeta.
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
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400">
              Pokémon as
            </p>
            <p className="text-sm text-slate-400">{ace.playerName}</p>
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

        {ace.species && !editing ? (
          <>
            <div
              className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/5"
              style={{ background: `${ace.color}14` }}
            >
              {ace.detailImage ?? ace.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ace.detailImage ?? ace.image ?? ""}
                  alt={ace.species}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-4xl opacity-30" aria-hidden>
                  ★
                </span>
              )}
            </div>

            <h3 className="mt-4 text-xl font-bold text-white">
              {ace.nickname ?? ace.species}
            </h3>
            <p className="muted">{ace.species}</p>

            {ace.reason ? (
              <p className="mt-3 border-l-2 border-brand-500/40 pl-3 text-sm italic leading-relaxed text-slate-300">
                {ace.reason}
              </p>
            ) : null}

            {ace.editable ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => setEditing(true)}
                >
                  ✎ Cambiar mi as
                </button>
                <form action={clearAceAction} onSubmit={() => onClose()}>
                  <input
                    type="hidden"
                    name="participantId"
                    value={ace.participantId}
                  />
                  <ConfirmSubmit message="¿Quitar tu pokémon as?">
                    Quitar
                  </ConfirmSubmit>
                </form>
              </div>
            ) : null}
          </>
        ) : (
          <form action={formAction} className="space-y-4">
            <input
              type="hidden"
              name="participantId"
              value={ace.participantId}
            />

            <SpeciesPicker
              defaultSpecies={ace.species ?? ""}
              defaultBoxImage={ace.image}
              defaultDetailImage={ace.detailImage}
            />

            <div>
              <label className="label">Mote</label>
              <input
                name="nickname"
                className="input"
                defaultValue={ace.nickname ?? ""}
                placeholder="Chispas"
              />
            </div>

            <div>
              <label className="label">¿Por qué es tu as? (opcional)</label>
              <textarea
                name="reason"
                className="textarea"
                rows={3}
                defaultValue={ace.reason ?? ""}
                placeholder="Me sacó del gimnasio de Antón con 2 PS"
              />
            </div>

            <FormMessage state={state} />
            <div className="flex gap-2">
              <SubmitButton>Guardar as</SubmitButton>
              {ace.species ? (
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
        )}
      </div>
    </div>,
    document.body,
  );
}
