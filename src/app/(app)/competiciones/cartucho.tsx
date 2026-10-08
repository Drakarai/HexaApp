import Link from "next/link";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

/**
 * Las piezas con las que se ve Competiciones: **cada edición es un cartucho**,
 * con sus estrías arriba y su etiqueta, y las ediciones juntas son la
 * estantería. Es a propósito distinto de la ficha de Mi perfil: cada pantalla
 * con su cara, no todas con la misma plantilla.
 */

export type EstadoDeEdicion = "en-curso" | "sin-empezar" | "archivada";

const ESTADOS: Record<EstadoDeEdicion, { texto: string; luz: string }> = {
  "en-curso": { texto: "En curso", luz: "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/70" },
  "sin-empezar": { texto: "Sin empezar", luz: "bg-amber-400 shadow-[0_0_8px] shadow-amber-400/70" },
  archivada: { texto: "Archivada", luz: "bg-slate-500" },
};

/** La lucecita del cartucho, como la de encendido de la consola */
export function Luz({ estado, conTexto = true }: { estado: EstadoDeEdicion; conTexto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
      <span className={cx("h-2 w-2 shrink-0 rounded-full", ESTADOS[estado].luz)} />
      {conTexto ? ESTADOS[estado].texto : <span className="sr-only">{ESTADOS[estado].texto}</span>}
    </span>
  );
}

/** La edición que se está viendo, en grande: el logo en la etiqueta y debajo cómo va */
export function CartuchoDeLaEdicion({
  nombre,
  detalle,
  descripcion,
  logo,
  estado,
  cifras,
}: {
  nombre: string;
  detalle: string;
  descripcion: string | null;
  logo: string | null;
  estado: EstadoDeEdicion;
  cifras: string[];
}) {
  return (
    <section className="cartucho border border-white/10 p-3 sm:p-4">
      <div aria-hidden className="estrias-de-cartucho mx-auto mb-3 h-3 w-1/2 rounded-sm" />
      <div className="etiqueta-de-cartucho rounded-lg border border-white/10 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-16 w-16 shrink-0 object-contain drop-shadow-lg sm:h-20 sm:w-20" />
          ) : null}
          <div className="min-w-0">
            <h2 className="font-[Barlow_Condensed] text-3xl font-bold uppercase leading-none tracking-wide text-white sm:text-4xl">
              {nombre}
            </h2>
            <p className="mt-1.5 text-sm text-white/70">{detalle}</p>
          </div>
        </div>
        {descripcion ? <p className="mt-3 text-sm text-white/80">{descripcion}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <Luz estado={estado} />
        <span className="text-xs text-slate-400">{cifras.join(" · ")}</span>
        <span aria-hidden className="ml-auto text-[10px] font-bold tracking-[0.35em] text-slate-600">
          HEXAAPP
        </span>
      </div>
    </section>
  );
}

/** Un cartucho de la estantería: lo justo para reconocerlo y sus botones debajo */
export function CartuchoPequeno({
  nombre,
  detalle,
  estado,
  puesto,
  children,
}: {
  nombre: string;
  detalle: string;
  estado: EstadoDeEdicion;
  /** El que se está viendo: se le nota encendido */
  puesto: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={cx(
        "cartucho border p-2.5",
        puesto ? "border-brand-500/60 ring-1 ring-brand-500/30" : "border-white/10",
      )}
    >
      <div aria-hidden className="estrias-de-cartucho mx-auto mb-2 h-2 w-1/2 rounded-sm" />
      <div className={cx("rounded-md border border-white/10 px-3 py-2.5", puesto ? "etiqueta-de-cartucho" : "bg-white/[0.04]")}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-[Barlow_Condensed] text-lg font-bold uppercase leading-tight tracking-wide text-white">
            {nombre}
          </h3>
          <span className="mt-1">
            <Luz estado={estado} conTexto={false} />
          </span>
        </div>
        <p className="truncate text-xs text-white/60">{detalle}</p>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 px-0.5">{children}</div>
    </article>
  );
}

/** Pestañas subrayadas, las de toda la vida: aquí van mejor que botones */
export function PestanasDeCompeticiones<T extends string>({
  secciones,
  activa,
}: {
  secciones: { valor: T; rotulo: string; icono: string; cuenta?: number; aviso?: boolean }[];
  activa: T;
}) {
  return (
    <nav aria-label="Partes de Competiciones" className="mb-5 mt-6 flex gap-4 overflow-x-auto border-b border-white/10 sm:gap-6">
      {secciones.map((s) => (
        <Link
          key={s.valor}
          href={`/competiciones?seccion=${s.valor}`}
          aria-current={s.valor === activa ? "page" : undefined}
          className={cx(
            "relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-0.5 pb-2.5 pt-1 text-sm font-medium transition",
            s.valor === activa
              ? "border-brand-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          {/* En el móvil sin icono: con él, las cuatro no caben en una fila */}
          <span className="hidden sm:inline-flex">
            <Icono emoji={s.icono} tamano={16} />
          </span>
          {s.rotulo}
          {s.cuenta ? <span className="text-xs tabular-nums text-slate-500">{s.cuenta}</span> : null}
          {s.aviso ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
        </Link>
      ))}
    </nav>
  );
}
