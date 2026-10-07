"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { useActionState, useEffect, useState } from "react";
import {
  castMvpVoteAction,
  clearMvpVoteAction,
  setMvpReasonAction,
  setMvpTiebreakAction,
} from "@/app/actions/mvp";
import type { FormState } from "@/app/actions/auth";
import { Avatar, FormMessage, SubmitButton } from "@/components/ui";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { Hoja } from "@/components/hoja";

export type MvpCandidateView = {
  id: string;
  species: string;
  nickname: string | null;
  /** Direcciones, no imágenes: ver lib/imagen-url.ts */
  boxImage: string | null;
  detailImage: string | null;
  position: number;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  ownerAvatar: string | null;
  votes: number;
};

export type MvpView = {
  matchdayId: string;
  matchdayLabel: string;
  reason: string | null;
  candidates: MvpCandidateView[];
  winner: MvpCandidateView | null;
  tied: MvpCandidateView[];
  myVoteId: string | null;
  votesCast: number;
  voterCount: number;
  /** Puede votar quien juega la competición */
  canVote: boolean;
  /** Los administradores escriben el porqué y desempatan */
  canManage: boolean;
};

/**
 * Chapa del MVP al lado del nombre de la jornada. El MVP sale de la votación
 * de los jugadores, así que la chapa enseña o al ganador o cómo va la cosa.
 */
