"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { NavGroup, NavItem } from "@/components/nav";
import {
  HUECO_DEL_BOTON,
  seVeElBotonApuntar,
  type AtajoDeApunte,
} from "@/components/boton-apuntar";
import { Avatar } from "@/components/ui";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

export type MobileUser = {
  displayName: string;
  avatarColor: string;
  avatarImage: string | null;
  /** El renglón de debajo del nombre: "@pablo · Jugador" */
  subtitle: string;
};

/**
 * La navegación del móvil: una barra de pestañas abajo donde **cada grupo es su
 * propia pestaña** y abre su propia hoja.
 *
 * Antes había cuatro páginas sueltas y un botón "Más" con todo lo demás
 * amontonado dentro: el cajón de sastre crecía con cada sección nueva y nadie
 * encontraba nada. Ahora se toca por temas —combates, la edición, lo mío— y
 * dentro de cada uno hay tres o cinco cosas, que sí se leen de un vistazo.
 */
export function MobileTabBar({
  primary,
  groups,
  user,
  avisos = {},
  atajos = [],
}: {
  primary: NavItem[];
  groups: NavGroup[];
  user: MobileUser;
  /** Qué grupos tienen algo nuevo desde tu última visita */
  avisos?: Record<string, boolean>;
  /**
   * Los mismos que lleva el botón de apuntar. La barra no los pinta: los
   * necesita para saber **si tiene que dejarle el hueco del centro**.
   */
  atajos?: AtajoDeApunte[];
}) {
  const pathname = usePathname();
  /** El nombre del grupo abierto, o null si no hay hoja */
  const [abierto, setAbierto] = useState<string | null>(null);

  // Al cambiar de página la hoja se cierra sola
  useEffect(() => {
    setAbierto(null);
  }, [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(null);
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
  const dentroDe = (grupo: NavGroup) =>
    grupo.children.some((item) => activo(item.href));

  const hoja = groups.find((grupo) => grupo.label === abierto) ?? null;

  /**
   * Cuántas pestañas van a la izquierda del botón. Con las cuatro de siempre
   * son dos y dos; si algún día son tres —en un locke en solitario se cae
   * "Combates"—, el reparto se ajusta solo en vez de quedar descentrado.
   */
  const pestanas = [...primary, ...groups];
  const hayBoton = seVeElBotonApuntar(atajos, pathname);
  const mitad = Math.ceil(pestanas.length / 2);

  return (
    <>
      {hoja ? (
        <div
          className="menu-fondo fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setAbierto(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={hoja.label}
            onClick={(evento) => evento.stopPropagation()}
            className={cx(
              "menu-movil absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900",
              // Hueco para la barra de pestañas, que se queda encima
              "pb-[calc(4.5rem+env(safe-area-inset-bottom))]",
            )}
          >
            <div className="sticky top-0 z-10 rounded-t-3xl border-b border-white/5 bg-ink-900/95 px-4 pb-3 pt-3 backdrop-blur">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="flex items-center gap-3">
                {hoja.personal ? (
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
                ) : (
                  <p className="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-white">
                    <span aria-hidden>
                      <Icono emoji={hoja.icon} />
                    </span>
                    {hoja.label}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setAbierto(null)}
                  className="btn-ghost btn-sm shrink-0"
                  aria-label="Cerrar el menú"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-4 pt-4">
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
                {hoja.children.map((item, posicion) => (
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
                      <Icono emoji={item.icon} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {/* El apartado que tiene algo nuevo él solo: sin esto, al
                        abrir el grupo no se sabría en cuál está */}
                    {avisos[item.label] && !activo(item.href) ? (
                      <span
                        aria-label="Hay algo nuevo"
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400"
                      />
                    ) : null}
                    <span aria-hidden className="text-xs text-slate-600">
                      ›
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {hoja.personal ? (
              <form action={logoutAction} className="mt-4 px-4">
                <button type="submit" className="btn-ghost w-full">
                  Cerrar sesión
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div
          className="grid"
          /**
           * Las pestañas se reparten el ancho por igual y, si hay botón de
           * apuntar, se le deja un **hueco fijo en el centro** para que se
           * monte encima sin taparlas. El hueco se calcula con las columnas y
           * no con un margen: así los rótulos siguen centrados en lo suyo.
           */
          style={{
            gridTemplateColumns: hayBoton
              ? `repeat(${mitad}, minmax(0, 1fr)) ${HUECO_DEL_BOTON} repeat(${pestanas.length - mitad}, minmax(0, 1fr))`
              : `repeat(${pestanas.length}, minmax(0, 1fr))`,
          }}
        >
          {primary.map((item) => (
            <Link key={item.href} href={item.href} className="pestana">
              <Pastilla icono={item.icon} encendida={activo(item.href)} />
              <Rotulo encendido={activo(item.href)}>{item.label}</Rotulo>
            </Link>
          ))}
          {/* El hueco: un hermano vacío, para que caiga justo en el medio */}
          {hayBoton && mitad === primary.length ? <span aria-hidden /> : null}
          {groups.map((grupo, posicion) => {
            const encendida = abierto === grupo.label || dentroDe(grupo);
            return (
              <button
                key={grupo.label}
                type="button"
                onClick={() =>
                  setAbierto((antes) =>
                    antes === grupo.label ? null : grupo.label,
                  )
                }
                aria-expanded={abierto === grupo.label}
                className="pestana"
              >
                <Pastilla
                  icono={grupo.icon}
                  encendida={encendida}
                  // Estando dentro no se avisa: lo estás viendo
                  aviso={Boolean(avisos[grupo.label]) && !dentroDe(grupo)}
                />
                <Rotulo encendido={encendida}>{grupo.label}</Rotulo>
              </button>
            );
          }).flatMap((pestana, posicion) =>
            hayBoton && primary.length + posicion + 1 === mitad
              ? [pestana, <span key="hueco" aria-hidden />]
              : [pestana],
          )}
        </div>
      </nav>
    </>
  );
}

/**
 * El icono dentro de una pastilla que se enciende: es lo que distingue la
 * pestaña activa de un vistazo, mucho antes de leer el rótulo.
 */
function Pastilla({
  icono,
  encendida,
  aviso = false,
}: {
  icono: string;
  encendida: boolean;
  aviso?: boolean;
}) {
  return (
    <span className="relative flex w-full justify-center">
      <span
        aria-hidden
        data-encendida={encendida || undefined}
        className={cx(
          "pastilla flex h-7 w-full max-w-14 items-center justify-center rounded-full text-lg leading-none transition",
          encendida && "bg-brand-600/25",
        )}
      >
        <Icono emoji={icono} tamano={20} />
      </span>
      {/* El punto va pegado al icono y no al rótulo: en una barra de cuatro
          pestañas el rótulo se trunca, y el aviso se perdería con él */}
      {aviso ? (
        <span
          aria-label="Hay algo nuevo"
          className="absolute right-1/2 top-0 h-2.5 w-2.5 translate-x-[1.05rem] rounded-full border-2 border-ink-900 bg-amber-400"
        />
      ) : null}
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
        "max-w-full truncate px-1 text-[10px] font-medium transition",
        encendido ? "text-brand-300" : "text-slate-400",
      )}
    >
      {children}
    </span>
  );
}
