"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { NavItem } from "@/components/nav";
import { cx } from "@/lib/utils";

/**
 * Barra de pestañas inferior, como en una app nativa. Las secciones que no
 * caben viven detrás del botón "Más", que abre un panel deslizante.
 */
export function MobileTabBar({
  primary,
  secondary,
}: {
  primary: NavItem[];
  secondary: NavItem[];
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Al cambiar de página, el panel se cierra solo
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const secondaryActive = secondary.some((item) => isActive(item.href));

  return (
    <>
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-ink-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="grid grid-cols-3 gap-2">
              {secondary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] px-2 py-3 text-center text-xs font-medium transition",
                    isActive(item.href)
                      ? "border-brand-500/40 bg-brand-600/20 text-white"
                      : "text-slate-300",
                  )}
                >
                  <span className="text-xl" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="btn-ghost w-full">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                isActive(item.href) ? "text-brand-400" : "text-slate-400",
              )}
            >
              <span className="text-xl leading-none" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            className={cx(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
              sheetOpen || secondaryActive ? "text-brand-400" : "text-slate-400",
            )}
          >
            <span className="text-xl leading-none" aria-hidden>
              ☰
            </span>
            Más
          </button>
        </div>
      </nav>
    </>
  );
}
