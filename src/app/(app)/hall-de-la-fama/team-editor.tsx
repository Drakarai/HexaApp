"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  addHallPokemonAction,
  removeHallPokemonAction,
  traerUltimoEquipoAction,
} from "@/app/actions/hall";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { cx } from "@/lib/utils";

export type HallPokemon = {
  id: string;
  species: string;
  nickname: string | null;
  image: string | null;
  /** La ilustración grande. Los equipos de antes no la tienen. */
  detailImage: string | null;
};

/**
 * Los 6 huecos del equipo final de un jugador.
 *
 * El del campeón se pinta **más grande y en dorado**: es el equipo que ganó el
 * locke y tiene que destacar sobre los demás, que es de lo que va esta página.
 */
export function TeamSlots({
  team,
  editable,
  teamSize = 6,
  destacado = false,
  duenoName,
}: {
  team: HallPokemon[];
  editable: boolean;
  teamSize?: number;
  /** El equipo del campeón */
  destacado?: boolean;
  duenoName: string;
}) {
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const abierto = team.find((pokemon) => pokemon.id === abiertoId) ?? null;
  const huecos = Math.max(0, teamSize - team.length);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {team.map((pokemon) => (
          <div
            key={pokemon.id}
            className={cx(
              "group relative rounded-xl border p-2 transition",
              destacado
                ? "border-amber-400/30 bg-amber-400/[0.06] hover:border-amber-400/60"
                : "border-white/10 bg-white/[0.03] hover:border-brand-500/50",
            )}
          >
            {/* La casilla entera abre la ficha: en un móvil apuntar a un
                botón pequeño dentro del sprite es un suplicio */}
            <button
              type="button"
              onClick={() => setAbiertoId(pokemon.id)}
              title={`${pokemon.nickname ?? pokemon.species} — ver en grande`}
              className="w-full"
            >
              <span
                className={cx(
                  "flex aspect-square items-center justify-center overflow-hidden rounded-lg",
                  destacado ? "bg-amber-950/30" : "bg-ink-850",
                )}
              >
                {pokemon.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={pokemon.image}
                    alt={pokemon.species}
                    loading="lazy"
                    className="h-full w-full object-contain transition group-hover:scale-105"
                  />
                ) : (
                  <span className="text-lg opacity-30" aria-hidden>
                    ★
                  </span>
                )}
              </span>
              <span className="mt-1.5 block truncate text-center text-sm font-semibold text-slate-100">
                {pokemon.nickname ?? pokemon.species}
              </span>
              <span className="block truncate text-center text-[11px] text-slate-500">
                {pokemon.species}
              </span>
            </button>

            {/**
             * En el móvil la ✕ se ve siempre. Salía solo al pasar el ratón por
             * encima, y en una pantalla táctil eso no pasa nunca: el botón
             * estaba ahí con opacidad 0 y no había forma de quitar un pokémon
             * del equipo desde el teléfono.
             */}
            {editable ? (
              <form
                action={removeHallPokemonAction}
                className="absolute right-1 top-1 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
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
          /* Un recuadro punteado y nada dentro. Antes llevaba un "·" a opacidad
             25, y con el borde tan tenue lo que se veía eran tres puntos
             sueltos flotando, como suciedad en la pantalla. */
          <div
            key={`hueco-${index}`}
            className="aspect-square rounded-xl border border-dashed border-white/[0.12]"
            aria-hidden
          />
        ))}
      </div>

      {abierto ? (
        <FichaEnGrande
          pokemon={abierto}
          duenoName={duenoName}
          destacado={destacado}
          onClose={() => setAbiertoId(null)}
        />
      ) : null}
    </>
  );
}

/**
 * El pokémon en grande. Con su ilustración si la tiene; los equipos apuntados
 * antes de que se guardara se apañan con el sprite de la casilla.
 */
function FichaEnGrande({
  pokemon,
  duenoName,
  destacado,
  onClose,
}: {
  pokemon: HallPokemon;
  duenoName: string;
  destacado: boolean;
  onClose: () => void;
}) {
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

  const imagen = pokemon.detailImage ?? pokemon.image;

  // Portal, como el resto de diálogos: las tarjetas llevan backdrop-blur y eso
  // rompe el posicionamiento fijo de lo que tienen dentro.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cx(
          "my-auto w-full max-w-sm rounded-2xl border bg-ink-900 p-5 text-center shadow-2xl",
          destacado ? "border-amber-400/30" : "border-white/10",
        )}
      >
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-ink-850">
          {imagen ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagen}
              alt={pokemon.species}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <span className="text-5xl opacity-20" aria-hidden>
              ★
            </span>
          )}
        </div>

        <p className="mt-4 text-2xl font-black text-white">
          {pokemon.nickname ?? pokemon.species}
        </p>
        {pokemon.nickname ? (
          <p className="text-sm text-slate-400">{pokemon.species}</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          {destacado ? "🏆 Del equipo campeón · " : ""}
          {duenoName}
        </p>

        <button type="button" className="btn-ghost mt-5" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * El atajo: traerse el equipo del último combate de jornada en vez de teclear
 * seis pokémon que la aplicación ya conoce. Solo sale con el equipo vacío.
 */
function TraerUltimoEquipo({
  participantId,
  deDonde,
}: {
  participantId: string;
  deDonde: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    traerUltimoEquipoAction,
    null,
  );

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="participantId" value={participantId} />
      <SubmitButton className="btn-ghost btn-sm">
        ⤵ Traer el equipo de {deDonde}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/** Formulario para ir metiendo los pokémon del equipo. */
export function AddPokemonForm({
  participantId,
  remaining,
  ultimoEquipoDe,
}: {
  participantId: string;
  remaining: number;
  /** De qué jornada se puede traer el equipo, si hay alguno y está vacío */
  ultimoEquipoDe?: string | null;
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
    <>
    {ultimoEquipoDe ? (
      <TraerUltimoEquipo
        participantId={participantId}
        deDonde={ultimoEquipoDe}
      />
    ) : null}
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
    </>
  );
}
