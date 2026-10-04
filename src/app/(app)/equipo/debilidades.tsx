"use client";

import { useEffect, useState } from "react";
import { ChapaDeTipo } from "@/components/chapa-de-tipo";
import { Pestanas } from "@/components/pestanas";
import type { Debilidad } from "@/lib/soul-link";
import { cx } from "@/lib/utils";

/** De lo que más duele a lo que no hace nada, con cómo se lee cada uno */
const FILAS: { x: number; rotulo: string; color: string }[] = [
  { x: 4, rotulo: "×4", color: "text-red-300" },
  { x: 2, rotulo: "×2", color: "text-orange-300" },
  { x: 0.5, rotulo: "×½", color: "text-emerald-300" },
  { x: 0.25, rotulo: "×¼", color: "text-emerald-200" },
  { x: 0, rotulo: "×0", color: "text-sky-300" },
];

/**
 * Las tablas de tipos que hay de verdad: la de la 1ª (el Fantasma no le hace
 * nada al Psíquico, el Bicho le pega al Veneno…), la de la 2ª a la 5ª (con
 * Siniestro y Acero, que resiste al Fantasma y al Siniestro) y la de la 6ª en
 * adelante (con Hada). Dentro de cada una no cambia nada, así que no hace
 * falta ofrecer nueve.
 */
const TABLAS = [
  { valor: "1", rotulo: "1ª gen.", largo: "la de la 1ª generación", desde: 1, hasta: 1 },
  { valor: "2-5", rotulo: "2ª–5ª", largo: "la de la 2ª a la 5ª", desde: 2, hasta: 5 },
  { valor: "6+", rotulo: "6ª en adelante", largo: "la de la 6ª en adelante", desde: 6, hasta: 99 },
] as const;
type Tabla = (typeof TABLAS)[number]["valor"];

const tablaDe = (generacion: number) =>
  TABLAS.find((t) => generacion >= t.desde && generacion <= t.hasta)!.valor;

/**
 * Qué le hace cada tipo a este pokémon, en la pestaña Combate. Solo lo que no
 * es neutro, en filas por multiplicador, con las chapas de siempre.
 *
 * La de la tabla del locke viene hecha del servidor. Las otras se calculan
 * aquí al pedirlas, con la tabla de tipos traída **en ese momento**
 * (`import()`): son 30 KB que la mayoría nunca va a necesitar. Con la
 * generación cambian también sus tipos: Clefairy es Normal hasta la 5ª.
 */
export function Debilidades({
  pokemonId,
  deLocke,
}: {
  pokemonId: number | null;
  deLocke: { generacion: number; lista: Debilidad[] };
}) {
  const delLocke = tablaDe(deLocke.generacion);
  const [tabla, setTabla] = useState<Tabla>(delLocke);
  const [otra, setOtra] = useState<{ tabla: Tabla; lista: Debilidad[] } | null>(null);

  useEffect(() => {
    if (tabla === delLocke || !pokemonId) return;
    let sigue = true;
    const { hasta } = TABLAS.find((t) => t.valor === tabla)!;
    void import("@/lib/tipos").then(({ debilidadesDe, GENERACION_POR_DEFECTO }) => {
      if (sigue) setOtra({ tabla, lista: debilidadesDe(pokemonId, Math.min(hasta, GENERACION_POR_DEFECTO)) });
    });
    return () => {
      sigue = false;
    };
  }, [tabla, delLocke, pokemonId]);

  if (!pokemonId || !deLocke.lista.length) return null;
  const lista = tabla === delLocke ? deLocke.lista : otra?.tabla === tabla ? otra.lista : null;

  return (
    <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="rotulo mb-2">Debilidades y resistencias</p>
      <Pestanas
        ancha
        etiqueta="Tabla de tipos"
        valor={tabla}
        onCambiar={setTabla}
        opciones={TABLAS.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))}
      />
      {/* Qué tabla es, y si es la que vale en los combates de este locke */}
      <p className="mb-3 mt-1.5 text-xs text-slate-500">
        {tabla === delLocke
          ? `La tabla de este locke (${TABLAS.find((t) => t.valor === delLocke)!.largo}).`
          : `Así sería con ${TABLAS.find((t) => t.valor === tabla)!.largo}; en este locke vale ${
              TABLAS.find((t) => t.valor === delLocke)!.largo
            }.`}
      </p>
      {lista ? (
        <dl className="space-y-1.5">
          {FILAS.map((fila) => {
            const deEsta = lista.filter((d) => d.x === fila.x);
            if (!deEsta.length) return null;
            return (
              <div key={fila.x} className="flex items-start gap-3">
                <dt className={cx("w-8 shrink-0 pt-0.5 text-sm font-bold tabular-nums", fila.color)}>
                  {fila.rotulo}
                </dt>
                <dd className="flex min-w-0 flex-wrap gap-1">
                  {deEsta.map((d) => (
                    <ChapaDeTipo key={d.slug} slug={d.slug} nombre={d.nombre} alto={18} />
                  ))}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="muted text-sm">Mirando la tabla…</p>
      )}
    </section>
  );
}
