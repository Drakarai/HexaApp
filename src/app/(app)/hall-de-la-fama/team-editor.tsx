"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { useActionState, useEffect, useState } from "react";
import {
  addHallPokemonAction,
  anadirDelPcAction,
  removeHallPokemonAction,
  traerEquipoDelPcAction,
  traerUltimoEquipoAction,
} from "@/app/actions/hall";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { sonarGrito } from "@/lib/gritos";
import { HistoriaDelPokemon } from "@/components/historia-del-pokemon";
import { CabeceraDeFicha } from "@/components/cabecera-de-ficha";
import { Pestanas } from "@/components/pestanas";
import { Hoja } from "@/components/hoja";

export type HallPokemon = {
  id: string;
  species: string;
  /** El número de PokéAPI, para su grito y su número en la entrada al hall */
  pokemonId: number | null;
  tipos: { slug: string; nombre: string }[];
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
  dueno,
}: {
  team: HallPokemon[];
  editable: boolean;
  teamSize?: number;
  /** El equipo del campeón */
  destacado?: boolean;
  dueno: DuenoDelEquipo;
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
                  <SpritePokemon
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
          dueno={dueno}
          destacado={destacado}
          onClose={() => setAbiertoId(null)}
        />
      ) : null}
    </>
  );
}

type DuenoDelEquipo = { nombre: string; color: string; imagen: string | null; participantId: string };

/**
 * La ficha de un pokémon del hall: la misma cabecera que en el Equipo y PC y
 * el cementerio, con su historia en una pestaña aparte.
 */
