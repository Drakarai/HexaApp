"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteDeathAction,
  updateDeathAction,
} from "@/app/actions/deaths";
import type { FormState } from "@/app/actions/auth";
import { Avatar, ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { AceBadge } from "@/components/ace-badge";
import { ImageInput } from "@/components/image-input";
import { SpeciesPicker } from "@/components/species-picker";
import { IMAGE_SIZES } from "@/lib/image";
import { cx } from "@/lib/utils";

export type AceSummary = {
  species: string | null;
  nickname: string | null;
  reason: string | null;
  image: string | null;
  detailImage: string | null;
  editable: boolean;
};

export type BoxDeath = {
  id: string;
  species: string;
  nickname: string | null;
  cause: string | null;
  level: number | null;
  location: string | null;
  notes: string | null;
  boxImage: string | null;
  /** La ilustración grande se carga aparte, al abrir la ficha */
  detailImage: string | null;
  diedAtLabel: string;
  diedAtInput: string;
  editable: boolean;
  participant: {
    id: string;
    displayName: string;
    color: string;
    avatarImage: string | null;
    ace: AceSummary;
  };
};

/** Cuadrícula estilo caja del PC: al pinchar una casilla se abre su ficha. */
export function DeathBox({
  deaths,
  grouped,
}: {
  deaths: BoxDeath[];
  /** Si es true, se separan las casillas por jugador. */
  grouped: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = deaths.find((death) => death.id === selectedId) ?? null;

  const groups = grouped
    ? [...new Map(deaths.map((d) => [d.participant.id, d.participant])).values()]
        .map((participant) => ({
          participant,
          items: deaths.filter((d) => d.participant.id === participant.id),
        }))
        .sort((a, b) =>
          a.participant.displayName.localeCompare(b.participant.displayName, "es"),
        )
    : [{ participant: null, items: deaths }];

  return (
    <>
      <div className="space-y-5">
        {groups.map((group, index) => (
          <section key={group.participant?.id ?? index} className="card">
            {group.participant ? (
              <div className="mb-4 flex items-center gap-2.5">
                <Avatar
                  name={group.participant.displayName}
                  color={group.participant.color}
                  image={group.participant.avatarImage}
                  size={28}
                />
                <h2 className="font-semibold text-white">
                  {group.participant.displayName}
                </h2>
                <AceBadge
                  size={26}
                  showEmpty
                  ace={{
                    participantId: group.participant.id,
                    playerName: group.participant.displayName,
                    color: group.participant.color,
                    ...group.participant.ace,
                  }}
                />
                <span className="chip ml-auto">{group.items.length}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {group.items.map((death) => (
                <button
                  key={death.id}
                  type="button"
                  onClick={() => setSelectedId(death.id)}
                  title={`${death.nickname ?? death.species} — ver ficha`}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition hover:border-brand-500/50 hover:bg-white/[0.07]"
                >
                  <span
                    className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-ink-850"
                    style={{ boxShadow: `inset 0 0 0 1px ${death.participant.color}33` }}
                  >
                    {death.boxImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={death.boxImage}
                        alt={death.species}
                        loading="lazy"
                        className="h-full w-full object-contain p-1 grayscale-[35%] transition group-hover:grayscale-0"
                      />
                    ) : (
                      <PokeballGlyph />
                    )}
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full"
                      style={{ background: death.participant.color }}
                      aria-hidden
                    />
                  </span>
                  <span className="w-full truncate text-center text-xs font-medium text-slate-200">
                    {death.nickname ?? death.species}
                  </span>
                  <span className="w-full truncate text-center text-[10px] text-slate-500">
                    {death.species}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {selected ? (
        <DeathDetail death={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}

function PokeballGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 opacity-25" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h6m6 0h6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function DeathDetail({
  death,
  onClose,
}: {
  death: BoxDeath;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [manualImages, setManualImages] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    updateDeathAction,
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar
              name={death.participant.displayName}
              color={death.participant.color}
              image={death.participant.avatarImage}
              size={30}
            />
            <div>
              <p className="text-sm text-slate-400">
                {death.participant.displayName}
              </p>
              <p className="text-xs text-slate-500">{death.diedAtLabel}</p>
            </div>
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

        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-ink-850">
          {death.detailImage ?? death.boxImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={death.detailImage ?? death.boxImage ?? ""}
              alt={death.species}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <span className="text-slate-600">
              <PokeballGlyph />
            </span>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-xl font-bold text-white">
            {death.nickname ?? death.species}
          </h3>
          <p className="muted">
            {death.species}
            {death.level ? ` · Nv. ${death.level}` : ""}
          </p>
          <dl className="mt-3 space-y-1.5 text-sm">
            {death.cause ? (
              <Row label="Causa" value={death.cause} />
            ) : null}
            {death.location ? <Row label="Dónde" value={death.location} /> : null}
            {death.notes ? <Row label="Notas" value={death.notes} /> : null}
          </dl>
        </div>

        {death.editable ? (
          editing ? (
            <form action={formAction} className="mt-5 space-y-4 border-t border-white/10 pt-4">
              <input type="hidden" name="deathId" value={death.id} />
              <div>
                <label className="label">Mote</label>
                <input
                  name="nickname"
                  className="input"
                  defaultValue={death.nickname ?? ""}
                />
              </div>

              {manualImages ? (
                <>
                  <div>
                    <label className="label">Especie</label>
                    <input
                      name="species"
                      className="input"
                      defaultValue={death.species}
                      required
                    />
                  </div>
                  <ImageInput
                    name="detailImage"
                    label="Imagen de la ficha"
                    defaultValue={death.detailImage}
                    maxSize={IMAGE_SIZES.detail}
                    hint="La imagen grande de esta ventana. Puede ser distinta del sprite de la caja."
                  />
                  <ImageInput
                    name="boxImage"
                    label="Sprite de la caja"
                    defaultValue={death.boxImage}
                    maxSize={IMAGE_SIZES.box}
                  />
                </>
              ) : (
                <SpeciesPicker
                  defaultSpecies={death.species}
                  defaultBoxImage={death.boxImage}
                  defaultDetailImage={death.detailImage}
                />
              )}

              <button
                type="button"
                className="text-xs text-brand-400 hover:underline"
                onClick={() => setManualImages((manual) => !manual)}
              >
                {manualImages
                  ? "← Volver a las imágenes automáticas"
                  : "Prefiero poner mis propias imágenes →"}
              </button>

              <div>
                <label className="label">Causa</label>
                <input
                  name="cause"
                  className="input"
                  defaultValue={death.cause ?? ""}
                />
              </div>

              <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <span className="mr-2 inline-block transition group-open:rotate-90">
                    ▸
                  </span>
                  Más detalles (opcional)
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Nivel</label>
                    <input
                      name="level"
                      type="number"
                      min={1}
                      max={100}
                      className="input"
                      defaultValue={death.level ?? ""}
                    />
                  </div>
                  <div>
                    <label className="label">Dónde</label>
                    <input
                      name="location"
                      className="input"
                      defaultValue={death.location ?? ""}
                    />
                  </div>
                  <div>
                    <label className="label">Fecha</label>
                    <input
                      name="diedAt"
                      type="date"
                      className="input"
                      defaultValue={death.diedAtInput}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label">Notas</label>
                    <input
                      name="notes"
                      className="input"
                      defaultValue={death.notes ?? ""}
                    />
                  </div>
                </div>
              </details>

              <FormMessage state={state} />
              <div className="flex gap-2">
                <SubmitButton>Guardar ficha</SubmitButton>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setEditing(true)}
              >
                🖼️ Editar ficha e imágenes
              </button>
              <form action={deleteDeathAction} onSubmit={() => onClose()}>
                <input type="hidden" name="deathId" value={death.id} />
                <ConfirmSubmit
                  message={`¿Borrar a ${death.nickname ?? death.species} del cementerio?`}
                >
                  Borrar
                </ConfirmSubmit>
              </form>
            </div>
          )
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={cx("flex gap-2")}>
      <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-slate-300">{value}</dd>
    </div>
  );
}
