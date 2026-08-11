"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { NavGroup, NavItem } from "@/components/nav";
import { Avatar } from "@/components/ui";
import { cx } from "@/lib/utils";

export type MobileUser = {
  displayName: string;
  avatarColor: string;
  avatarImage: string | null;
  /** El renglón de debajo del nombre: "@pablo · Jugador" */
  subtitle: string;
};

/**
 * La navegación del móvil: barra de pestañas abajo con lo que más se usa, y el
 * resto en un menú que sube desde abajo.
 *
 * Ese menú va **por grupos** (combates, la edición, lo mío, gestión). Antes era
 * una rejilla de doce iconos iguales, y con doce cosas seguidas no se encuentra
 * nada: hay que leérselas todas. Con los grupos, primero eliges de qué va lo
 * que buscas y solo miras cuatro.
 */
export function MobileTabBar({
  primary,
  groups,
  user,
}: {
  primary: NavItem[];
  groups: NavGroup[];
  user: MobileUser;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Al cambiar de página, el menú se cierra solo
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alPulsarTecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  const activo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const algoDelMenuActivo = groups.some((grupo) =>
    grupo.children.some((item) => activo(item.href)),
  );

  return (
    <>
      {abierto ? (
        <div
          className="menu-fondo fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            onClick={(evento) => evento.stopPropagation()}
            className={cx(
              "menu-movil absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900",
              // Deja hueco abajo para la barra de pestañas, que sigue encima
              "pb-[calc(4.5rem+env(safe-area-inset-bottom))]",
            )}
          >
            {/* La cabecera se queda arriba aunque el menú se desplace */}
            <div className="sticky top-0 z-10 rounded-t-3xl border-b border-white/5 bg-ink-900/95 px-4 pb-3 pt-3 backdrop-blur">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="flex items-center gap-3">
                <Link
                  href="/perfil"
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar
                    name={user.displayName}
                    color={user.avatarColor}
                    image={user.avatarImage}
                    size={40}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {user.subtitle}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="btn-ghost btn-sm shrink-0"
                  aria-label="Cerrar el menú"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 px-4 pt-4">
              {groups.map((grupo) => (
                <section key={grupo.label}>
                  <h2 className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <span aria-hidden>{grupo.icon}</span>
                    {grupo.label}
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
                    {grupo.children.map((item, posicion) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={activo(item.href) ? "page" : undefined}
                        className={cx(
                          "flex items-center gap-3 px-3 py-3 text-sm transition",
                          posicion > 0 && "border-t border-white/5",
                          activo(item.href)
                            ? "bg-brand-600/20 font-semibold text-white"
                            : "text-slate-300 active:bg-white/5",
                        )}
                      >
                        <span
                          aria-hidden
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-base"
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        <span aria-hidden className="text-xs text-slate-600">
                          ›
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <form action={logoutAction} className="mt-5 px-4">
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
            <Link key={item.href} href={item.href} className="pestana">
              <Pastilla icono={item.icon} encendida={activo(item.href)} />
              <Rotulo encendido={activo(item.href)}>{item.label}</Rotulo>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setAbierto((estaba) => !estaba)}
            aria-expanded={abierto}
            className="pestana"
          >
            <Pastilla icono="☰" encendida={abierto || algoDelMenuActivo} />
            <Rotulo encendido={abierto || algoDelMenuActivo}>Menú</Rotulo>
          </button>
        </div>
      </nav>
    </>
  );
}

/**
 * El icono dentro de una pastilla que se enciende: es lo que distingue la
 * pestaña activa de un vistazo, mucho antes de leer el rótulo.
 */
function Pastilla({ icono, encendida }: { icono: string; encendida: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        "flex h-7 w-14 items-center justify-center rounded-full text-lg leading-none transition",
        encendida && "bg-brand-600/25",
      )}
    >
      {icono}
    </span>
  );
}

function Rotulo({
  children,
  encendido,
}: {
  children: React.ReactNode;
  encendido: boolean;
}) {
  return (
    <span
      className={cx(
        "text-[10px] font-medium transition",
        encendido ? "text-brand-300" : "text-slate-400",
      )}
    >
      {children}
    </span>
  );
}
