"use client";

import { useEffect } from "react";
import { desbloquear, gritosDelJuego } from "@/lib/gritos";

/**
 * Va en el layout y no pinta nada: le dice a los gritos qué estilo pide el
 * juego del locke y desbloquea el sonido con el primer toque (ver lib/gritos.ts).
 */
export function GritosDelLocke({ clasicos }: { clasicos: boolean }) {
  useEffect(() => {
    gritosDelJuego(clasicos);
  }, [clasicos]);

  useEffect(() => {
    const alTocar = () => desbloquear();
    // Se escucha siempre y no solo la primera vez: si el móvil suspende el
    // sonido al irse a segundo plano, el siguiente toque lo vuelve a despertar
    window.addEventListener("pointerdown", alTocar, { passive: true, capture: true });
    window.addEventListener("keydown", alTocar, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", alTocar, { capture: true });
      window.removeEventListener("keydown", alTocar, { capture: true });
    };
  }, []);

  return null;
}
