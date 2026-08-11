"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string };

/** Una entrada que agrupa a otras y se despliega, como "Combates". */
export type NavGroup = { label: string; icon: string; children: NavItem[] };

export type NavEntry = NavItem | NavGroup;

const esGrupo = (entrada: NavEntry): entrada is NavGroup =>
  "children" in entrada;

export function Nav({ items }: { items: NavEntry[] }) {
  const pathname = usePathname();

  const activo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((entrada) =>
        esGrupo(entrada) ? (
          <Grupo
            key={entrada.label}
            grupo={entrada}
            activo={activo}
            // Arranca desplegado si estás en una de sus páginas
            abiertoDeInicio={entrada.children.some((hijo) => activo(hijo.href))}
          />
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
  sangrado = false,
}: {
  item: NavItem;
  activo: boolean;
  sangrado?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cx(
        "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
        sangrado && "lg:ml-3",
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
  abiertoDeInicio,
}: {
  grupo: NavGroup;
  activo: (href: string) => boolean;
  abiertoDeInicio: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoDeInicio);
  const alguienActivo = grupo.children.some((hijo) => activo(hijo.href));

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((estaba) => !estaba)}
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
        <span
          aria-hidden
          className={cx("text-xs text-slate-500 transition", abierto && "rotate-90")}
        >
          ▸
        </span>
      </button>

      {abierto ? (
        <div className="flex gap-1 lg:mt-0.5 lg:flex-col">
          {grupo.children.map((hijo) => (
            <Enlace
              key={hijo.href}
              item={hijo}
              activo={activo(hijo.href)}
              sangrado
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
