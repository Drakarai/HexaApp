import Link from "next/link";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

/**
 * El menú de las partes de Mi perfil: botones a lo ancho, con el icono encima en el móvil —en una
 * fila de pestañas no cabían sin desplazar— y al lado en el ordenador.
 *
 * Son **enlaces** con `?seccion=`, pintados en el servidor: atrás vuelve a la
 * parte de antes, recargar se queda donde estaba y no hay estado que perder.
 */
export function MenuDeSecciones<T extends string>({
  ruta,
  secciones,
  activa,
  etiqueta,
}: {
  ruta: string;
  secciones: { valor: T; rotulo: string; icono: string; cuenta?: number; aviso?: boolean }[];
  activa: T;
  etiqueta: string;
}) {
  return (
    <nav
      aria-label={etiqueta}
      className="mb-5 mt-6 grid gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
      style={{ gridTemplateColumns: `repeat(${secciones.length}, minmax(0, 1fr))` }}
    >
      {secciones.map((s) => (
        <Link
          key={s.valor}
          href={`${ruta}?seccion=${s.valor}`}
          aria-current={s.valor === activa ? "page" : undefined}
          className={cx(
            "relative flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition sm:flex-row sm:gap-2 sm:text-sm",
            s.valor === activa
              ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
          )}
        >
          <Icono emoji={s.icono} tamano={18} />
          <span className="max-w-full truncate">{s.rotulo}</span>
          {s.cuenta ? (
            <span className="hidden rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums text-slate-300 sm:inline">
              {s.cuenta}
            </span>
          ) : null}
          {/* Algo pendiente dentro: el punto se ve aunque la pestaña no esté abierta */}
          {s.aviso ? <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-amber-400" /> : null}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Elige la parte pedida si existe; si no, la primera. Lo usan todas las
 * pantallas con partes por `?seccion=`, cada una con su propio menú.
 */
export function seccionActiva<T extends string>(secciones: { valor: T }[], pedida: string | undefined): T {
  return secciones.find((s) => s.valor === pedida)?.valor ?? secciones[0].valor;
}

/** Un acceso a otra pantalla, con su icono y para qué sirve */
export function Atajo({ href, icono, nombre, detalle }: { href: string; icono: string; nombre: string; detalle: string }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-brand-500/40 hover:bg-brand-600/10"
    >
      <span className="mt-0.5 text-brand-400">
        <Icono emoji={icono} tamano={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{nombre}</span>
        <span className="block text-xs text-slate-400">{detalle}</span>
      </span>
    </Link>
  );
}
