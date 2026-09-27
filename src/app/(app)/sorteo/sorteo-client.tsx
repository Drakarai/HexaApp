"use client";

import { useActionState, useState } from "react";
import {
  anadirAlBoteAction,
  borrarSorteoAction,
  cambiarParticipanteAction,
  crearSorteoAction,
  deshacerRepartoAction,
  quitarDelBoteAction,
  repartirAction,
} from "@/app/actions/sorteos";
import type { FormState } from "@/app/actions/auth";
import { Avatar, ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { Sprite } from "@/components/match-team";
import { POR_PERSONA } from "@/lib/sorteo";
import { cx, formatDateTime } from "@/lib/utils";
import { Icono } from "@/components/icono";

export type PokemonDelBote = {
  id: string;
  species: string;
  nickname: string | null;
  boxImage: string | null;
  aportadoPor: string | null;
  tocaAId: string | null;
};

export type GenteDelSorteo = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** Si entra en este reparto */
  entra: boolean;
};

export type SorteoVista = {
  id: string;
  label: string | null;
  repartidoAt: Date | null;
  pokemon: PokemonDelBote[];
  gente: GenteDelSorteo[];
};

export function CrearSorteo({ competitionId }: { competitionId: string }) {
  const [estado, crear] = useActionState<FormState, FormData>(
    crearSorteoAction,
    null,
  );

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Nuevo sorteo
      </summary>
      <form action={crear} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="min-w-48 flex-1">
          <label className="label">Para qué es</label>
          <input
            name="label"
            className="input"
            maxLength={60}
            placeholder="Jornada 4 · préstamos"
          />
        </div>
        <SubmitButton>Crear</SubmitButton>
        <FormMessage state={estado} />
      </form>
    </details>
  );
}

/**
 * Un sorteo: el bote de pokémon, quién entra y el reparto.
 *
 * El bote lo llena cualquiera que juegue —la gracia es que cada uno eche los
 * suyos— y repartir es cosa de la organización, como anotar un resultado.
 */