export function MvpBadge({ mvp }: { mvp: MvpView }) {
  const [open, setOpen] = useState(false);

  // Sin equipos apuntados no hay a quién votar todavía
  if (!mvp.candidates.length) return null;

  const label = mvp.winner
    ? (mvp.winner.nickname ?? mvp.winner.species)
    : mvp.tied.length
      ? `Empate a ${mvp.tied[0].votes}`
      : "Votación abierta";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          mvp.winner
            ? `MVP de ${mvp.matchdayLabel}: ${label}`
            : `Votar al MVP de ${mvp.matchdayLabel}`
        }
        className={cx(
          "flex items-center gap-2 rounded-xl border py-1 pl-1 pr-2.5 text-left transition",
          mvp.winner
            ? "border-amber-400/30 bg-amber-400/10 hover:border-amber-400/60 hover:bg-amber-400/15"
            : "border-dashed border-white/20 hover:border-white/40",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-850/80">
          {mvp.winner?.boxImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <SpritePokemon
              src={mvp.winner.boxImage}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-sm opacity-60" aria-hidden>
              <Icono emoji="🗳️" />
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span
            className={cx(
              "block text-[10px] font-bold uppercase tracking-widest",
              mvp.winner ? "text-amber-300/90" : "text-slate-500",
            )}
          >
            MVP
          </span>
          <span
            className={cx(
              "block truncate text-sm font-semibold",
              mvp.winner ? "text-white" : "text-slate-300",
            )}
          >
            {label}
          </span>
          <span className="block truncate text-[11px] text-slate-400">
            {mvp.winner
              ? `de ${mvp.winner.ownerName}`
              : `${mvp.votesCast}/${mvp.voterCount} votos`}
          </span>
        </span>
      </button>

      {open ? <MvpCard mvp={mvp} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function MvpCard({ mvp, onClose }: { mvp: MvpView; onClose: () => void }) {
  // Portal: las tarjetas llevan backdrop-blur y eso hace que un position:fixed
  // de dentro se coloque respecto a la tarjeta en vez de a la pantalla.
  return (
    <Hoja onCerrar={onClose} ancho="max-w-lg" fondo="bg-black/70" className="p-5">
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

      {mvp.winner ? (
        <Ficha mvp={mvp} winner={mvp.winner} />
      ) : mvp.tied.length ? (
        <Empate mvp={mvp} />
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-6 text-center text-sm text-slate-400">
          Todavía no ha votado nadie. El MVP sale por mayoría de entre los
          pokémon que jugaron la jornada.
        </p>
      )}

      <Votacion mvp={mvp} />
    </Hoja>
  );
}

function Ficha({ mvp, winner }: { mvp: MvpView; winner: MvpCandidateView }) {
  const [editingReason, setEditingReason] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    setMvpReasonAction,
    null,
  );

  useEffect(() => {
    if (state?.success) setEditingReason(false);
  }, [state]);

  return (
    <>
      {/* 4:3 en vez de 16:9: con el panorámico el pokémon salía pequeño */}
      <div
        className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-white/5"
        style={{ background: `${winner.ownerColor}14` }}
      >
        {winner.detailImage ?? winner.boxImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <SpritePokemon
                ficha
            src={winner.detailImage ?? winner.boxImage ?? ""}
            alt={winner.species}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="text-4xl opacity-30" aria-hidden>
            ★
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-white">
            {winner.nickname ?? winner.species}
          </h3>
          <p className="muted">{winner.species}</p>
        </div>
        <span className="chip shrink-0 text-amber-300">
          {winner.votes} {winner.votes === 1 ? "voto" : "votos"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Avatar
          name={winner.ownerName}
          color={winner.ownerColor}
          image={winner.ownerAvatar}
          size={24}
          participantId={winner.ownerId}
        />
        <span className="text-sm text-slate-300">{winner.ownerName}</span>
      </div>

      {mvp.reason && !editingReason ? (
        <p className="mt-3 border-l-2 border-amber-400/40 pl-3 text-sm italic leading-relaxed text-slate-300">
          {mvp.reason}
        </p>
      ) : null}

      {mvp.canManage ? (
        editingReason ? (
          <form action={formAction} className="mt-4 space-y-3">
            <input type="hidden" name="matchdayId" value={mvp.matchdayId} />
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
              <SubmitButton>Guardar</SubmitButton>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditingReason(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-sm mt-3"
            onClick={() => setEditingReason(true)}
          >
            {mvp.reason ? "✎ Cambiar el porqué" : "＋ Contar por qué es el MVP"}
          </button>
        )
      ) : null}
    </>
  );
}

function Empate({ mvp }: { mvp: MvpView }) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
      <p className="text-sm text-amber-200">
        Empate entre {mvp.tied.length} pokémon a {mvp.tied[0].votes}{" "}
        {mvp.tied[0].votes === 1 ? "voto" : "votos"}. No hay MVP hasta que
        alguien cambie su voto{mvp.canManage ? " o lo desempates tú" : ""}.
      </p>
      {mvp.canManage ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {mvp.tied.map((candidate) => (
            <form key={candidate.id} action={setMvpTiebreakAction}>
              <input type="hidden" name="matchdayId" value={mvp.matchdayId} />
              <input
                type="hidden"
                name="matchPokemonId"
                value={candidate.id}
              />
              <button type="submit" className="btn-ghost btn-sm">
                Que gane {candidate.nickname ?? candidate.species}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type OwnerGroup = {
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  ownerAvatar: string | null;
  pokemon: MvpCandidateView[];
  votes: number;
};

/**
 * La votación va por entrenadores: se elige primero de quién, y ahí dentro
 * salen sus pokémon de esa jornada. Con seis jugadores a seis pokémon, la lista
 * de todos seguidos era un maremágnum.
 */
function Votacion({ mvp }: { mvp: MvpView }) {
  const groups = agruparPorDueno(mvp.candidates);
  const myGroup = mvp.candidates.find(
    (candidate) => candidate.id === mvp.myVoteId,
  )?.ownerId;

  // Se abre solo el del voto propio, que es el que se querrá mirar o cambiar
  const [open, setOpen] = useState<string | null>(myGroup ?? null);

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-white">Votación</h4>
        <span className="text-xs text-slate-500">
          {mvp.votesCast}/{mvp.voterCount} jugadores
        </span>
      </div>

      <ul className="space-y-1.5">
        {groups.map((group) => {
          const abierto = open === group.ownerId;
          const tieneMiVoto = group.ownerId === myGroup;

          return (
            <li
              key={group.ownerId}
              className={cx(
                "overflow-hidden rounded-lg border",
                tieneMiVoto
                  ? "border-brand-500/40 bg-brand-500/[0.07]"
                  : "border-white/5 bg-white/[0.03]",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(abierto ? null : group.ownerId)}
                aria-expanded={abierto}
                className="flex w-full items-center gap-2 px-2 py-2 text-left transition hover:bg-white/[0.04]"
              >
                <span
                  aria-hidden
                  className={cx(
                    "shrink-0 text-xs text-slate-500 transition",
                    abierto && "rotate-90",
                  )}
                >
                  ▸
                </span>
                <Avatar
                  name={group.ownerName}
                  color={group.ownerColor}
                  image={group.ownerAvatar}
                  size={24}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {group.ownerName}
                </span>
                {tieneMiVoto ? (
                  <span className="shrink-0 text-[11px] text-brand-400">
                    tu voto
                  </span>
                ) : null}
                <span className="shrink-0 text-[11px] text-slate-500">
                  {group.pokemon.length} pokémon
                </span>
                <span
                  className={cx(
                    "shrink-0 text-sm font-bold tabular-nums",
                    group.votes > 0 ? "text-amber-300" : "text-slate-600",
                  )}
                >
                  {group.votes}
                </span>
              </button>

              {abierto ? (
                <ul className="space-y-1 border-t border-white/5 p-2">
                  {group.pokemon.map((candidate) => (
                    <FilaPokemon
                      key={candidate.id}
                      mvp={mvp}
                      candidate={candidate}
                    />
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!mvp.canVote ? (
        <p className="muted mt-3">
          Votan los jugadores de la competición, también los que perdieron el
          locke. Quien se retira, ya no.
        </p>
      ) : null}
    </div>
  );
}

function FilaPokemon({
  mvp,
  candidate,
}: {
  mvp: MvpView;
  candidate: MvpCandidateView;
}) {
  const mine = mvp.myVoteId === candidate.id;

  return (
    <li
      className={cx(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5",
        mine
          ? "border-brand-500/40 bg-brand-500/10"
          : "border-transparent bg-white/[0.03]",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.04]">
        {candidate.boxImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <SpritePokemon
            src={candidate.boxImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-slate-500" aria-hidden>
            ?
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">
          {candidate.nickname ?? candidate.species}
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          {candidate.species}
        </span>
      </span>

      <span
        className={cx(
          "shrink-0 text-sm font-bold tabular-nums",
          candidate.votes > 0 ? "text-amber-300" : "text-slate-600",
        )}
      >
        {candidate.votes}
      </span>

      {mvp.canVote ? (
        mine ? (
          <form action={clearMvpVoteAction}>
            <input type="hidden" name="matchdayId" value={mvp.matchdayId} />
            <button
              type="submit"
              className="btn-ghost btn-sm"
              title="Quitar mi voto"
            >
              ✓ Tu voto
            </button>
          </form>
        ) : (
          <form action={castMvpVoteAction}>
            <input type="hidden" name="matchdayId" value={mvp.matchdayId} />
            <input type="hidden" name="matchPokemonId" value={candidate.id} />
            <button type="submit" className="btn-ghost btn-sm">
              Votar
            </button>
          </form>
        )
      ) : null}
    </li>
  );
}

/**
 * Agrupa los candidatos por entrenador. El orden es alfabético a propósito: la
 * lista no se recoloca cada vez que entra un voto, así el sitio de cada uno se
 * aprende y no hay que buscarlo.
 */
function agruparPorDueno(candidates: MvpCandidateView[]): OwnerGroup[] {
  const groups = new Map<string, OwnerGroup>();

  for (const candidate of candidates) {
    const group = groups.get(candidate.ownerId) ?? {
      ownerId: candidate.ownerId,
      ownerName: candidate.ownerName,
      ownerColor: candidate.ownerColor,
      ownerAvatar: candidate.ownerAvatar,
      pokemon: [],
      votes: 0,
    };
    group.pokemon.push(candidate);
    group.votes += candidate.votes;
    groups.set(candidate.ownerId, group);
  }

  for (const group of groups.values()) {
    // Dentro de cada uno, el orden del equipo: el mismo que en el combate, y
    // así tampoco baila cada vez que entra un voto.
    group.pokemon.sort((a, b) => a.position - b.position);
  }

  return [...groups.values()].sort((a, b) =>
    a.ownerName.localeCompare(b.ownerName, "es"),
  );
}
