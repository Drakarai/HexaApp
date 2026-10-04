"use client";

import { useEffect, useState } from "react";
import { historiaAction } from "@/app/actions/historia";
import type { DeQuienEsLaHistoria, Historia } from "@/lib/historia-servidor";
import type { TipoDeSuceso } from "@/lib/historia";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";

const ICONO: Record<TipoDeSuceso, string> = {
  captura: "📍",
  evoluciona: "🧬",
  shiny: "✨",
  gimnasio: "🏅",
  jornada: "⚔️",
  royale: "⚔️",
  reto: "🎯",
  mvp: "⭐",
  final: "🏆",
  hall: "🏆",
  caida: "🪦",
};

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

/**
 * La historia de un pokémon en su ficha: una línea de tiempo desde que se
 * capturó hasta hoy, el hall o su caída. Se pide al abrir la ficha (ver
 * `historiaAction`), así que sin conexión se dice y ya.
 */
export function HistoriaDelPokemon({ de, nombre }: { de: DeQuienEsLaHistoria; nombre: string }) {
  const [historia, setHistoria] = useState<Historia | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setHistoria(null);
    setError(null);
    historiaAction(de)
      .then((respuesta) => {
        if (!vigente) return;
        if (respuesta.historia) setHistoria(respuesta.historia);
        else setError(respuesta.error ?? "No se ha podido cargar.");
      })
      .catch(() => vigente && setError("Sin conexión: la historia se ve con línea."));
    return () => {
      vigente = false;
    };
    // Solo cuando cambia de pokémon
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [de.tipo, de.id]);

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="rotulo mb-2">
        Su historia
      </p>

      {error ? (
        <p className="text-sm text-slate-500">{error}</p>
      ) : !historia ? (
        <div className="space-y-2" aria-label="Cargando su historia">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-white/[0.06]" style={{ width: `${80 - i * 15}%` }} />
          ))}
        </div>
      ) : (
        <>
          <Cifras historia={historia} />
          {historia.sucesos.length ? (
            <ol className="relative ml-2 border-l border-white/10">
              {historia.sucesos.map((suceso, i) => (
                <li key={i} className="relative pb-3 pl-5 last:pb-0">
                  <span
                    className={cx(
                      "absolute -left-[11px] top-0 flex h-[21px] w-[21px] items-center justify-center rounded-full border bg-ink-900 text-[11px]",
                      suceso.tipo === "caida"
                        ? "border-red-400/40 text-red-300"
                        : suceso.tipo === "mvp" || suceso.tipo === "hall" || suceso.tipo === "shiny"
                          ? "border-amber-300/50 text-amber-200"
                          : "border-white/15 text-slate-300",
                    )}
                    aria-hidden
                  >
                    <Icono emoji={ICONO[suceso.tipo]} tamano={12} />
                  </span>
                  <p className="text-sm leading-tight text-slate-100">
                    {suceso.texto}
                    {suceso.detalle ? (
                      <span
                        className={cx(
                          "ml-1.5 text-xs",
                          suceso.gano === true
                            ? "text-emerald-300"
                            : suceso.gano === false
                              ? "text-red-300"
                              : "text-slate-400",
                        )}
                      >
                        · {suceso.detalle}
                      </span>
                    ) : null}
                  </p>
                  {suceso.fecha ? (
                    <p className="text-[11px] text-slate-500">{FECHA.format(new Date(suceso.fecha))}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">
              {nombre} todavía no ha hecho nada que contar. Ya llegará.
            </p>
          )}
          {historia.cajaAjena ? (
            <p className="mt-2 text-[11px] text-slate-500">
              Dónde se capturó y cómo evolucionó solo lo ve su dueño.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function Cifras({ historia }: { historia: Historia }) {
  const { combates, victorias, mvps, dias } = historia.cifras;
  const piezas = [
    dias !== null ? `${dias} ${dias === 1 ? "día" : "días"}` : null,
    combates ? `${combates} ${combates === 1 ? "combate" : "combates"}` : null,
    combates ? `${victorias} ${victorias === 1 ? "victoria" : "victorias"}` : null,
    mvps ? `${mvps} MVP` : null,
  ].filter(Boolean);
  if (!piezas.length) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {piezas.map((pieza) => (
        <span key={pieza} className="chip text-[11px]">
          {pieza}
        </span>
      ))}
    </div>
  );
}
