import Link from "next/link";
import { cx } from "@/lib/utils";

/**
 * Las mismas pestañas que `Pestanas`, pero como enlaces, para las páginas que
 * se pintan en el servidor (Diagnóstico): cada pestaña es una dirección, así
 * que se puede volver atrás, recargar o pasar el enlace y se queda donde está.
 */
export function PestanasEnlace({
  opciones,
  activa,
  etiqueta,
  className,
}: {
  opciones: { href: string; rotulo: string; valor: string; cuenta?: number }[];
  activa: string;
  etiqueta: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={etiqueta}
      className={cx(
        "flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-1",
        className,
      )}
    >
      {opciones.map((opcion) => (
        <Link
          key={opcion.valor}
          href={opcion.href}
          aria-current={opcion.valor === activa ? "page" : undefined}
          className={cx(
            "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
            opcion.valor === activa
              ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          {opcion.rotulo}
          {opcion.cuenta ? (
            <span className="rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums text-slate-300">
              {opcion.cuenta}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
