"use client";

import { useState } from "react";
import { setFinalMatchResultAction } from "@/app/actions/final-four";
import type { BracketMatch } from "@/lib/final-four";
import { Avatar, SubmitButton } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";

/** Una llave del cuadro: los dos contendientes y, si toca, quién ganó. */
export function BracketCard({
  match,
  competitionId,
  canManage,
}: {
  match: BracketMatch;
  competitionId: string;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const decided = Boolean(match.winnerId);

  return (
    <article
      className={cx(
        "rounded-xl border p-3 transition",
        // El tercero del mejor de tres, cuando la serie ya está decidida, se
        // apaga del todo: no invita a jugar algo que ya no hace falta
        match.sobra
          ? "border-dashed border-white/5 bg-white/[0.01] opacity-50"
          : decided
            ? "border-emerald-500/25 bg-emerald-500/[0.04]"
            : match.ready
              ? "border-white/10 bg-white/[0.04]"
              : "border-dashed border-white/10 bg-white/[0.02]",
      )}
    >
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        {match.title}
      </p>

      {match.sobra ? (
        <p className="mb-2 text-[11px] text-slate-500">
          No hace falta: la serie ya está decidida.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Side
          player={match.a}
          pending={match.aPending}
          winner={match.winnerId === match.a?.participantId}
          decided={decided}
        />
        <Side
          player={match.b}
          pending={match.bPending}
          winner={match.winnerId === match.b?.participantId}
          decided={decided}
        />
      </div>

      {match.pokemonDiff !== null || match.playedAt ? (
        <p className="mt-2 text-[11px] text-slate-500">
          {match.pokemonDiff !== null
            ? `Diferencia de ${match.pokemonDiff}`
            : null}
          {match.pokemonDiff !== null && match.playedAt ? " · " : null}
          {match.playedAt ? formatDate(match.playedAt) : null}
        </p>
      ) : null}

      {match.notes ? (
        <p className="mt-1 text-[11px] text-slate-500">{match.notes}</p>
      ) : null}

      {canManage && match.ready ? (
        editing ? (
          <form
            action={async (formData) => {
              await setFinalMatchResultAction(formData);
              setEditing(false);
            }}
            className="mt-3 space-y-2 border-t border-white/10 pt-3"
          >
            <input type="hidden" name="competitionId" value={competitionId} />
            <input type="hidden" name="key" value={match.key} />
            <div>
              <label className="label">Ganador</label>
              <select
                name="winnerId"
                className="input"
                defaultValue={match.winnerId ?? ""}
              >
                <option value="">Sin resultado</option>
                {match.a ? (
                  <option value={match.a.participantId}>
                    {match.a.displayName}
                  </option>
                ) : null}
                {match.b ? (
                  <option value={match.b.participantId}>
                    {match.b.displayName}
                  </option>
                ) : null}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Dif. pokémon</label>
                <input
                  name="pokemonDiff"
                  type="number"
                  min={0}
                  max={6}
                  className="input"
                  defaultValue={match.pokemonDiff ?? ""}
                />
              </div>
              <div>
                <label className="label">Fecha</label>
                <input name="playedAt" type="date" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Notas</label>
              <input
                name="notes"
                className="input"
                defaultValue={match.notes ?? ""}
              />
            </div>
            <div className="flex gap-2">
              <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Cambiar este resultado borra los de las rondas siguientes.
            </p>
          </form>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-sm mt-3"
            onClick={() => setEditing(true)}
          >
            {decided ? "✎ Cambiar resultado" : "✓ Anotar resultado"}
          </button>
        )
      ) : null}
    </article>
  );
}

function Side({
  player,
  pending,
  winner,
  decided,
}: {
  player: BracketMatch["a"];
  pending?: string;
  winner: boolean;
  decided: boolean;
}) {
  if (!player) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-white/20 text-[10px]">
          ?
        </span>
        <span className="truncate italic">{pending ?? "Por decidir"}</span>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
        winner
          ? "bg-emerald-500/15 font-semibold text-emerald-100 ring-1 ring-emerald-500/30"
          : decided
            ? "text-slate-500 opacity-70"
            : "text-slate-200",
      )}
    >
      <span className="w-4 shrink-0 text-[10px] font-bold text-slate-500">
        {player.seed}º
      </span>
      <Avatar
        name={player.displayName}
        color={player.color}
        image={player.avatarImage}
        size={22}
        participantId={player.participantId}
      />
      <span className="min-w-0 flex-1 truncate">{player.displayName}</span>
      {winner ? <span aria-hidden>👑</span> : null}
    </div>
  );
}
