"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/utils";

/**
 * Una ficha que **en el móvil sube desde abajo** y en el ordenador sale
 * centrada, como siempre.
 *
 * En el móvil una ventana centrada es de ordenador: el pulgar no llega arriba
 * y no se sabe cómo cerrarla sin buscar la ✕. Aquí va pegada abajo, con su
 * asa, y **se cierra arrastrándola hacia abajo** como las de las apps del
 * teléfono. El arrastre solo empieza con la ficha subida del todo: si tiene
 * scroll dentro, primero se sube hasta arriba y luego ya baja la ficha, que es
 * como lo hacen las nativas.
 *
 * Va por encima del botón de apuntar y de la barra de pestañas (z 65): una
 * ficha a medias tapada por el ＋ no se puede leer.
 */

/** Por debajo de esto es móvil: el `sm` de Tailwind */
const MOVIL = "(max-width: 639px)";
/** Lo que hay que bajarla para que se cierre al soltar */
const UMBRAL = 110;
/** O la velocidad, en píxeles por milisegundo: un tirón corto también cierra */
const TIRON = 0.6;
const DURACION = 220;
/**
 * Cuántas hay abiertas. Al pasar de una a otra (del grupo del mapa a su zona)
 * la nueva se abre antes de que se cierre la vieja, y la vieja, al irse, le
 * devolvía el scroll a la página con la nueva todavía encima.
 */
let abiertas = 0;

export function Hoja({
  onCerrar,
  children,
  ancho = "max-w-md",
  fondo = "bg-black/70",
  className,
  etiqueta,
}: {
  onCerrar: () => void;
  children: React.ReactNode;
  /** El ancho en el ordenador; en el móvil ocupa todo */
  ancho?: string;
  fondo?: string;
  /** El relleno y lo que cambie de cada ficha */
  className?: string;
  etiqueta?: string;
}) {
  const capa = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  // Las fichas pasan un onCerrar nuevo en cada render; los escuchas son de uno
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  /** Baja la ficha y luego cierra; en el ordenador, cierra sin más */
  function cerrarBajando() {
    const nodo = hoja.current;
    if (!nodo || !window.matchMedia(MOVIL).matches || sinMovimiento()) {
      cerrarRef.current();
      return;
    }
    nodo.style.transition = `transform ${DURACION}ms ease-in`;
    nodo.style.transform = "translateY(100%)";
    if (capa.current) {
      capa.current.style.transition = `opacity ${DURACION}ms ease-in`;
      capa.current.style.opacity = "0";
    }
    window.setTimeout(() => cerrarRef.current(), DURACION);
  }

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrarRef.current();
    };
    document.addEventListener("keydown", alPulsar);
    abiertas += 1;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsar);
      abiertas -= 1;
      if (abiertas === 0) document.body.style.overflow = "";
    };
  }, []);

  // Arrastrar hacia abajo para cerrar, solo con el dedo y solo en el móvil
  useEffect(() => {
    const nodo = hoja.current;
    if (!nodo) return;
    let inicio: { x: number; y: number; t: number } | null = null;
    let bajada = 0;
    let arrastrando = false;

    const alTocar = (evento: TouchEvent) => {
      if (!window.matchMedia(MOVIL).matches || evento.touches.length !== 1) return;
      const dedo = evento.touches[0];
      inicio = { x: dedo.clientX, y: dedo.clientY, t: Date.now() };
      bajada = 0;
      arrastrando = false;
    };

    const alMover = (evento: TouchEvent) => {
      if (!inicio) return;
      const dedo = evento.touches[0];
      const dy = dedo.clientY - inicio.y;
      const dx = dedo.clientX - inicio.x;
      if (!arrastrando) {
        // Solo si va hacia abajo, más vertical que de lado y sin scroll que subir
        if (dy > 6 && dy > Math.abs(dx) && nodo.scrollTop <= 0) {
          arrastrando = true;
          inicio = { x: dedo.clientX, y: dedo.clientY, t: Date.now() };
          nodo.style.transition = "none";
        } else if (Math.abs(dy) > 6 || Math.abs(dx) > 6) {
          // Era scroll o un gesto de lado: esta vez no se arrastra
          inicio = null;
        }
        return;
      }
      if (evento.cancelable) evento.preventDefault();
      bajada = Math.max(0, dedo.clientY - inicio.y);
      nodo.style.transform = `translateY(${bajada}px)`;
      if (capa.current) {
        capa.current.style.opacity = String(Math.max(0.3, 1 - bajada / 500));
      }
    };

    const alSoltar = () => {
      if (!inicio || !arrastrando) {
        inicio = null;
        return;
      }
      const velocidad = bajada / Math.max(1, Date.now() - inicio.t);
      inicio = null;
      arrastrando = false;
      if (bajada > UMBRAL || (bajada > 30 && velocidad > TIRON)) {
        cerrarBajando();
        return;
      }
      // No llegó: vuelve a su sitio
      nodo.style.transition = `transform ${DURACION}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      nodo.style.transform = "";
      if (capa.current) {
        capa.current.style.transition = `opacity ${DURACION}ms`;
        capa.current.style.opacity = "";
      }
    };

    nodo.addEventListener("touchstart", alTocar, { passive: true });
    // No pasivo: una vez arrastrando, el scroll de la ficha se para
    nodo.addEventListener("touchmove", alMover, { passive: false });
    nodo.addEventListener("touchend", alSoltar);
    nodo.addEventListener("touchcancel", alSoltar);
    return () => {
      nodo.removeEventListener("touchstart", alTocar);
      nodo.removeEventListener("touchmove", alMover);
      nodo.removeEventListener("touchend", alSoltar);
      nodo.removeEventListener("touchcancel", alSoltar);
    };
    // cerrarBajando solo lee refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      ref={capa}
      className={cx(
        "hoja-fondo fixed inset-0 z-[65] flex items-end justify-center backdrop-blur-sm",
        "sm:items-start sm:overflow-y-auto sm:p-4",
        fondo,
      )}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) cerrarBajando();
      }}
    >
      <div
        ref={hoja}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        className={cx(
          "hoja relative w-full border border-white/10 bg-ink-900 shadow-2xl",
          // Móvil: pegada abajo, con su propio scroll y el hueco de la barra del sistema
          "max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-b-0",
          "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          // Ordenador: la ventana centrada de siempre
          "sm:my-auto sm:max-h-none sm:overflow-visible sm:rounded-2xl sm:border-b sm:pb-5",
          ancho,
          className,
        )}
      >
        {/* El asa: dice sin palabras que se puede bajar */}
        <div aria-hidden className="flex justify-center pb-1 pt-0 sm:hidden">
          <span className="-mt-2 mb-1 h-1 w-10 rounded-full bg-white/20" />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function sinMovimiento() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
