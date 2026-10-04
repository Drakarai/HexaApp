import { ChapaDeTipo } from "@/components/chapa-de-tipo";
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
 * Qué le hace cada tipo a este pokémon, en la pestaña Combate. Solo lo que no
 * es neutro, en filas por multiplicador, con las chapas de siempre. Viene
 * calculado del servidor con la tabla de la generación del locke.
 */
export function Debilidades({ debilidades }: { debilidades: { slug: string; nombre: string; x: number }[] }) {
  if (!debilidades.length) return null;
  return (
    <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="rotulo mb-2">Debilidades y resistencias</p>
      <dl className="space-y-1.5">
        {FILAS.map((fila) => {
          const deEsta = debilidades.filter((d) => d.x === fila.x);
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
    </section>
  );
}