export function Sorteo({
  sorteo,
  canManage,
  miParticipantId,
}: {
  sorteo: SorteoVista;
  canManage: boolean;
  /** Quién mira, si juega este locke: puede echar al bote y quitar lo suyo */
  miParticipantId: string | null;
}) {
  const [estadoReparto, repartir] = useActionState<FormState, FormData>(
    repartirAction,
    null,
  );

  const entran = sorteo.gente.filter((quien) => quien.entra);
  const sinRepartir = sorteo.pokemon.filter((pokemon) => !pokemon.tocaAId);
  const huecos = entran.length * POR_PERSONA;
  const repartido = Boolean(sorteo.repartidoAt);

  const nombres = new Map(
    sorteo.gente.map((quien) => [quien.participantId, quien.displayName]),
  );

  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="section-title">{sorteo.label || "Sorteo"}</h2>
          <p className="text-xs text-slate-500">
            {sorteo.pokemon.length} en el bote · {entran.length}{" "}
            {entran.length === 1 ? "persona" : "personas"} ·{" "}
            {repartido
              ? `repartido ${formatDateTime(sorteo.repartidoAt!)}`
              : `caben ${huecos}`}
          </p>
        </div>
        {canManage ? (
          <form action={borrarSorteoAction}>
            <input type="hidden" name="sorteoId" value={sorteo.id} />
            <ConfirmSubmit message="¿Borrar este sorteo con su bote?">✕</ConfirmSubmit>
          </form>
        ) : null}
      </div>

      {/* Quién entra */}
      <div className="mb-3">
        <p className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">
          Quién entra
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sorteo.gente.map((quien) =>
            canManage ? (
              <form
                key={quien.participantId}
                action={cambiarParticipanteAction}
                className="contents"
              >
                <input type="hidden" name="sorteoId" value={sorteo.id} />
                <input
                  type="hidden"
                  name="participantId"
                  value={quien.participantId}
                />
                <button
                  type="submit"
                  className={cx(
                    "chip cursor-pointer",
                    quien.entra
                      ? "border-brand-500/40 bg-brand-600/20 text-white"
                      : "opacity-50",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: quien.color }}
                    aria-hidden
                  />
                  {quien.displayName}
                </button>
              </form>
            ) : (
              <span
                key={quien.participantId}
                className={cx("chip", !quien.entra && "opacity-40")}
              >
                {quien.displayName}
              </span>
            ),
          )}
        </div>
      </div>

      {/* El reparto, cuando ya está hecho */}
      {repartido ? (
        <div className="mb-4 space-y-2">
          {entran.map((quien) => {
            const suyos = sorteo.pokemon
              .filter((pokemon) => pokemon.tocaAId === quien.participantId)
              .slice(0, POR_PERSONA);
            return (
              <div
                key={quien.participantId}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Avatar
                    name={quien.displayName}
                    color={quien.color}
                    image={quien.avatarImage}
                    size={22}
                  />
                  <span className="text-sm font-semibold text-slate-100">
                    {quien.displayName}
                  </span>
                  <span className="ml-auto text-xs text-slate-500">
                    {suyos.length}/{POR_PERSONA}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suyos.map((pokemon) => (
                    <span key={pokemon.id} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] py-1 pl-1 pr-2">
                      <Sprite
                        pokemon={{
                          id: pokemon.id,
                          species: pokemon.species,
                          nickname: pokemon.nickname,
                          boxImage: pokemon.boxImage,
                        }}
                        owner={quien.displayName}
                        size={30}
                      />
                      <span className="text-xs text-slate-300">
                        {pokemon.nickname ?? pokemon.species}
                      </span>
                    </span>
                  ))}
                  {!suyos.length ? (
                    <span className="text-xs text-slate-600">
                      No le ha tocado nada.
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}

          {sinRepartir.length ? (
            <div className="rounded-xl border border-dashed border-white/10 p-2.5">
              <p className="mb-1.5 text-xs text-slate-500">
                Se quedan en el bote ({sinRepartir.length}): había más pokémon
                que huecos.
              </p>
              <div className="flex flex-wrap gap-1">
                {sinRepartir.map((pokemon) => (
                  <Sprite
                    key={pokemon.id}
                    pokemon={{
                      id: pokemon.id,
                      species: pokemon.species,
                      nickname: pokemon.nickname,
                      boxImage: pokemon.boxImage,
                    }}
                    owner="nadie"
                    size={28}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* El bote */}
      <div className="mb-3">
        <p className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">
          {repartido ? "El bote entero" : "En el bote"}
        </p>
        {sorteo.pokemon.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {sorteo.pokemon.map((pokemon) => (
              <li
                key={pokemon.id}
                className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] py-1 pl-1 pr-1.5"
                title={
                  pokemon.aportadoPor
                    ? `Lo puso ${nombres.get(pokemon.aportadoPor) ?? "alguien"}`
                    : undefined
                }
              >
                <Sprite
                  pokemon={{
                    id: pokemon.id,
                    species: pokemon.species,
                    nickname: pokemon.nickname,
                    boxImage: pokemon.boxImage,
                  }}
                  owner={
                    pokemon.aportadoPor
                      ? (nombres.get(pokemon.aportadoPor) ?? "alguien")
                      : "el bote"
                  }
                  size={28}
                />
                <span className="text-xs text-slate-300">
                  {pokemon.nickname ?? pokemon.species}
                </span>
                {/* La ✕ solo a quien puede usarla; el servidor lo comprueba igual */}
                {canManage || pokemon.aportadoPor === miParticipantId ? (
                  <form action={quitarDelBoteAction}>
                    <input type="hidden" name="pokemonId" value={pokemon.id} />
                    <button
                      type="submit"
                      className="rounded px-1 text-xs text-slate-500 hover:text-red-300"
                      title="Quitarlo del bote"
                    >
                      ✕
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-slate-500">
            El bote está vacío. Id echando pokémon aquí abajo.
          </p>
        )}
      </div>

      {miParticipantId ? <EcharAlBote sorteoId={sorteo.id} /> : null}

      {canManage ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <form action={repartir}>
            <input type="hidden" name="sorteoId" value={sorteo.id} />
            <SubmitButton className="btn-primary btn-sm">
              <Icono emoji="🎲" /> {repartido ? "Repartir otra vez" : "Repartir"}
            </SubmitButton>
          </form>
          {repartido ? (
            <form action={deshacerRepartoAction}>
              <input type="hidden" name="sorteoId" value={sorteo.id} />
              <button type="submit" className="btn-ghost btn-sm">
                Deshacer el reparto
              </button>
            </form>
          ) : null}
          <FormMessage state={estadoReparto} />
          <p className="w-full text-xs text-slate-500">
            Se baraja el bote entero y se da uno a cada uno por turnos. Si hay
            más pokémon que huecos, los que sobran se quedan sin repartir.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** El formulario de echar un pokémon al bote. */
function EcharAlBote({ sorteoId }: { sorteoId: string }) {
  const [estado, echar] = useActionState<FormState, FormData>(
    anadirAlBoteAction,
    null,
  );
  // El buscador de especie lleva estado propio: se remonta para vaciarlo
  const [vuelta, setVuelta] = useState(0);
  /**
   * Abierto o cerrado lo lleva React y no el navegador: al refrescarse la
   * página tras echar un pokémon, el `<details>` se cerraba solo y había que
   * volver a abrirlo para el siguiente. Al bote se echan varios de una vez.
   */
  const [abierto, setAbierto] = useState(false);

  return (
    <details
      open={abierto}
      onToggle={(evento) => setAbierto(evento.currentTarget.open)}
      className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
    >
      <summary className="cursor-pointer list-none text-xs font-semibold text-slate-300">
        ＋ Echar un pokémon al bote
      </summary>
      <form
        action={async (formData) => {
          await echar(formData);
          setVuelta((n) => n + 1);
        }}
        className="mt-3 space-y-3"
      >
        <input type="hidden" name="sorteoId" value={sorteoId} />
        <SpeciesPicker key={vuelta} />
        <div>
          <label className="label">Mote (opcional)</label>
          <input name="nickname" className="input" placeholder="Chispas" />
        </div>
        <FormMessage state={estado} />
        <SubmitButton className="btn-primary btn-sm">Al bote</SubmitButton>
      </form>
    </details>
  );
}
