"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addHallPokemonAction,
  removeHallPokemonAction,
} from "@/app/actions/hall";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";

export type HallPokemon = {
  id: string;
  species: string;
  nickname: string | null;
  image: string | null;
};

/** Los 6 huecos del equipo final de un jugador. */
export function TeamSlots({
  team,
  editable,
  teamSize = 6,
}: {
  team: HallPokemon[];
  editable: boolean;
  teamSize?: number;
}) {
  const huecos = Math.max(0, teamSize - team.length);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {team.map((pokemon) => (
        <div
          key={pokemon.id}
          className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-2"
        >
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-ink-850">
            {pokemon.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={pokemon.image}
                alt={pokemon.species}
                loading="lazy"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-lg opacity-30" aria-hidden>
                ★
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-center text-xs font-medium text-slate-100">
            {pokemon.nickname ?? pokemon.species}
          </p>
          <p className="truncate text-center text-[10px] text-slate-500">
            {pokemon.species}
          </p>

          {editable ? (
            <form
              action={removeHallPokemonAction}
              className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
            >
              <input type="hidden" name="entryId" value={pokemon.id} />
              <ConfirmSubmit
                message={`¿Quitar a ${pokemon.nickname ?? pokemon.species} del equipo?`}
                className="btn-danger btn-sm px-1.5 py-0"
              >
                ✕
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
      ))}

      {Array.from({ length: huecos }).map((_, index) => (
        <div
          key={`hueco-${index}`}
          className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-white/10 text-2xl opacity-25"
          aria-hidden
        >
          ·
        </div>
      ))}
    </div>
  );
}

/** Formulario para ir metiendo los pokémon del equipo. */
export function AddPokemonForm({
  participantId,
  remaining,
}: {
  participantId: string;
  remaining: number;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addHallPokemonAction,
    null,
  );
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) setResetKey((key) => key + 1);
  }, [state]);

  if (remaining <= 0) {
    return (
      <p className="mt-3 text-xs text-emerald-300">
        Equipo completo. Así se queda para la posteridad.
      </p>
    );
  }

  return (
    <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        ▸ Añadir pokémon ({remaining} {remaining === 1 ? "hueco" : "huecos"})
      </summary>
      <form key={resetKey} action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="participantId" value={participantId} />
        <SpeciesPicker />
        <div>
          <label className="label">Mote</label>
          <input name="nickname" className="input" placeholder="Chispas" />
        </div>
        <FormMessage state={state} />
        <SubmitButton>Añadir al equipo</SubmitButton>
      </form>
    </details>
  );
}
