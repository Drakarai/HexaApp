"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  findSpecies,
  searchSpecies,
  spriteCandidates,
  type PokedexSpecies,
} from "@/lib/pokedex";
import { IMAGE_SIZES, imageToDataUrl } from "@/lib/image";
import { cx } from "@/lib/utils";

/**
 * Busca el pokémon por su nombre en español y, al elegirlo, descarga solo el
 * sprite de Pokémon HOME y la ilustración oficial, los reduce y los deja
 * listos en los campos ocultos. Las imágenes se guardan como copia propia:
 * una vez registrada la baja no dependen de ningún servidor de fuera.
 */
export function SpeciesPicker({
  defaultSpecies = "",
  defaultBoxImage = "",
  defaultDetailImage = "",
}: {
  defaultSpecies?: string;
  defaultBoxImage?: string | null;
  defaultDetailImage?: string | null;
}) {
  const [query, setQuery] = useState(defaultSpecies);
  const [selected, setSelected] = useState<PokedexSpecies | null>(() =>
    defaultSpecies ? (findSpecies(defaultSpecies) ?? null) : null,
  );
  const [formId, setFormId] = useState<number | null>(null);
  const [shiny, setShiny] = useState(false);
  const [boxImage, setBoxImage] = useState(defaultBoxImage ?? "");
  const [detailImage, setDetailImage] = useState(defaultDetailImage ?? "");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const suggestions = suggestionsOpen ? searchSpecies(query) : [];
  // Evita que una descarga lenta pise el resultado de otra más reciente
  const requestRef = useRef(0);
  // Puede haber dos buscadores en la misma página (el alta y una ficha)
  const fieldId = useId();

  async function loadImages(pokemonId: number, isShiny: boolean) {
    const request = ++requestRef.current;
    setStatus("loading");

    const download = async (kind: "box" | "detail", maxSize: number) => {
      for (const url of spriteCandidates(pokemonId, isShiny, kind)) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          return await imageToDataUrl(await response.blob(), maxSize);
        } catch {
          // se prueba la siguiente dirección
        }
      }
      return null;
    };

    try {
      const [box, detail] = await Promise.all([
        download("box", IMAGE_SIZES.box),
        download("detail", IMAGE_SIZES.detail),
      ]);
      if (request !== requestRef.current) return;

      if (!box && !detail) {
        setStatus("error");
        return;
      }
      setBoxImage(box ?? detail ?? "");
      setDetailImage(detail ?? box ?? "");
      setStatus("idle");
    } catch {
      if (request === requestRef.current) setStatus("error");
    }
  }

  function chooseSpecies(species: PokedexSpecies) {
    setQuery(species.name);
    setSelected(species);
    setSuggestionsOpen(false);
    const firstForm = species.forms[0];
    setFormId(firstForm.id);
    void loadImages(firstForm.id, shiny);
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
              const match = findSpecies(event.target.value);
              if (match) {
                setSelected(match);
                setFormId(match.forms[0].id);
              } else {
                setSelected(null);
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
                      #{species.dex}
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
                onChange={(event) => {
                  const id = Number(event.target.value);
                  setFormId(id);
                  void loadImages(id, shiny);
                }}
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
              className="accent-amber-400"
              checked={shiny}
              onChange={(event) => {
                setShiny(event.target.checked);
                if (formId) void loadImages(formId, event.target.checked);
              }}
            />
            ✨ Shiny
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <Preview label="Caja" image={boxImage} />
        <Preview label="Ficha" image={detailImage} />
        <div className="min-w-0 flex-1 text-xs">
          {status === "loading" ? (
            <p className="text-slate-400">Descargando imágenes…</p>
          ) : status === "error" ? (
            <p className="text-amber-300">
              No he encontrado imágenes de esa forma. Puedes ponerlas a mano al
              abrir la ficha.
            </p>
          ) : boxImage || detailImage ? (
            <p className="text-slate-400">
              Sprite de Pokémon HOME e ilustración oficial, ya guardados. Podrás
              cambiarlos desde la ficha.
            </p>
          ) : (
            <p className="text-slate-500">
              Elige la especie de la lista y las imágenes se ponen solas.
            </p>
          )}
        </div>
      </div>

      <input type="hidden" name="boxImage" value={boxImage} />
      <input type="hidden" name="detailImage" value={detailImage} />
    </div>
  );
}

function Preview({ label, image }: { label: string; image: string }) {
  return (
    <div className="text-center">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-850">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-lg opacity-30" aria-hidden>
            ？
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}
