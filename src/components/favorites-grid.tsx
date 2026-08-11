"use client";

import { startTransition, useState } from "react";
import {
  addFavoriteAction,
  removeFavoriteAction,
} from "@/app/actions/favorites";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { spriteCandidates } from "@/lib/pokedex";

export type Favorito = {
  id: string;
  species: string;
  nickname: string | null;
  /** Dirección de la imagen, no la imagen: ver lib/imagen-url.ts */
  image: string | null;
};

const HUECOS = 6;

/**
 * Los pokémon favoritos de un jugador, en una caja de 3x2 igual en móvil y en
 * PC: son seis casillas cuadradas, así que a 3 por fila caben de sobra hasta en
 * pantallas estrechas y se lee como el equipo de un juego.
 */
export function FavoritesGrid({
  participantId,
  favoritos,
  editable,
}: {
  participantId: string;
  favoritos: Favorito[];
  editable: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, setState] = useState<FormState>(null);
  const [limpiezas, setLimpiezas] = useState(0);
  // Aparece al momento, sin esperar a que el servidor baje el sprite
  const [pendientes, setPendientes] = useState<Favorito[]>([]);

  const lista = [...favoritos, ...pendientes].slice(0, HUECOS);
  const huecos = Array.from({ length: HUECOS }, (_, i) => lista[i] ?? null);
  const lleno = lista.length >= HUECOS;

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    const species = String(formData.get("species") ?? "").trim();
    if (!species) return;

    const pokemonId = Number(formData.get("pokemonId") ?? 0);
    const provisional: Favorito = {
      id: `pendiente-${Date.now()}`,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      // El sprite pixelado de siempre mientras llega el bueno: 900 bytes
      image: pokemonId
        ? spriteCandidates(pokemonId, formData.get("shiny") === "on", "mini")[0]
        : null,
    };
    setPendientes((actuales) => [...actuales, provisional]);

    startTransition(async () => {
      const resultado = await addFavoriteAction(null, formData);
      setState(resultado);
      // Ya está en la lista de verdad (o ha fallado): fuera el provisional
      setPendientes((actuales) =>
        actuales.filter((uno) => uno.id !== provisional.id),
      );
    });

    setLimpiezas((veces) => veces + 1);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {huecos.map((favorito, indice) =>
          favorito ? (
            <div
              key={favorito.id}
              className="relative min-w-0 rounded-xl border border-white/5 bg-white/[0.04] p-1.5"
            >
              <div className="flex h-16 items-center justify-center sm:h-20">
                {favorito.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={favorito.image}
                    alt={favorito.nickname ?? favorito.species}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xl opacity-30" aria-hidden>
                    ★
                  </span>
                )}
              </div>
              <p className="truncate text-center text-xs font-semibold text-white">
                {favorito.nickname ?? favorito.species}
              </p>
              <p className="truncate text-center text-[11px] text-slate-500">
                {favorito.species}
              </p>

              {/* El botón de quitar va siempre visible, no solo al pasar el
                  ratón: en el móvil no hay ratón y no habría forma de usarlo */}
              {editable && !favorito.id.startsWith("pendiente-") ? (
                <form
                  action={removeFavoriteAction}
                  className="absolute right-1 top-1"
                >
                  <input type="hidden" name="favoriteId" value={favorito.id} />
                  <ConfirmSubmit
                    message={`¿Quitar a ${favorito.nickname ?? favorito.species} de tus favoritos?`}
                    className="btn-danger btn-sm px-1.5 py-0.5"
                    title="Quitar de favoritos"
                  >
                    ✕
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
          ) : (
            <div
              key={`hueco-${indice}`}
              aria-hidden
              className="rounded-xl border border-dashed border-white/[0.08]"
            >
              <div className="h-16 sm:h-20" />
              <p className="text-xs">&nbsp;</p>
              <p className="text-[11px]">&nbsp;</p>
            </div>
          ),
        )}
      </div>

      {editable ? (
        <div className="mt-3">
          {abierto ? (
            <form onSubmit={enviar} className="space-y-3">
              <input
                type="hidden"
                name="participantId"
                value={participantId}
              />
              <SpeciesPicker key={limpiezas} />
              <div>
                <label className="label">Mote</label>
                <input
                  key={limpiezas}
                  name="nickname"
                  className="input"
                  placeholder="Chispas"
                />
              </div>
              <FormMessage state={state} />
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary" disabled={lleno}>
                  Añadir a favoritos
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setAbierto(false)}
                >
                  Cerrar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setAbierto(true)}
              disabled={lleno}
            >
              {lleno ? "Ya tienes los 6" : "＋ Añadir favorito"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
