"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { leerRepeticionesPendientesAction } from "@/app/actions/estadisticas";

/**
 * Las repeticiones de antes de que hubiera estadísticas, o las de un enlace
 * cambiado, se leen a mano y **de pocas en pocas**: cada vuelta lee unas
 * cuantas y pide las siguientes hasta acabar.
 */
export function LeerLasQueFaltan({ competitionId, cuantas }: { competitionId: string; cuantas: number }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [quedan, setQuedan] = useState(cuantas);
  const [fallidas, setFallidas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function leer() {
    setError(null);
    startTransition(async () => {
      const fallos: string[] = [];
      for (let vueltas = 0; vueltas < 50; vueltas++) {
        const r = await leerRepeticionesPendientesAction(competitionId, fallos);
        if (r.error) {
          setError(r.error);
          break;
        }
        fallos.push(...r.fallidas);
        setQuedan(r.quedan);
        if (!r.quedan) break;
      }
      setFallidas(fallos.length);
      router.refresh();
    });
  }

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-3 p-3 text-sm">
      <p className="min-w-0 flex-1 text-slate-300">
        {pendiente
          ? `Leyendo repeticiones… quedan ${quedan}.`
          : `Hay ${cuantas} repetici${cuantas === 1 ? "ón" : "ones"} sin leer todavía.`}
        {fallidas ? ` ${fallidas} no se han podido leer: revisa que el enlace siga funcionando.` : ""}
        {error ? <span className="text-rose-300"> {error}</span> : null}
      </p>
      <button type="button" className="btn-primary btn-sm" disabled={pendiente} onClick={leer}>
        {pendiente ? "Leyendo…" : "Leer las que faltan"}
      </button>
    </div>
  );
}
