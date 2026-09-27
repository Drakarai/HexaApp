"use client";

import { useEffect, useState } from "react";
import { Icono } from "@/components/icono";

/**
 * Registra el service worker, que es lo que hace la app instalable y lo que
 * permite verla sin conexión.
 *
 * Y, sobre todo, **se asegura de que el de hoy sustituya al de ayer**. Un
 * service worker se queda mandando en el móvil hasta que uno nuevo lo releva,
 * así que si se sube uno con un fallo —pasó: uno rompió el cambiar de
 * pantalla— la corrección no sirve de nada si no llega. Por eso aquí se pide
 * la actualización en cada carga y, en cuanto el nuevo toma el mando, la
 * página se recarga sola una vez.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let vivo = true;
    /**
     * ¿Había ya un service worker mandando al abrir esta pantalla?
     *
     * Importa mucho: la **primera** instalación también avisa de que hay uno
     * nuevo al mando, y recargar ahí es un desastre —pasó, y se llevaba por
     * delante el inicio de sesión, porque la instalación cae justo mientras
     * se está escribiendo la contraseña—. Solo se recarga cuando uno nuevo
     * **releva a otro**, que es el caso que hay que arreglar.
     */
    const habiaOtro = Boolean(navigator.serviceWorker.controller);

    const registrar = async () => {
      try {
        const registro = await navigator.serviceWorker.register("/sw.js");
        // Que compruebe si hay uno más nuevo, sin esperar al día siguiente
        registro.update().catch(() => {});
      } catch {
        // Si falla, la aplicación sigue funcionando como web normal
      }
    };

    /**
     * Cuando el service worker nuevo toma el mando, la página que está abierta
     * la sirvió el viejo: se recarga para quedar toda con la misma versión. La
     * marca evita el bucle si algo va mal.
     */
    const alCambiarDeMando = () => {
      if (!vivo || !habiaOtro) return;
      // Y nunca mientras se está escribiendo algo
      const donde = document.activeElement?.tagName;
      if (donde === "INPUT" || donde === "TEXTAREA" || donde === "SELECT") return;
      try {
        if (window.sessionStorage.getItem("hexaapp.recargada") === "1") return;
        window.sessionStorage.setItem("hexaapp.recargada", "1");
      } catch {
        return;
      }
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", alCambiarDeMando);

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar);

    return () => {
      vivo = false;
      navigator.serviceWorker.removeEventListener("controllerchange", alCambiarDeMando);
      window.removeEventListener("load", registrar);
    };
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

/**
 * El botón de "esto va raro".
 *
 * Tira **todo** lo que la aplicación guarda en el móvil y desinstala el
 * service worker, dejando el navegador como la primera vez. Existe porque un
 * service worker con un fallo se queda mandando aunque el fallo ya esté
 * arreglado en el servidor, y sin esto la única salida es borrar los datos del
 * navegador a mano, que no se le puede pedir a nadie.
 *
 * Lo que hay en la cola de apuntes **no se toca**: se sube primero, y si
 * queda algo, avisa en vez de tirarlo.
 */
export function RepararLaAplicacion() {
  const [estado, setEstado] = useState<"quieto" | "trabajando">("quieto");

  async function reparar() {
    setEstado("trabajando");
    try {
      const { leerCola, subirLaCola } = await import("@/lib/cola");
      if (leerCola().length) {
        await subirLaCola();
        if (leerCola().length) {
          window.alert(
            "Tienes apuntes sin subir y no han podido subirse. Conéctate y espera a que se suban antes de reparar, o se perderán.",
          );
          setEstado("quieto");
          return;
        }
      }

      const registros = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((registros ?? []).map((registro) => registro.unregister()));
      const nombres = await caches.keys();
      await Promise.all(nombres.map((nombre) => caches.delete(nombre)));
    } catch {
      // Aunque algo falle, recargar ya arregla la mayoría de los líos
    }
    window.location.reload();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-sm font-semibold text-slate-200">¿La aplicación va rara?</p>
      <p className="mt-1 text-xs text-slate-400">
        Si se queda en blanco, no cambia de pantalla o enseña cosas viejas, esto
        tira lo que tiene guardado en este móvil y la deja como recién
        instalada. No borra nada de tu locke.
      </p>
      <button
        type="button"
        onClick={reparar}
        disabled={estado === "trabajando"}
        className="btn-ghost btn-sm mt-2"
      >
        {estado === "trabajando" ? "Reparando…" : <><Icono emoji="🧹" /> Reparar la aplicación</>}
      </button>
    </div>
  );
}
