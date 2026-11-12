"use client";

import { useState } from "react";
import { Pestanas } from "@/components/pestanas";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { Avatar } from "@/components/ui";
import type { Numeros } from "@/lib/estadisticas";

type Fila = { clave: string; participantId: string; nombre: string; imagen: string | null; numeros: Numeros };
type Jugador = { id: string; nombre: string; color: string; avatar: string | null };

/** Cada clasificación: qué mira y cómo se escribe la cifra */
const TABLAS = [
  { campo: "kos", rotulo: "KOs", icono: "🗡️", cifra: (n: number) => `${n}` },
  { campo: "danoHecho", rotulo: "Daño", icono: "💥", cifra: (n: number) => `${Math.round(n)} %` },
  { campo: "mejorBarrida", rotulo: "Barrida", icono: "🧹", cifra: (n: number) => `${n} KOs` },
  { campo: "criticosHechos", rotulo: "Críticos", icono: "🎲", cifra: (n: number) => `${n}` },
  { campo: "supereficaces", rotulo: "Muy eficaces", icono: "🎯", cifra: (n: number) => `${n}` },
  { campo: "aguantado", rotulo: "Aguante", icono: "🛡️", cifra: (n: number) => `${Math.round(n)} %` },
  { campo: "ultimoEnPie", rotulo: "Último en pie", icono: "🧍", cifra: (n: number) => `${n}` },
  { campo: "combates", rotulo: "Combates", icono: "🏕️", cifra: (n: number) => `${n}` },
  { campo: "diasVivo", rotulo: "Días vivo", icono: "🌱", cifra: (n: number) => `${n}` },
  { campo: "criticosRecibidos", rotulo: "Críticos recibidos", icono: "🧲", cifra: (n: number) => `${n}` },
  { campo: "fallos", rotulo: "Fallos", icono: "😵", cifra: (n: number) => `${n}` },
  { campo: "turnosPerdidos", rotulo: "Turnos sin moverse", icono: "🐌", cifra: (n: number) => `${n}` },
] as const satisfies readonly { campo: keyof Numeros; rotulo: string; icono: string; cifra: (n: number) => string }[];

type Campo = (typeof TABLAS)[number]["campo"];
const CUANTOS = 8;

/**
 * Las clasificaciones, **una a la vez** con pestañas: ocho tarjetas de cinco
 * en fila hacían una pantalla larguísima para mirar una sola cosa.
 */
export function Clasificaciones({ pokemon, jugadores }: { pokemon: Fila[]; jugadores: Jugador[] }) {
  const [campo, setCampo] = useState<Campo>("kos");
  const [jugador, setJugador] = useState("");
  const tabla = TABLAS.find((t) => t.campo === campo)!;
  const deQuien = new Map(jugadores.map((j) => [j.id, j]));
  const top = pokemon
    .filter((p) => (!jugador || p.participantId === jugador) && (p.numeros[campo] ?? 0) > 0)
    .sort((a, b) => (b.numeros[campo] ?? 0) - (a.numeros[campo] ?? 0))
    .slice(0, CUANTOS);

  return (
    <section className="card p-3" aria-labelledby="clasificaciones" data-clasificaciones>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="clasificaciones" className="antetitulo">
          Clasificaciones
        </h2>
        <select
          className="input w-auto py-1 text-sm"
          aria-label="De quién"
          value={jugador}
          onChange={(e) => setJugador(e.target.value)}
        >
          <option value="">Todos</option>
          {jugadores.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nombre}
            </option>
          ))}
        </select>
      </div>
      <Pestanas
        etiqueta="Qué clasificación"
        opciones={TABLAS.map((t) => ({ valor: t.campo, rotulo: t.rotulo, icono: t.icono }))}
        valor={campo}
        onCambiar={setCampo}
        className="mb-3"
      />
      {top.length ? (
        <ol className="space-y-1.5">
          {top.map((p, i) => {
            const dueno = deQuien.get(p.participantId);
            return (
              <li key={p.clave} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right text-xs text-slate-500">{i + 1}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  {p.imagen ? (
                    <SpritePokemon src={p.imagen} alt="" loading="lazy" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-600" aria-hidden>
                      ?
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                {dueno && !jugador ? (
                  <span className="flex min-w-0 items-center gap-1 text-xs text-slate-400">
                    <Avatar name={dueno.nombre} color={dueno.color} image={dueno.avatar} size={18} />
                    <span className="hidden truncate sm:inline">{dueno.nombre}</span>
                  </span>
                ) : null}
                <span className="w-16 text-right font-semibold tabular-nums">{tabla.cifra(p.numeros[campo] ?? 0)}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="py-3 text-center text-xs text-slate-500">Nadie todavía.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        El daño va en % de la vida del rival, sumado: 200 % son dos pokémon enteros. «Aguante» es el daño recibido en
        los combates en que no cayó. Cada pokémon junta lo de todos sus combates, también los de antes de evolucionar.
      </p>
    </section>
  );
}
