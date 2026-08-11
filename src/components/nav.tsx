"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string };

/** Una entrada que agrupa a otras y se despliega, como "Combates". */
export type NavGroup = { label: string; icon: string; children: NavItem[] };

export type NavEntry = NavItem | NavGroup;

const esGrupo = (entrada: NavEntry): entrada is NavGroup =>
  "children" in entrada;

/**
 * La barra lateral del PC. Arriba, sueltas, las cuatro de todos los días; el
 * resto repartidas en los mismos grupos que el menú del móvil, cada uno
 * desplegable. Una lista de catorce enlaces seguidos ya no se leía.
 */
export function Nav({ items }: { items: NavEntry[] }) {
  const pathname = usePathname();

  const activo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((entrada) =>
        esGrupo(entrada) ? (
          <Grupo key={entrada.label} grupo={entrada} activo={activo} />
        ) : (
          <Enlace
            key={entrada.href}
            item={entrada}
            activo={activo(entrada.href)}
          />
        ),
      )}
    </nav>
  );
}

function Enlace({
  item,
  activo,
}: {
  item: NavItem;
  activo: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={activo ? "page" : undefined}
      className={cx(
        "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
        activo
          ? "bg-brand-600/20 text-white ring-1 ring-brand-500/40"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
      )}
    >
      <span aria-hidden className="text-base">
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function Grupo({
  grupo,
  activo,
}: {
  grupo: NavGroup;
  activo: (href: string) => boolean;
}) {
  const pathname = usePathname();
  const alguienActivo = grupo.children.some((hijo) => activo(hijo.href));

  /**
   * `null` significa "como toque": abierto si estás dentro del grupo. En cuanto
   * lo abres o lo cierras a mano manda tu decisión, pero al cambiar de página
   * se vuelve al automático, para que el grupo donde estás salga abierto aunque
   * hayas llegado por un enlace de dentro de la página.
   */
  const [aMano, setAMano] = useState<boolean | null>(null);
  useEffect(() => setAMano(null), [pathname]);
  const abierto = aMano ?? alguienActivo;

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setAMano(!abierto)}
        aria-expanded={abierto}
        className={cx(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
          alguienActivo
            ? "text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
        )}
      >
        <span aria-hidden className="text-base">
          {grupo.icon}
        </span>
        <span className="flex-1 text-left">{grupo.label}</span>
        {/* Un punto cuando está cerrado y estás dentro: si no, no se ve dónde
            estás sin abrirlos todos */}
        {!abierto && alguienActivo ? (
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        ) : null}
        <span
          aria-hidden
          className={cx(
            "text-xs text-slate-500 transition",
            abierto && "rotate-90",
          )}
        >
          ▸
        </span>
      </button>

      {abierto ? (
        // El filete de la izquierda ata los hijos a su grupo
        <div className="flex gap-1 lg:mt-0.5 lg:ml-4 lg:flex-col lg:border-l lg:border-white/5 lg:pl-2">
          {grupo.children.map((hijo) => (
            <Enlace key={hijo.href} item={hijo} activo={activo(hijo.href)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
