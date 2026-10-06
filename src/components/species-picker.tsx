"use client";

import { useId, useState } from "react";
import {
  findSpecies,
  searchSpecies,
  spriteCandidates,
  type PokedexSpecies,
} from "@/lib/pokedex";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { useEsAnil } from "@/components/juego-del-locke";
import { esPokemonDeAnil } from "@/lib/anil";

/**
 * Busca el pokémon por su nombre en español y manda al servidor **qué** pokémon
 * es, no sus imágenes.
 *
 * Antes el navegador se bajaba de GitHub el render de Pokémon HOME y la
 * ilustración oficial (unos 110 KB cada uno), los redimensionaba con canvas y
 * subía 57 KB de base64 al guardar. Había que esperar a todo eso antes de poder
 * pulsar el botón, y apuntar un equipo son seis pokémon seguidos. Ahora las
 * descarga el servidor al guardar (ver lib/sprites-servidor.ts) y aquí solo
 * viajan el número de la especie y si es shiny.
 */
export function SpeciesPicker({
  defaultSpecies = "",
  defaultBoxImage = "",
  defaultDetailImage = "",
}: {
  defaultSpecies?: string;
  /**
   * Imágenes que ya tiene guardadas, **solo para la vista previa**: son
   * direcciones, no las imágenes. Mientras no se elija otra especie no se toca
   * nada de lo guardado.
   */
  defaultBoxImage?: string | null;
  defaultDetailImage?: string | null;
}) {
  // En un locke de Pokémon Añil también salen sus pokémon nuevos
  const anil = useEsAnil();
  const [query, setQuery] = useState(defaultSpecies);
  const [selected, setSelected] = useState<PokedexSpecies | null>(() =>
    defaultSpecies ? (findSpecies(defaultSpecies, anil) ?? null) : null,
  );
  const [formId, setFormId] = useState<number | null>(null);
  const [shiny, setShiny] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const suggestions = suggestionsOpen ? searchSpecies(query, 8, anil) : [];
  // Puede haber dos buscadores en la misma página (el alta y una ficha)
  const fieldId = useId();

  // Se ha elegido pokémon nuevo: es lo que hará que el servidor lo descargue
  const elegido = formId !== null;

  function chooseSpecies(species: PokedexSpecies) {
    setQuery(species.name);
    setSelected(species);
    setSuggestionsOpen(false);
    setFormId(species.forms[0].id);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <label className="label" htmlFor={`${fieldId}-especie`}>
            Especie
          </label>
          <input
            id={`${fieldId}-especie`}
            name="species"
            className="input"
            value={query}
            autoComplete="off"
            placeholder="Quilava"
            required
            onChange={(event) => {
              setQuery(event.target.value);
              setSuggestionsOpen(true);
              const match = findSpecies(event.target.value, anil);
              if (match) {
                setSelected(match);
                setFormId(match.forms[0].id);
              } else {
                setSelected(null);
                setFormId(null);
              }
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => {
              // Da tiempo a que el clic en una sugerencia llegue antes de cerrar
              window.setTimeout(() => setSuggestionsOpen(false), 150);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && suggestions.length) {
                event.preventDefault();
                chooseSpecies(suggestions[0]);
              }
              if (event.key === "Escape") setSuggestionsOpen(false);
            }}
          />

          {suggestions.length && query !== selected?.name ? (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-white/10 bg-ink-850 py-1 shadow-xl">
              {suggestions.map((species) => (
                <li key={species.dex}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSpecies(species)}
                  >
                    <span className="w-10 shrink-0 text-xs text-slate-500 tabular-nums">
                      {esPokemonDeAnil(species.dex) ? "Añil" : `#${species.dex}`}
                    </span>
                    {species.name}
                    {species.forms.length > 1 ? (
                      <span className="ml-auto text-xs text-slate-500">
                        {species.forms.length} formas
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex items-end gap-3">
          {selected && selected.forms.length > 1 ? (
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor={`${fieldId}-forma`}>
                Forma
              </label>
              <select
                id={`${fieldId}-forma`}
                className="input"
                value={formId ?? selected.forms[0].id}
                onChange={(event) => setFormId(Number(event.target.value))}
              >
                {selected.forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label
            className={cx(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
              shiny
                ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
                : "border-white/10 bg-white/5 text-slate-300",
            )}
          >
            <input
              type="checkbox"
              name="shiny"
              className="accent-amber-400"
              checked={shiny}
              onChange={(event) => setShiny(event.target.checked)}
            />
            <Icono emoji="✨" /> Shiny
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <Preview
          elegido={elegido}
          pokemonId={formId}
          shiny={shiny}
          guardada={defaultBoxImage ?? ""}
        />
        <div className="min-w-0 flex-1 text-xs">
          {elegido ? (
            <p className="text-slate-400">
              Al guardar se descargan solas el sprite de Pokémon HOME y la
              ilustración oficial. Podrás cambiarlas desde la ficha.
            </p>
          ) : defaultBoxImage || defaultDetailImage ? (
            <p className="text-slate-500">
              Esta es la que tiene ahora. Si eliges otra especie se cambia sola.
            </p>
          ) : (
            <p className="text-slate-500">
              Elige la especie de la lista y las imágenes se ponen solas.
            </p>
          )}
        </div>
      </div>

      {/* Lo único que viaja: qué pokémon es. Si no se ha elegido ninguno no se
          manda nada y el servidor deja las imágenes que ya hubiera. */}
      {elegido ? (
        <input type="hidden" name="pokemonId" value={formId ?? ""} />
      ) : null}
    </div>
  );
}

/**
 * Vista previa. Con un pokémon recién elegido usa el sprite pequeño de toda la
 * vida (unos 900 bytes) en vez del render grande: es solo para confirmar que
 * has elegido el que querías, y así no se bajan 110 KB por cada uno que miras.
 */
function Preview({
  elegido,
  pokemonId,
  shiny,
  guardada,
}: {
  elegido: boolean;
  pokemonId: number | null;
  shiny: boolean;
  guardada: string;
}) {
  const [fallo, setFallo] = useState(false);
  const candidatas =
    elegido && pokemonId ? spriteCandidates(pokemonId, shiny, "mini") : [];
  const src = elegido ? (fallo ? candidatas[1] : candidatas[0]) : guardada;

  return (
    <div className="text-center">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-850">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setFallo(true)}
          />
        ) : (
          <span className="text-lg opacity-30" aria-hidden>
            ？
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
        {elegido ? "Elegido" : "Ahora"}
      </p>
    </div>
  );
}
