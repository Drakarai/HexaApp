"use client";

import { useState } from "react";
import { setFinalMatchResultAction } from "@/app/actions/final-four";
import type { CombateDeLaLlave, LlaveDelCuadro } from "@/lib/final-four";
import { AL_MEJOR_DE } from "@/lib/formatos-finales";
import { Avatar, SubmitButton } from "@/components/ui";
import { ReplayLink } from "@/components/replay-link";
import { cx, formatDate } from "@/lib/utils";
import { Icono } from "@/components/icono";

/**
 * Una llave del cuadro: los dos contendientes, cómo va la serie y sus tres
 * combates. Todas las llaves se juegan **al mejor de tres** (ver
 * `lib/formatos-finales.ts`), así que la tarjeta es la serie entera.
 */
export function BracketCard({
  llave,
  competitionId,
  canManage,
}: {
  llave: LlaveDelCuadro;
  competitionId: string;
  canManage: boolean;
}) {
  const decidida = Boolean(llave.winnerId);

  return (
    <article
      className={cx(
        "rounded-xl border p-3 transition",
        decidida
          ? "border-emerald-500/25 bg-emerald-500/[0.04]"
          : llave.ready
            ? "border-white/10 bg-white/[0.04]"
            : "border-dashed border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="rotulo">
          {llave.title}
        </p>
        <p className="shrink-0 text-[11px] text-slate-500">
          Al mejor de {AL_MEJOR_DE}
        </p>
      </div>

      <div className="space-y-1.5">
        <Side
          player={llave.a}
          pending={llave.aPending}
          ganadas={llave.ganadasA}
          winner={llave.winnerId === llave.a?.participantId}
          decided={decidida}
        />
        <Side
          player={llave.b}
          pending={llave.bPending}
          ganadas={llave.ganadasB}
          winner={llave.winnerId === llave.b?.participantId}
          decided={decidida}
        />
      </div>

      {llave.ready ? (
        <ol className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {llave.combates.map((combate) => (
            <Combate
              key={combate.key}
              combate={combate}
              llave={llave}
              competitionId={competitionId}
              canManage={canManage}
            />
          ))}
        </ol>
      ) : null}
    </article>
  );
}

/** Uno de los tres combates de la llave, con su resultado y su repetición. */
function Combate({
  combate,
  llave,
  competitionId,
  canManage,
}: {
  combate: CombateDeLaLlave;
  llave: LlaveDelCuadro;
  competitionId: string;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const jugado = Boolean(combate.winnerId);
  const ganador =
    combate.winnerId === llave.a?.participantId
      ? llave.a
      : combate.winnerId === llave.b?.participantId
        ? llave.b
        : null;

  return (
    <li
      className={cx(
        "rounded-lg px-2 py-1.5",
        /**
         * El que ya no hace falta se apaga, **haya resultado o no**. Puede
         * tenerlo de antes: si se corrige un combate anterior y la serie pasa a
         * decidirse en el segundo, lo que se apuntó del tercero deja de contar
         * (`comoVaLaSerie` lo descarta). Enseñarlo como jugado sin más haría
         * que el marcador dijera 2 con tres coronas debajo.
         */
        combate.sobra
          ? "opacity-40"
          : jugado
            ? "bg-white/[0.04]"
            : "bg-white/[0.02]",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="w-4 shrink-0 font-bold text-slate-600">
          {combate.numero}
        </span>
        {/* Con un ancho mínimo: la columna del cuadro es estrecha y entre la
            diferencia, la fecha y el lápiz al nombre le quedaban cuatro letras
            ("👑 Adri…"). Como la fila se parte sola, lo que baja es la fecha */}
        <span className="min-w-24 flex-1 truncate text-slate-300">
          {combate.sobra ? (
            <span className="italic text-slate-500">
              {ganador
                ? `No cuenta (ganó ${ganador.displayName})`
                : "No hace falta"}
            </span>
          ) : ganador ? (
            <>
              <span aria-hidden><Icono emoji="👑" /></span> {ganador.displayName}
            </>
          ) : (
            <span className="italic text-slate-500">Sin jugar</span>
          )}
        </span>
        {!combate.sobra && combate.pokemonDiff !== null ? (
          <span className="shrink-0 text-slate-500">
            dif. {combate.pokemonDiff}
          </span>
        ) : null}
        {!combate.sobra && combate.playedAt ? (
          <span className="shrink-0 text-slate-500">
            {formatDate(combate.playedAt)}
          </span>
        ) : null}
        {combate.sobra ? null : <ReplayLink url={combate.replayUrl} />}
        {canManage && !editing ? (
          <button
            type="button"
            className="btn-ghost btn-sm shrink-0 px-1.5 py-0"
            onClick={() => setEditing(true)}
            title={jugado ? "Cambiar resultado" : "Anotar resultado"}
          >
            {jugado ? "✎" : "✓"}
          </button>
        ) : null}
      </div>

      {combate.notes ? (
        <p className="mt-0.5 pl-6 text-[11px] text-slate-500">{combate.notes}</p>
      ) : null}

      {canManage && editing ? (
        <form
          action={async (formData) => {
            await setFinalMatchResultAction(formData);
            setEditing(false);
          }}
          className="mt-2 space-y-2 border-t border-white/10 pt-2"
        >
          <input type="hidden" name="competitionId" value={competitionId} />
          <input type="hidden" name="key" value={combate.key} />
          <div>
            <label className="label">Ganador del {combate.numero}º</label>
            <select
              name="winnerId"
              className="input"
              defaultValue={combate.winnerId ?? ""}
            >
              <option value="">Sin resultado</option>
              {llave.a ? (
                <option value={llave.a.participantId}>
                  {llave.a.displayName}
                </option>
              ) : null}
              {llave.b ? (
                <option value={llave.b.participantId}>
                  {llave.b.displayName}
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
                defaultValue={combate.pokemonDiff ?? ""}
              />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input name="playedAt" type="date" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Repetición</label>
            <input
              name="replayUrl"
              type="url"
              className="input"
              placeholder="https://replay.pokemonshowdown.com/…"
              defaultValue={combate.replayUrl ?? ""}
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <input
              name="notes"
              className="input"
              defaultValue={combate.notes ?? ""}
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
      ) : null}
    </li>
  );
}

function Side({
  player,
  pending,
  ganadas,
  winner,
  decided,
}: {
  player: LlaveDelCuadro["a"];
  pending?: string;
  ganadas: number;
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
      {winner ? <span aria-hidden><Icono emoji="👑" /></span> : null}
      {/* Cómo va la serie: el marcador manda sobre todo lo demás */}
      <span
        className={cx(
          "w-5 shrink-0 text-center text-base font-black",
          winner ? "text-emerald-200" : "text-slate-400",
        )}
      >
        {ganadas}
      </span>
    </div>
  );
}
