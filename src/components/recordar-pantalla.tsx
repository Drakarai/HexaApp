"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Apunta por qué pantalla se va, para que HexaPost deje ya elegida aquella de
 * la que vienes: casi siempre se entra justo después de ver el fallo.
 * `document.referrer` no sirve, porque al moverse por la aplicación no se
 * recarga la página y se queda con la de la primera carga.
 */
const CLAVE = "hexaapp.pantalla-anterior";

export function RecordarPantalla() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/hexapost")) return;
    try {
      sessionStorage.setItem(CLAVE, pathname);
    } catch {
      // Sin almacenamiento (navegación privada): se elige a mano
    }
  }, [pathname]);
  return null;
}

export function leerPantallaAnterior() {
  try {
    return sessionStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}