function FichaEnGrande({
  pokemon,
  dueno,
  destacado,
  onClose,
}: {
  pokemon: HallPokemon;
  dueno: DuenoDelEquipo;
  destacado: boolean;
  onClose: () => void;
}) {
  const [pestana, setPestana] = useState<"resumen" | "historia">("resumen");
  useEffect(() => {
    sonarGrito(pokemon.pokemonId);
  }, [pokemon.pokemonId]);

  const imagen = pokemon.detailImage ?? pokemon.image;
  const nombre = pokemon.nickname ?? pokemon.species;

  return (
    <Hoja onCerrar={onClose} className="p-5 pt-3" etiqueta={nombre}>
      <CabeceraDeFicha
        dueno={dueno}
        onCerrar={onClose}
        nombre={nombre}
        especie={pokemon.species}
        detalle={
          destacado ? (
            <span className="inline-flex items-center gap-1 text-amber-200">
              <Icono emoji="🏆" tamano={13} /> Del equipo campeón
            </span>
          ) : null
        }
        tipos={pokemon.tipos}
        sprite={
          imagen ? (
            <SpritePokemon
              ficha
              key={pokemon.id}
              src={imagen}
              pokemonId={pokemon.pokemonId}
              alt={pokemon.species}
              className="h-20 w-20 object-contain"
            />
          ) : (
            <span className="text-3xl opacity-20" aria-hidden>
              ★
            </span>
          )
        }
      >
        <Pestanas
          className="mt-3"
          ancha
          etiqueta="Partes de la ficha"
          valor={pestana}
          onCambiar={setPestana}
          opciones={[
            { valor: "resumen", rotulo: "Resumen" },
            { valor: "historia", rotulo: "Historia" },
          ]}
        />
      </CabeceraDeFicha>

      <div className="min-h-[40dvh] sm:min-h-[16rem]">
        {pestana === "historia" ? (
          <HistoriaDelPokemon de={{ tipo: "hall", id: pokemon.id }} nombre={nombre} />
        ) : (
          // Del hall no se guarda más que quién es: lo demás está en su historia
          <p className="muted mt-2 text-sm">
            {destacado
              ? `Ganó el locke en el equipo de ${dueno.nombre}.`
              : `Llegó hasta el final en el equipo de ${dueno.nombre}.`}{" "}
            Lo que hizo por el camino, en Historia.
          </p>
        )}
      </div>
    </Hoja>
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
    <form action={formAction}>
      <input type="hidden" name="participantId" value={participantId} />
      <SubmitButton className="btn-ghost btn-sm">
        ⤵ Traer el equipo de {deDonde}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/** Un pokémon de su Equipo y PC, para elegirlo */
export type DelPc = {
  id: string;
  species: string;
  nickname: string | null;
  enEquipo: boolean;
  imagen: string | null;
};

/** Traerse de golpe los que lleva en el equipo de Equipo y PC */
function TraerDelPc({ participantId }: { participantId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(traerEquipoDelPcAction, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="participantId" value={participantId} />
      <SubmitButton className="btn-ghost btn-sm">⤵ Traer mi equipo de Equipo y PC</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/**
 * Elegir de su PC, de uno en uno: los del equipo primero y luego los de la
 * caja, con un buscador si son muchos. Un toque y entra.
 */
function ElegirDelPc({ participantId, pokemon }: { participantId: string; pokemon: DelPc[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(anadirDelPcAction, null);
  const [busqueda, setBusqueda] = useState("");
  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? pokemon.filter((p) => `${p.nickname ?? ""} ${p.species}`.toLowerCase().includes(texto))
    : pokemon;
  return (
    <div className="mt-3 space-y-3">
      {pokemon.length > 12 ? (
        <input
          className="input"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por mote o especie…"
          aria-label="Buscar en tu PC"
        />
      ) : null}
      <form action={formAction}>
        <input type="hidden" name="participantId" value={participantId} />
        <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-6">
          {visibles.map((p) => (
            <button
              key={p.id}
              type="submit"
              name="captureId"
              value={p.id}
              title={`Añadir a ${p.nickname ?? p.species}`}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-center transition hover:border-brand-500/50"
            >
              <span className="flex aspect-square items-center justify-center">
                {p.imagen ? (
                  <SpritePokemon src={p.imagen} alt={p.species} loading="lazy" className="h-full w-full object-contain" />
                ) : null}
              </span>
              <span className="block truncate text-xs font-semibold text-slate-100">{p.nickname ?? p.species}</span>
              <span className="block truncate text-[10px] text-slate-500">{p.enEquipo ? "Equipo" : "Caja"}</span>
            </button>
          ))}
        </div>
      </form>
      {!visibles.length ? <p className="muted text-sm">Nadie con ese nombre.</p> : null}
      <FormMessage state={state} />
    </div>
  );
}

/** Formulario para ir metiendo los pokémon del equipo. */
export function AddPokemonForm({
  participantId,
  remaining,
  ultimoEquipoDe,
  vacia = false,
  delPc = null,
}: {
  participantId: string;
  remaining: number;
  /** De qué jornada se puede traer el equipo, si hay alguno y está vacío */
  ultimoEquipoDe?: string | null;
  /** Si el equipo del hall está vacío: los atajos de traerlo entero solo salen así */
  vacia?: boolean;
  /** Sus pokémon vivos de Equipo y PC, si quien mira puede ver esa caja */
  delPc?: DelPc[] | null;
}) {
  const [modo, setModo] = useState<"pc" | "mano">(delPc?.length ? "pc" : "mano");
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

  const conEquipoEnElPc = Boolean(delPc?.some((p) => p.enEquipo));
  return (
    <>
    {/* Los dos atajos para no teclear: el último combate y el equipo que lleva en el PC */}
    {ultimoEquipoDe || (vacia && conEquipoEnElPc) ? (
      <div className="mt-3 flex flex-wrap items-start gap-2">
        {ultimoEquipoDe ? (
          <TraerUltimoEquipo participantId={participantId} deDonde={ultimoEquipoDe} />
        ) : null}
        {vacia && conEquipoEnElPc ? <TraerDelPc participantId={participantId} /> : null}
      </div>
    ) : null}
    <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        ▸ Añadir pokémon ({remaining} {remaining === 1 ? "hueco" : "huecos"})
      </summary>
      {delPc?.length ? (
        <Pestanas
          className="mt-3"
          etiqueta="Cómo añadirlo"
          valor={modo}
          onCambiar={setModo}
          opciones={[
            { valor: "pc", rotulo: "De tu PC" },
            { valor: "mano", rotulo: "Escribirlo" },
          ]}
        />
      ) : null}
      {modo === "pc" && delPc?.length ? (
        <ElegirDelPc participantId={participantId} pokemon={delPc} />
      ) : (
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
      )}
    </details>
    </>
  );
}
