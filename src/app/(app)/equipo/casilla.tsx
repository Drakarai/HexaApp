"use client";

import { Icono } from "@/components/icono";
import { ChapaDeTipo } from "@/components/chapa-de-tipo";
import { cx } from "@/lib/utils";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { ConFichaAlPasar } from "./ficha-al-pasar";
import type { PokemonDelTablero } from "@/lib/soul-link";
import type { Arrastre } from "./arrastre";

/**
 * Las piezas pequeñas del tablero del Equipo y PC: la casilla de cada
 * pokémon, las flechas de la caja, los sprites y las chapas de tipo. Ver
 * `tablero.tsx`.
 */
export function Casilla({
  pokemon,
  destino,
  numero,
  resaltado,
  grande = false,
  rejilla = false,
  arrastre,
  onAbrir,
}: {
  pokemon: PokemonDelTablero | null;
  destino: string;
  numero: number | undefined;
  resaltado: boolean;
  grande?: boolean;
  /** En la caja sin fondo, cada hueco se marca; sobre un fondo, no, como en los juegos */
  rejilla?: boolean;
  arrastre: Arrastre;
  onAbrir: (id: string) => void;
}) {
  const levantado = pokemon && arrastre.fantasma?.id === pokemon.id;
  const debajo = arrastre.destino === destino;
  return (
    <div
      data-destino={destino}
      className={cx(
        // Sin transición: al arrastrar, el resaltado salta de casilla en casilla,
        // y con ella cada una por la que se pasaba se repintaba varios fotogramas
        "relative flex flex-col items-center justify-center rounded-lg",
        grande
          ? "min-h-[6.5rem] border border-white/10 bg-white/[0.03] p-1.5"
          : cx("min-h-0 min-w-0", rejilla && "bg-white/[0.03]"),
        !pokemon && grande && "border-dashed",
        debajo && "bg-brand-500/20 ring-2 ring-brand-400",
        resaltado && "ring-2 ring-amber-300",
      )}
    >
      {pokemon ? (
        <ConFichaAlPasar pokemon={pokemon} arrastrando={Boolean(arrastre.fantasma)}>
          <button
            type="button"
            {...arrastre.propsDe(pokemon.id)}
            onClick={() => {
              if (arrastre.acabaDeSoltar()) return;
              onAbrir(pokemon.id);
            }}
            // Sin `title`: el globo del navegador salía encima de la ficha al pasar el ratón
            aria-label={`${pokemon.nickname ?? pokemon.species} — ${pokemon.species}`}
            style={{ WebkitTouchCallout: "none", touchAction: "manipulation" }}
            className={cx(
              "flex h-full w-full flex-col items-center justify-center rounded-md",
              arrastre.habilitado && "cursor-grab active:cursor-grabbing",
              levantado && "opacity-30",
            )}
          >
            {/* En la caja, algo más grande que su hueco: los sprites traen mucho aire alrededor */}
            <Sprite
              pokemon={pokemon}
              className={
                grande
                  ? "h-14 w-14"
                  : // Y una sombra al borde, que el contorno se lea sobre cualquier
                    // fondo. Una sola y casi sin desenfoque: con dos, repintar una
                    // casilla costaba el triple
                    "h-full w-full [filter:drop-shadow(0_0_1px_rgb(0_0_0/0.9))]"
              }
            />
            {grande ? (
              <>
                <span className="mt-0.5 w-full truncate text-center text-xs font-medium text-slate-100">
                  {pokemon.nickname ?? pokemon.species}
                </span>
                <Tipos tipos={pokemon.tipos} enColumna />
              </>
            ) : (
              // En la caja no caben los nombres de los tipos: sus iconos, en la esquina
              <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex gap-px">
                {pokemon.tipos.map((tipo) => (
                  <ChapaDeTipo
                    key={tipo.slug}
                    slug={tipo.slug}
                    nombre={tipo.nombre}
                    forma="icono"
                    alto={11}
                    // En el móvil el hueco es más pequeño: más pequeños, que no tapen al pokémon
                    className="max-sm:h-[9px] max-sm:w-[9px]"
                  />
                ))}
              </span>
            )}
          </button>
        </ConFichaAlPasar>
      ) : null}
      {pokemon?.shiny ? (
        // El destello del shiny, en la esquina de arriba (la otra la lleva el vínculo)
        <span
          className={cx(
            "pointer-events-none absolute text-amber-300 [filter:drop-shadow(0_0_3px_rgb(251_191_36/0.8))]",
            grande ? "right-1 top-1" : "right-0.5 top-0.5",
          )}
          title="Shiny"
        >
          <Icono emoji="✨" tamano={grande ? 16 : 11} className="brillo-shiny" sinColor />
        </span>
      ) : null}
      {pokemon && numero ? (
        <span
          className={cx(
            "pointer-events-none absolute flex items-center justify-center rounded-full bg-brand-600 font-bold text-white shadow",
            grande ? "left-1 top-1 h-5 min-w-5 px-1 text-[10px]" : "left-0.5 top-0.5 h-3.5 min-w-3.5 px-0.5 text-[8px]",
          )}
          title="Su vínculo: la pareja lleva el mismo número"
        >
          {numero}
        </span>
      ) : null}
    </div>
  );
}

