"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { cx } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { QueSeMira } from "@/components/estadisticas-del-combate";
import type { RefCombate } from "@/lib/estadisticas";
import { Icono } from "@/components/icono";

/**
 * Lo que solo se abre al tocar algo va aparte y se pide entonces: el editor de
 * equipos y la hoja de estadísticas. Así quien solo mira los combates no se
 * descarga el buscador de la Pokédex ni el lector de repeticiones.
 */
const TeamEditor = dynamic(() => import("@/components/match-team-editor").then((m) => m.TeamEditor), {
  ssr: false,
});
const EstadisticasDelCombate = dynamic(
  () => import("@/components/estadisticas-del-combate").then((m) => m.EstadisticasDelCombate),
  { ssr: false },
);

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
  esReto = false,
  levelCapId,
  royaleId,
  finalFourId,
  rotulo,
  maximo = 6,
  aLaVez = 1,
  repeticion,
  estadisticas,
}: {
  matchId: string;
  /**
   * Uno o dos. Dos en un combate, y **uno** en el equipo con el que alguien se
   * pasó un gimnasio: allí no hay rival, solo el equipo que sacaste.
   */
  sides: TeamSide[];
  canManage: boolean;
  /** Los retos usan el mismo editor, solo cambia dónde se guarda */
  esReto?: boolean;
  /** Si viene, el equipo es el de ese gimnasio y no el de un combate */
  levelCapId?: string;
  /** Y si viene este, el de un Battle Royale */
  royaleId?: string;
  /** Y este, el equipo con el que se juega la final entera */
  finalFourId?: string;
  /** Qué poner en la cabecera del editor */
  rotulo?: string;
  /** Cuántos pokémon caben, que en VGC son cuatro y no seis */
  maximo?: number;
  /** Cuántos salen a la vez: en dobles se marcan los que abren */
  aLaVez?: number;
  /** El enlace de la repetición del combate, si ya se apuntó: de ahí salen los equipos */
  repeticion?: string | null;
  /**
   * Que se puedan mirar sus números: tocar un pokémon enseña lo que hizo en
   * estos combates (uno, o los de una serie o una final, sumados), y sale el
   * botón con las tablas. Solo los que tienen repetición, que es de donde salen.
   */
  estadisticas?: {
    refs: RefCombate[];
    /** «Estadísticas del combate», «… de la serie» */
    titulo?: string;
    /** Sin el botón: cuando cada combate ya lleva el suyo (la final) */
    sinBoton?: boolean;
  };
}) {
  const [editing, setEditing] = useState(false);
  const [mira, setMira] = useState<QueSeMira | null>(null);
  const verNumeros = Boolean(estadisticas?.refs.length);
  const alTocar = verNumeros
    ? (pokemon: TeamPokemon) =>
        setMira({ tipo: "pokemon", teamId: pokemon.id, nombre: pokemon.nickname ?? pokemon.species, imagen: pokemon.boxImage })
    : undefined;
  const hasTeams = sides.some((side) => side.team.length > 0);

  /**
   * Cuántas casillas se pintan. No son siempre las del formato: se pintan las
   * del equipo **más largo de este combate**. Así las dos cajas siguen midiendo
   * igual —que es para lo que estaban los huecos— pero cuando los dos han
   * sacado tres pokémon no quedan seis cuadros vacíos debajo de cada combate.
   */
  const casillas = Math.min(
    maximo,
    Math.max(1, ...sides.map((side) => side.team.length)),
  );

  // Sin equipos apuntados, la repetición sigue teniendo sus números
  if (!hasTeams && !canManage && !verNumeros) return null;

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      {hasTeams ? (
        <>
          {/* Móvil: una tira de sprites por jugador, que es lo que cabe */}
          <div className="space-y-1.5 lg:hidden">
            {sides.map((side) => (
              <TeamRow key={side.participantId} side={side} aLaVez={aLaVez} alTocar={alTocar} />
            ))}
          </div>

          {/* PC: los equipos como cajas de 3x2, una al lado de la otra */}
          <div
            className={cx(
              "hidden gap-3 lg:grid",
              sides.length > 1 ? "lg:grid-cols-2" : "lg:max-w-sm",
            )}
          >
            {sides.map((side) => (
              <TeamBox
                key={side.participantId}
                side={side}
                maximo={maximo}
                casillas={casillas}
                aLaVez={aLaVez}
                alTocar={alTocar}
              />
            ))}
          </div>
        </>
      ) : null}

      {verNumeros && !estadisticas?.sinBoton ? (
        <button
          type="button"
          className="btn-ghost btn-sm mt-2 mr-2"
          onClick={() => setMira({ tipo: "combate" })}
        >
          <Icono emoji="📊" /> {estadisticas?.titulo ?? "Estadísticas del combate"}
        </button>
      ) : null}

      {mira && estadisticas ? (
        <EstadisticasDelCombate
          refs={estadisticas.refs}
          titulo={estadisticas.titulo}
          mira={mira}
          onCerrar={() => setMira(null)}
        />
      ) : null}

      {canManage ? (
        <button
          type="button"
          className="btn-ghost btn-sm mt-2"
          onClick={() => setEditing(true)}
        >
          {sides.length > 1
            ? hasTeams
              ? "✎ Cambiar equipos"
              : "＋ Apuntar equipos"
            : hasTeams
            ? "✎ Cambiar el equipo"
            : // En la final es "el equipo con el que juegas", no "con el que lo
              // pasaste", que eso es del gimnasio de un locke en solitario
              finalFourId
              ? "＋ Apuntar el equipo"
              : "＋ Apuntar con qué lo pasaste"}
        </button>
      ) : null}

      {editing ? (
        <TeamEditor
          matchId={matchId}
          esReto={esReto}
          levelCapId={levelCapId}
          royaleId={royaleId}
          finalFourId={finalFourId}
          rotulo={rotulo}
          maximo={maximo}
          sides={sides}
          repeticion={repeticion}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}

function TeamRow({
  side,
  aLaVez = 1,
  alTocar,
}: {
  side: TeamSide;
  aLaVez?: number;
  alTocar?: (pokemon: TeamPokemon) => void;
}) {
  if (!side.team.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Avatar
        name={side.displayName}
        color={side.color}
        image={side.avatarImage}
        size={18}
        participantId={side.participantId}
      />
      {side.team.map((pokemon, index) => (
        <Sprite
          key={pokemon.id}
          pokemon={pokemon}
          owner={side.displayName}
          abre={aLaVez > 1 && index < aLaVez}
          alTocar={alTocar}
        />
      ))}
    </div>
  );
}

/**
 * El equipo como una caja, al estilo del equipo de un juego. Los huecos que
 * faltan se pintan en punteado para que las dos cajas de un combate midan igual
 * y se lean de un vistazo, pero solo hasta donde llegue el equipo más largo:
 * ver `casillas` en `MatchTeams`. `maximo` sigue siendo el del formato —seis en
 * singles, cuatro en VGC— porque es lo que dice el contador de la esquina.
 */
function TeamBox({
  side,
  maximo = 6,
  casillas = maximo,
  aLaVez = 1,
  alTocar,
}: {
  side: TeamSide;
  maximo?: number;
  casillas?: number;
  aLaVez?: number;
  alTocar?: (pokemon: TeamPokemon) => void;
}) {
  const huecos = Array.from({ length: casillas }, (_, index) => side.team[index] ?? null);

  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] p-2">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Avatar
          name={side.displayName}
          color={side.color}
          image={side.avatarImage}
          size={20}
          participantId={side.participantId}
        />
        <span className="min-w-0 truncate text-xs font-semibold text-slate-300">
          {side.displayName}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-slate-500">
          {side.team.length}/{maximo}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {huecos.map((pokemon, index) =>
          pokemon ? (
            <Casilla
              key={pokemon.id}
              alTocar={alTocar && (() => alTocar(pokemon))}
              title={`${pokemon.nickname ?? pokemon.species} (${pokemon.species})${
                aLaVez > 1 && index < aLaVez ? " · abre el combate" : ""
              }`}
              className={cx(
                "min-w-0 rounded-lg border bg-white/[0.04] p-1",
                // En dobles y VGC, los primeros son los que salen al terreno
                aLaVez > 1 && index < aLaVez
                  ? "border-brand-400/50 ring-1 ring-brand-400/30"
                  : "border-white/5",
              )}
            >
              <div className="flex h-16 items-center justify-center">
                {pokemon.boxImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <SpritePokemon
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
            </Casilla>
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

/** Una casilla del equipo: un botón si se puede tocar para ver sus números */
function Casilla({
  alTocar,
  className,
  title,
  children,
}: {
  alTocar?: () => void;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  if (!alTocar) {
    return (
      <div title={title} className={className}>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      title={`${title} · toca para ver lo que hizo`}
      onClick={alTocar}
      className={cx(className, "block text-left transition hover:bg-white/[0.08]")}
    >
      {children}
    </button>
  );
}

export function Sprite({
  pokemon,
  owner,
  size = 34,
  abre = false,
  alTocar,
}: {
  pokemon: TeamPokemon;
  owner: string;
  size?: number;
  /** Que es de los que salen al terreno al empezar (dobles, VGC) */
  abre?: boolean;
  alTocar?: (pokemon: TeamPokemon) => void;
}) {
  const Etiqueta = alTocar ? "button" : "span";
  return (
    <Etiqueta
      {...(alTocar ? { type: "button" as const, onClick: () => alTocar(pokemon) } : {})}
      title={`${pokemon.nickname ?? pokemon.species} (${pokemon.species}) de ${owner}${
        abre ? " · abre el combate" : ""
      }`}
      className={cx(
        "flex shrink-0 items-center justify-center rounded-lg bg-white/[0.04]",
        abre && "ring-1 ring-brand-400/50",
        alTocar && "transition hover:bg-white/[0.1]",
      )}
      style={{ width: size, height: size }}
    >
      {pokemon.boxImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <SpritePokemon
          src={pokemon.boxImage}
          alt={pokemon.nickname ?? pokemon.species}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-[11px] text-slate-500" aria-hidden>
          ?
        </span>
      )}
    </Etiqueta>
  );
}
