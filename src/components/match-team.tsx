"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMatchPokemonAction,
  removeMatchPokemonAction,
} from "@/app/actions/match-teams";
import type { FormState } from "@/app/actions/auth";
import { Avatar, ConfirmSubmit, FormMessage } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { spriteCandidates } from "@/lib/pokedex";

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
        <>
          {/* Móvil: una tira de sprites por jugador, que es lo que cabe */}
          <div className="space-y-1.5 lg:hidden">
            {sides.map((side) => (
              <TeamRow key={side.participantId} side={side} />
            ))}
          </div>

          {/* PC: los dos equipos como cajas de 3x2, una al lado de la otra */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-2">
            {sides.map((side) => (
              <TeamBox key={side.participantId} side={side} />
            ))}
          </div>
        </>
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

/**
 * El equipo como una caja de 3x2, al estilo del equipo de un juego. Los seis
 * huecos están siempre, aunque falten pokémon, para que las dos cajas de un
 * combate midan igual y se lean de un vistazo.
 */
function TeamBox({ side }: { side: TeamSide }) {
  const huecos = Array.from({ length: 6 }, (_, index) => side.team[index] ?? null);

  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] p-2">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Avatar
          name={side.displayName}
          color={side.color}
          image={side.avatarImage}
          size={20}
        />
        <span className="min-w-0 truncate text-xs font-semibold text-slate-300">
          {side.displayName}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-slate-600">
          {side.team.length}/6
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {huecos.map((pokemon, index) =>
          pokemon ? (
            <div
              key={pokemon.id}
              title={`${pokemon.nickname ?? pokemon.species} (${pokemon.species})`}
              className="min-w-0 rounded-lg border border-white/5 bg-white/[0.04] p-1"
            >
              <div className="flex h-16 items-center justify-center">
                {pokemon.boxImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={pokemon.boxImage}
                    alt={pokemon.nickname ?? pokemon.species}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-lg text-slate-600" aria-hidden>
                    ?
                  </span>
                )}
              </div>
              <p className="truncate text-center text-[11px] text-slate-400">
                {pokemon.nickname ?? pokemon.species}
              </p>
            </div>
          ) : (
            <div
              key={`hueco-${index}`}
              aria-hidden
              className="rounded-lg border border-dashed border-white/[0.07]"
            >
              <div className="h-16" />
              <p className="text-[11px]">&nbsp;</p>
            </div>
          ),
        )}
      </div>
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
  /**
   * El pokémon aparece en su equipo nada más darle a añadir, sin esperar al
   * servidor. Lo que se espera son unos 600 ms —descargar las imágenes y volver
   * a generar la página— y apuntar un equipo son seis seguidos: esperando cada
   * vez se hacía pesadísimo. Cuando el servidor contesta, la lista de verdad
   * sustituye a esta; si falla, el pokémon desaparece solo y sale el aviso.
   */
  const [equipos, anadirALaVista] = useOptimistic(
    sides,
    (actuales, recien: TeamPokemon & { participantId: string }) =>
      actuales.map((lado) =>
        lado.participantId === recien.participantId
          ? { ...lado, team: [...lado.team, recien] }
          : lado,
      ) as [TeamSide, TeamSide],
  );

  const [state, setState] = useState<FormState>(null);
  // El dueño se queda como lo dejaste: apuntar un equipo entero es meter seis
  // seguidos del mismo, y volver al primero del combate cada vez era un lío.
  const [owner, setOwner] = useState(sides[0].participantId);
  // El buscador y el mote se vacían remontándolos: los dos llevan estado
  // propio, así que un reset() del formulario no los limpiaría.
  const [limpiezas, setLimpiezas] = useState(0);

  /**
   * El envío se hace a mano en vez de con `action={...}` para mandar el orden:
   * primero se lee el formulario, luego se vacía. Dejándoselo a React, la
   * limpieza caía a destiempo y se perdía el mote del pokémon.
   */
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const formData = new FormData(formulario);

    const especie = String(formData.get("species") ?? "").trim();
    if (!especie) return;

    const pokemonId = Number(formData.get("pokemonId") ?? 0);
    const dueno = String(formData.get("participantId") ?? "");

    startTransition(async () => {
      anadirALaVista({
        // Provisional: al llegar la respuesta manda la lista del servidor
        id: `pendiente-${Date.now()}`,
        species: especie,
        nickname: String(formData.get("nickname") ?? "").trim() || null,
        // El sprite pequeño de siempre, que pesa unos 900 bytes
        boxImage: pokemonId
          ? spriteCandidates(pokemonId, formData.get("shiny") === "on", "mini")[0]
          : null,
        participantId: dueno,
      });
      setState(await addMatchPokemonAction(null, formData));
    });

    // Ya está leído: se puede vaciar para escribir el siguiente
    setLimpiezas((veces) => veces + 1);
  }

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
          {equipos.map((side) => (
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
          onSubmit={enviar}
          className="mt-4 space-y-3 border-t border-white/10 pt-4"
        >
          <input type="hidden" name="matchId" value={matchId} />
          <SpeciesPicker key={limpiezas} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Entrenador</label>
              <select
                name="participantId"
                className="input"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
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
              <input
                key={limpiezas}
                name="nickname"
                className="input"
                placeholder="Chispas"
              />
            </div>
          </div>
          <FormMessage state={state} />
          {/* Sin bloquearse mientras guarda: se pueden encadenar varios */}
          <button type="submit" className="btn-primary">
            Añadir al equipo
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