/** Cuánto se apaga el fondo de una caja para que los pokémon se lean encima */
export const APAGADO = "opacity-35 saturate-[.7]";

/** La flecha de un lado de la caja. `data-pagina` es lo que mira el arrastre */
export function FlechaDeCaja({
  paso,
  dueno,
  encendida,
  onClick,
}: {
  paso: -1 | 1;
  dueno: string;
  /** Con un pokémon cogido encima: está a punto de pasar de caja */
  encendida: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-pagina={paso}
      data-dueno={dueno}
      onClick={onClick}
      // Las cajas de en medio se colocan con `order` (ver `columnas`): las flechas, a los lados
      style={{ order: paso < 0 ? 0 : 9 }}
      aria-label={paso < 0 ? "Caja anterior" : "Caja siguiente"}
      className={cx(
        "flex w-7 shrink-0 items-center justify-center rounded-lg border text-xl transition sm:w-8",
        encendida
          ? "border-brand-400 bg-brand-500/25 text-white"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white active:bg-brand-500/20",
      )}
    >
      {paso < 0 ? "‹" : "›"}
    </button>
  );
}

/** En la ficha grande, el sprite al estilo de Blanco y Negro, animado si lo hay (ver `SpritePokemon`) */
export function SpriteAnimado({ pokemon, className }: { pokemon: PokemonDelTablero; className?: string }) {
  return <Sprite pokemon={pokemon} className={className} ficha />;
}

/** En la caja y el equipo: el quieto de Blanco y Negro, o el de HOME si se ha elegido (ver `SpritePokemon`) */
export function Sprite({ pokemon, className, ficha = false }: { pokemon: PokemonDelTablero; className?: string; ficha?: boolean }) {
  return pokemon.imagen || pokemon.pokemonId ? (
    <SpritePokemon
      src={pokemon.imagen}
      // Con su megapiedra, la mega (ver lib/megas.ts)
      pokemonId={pokemon.mega?.pokemonId ?? pokemon.pokemonId}
      shiny={pokemon.shiny}
      ficha={ficha}
      alt={pokemon.species}
      draggable={false}
      className={cx("pointer-events-none object-contain", className)}
    />
  ) : (
    <span className={cx("flex items-center justify-center text-[10px] text-slate-500", className)}>
      {pokemon.species.slice(0, 3)}
    </span>
  );
}

/**
 * Los tipos con sus chapas de los juegos. En la casilla del equipo van una
 * encima de otra, que dos en fila no caben en el ancho de un móvil; en la
 * ficha, en fila y más grandes.
 */
function Tipos({
  tipos,
  alto = 12,
  enColumna = false,
}: {
  tipos: PokemonDelTablero["tipos"];
  alto?: number;
  enColumna?: boolean;
}) {
  if (!tipos.length) return null;
  return (
    <span
      className={cx(
        "mt-1 flex items-center justify-center gap-0.5",
        enColumna ? "flex-col" : "flex-wrap",
      )}
    >
      {tipos.map((tipo) => (
        <ChapaDeTipo key={tipo.slug} slug={tipo.slug} nombre={tipo.nombre} alto={alto} />
      ))}
    </span>
  );
}
