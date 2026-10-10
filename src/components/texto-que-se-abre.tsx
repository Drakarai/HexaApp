"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";

/**
 * Una línea que se corta con «…» si no cabe y **se ve entera al tocarla**. En
 * Actividad, las causas de las bajas largas se quedaban a medias («Murió
 * sacrificándose contra un Sableye, sino era wi…») y no había forma de leer el
 * resto sin ir al cementerio.
 *
 * Solo se puede tocar si de verdad está cortada: se mide al pintarla y otra vez
 * si cambia el ancho (girar el móvil).
 */
export function TextoQueSeAbre({ texto, className }: { texto: string; className?: string }) {
  const nodo = useRef<HTMLParagraphElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [cortado, setCortado] = useState(false);

  useLayoutEffect(() => {
    const p = nodo.current;
    if (!p || abierto) return;
    const medir = () => setCortado(p.scrollWidth > p.clientWidth + 1);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(p);
    return () => observador.disconnect();
  }, [abierto, texto]);

  // La propia línea es lo que se toca: un botón dentro no dejaría salir los «…»
  const tocable = cortado || abierto;
  const cambiar = () => setAbierto((antes) => !antes);
  return (
    <p
      ref={nodo}
      className={cx(
        abierto ? "[overflow-wrap:anywhere]" : "truncate",
        tocable && "cursor-pointer hover:text-slate-300",
        className,
      )}
      {...(tocable
        ? {
            role: "button",
            tabIndex: 0,
            "aria-expanded": abierto,
            title: abierto ? "Recoger" : "Verlo entero",
            onClick: cambiar,
            onKeyDown: (evento: React.KeyboardEvent) => {
              if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                cambiar();
              }
            },
          }
        : {})}
    >
      {texto}
    </p>
  );
}
