"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChapaDeTipo } from "@/components/chapa-de-tipo";
import type { PokemonDelTablero } from "@/lib/soul-link";

/** Lo que hay que dejar el ratón quieto encima: cruzar la caja no la enciende */
const RETRASO = 350;
const ANCHO = 260;

/**
 * En el ordenador, al pasar el ratón por un pokémon del Equipo y PC: su
 * naturaleza, objeto y movimientos sin abrir la ficha, que es lo que se mira
 * al preparar un combate. Como la ficha rápida de la clasificación.
 *
 * Solo con ratón (con el dedo no hay «pasar por encima») y nunca mientras se
 * arrastra: mientras va cogido, lo que tapa estorba. No pide nada: la ficha
 * completa ya viene con el tablero.
 */
export function ConFichaAlPasar({
  pokemon,
  arrastrando,
  children,
}: {
  pokemon: PokemonDelTablero;
  arrastrando: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | null>(null);
  const [donde, setDonde] = useState<{ x: number; y: number; arriba: boolean } | null>(null);

  useEffect(() => () => {
    if (temporizador.current) window.clearTimeout(temporizador.current);
  }, []);
  // Al coger uno, fuera la que hubiera
  useEffect(() => {
    if (arrastrando) setDonde(null);
  }, [arrastrando]);

  function entrar(evento: React.PointerEvent) {
    if (evento.pointerType !== "mouse" || arrastrando) return;
    temporizador.current = window.setTimeout(() => {
      // El envoltorio no tiene caja propia (`contents`): se mide lo de dentro
      const caja = ref.current?.firstElementChild?.getBoundingClientRect();
      if (!caja) return;
      const arriba = caja.bottom + 220 > window.innerHeight;
      const x = Math.max(8, Math.min(caja.left + caja.width / 2 - ANCHO / 2, window.innerWidth - ANCHO - 8));
      setDonde({ x, y: arriba ? caja.top : caja.bottom, arriba });
    }, RETRASO);
  }

  function salir() {
    if (temporizador.current) window.clearTimeout(temporizador.current);
    setDonde(null);
  }

  const { naturaleza, objeto, movimientos } = pokemon.combate;
  return (
    <div
      ref={ref}
      onPointerEnter={entrar}
      onPointerLeave={salir}
      onPointerDown={salir}
      className="contents"
    >
      {children}
      {donde
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[70] rounded-xl border border-white/10 bg-ink-900/95 p-3 shadow-2xl backdrop-blur"
              style={{
                width: ANCHO,
                left: donde.x,
                top: donde.arriba ? undefined : donde.y + 6,
                bottom: donde.arriba ? window.innerHeight - donde.y + 6 : undefined,
              }}
            >
              <p className="truncate text-sm font-semibold text-white">
                {pokemon.nickname ?? pokemon.species}
                {pokemon.nickname ? <span className="font-normal text-slate-400"> · {pokemon.species}</span> : null}
              </p>
              <div className="mt-1 flex gap-1">
                {pokemon.tipos.map((tipo) => (
                  <ChapaDeTipo key={tipo.slug} slug={tipo.slug} nombre={tipo.nombre} alto={14} />
                ))}
              </div>
              {naturaleza || objeto || movimientos.length ? (
                <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 text-xs">
                  {naturaleza || objeto ? (
                    <p className="text-slate-300">
                      {[naturaleza?.nombre, objeto ? `con ${objeto.nombre}` : null].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {movimientos.length ? (
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {movimientos.map((m) => (
                        <li key={m.slug} className="flex min-w-0 items-center gap-1">
                          {m.tipo ? (
                            <ChapaDeTipo slug={m.tipo.slug} nombre={m.tipo.nombre} forma="icono" alto={12} />
                          ) : null}
                          <span className="truncate text-slate-200">{m.nombre}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">
                  Sin naturaleza ni movimientos apuntados. Ábrelo para ponérselos.
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
