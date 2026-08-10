"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMatchPokemonAction,
  removeMatchPokemonAction,
} from "@/app/actions/match-teams";
import type { FormState } from "@/app/actions/auth";
import { Avatar, ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";

export type TeamPokemon = {
  id: string;
  species: string;
  nickname: string | null;
  boxImage: string | null;
};

export type TeamSide = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  team: TeamPokemon[];
};

/**
 * Los dos equipos de un combate, debajo del emparejamiento. Se ven los sprites
 * de caja de Pokémon HOME, que es lo que se pide aquí: la ilustración grande
 * queda para la ficha del MVP.
 */
export function MatchTeams({
  matchId,
  sides,
  canManage,
}: {
  matchId: string;
  sides: [TeamSide, TeamSide];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const hasTeams = sides.some((side) => side.team.length > 0);

  if (!hasTeams && !canManage) return null;

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      {hasTeams ? (
        <div className="space-y-1.5">
          {sides.map((side) => (
            <TeamRow key={side.participantId} side={side} />
          ))}
        </div>
      ) : null}

      {canManage ? (
        <button
          type="button"
          className="btn-ghost btn-sm mt-2"
          onClick={() => setEditing(true)}
        >
          {hasTeams ? "✎ Cambiar equipos" : "＋ Apuntar equipos"}
        </button>
      ) : null}

      {editing ? (
        <TeamEditor
          matchId={matchId}
          sides={sides}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}

function TeamRow({ side }: { side: TeamSide }) {
  if (!side.team.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Avatar
        name={side.displayName}
        color={side.color}
        image={side.avatarImage}
        size={18}
      />
      {side.team.map((pokemon) => (
        <Sprite key={pokemon.id} pokemon={pokemon} owner={side.displayName} />
      ))}
    </div>
  );
}

export function Sprite({
  pokemon,
  owner,
  size = 34,
}: {
  pokemon: TeamPokemon;
  owner: string;
  size?: number;
}) {
  return (
    <span
      title={`${pokemon.nickname ?? pokemon.species} (${pokemon.species}) de ${owner}`}
      className="flex shrink-0 items-center justify-center rounded-lg bg-white/[0.04]"
      style={{ width: size, height: size }}
    >
      {pokemon.boxImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={pokemon.boxImage}
          alt={pokemon.nickname ?? pokemon.species}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-[10px] text-slate-500" aria-hidden>
          ?
        </span>
      )}
    </span>
  );
}

function TeamEditor({
  matchId,
  sides,
  onClose,
}: {
  matchId: string;
  sides: [TeamSide, TeamSide];
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addMatchPokemonAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
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

  // Portal, como el resto de diálogos: las tarjetas llevan backdrop-blur y eso
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
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400">
              Equipos del combate
            </p>
            <p className="text-sm text-slate-400">
              {sides[0].displayName} vs {sides[1].displayName}
            </p>
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

        <div className="space-y-3">
          {sides.map((side) => (
            <div
              key={side.participantId}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <Avatar
                  name={side.displayName}
                  color={side.color}
                  image={side.avatarImage}
                  size={20}
                />
                <span className="text-sm font-semibold text-white">
                  {side.displayName}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  {side.team.length}/6
                </span>
              </div>

              {side.team.length ? (
                <ul className="flex flex-wrap gap-2">
                  {side.team.map((pokemon) => (
                    <li
                      key={pokemon.id}
                      className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.04] py-1 pl-1 pr-1.5"
                    >
                      <Sprite pokemon={pokemon} owner={side.displayName} size={28} />
                      <span className="text-xs text-slate-300">
                        {pokemon.nickname ?? pokemon.species}
                      </span>
                      <form action={removeMatchPokemonAction}>
                        <input
                          type="hidden"
                          name="matchPokemonId"
                          value={pokemon.id}
                        />
                        <ConfirmSubmit
                          message={`¿Quitar a ${pokemon.nickname ?? pokemon.species} del equipo?`}
                          className="btn-ghost btn-sm px-1.5"
                          title="Quitar del equipo"
                        >
                          ✕
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Sin pokémon todavía.</p>
              )}
            </div>
          ))}
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="mt-4 space-y-3 border-t border-white/10 pt-4"
        >
          <input type="hidden" name="matchId" value={matchId} />
          <SpeciesPicker />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Entrenador</label>
              <select
                name="participantId"
                className="input"
                defaultValue={sides[0].participantId}
              >
                {sides.map((side) => (
                  <option key={side.participantId} value={side.participantId}>
                    {side.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mote</label>
              <input name="nickname" className="input" placeholder="Chispas" />
            </div>
          </div>
          <FormMessage state={state} />
          <SubmitButton>Añadir al equipo</SubmitButton>
        </form>
      </div>
    </div>,
    document.body,
  );
}
