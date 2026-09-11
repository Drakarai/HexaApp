"use client";

import { useEffect } from "react";

/** Registra el service worker, que es lo que hace la app instalable. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla, la app sigue funcionando como web normal
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

/**
 * Borra las pantallas guardadas para poder verlas sin conexión.
 *
 * Va montado en la pantalla de entrada, que es donde se acaba después de
 * cerrar sesión: esas copias llevan dentro los datos de quien las vio —su
 * mapa, sus notas— y en un móvil compartido no tienen por qué quedarse. Las
 * imágenes no se tocan: son sprites, y los mismos para todo el mundo.
 */
export function OlvidarLoGuardado() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage({ tipo: "limpiar" });
  }, []);

  return null;
}
