"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { cx } from "@/lib/utils";

/**
 * **Tirar hacia abajo para refrescar**, con la media ball girando, como en las
 * apps del teléfono. Va en las pantallas que cambian mientras se miran —la
 * portada y Equipo y PC—, donde lo normal es querer ver lo último que ha
 * apuntado el otro.
 *
 * Refresca con `router.refresh()`: vuelve a pedir los datos sin recargar la
 * página, así que no se pierde nada de lo que hubiera a medio escribir.
 *
 * El del navegador se apaga (`overscroll-behavior`) mientras esto está puesto:
 * con los dos, Chrome recargaba la página entera por encima del nuestro. Y no
 * se mete donde no toca: con una ficha abierta, ni cuando el tablero de Equipo
 * y PC ya ha cogido un pokémon para arrastrarlo (ese `touchmove` llega con el
 * `preventDefault` hecho).
 */

/** Lo que hay que bajar la bola, ya frenada, para que al soltar refresque */
const UMBRAL = 64;
/** Hasta dónde baja como mucho */
const TOPE = 96;
/** Lo que se mueve el dedo antes de empezar: el tablero coge a los 8 */
const HOLGURA = 10;
/** Lo mínimo que gira, que un refresco rapidísimo parecía un fallo */
const GIRO_MINIMO = 700;

export function TirarParaRefrescar() {
  const router = useRouter();
  const [bajada, setBajada] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [pendiente, empezar] = useTransition();
  const desde = useRef(0);

  useEffect(() => {
    const html = document.documentElement;
    const antes = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = "contain";

    let inicio: { x: number; y: number } | null = null;
    let tirando = false;
    let actual = 0;
    let avisado = false;

    const alTocar = (evento: TouchEvent) => {
      inicio = null;
      if (evento.touches.length !== 1 || window.scrollY > 0) return;
      if (document.body.style.overflow === "hidden") return;
      if ((evento.target as Element | null)?.closest?.("[role=dialog]")) return;
      const dedo = evento.touches[0];
      inicio = { x: dedo.clientX, y: dedo.clientY };
      tirando = false;
      actual = 0;
      avisado = false;
    };

    const alMover = (evento: TouchEvent) => {
      if (!inicio) return;
      if (evento.defaultPrevented) {
        // Alguien ya se ha quedado este gesto (arrastrar un pokémon)
        inicio = null;
        setBajada(0);
        return;
      }
      const dedo = evento.touches[0];
      const dy = dedo.clientY - inicio.y;
      const dx = dedo.clientX - inicio.x;
      if (!tirando) {
        if (dy > HOLGURA && dy > Math.abs(dx) * 1.5 && window.scrollY <= 0) {
          tirando = true;
          inicio = { x: dedo.clientX, y: dedo.clientY };
        } else if (dy < -HOLGURA || Math.abs(dx) > HOLGURA) {
          inicio = null;
        }
        return;
      }
      if (evento.cancelable) evento.preventDefault();
      // Frenada: cuanto más se tira, menos baja, como las de verdad
      const tirado = Math.max(0, dedo.clientY - inicio.y);
      actual = Math.min(TOPE, tirado * 0.5);
      if (actual >= UMBRAL && !avisado) {
        avisado = true;
        navigator.vibrate?.(10);
      } else if (actual < UMBRAL) {
        avisado = false;
      }
      setBajada(actual);
    };

    const alSoltar = () => {
      if (!inicio || !tirando) {
        inicio = null;
        return;
      }
      inicio = null;
      tirando = false;
      if (actual >= UMBRAL) {
        desde.current = Date.now();
        setCargando(true);
        setBajada(UMBRAL);
        empezar(() => router.refresh());
      } else {
        setBajada(0);
      }
    };

    window.addEventListener("touchstart", alTocar, { passive: true });
    window.addEventListener("touchmove", alMover, { passive: false });
    window.addEventListener("touchend", alSoltar);
    window.addEventListener("touchcancel", alSoltar);
    return () => {
      html.style.overscrollBehaviorY = antes;
      window.removeEventListener("touchstart", alTocar);
      window.removeEventListener("touchmove", alMover);
      window.removeEventListener("touchend", alSoltar);
      window.removeEventListener("touchcancel", alSoltar);
    };
  }, [router]);

  // Cuando llegan los datos nuevos, la bola se va (tras girar un mínimo)
  useEffect(() => {
    if (!cargando || pendiente) return;
    const falta = Math.max(0, GIRO_MINIMO - (Date.now() - desde.current));
    const temporizador = window.setTimeout(() => {
      setCargando(false);
      setBajada(0);
    }, falta);
    return () => window.clearTimeout(temporizador);
  }, [cargando, pendiente]);

  const listo = bajada >= UMBRAL;
  return (
    <div
      aria-hidden={!cargando}
      role={cargando ? "status" : undefined}
      className={cx(
        "pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[45] flex justify-center lg:hidden",
        // Mientras se tira, sigue al dedo; al soltar, vuelve con calma
        bajada === 0 || cargando ? "transition-transform duration-300" : "",
      )}
      style={{ transform: `translateY(${bajada - 48}px)` }}
    >
      {cargando ? <span className="sr-only">Refrescando…</span> : null}
      <span
        className={cx(
          "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-ink-900 shadow-xl transition-opacity",
          bajada === 0 && !cargando ? "opacity-0" : "opacity-100",
        )}
      >
        <span
          className={cx("flex", cargando && "animate-spin")}
          style={cargando ? undefined : { transform: `rotate(${bajada * 4}deg)` }}
        >
          <Logo
            id="logo-refrescar"
            tamano={24}
            className={cx("transition-[filter]", !listo && !cargando && "grayscale")}
          />
        </span>
      </span>
    </div>
  );
}
