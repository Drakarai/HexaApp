"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

export type AtajoDeApunte = {
  href: string;
  icon: string;
  label: string;
  /** El renglón chico de debajo, para saber qué hace sin entrar */
  hint: string;
};

/**
 * El hueco que la barra de pestañas del móvil le deja en el centro. Vive aquí
 * para que el ancho del botón y el del hueco no se puedan descuadrar.
 */
export const HUECO_DEL_BOTON = "4.5rem";

/**
 * ¿Se ve el botón? Lo preguntan **los dos**: él, para pintarse, y la barra de
 * pestañas, para dejarle el hueco. Si cada uno lo decidiera por su cuenta,
 * bastaría con tocar una regla para que quedara un agujero en medio de la barra
 * sin nada dentro.
 */
export function seVeElBotonApuntar(atajos: AtajoDeApunte[], pathname: string) {
  return atajos.length > 0 && !pathname.startsWith("/admin");
}

/**
 * El botón de apuntar: un "＋" fijo con lo que se registra mientras juegas.
 *
 * Existe porque apuntar era lo que más pasos costaba justo cuando menos
 * apetece navegar: para una baja había que ir a *La edición › Caja* y desplegar
 * el formulario, y para una captura a *Lo mío › Mapa* y buscar la ruta. Cada
 * atajo lleva a su página **con el formulario ya abierto** (el `?apuntar=1`),
 * así que desde cualquier sitio son dos toques.
 *
 * No abre un formulario aquí dentro a propósito: el de las bajas arrastra el
 * buscador de especies y sus imágenes, y tener dos copias del mismo formulario
 * es la forma segura de que una se quede vieja.
 */
export function BotonApuntar({ atajos }: { atajos: AtajoDeApunte[] }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Al cambiar de página se cierra solo
  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    const alTocarFuera = (evento: MouseEvent) => {
      if (!caja.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("keydown", alPulsarTecla);
    document.addEventListener("pointerdown", alTocarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.removeEventListener("pointerdown", alTocarFuera);
    };
  }, [abierto]);

  /**
   * En Administración no pinta nada: ahí no se apunta nada de partida y el
   * botón solo taparía los formularios largos de la esquina.
   */
  if (!seVeElBotonApuntar(atajos, pathname)) return null;

  return (
    <div
      ref={caja}
      className={cx(
        "fixed z-[60] flex flex-col gap-2",
        /**
         * En el móvil va **en el centro y montado sobre la barra**, como el de
         * las aplicaciones del teléfono. Antes vivía en la esquina de abajo a
         * la derecha y tapaba contenido —una tarjeta del palmarés, un sprite
         * del hall—; ahí en medio cae en el hueco que le deja la barra y no
         * pisa nada.
         *
         * Se lee como **acción y no como pestaña** porque es un círculo de
         * color, más grande y levantado: plano y del tamaño de los demás, la
         * gente esperaría que llevara a una pantalla.
         */
        "bottom-[calc(1.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 items-center",
        // En el ordenador no hay barra de pestañas: se queda en su esquina
        "lg:bottom-6 lg:left-auto lg:right-4 lg:translate-x-0 lg:items-end",
      )}
    >
      {abierto ? (
        <div className="w-64 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
          {atajos.map((atajo, posicion) => (
            <Link
              key={atajo.href}
              href={atajo.href}
              className={cx(
                "flex items-center gap-3 px-3 py-2.5 transition active:bg-white/5 hover:bg-white/5",
                posicion > 0 && "border-t border-white/5",
              )}
            >
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-base"
              >
                <Icono emoji={atajo.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-100">
                  {atajo.label}
                </span>
                {/* Sin truncar: en un móvil de 390 el renglón de ayuda no cabe
                    en una línea y cortado no dice nada */}
                <span className="block text-xs leading-snug text-slate-500">
                  {atajo.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setAbierto((antes) => !antes)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar el menú de apuntar" : "Apuntar algo"}
        className={cx(
          // `boton-apuntar` no pinta nada: es el gancho del aspecto nuevo
          "boton-apuntar flex items-center justify-center rounded-full text-2xl leading-none shadow-lg transition",
          /**
           * El aro del color de la barra es lo que hace que se lea como un
           * botón **montado encima** y no como un círculo suelto flotando: sin
           * él, donde el botón pisa la barra no se sabe qué está delante de
           * qué. En el ordenador no hay barra que pisar, así que solo lleva su
           * borde de siempre.
           */
          "ring-4 ring-ink-900 lg:border lg:border-white/10 lg:ring-0",
          abierto
            ? "rotate-45 bg-ink-800 text-slate-200"
            : "bg-brand-600 text-white hover:bg-brand-500",
        )}
        // Fuera de la escala de Tailwind: 52 px es el mínimo cómodo para un
        // pulgar sin que el botón tape media pantalla del móvil
        style={{ height: "3.25rem", width: "3.25rem" }}
      >
        ＋
      </button>
    </div>
  );
}
