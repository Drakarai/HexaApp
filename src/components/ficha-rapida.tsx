"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fichaRapidaAction } from "@/app/actions/ficha-rapida";
import type { FichaRapida, PokemonDeLaFicha } from "@/lib/ficha-rapida";

/**
 * La ficha rápida de un jugador: al **pasar el ratón** por su nombre en la
 * clasificación, su equipo, sus últimas bajas y su as, sin entrar en su perfil.
 *
 * Solo con ratón: en una pantalla táctil no hay "pasar por encima", y tocar el
 * nombre ya lleva a su perfil. Se pide al servidor la primera vez y se guarda
 * para el resto de la visita; con un pequeño retraso, para que cruzar la tabla
 * con el ratón no dispare una petición por cada fila.
 */

const guardadas = new Map<string, Promise<FichaRapida | null>>();

function pedir(participantId: string) {
  let pedida = guardadas.get(participantId);
  if (!pedida) {
    pedida = fichaRapidaAction(participantId)
      .then((r) => r.ficha ?? null)
      .catch(() => null);
    guardadas.set(participantId, pedida);
  }
  return pedida;
}

const RETRASO = 350;

export function ConFichaRapida({
  participantId,
  nombre,
  color,
  children,
}: {
  participantId: string;
  nombre: string;
  color: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | null>(null);
  const [donde, setDonde] = useState<{ x: number; y: number; arriba: boolean } | null>(null);
  const [ficha, setFicha] = useState<FichaRapida | null | undefined>(undefined);

  useEffect(() => () => {
    if (temporizador.current) window.clearTimeout(temporizador.current);
  }, []);

  function entrar(evento: React.PointerEvent) {
    if (evento.pointerType !== "mouse") return;
    temporizador.current = window.setTimeout(() => {
      const caja = ref.current?.getBoundingClientRect();
      if (!caja) return;
      // Debajo del nombre, o encima si no cabe
      const arriba = caja.bottom + 260 > window.innerHeight;
      setDonde({ x: Math.min(caja.left, window.innerWidth - 336), y: arriba ? caja.top : caja.bottom, arriba });
      void pedir(participantId).then(setFicha);
    }, RETRASO);
  }

  function salir() {
    if (temporizador.current) window.clearTimeout(temporizador.current);
    setDonde(null);
  }

  return (
    <div ref={ref} onPointerEnter={entrar} onPointerLeave={salir} className="min-w-0">
      {children}
      {donde
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[70] w-80 rounded-xl border border-white/10 bg-ink-900/95 p-3 shadow-2xl backdrop-blur"
              style={{
                left: donde.x,
                top: donde.arriba ? undefined : donde.y + 6,
                bottom: donde.arriba ? window.innerHeight - donde.y + 6 : undefined,
                borderTopColor: color,
              }}
            >
              <Contenido nombre={nombre} ficha={ficha} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function Contenido({ nombre, ficha }: { nombre: string; ficha: FichaRapida | null | undefined }) {
  if (ficha === undefined) {
    return <p className="text-xs text-slate-500">Cargando a {nombre}…</p>;
  }
  if (ficha === null) {
    return <p className="text-xs text-slate-500">No se ha podido cargar.</p>;
  }
  return (
    <div className="space-y-2.5">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Equipo{ficha.equipoDe ? ` · ${ficha.equipoDe}` : ""}
        </p>
        {ficha.equipo.length ? (
          <div className="grid grid-cols-6 gap-1">
            {ficha.equipo.slice(0, 6).map((p) => (
              <Mini key={p.id} pokemon={p} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Todavía no ha sacado equipo en un combate.</p>
        )}
      </div>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Últimas bajas
          </p>
          {ficha.bajas.length ? (
            <div className="flex gap-1">
              {ficha.bajas.map((p) => (
                <Mini key={p.id} pokemon={p} caido />
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-300/80">Ninguna. De momento.</p>
          )}
        </div>
        {ficha.as ? (
          <div className="shrink-0 text-center">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">As</p>
            <Mini pokemon={{ id: "as", nombre: ficha.as.nombre, especie: ficha.as.especie, imagen: ficha.as.imagen }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Mini({ pokemon, caido = false }: { pokemon: PokemonDeLaFicha; caido?: boolean }) {
  return (
    <div className="flex w-11 flex-col items-center" title={`${pokemon.nombre} · ${pokemon.especie}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-850">
        {pokemon.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pokemon.imagen}
            alt=""
            className={caido ? "h-10 w-10 object-contain opacity-60 grayscale" : "h-10 w-10 object-contain"}
          />
        ) : (
          <span className="text-[10px] text-slate-500">{pokemon.especie.slice(0, 3)}</span>
        )}
      </span>
      <span className="mt-0.5 w-full truncate text-center text-[10px] text-slate-400">{pokemon.nombre}</span>
    </div>
  );
}
