"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icono } from "@/components/icono";
import { numerosDelPokemonAction } from "@/app/actions/estadisticas";
import type { Numeros } from "@/lib/estadisticas";

type Leido = Awaited<ReturnType<typeof numerosDelPokemonAction>>;

/**
 * Lo que lleva hecho este pokémon en los combates de jornada, junto en su
 * ficha: todo lo suyo, también lo de antes de evolucionar. Se pide al abrir la
 * pestaña, que sumarlo cuesta lo mismo que la pantalla de estadísticas entera.
 */
export function SusNumeros({ captureId }: { captureId: string }) {
  const [leido, setLeido] = useState<Leido | null>(null);

  useEffect(() => {
    let vivo = true;
    numerosDelPokemonAction(captureId)
      .then((r) => vivo && setLeido(r))
      .catch(() => vivo && setLeido({ error: "No se han podido sumar sus números." }));
    return () => {
      vivo = false;
    };
  }, [captureId]);

  // Si no ha combatido en ninguna jornada, no hay nada que enseñar
  if (!leido || leido.error || !leido.numeros?.combates) return null;
  const n: Numeros = leido.numeros;

  const cifras: [string, string][] = [
    ["Combates", String(n.combates)],
    ["KOs", String(n.kos)],
    ["Daño hecho", `${Math.round(n.danoHecho)} %`],
    ["Críticos", String(n.criticosHechos)],
    ["Muy eficaces", String(n.supereficaces)],
    ["Mejor barrida", `${n.mejorBarrida} KO${n.mejorBarrida === 1 ? "" : "s"}`],
    ["Aguantado", `${Math.round(n.aguantado)} %`],
    ["Críticos recibidos", String(n.criticosRecibidos)],
    ["Último en pie", String(n.ultimoEnPie)],
  ];

  return (
    <section className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3" data-sus-numeros>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
          <Icono emoji="📈" /> Sus números
        </h3>
        <Link href="/estadisticas" className="text-xs text-brand-300 hover:underline">
          Ver todos
        </Link>
      </div>
      {leido.galardones?.length ? (
        <p className="mb-2 flex flex-wrap gap-1.5">
          {leido.galardones.map((g) => (
            <span
              key={g.titulo}
              className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200"
            >
              <Icono emoji={g.icono} tamano={12} /> {g.titulo}
            </span>
          ))}
        </p>
      ) : null}
      <dl className="grid grid-cols-3 gap-2 text-center">
        {cifras.map(([rotulo, cifra]) => (
          // La cifra arriba, pero el rótulo primero en el HTML, como pide <dl>
          <div key={rotulo} className="flex flex-col-reverse rounded-lg bg-white/[0.03] p-1.5">
            <dt className="text-[11px] text-slate-400">{rotulo}</dt>
            <dd className="font-semibold tabular-nums text-white">{cifra}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
