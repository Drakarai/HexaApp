"use client";

import { useEffect, useState } from "react";
import { ChapaDeTipo } from "@/components/chapa-de-tipo";
import type { MovimientoParaVer } from "@/lib/movimientos";
import type { DetalleDeMovimiento } from "@/lib/movimientos-detalle";

const CLASE = ["De estado", "Físico", "Especial"];

/**
 * Lo que sale al tocar un movimiento de la ficha de combate, con los valores de
 * la generación del locke. Los datos (unos 140 KB) se cargan la primera vez
 * que se toca uno, no al abrir la ficha.
 */
export function DetalleDeMovimiento({ movimiento }: { movimiento: MovimientoParaVer }) {
  const [detalle, setDetalle] = useState<DetalleDeMovimiento | null | "cargando" | "error">("cargando");

  useEffect(() => {
    let vigente = true;
    setDetalle("cargando");
    import("@/lib/movimientos-detalle")
      .then((m) => vigente && setDetalle(m.detalleDelMovimiento(movimiento.slug, movimiento.generacion)))
      .catch(() => vigente && setDetalle("error"));
    return () => {
      vigente = false;
    };
  }, [movimiento.slug, movimiento.generacion]);

  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-sm" aria-live="polite">
      <div className="flex flex-wrap items-center gap-1.5">
        {movimiento.tipo ? <ChapaDeTipo slug={movimiento.tipo.slug} nombre={movimiento.tipo.nombre} alto={18} /> : null}
        <span className="chip text-xs">{CLASE[movimiento.clase] ?? "—"}</span>
        <span className="font-medium text-slate-100">{movimiento.nombre}</span>
      </div>

      {detalle === "cargando" ? (
        <p className="mt-2 text-xs text-slate-500">Cargando…</p>
      ) : detalle === "error" ? (
        <p className="mt-2 text-xs text-amber-300">Sin conexión: el detalle no carga.</p>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center sm:grid-cols-5">
            <Dato nombre="Potencia" valor={movimiento.clase === 0 ? "—" : (movimiento.potencia ?? "—")} />
            <Dato nombre="Precisión" valor={detalle ? (detalle.precision === null ? "No falla" : `${detalle.precision} %`) : "—"} />
            <Dato nombre="PP" valor={detalle?.pp ?? "—"} />
            {detalle && detalle.prioridad !== 0 ? (
              <Dato nombre="Prioridad" valor={detalle.prioridad > 0 ? `+${detalle.prioridad}` : detalle.prioridad} />
            ) : null}
            {detalle ? <Dato nombre="Contacto" valor={detalle.contacto ? "Sí" : "No"} /> : null}
          </dl>

          {detalle?.efectos.length || detalle?.notas.length ? (
            <ul className="mt-2 space-y-1 text-xs">
              {detalle.efectos.map((e) => (
                <li key={e.texto} className="flex gap-2">
                  <span className="w-11 shrink-0 text-right font-semibold tabular-nums text-sky-300">{e.probabilidad} %</span>
                  <span className="text-slate-300">{primeraMayuscula(e.texto)}</span>
                </li>
              ))}
              {detalle.notas.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="w-11 shrink-0 text-right text-slate-500">·</span>
                  <span className="text-slate-300">{n}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {detalle?.descripcion ? <p className="mt-2 text-xs leading-snug text-slate-400">{detalle.descripcion}</p> : null}
        </>
      )}
    </div>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-1 py-1">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{nombre}</dt>
      <dd className="text-sm tabular-nums text-slate-100">{valor}</dd>
    </div>
  );
}

const primeraMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
