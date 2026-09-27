"use client";

import { useEffect, useState } from "react";
import {
  alCambiarLaCola,
  leerCola,
  quitarDeLaCola,
  TIPOS,
  type Apunte,
  type TipoDeApunte,
} from "@/lib/cola";
import { formatDateTime } from "@/lib/utils";
import { Icono } from "@/components/icono";

/**
 * Lo que se apuntó sin conexión y todavía no ha subido, en la propia pantalla
 * donde se apuntó.
 *
 * Sin esto, apuntar sin línea sería apuntar a ciegas: das a guardar, la lista
 * no cambia —porque la lista la manda el servidor— y no hay forma de saber si
 * se ha quedado algo. Aquí se ve, se lee y se puede tirar a la basura.
 */
export function Pendientes({ tipo }: { tipo: TipoDeApunte }) {
  const [apuntes, setApuntes] = useState<Apunte[]>([]);

  useEffect(() => {
    const mirar = () => setApuntes(leerCola().filter((a) => a.tipo === tipo));
    mirar();
    return alCambiarLaCola(mirar);
  }, [tipo]);

  if (!apuntes.length) return null;

  return (
    <section className="mt-4 rounded-xl border border-amber-400/25 bg-amber-950/20 p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300/90">
        <span aria-hidden>
          <Icono emoji={TIPOS[tipo].icono} />
        </span>
        Sin subir todavía
      </p>
      <ul className="space-y-1.5">
        {apuntes.map((apunte) => (
          <li
            key={apunte.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-200">{apunte.resumen}</p>
              <p className="text-xs text-slate-500">
                {formatDateTime(new Date(apunte.creadoEn))}
                {apunte.error ? ` · ${apunte.error}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => quitarDeLaCola(apunte.id)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-white/5"
              title="Quitarlo de la cola sin subirlo"
            >
              Tirar
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-200/70">
        Se sube solo en cuanto haya conexión. Mientras tanto vive en este móvil:
        si borras los datos del navegador, se pierde.
      </p>
    </section>
  );
}
