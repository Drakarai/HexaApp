"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { alCambiarLaCola, leerCola, subirLaCola } from "@/lib/cola";
import { cx } from "@/lib/utils";

/**
 * La barra de estado de la conexión, encima de todo.
 *
 * Sale **solo cuando hay algo que decir**: que no hay línea y por tanto lo que
 * se ve puede estar viejo, o que hay apuntes esperando a subirse. Con
 * conexión y sin nada pendiente no se ve nada, que es el 99% del tiempo.
 *
 * Lo pendiente se sube solo: al recuperar la línea y al abrir la aplicación.
 * En iPhone no hay forma de subirlo con la app cerrada, así que ahí el momento
 * de volver a abrirla es el que vale; por eso el aviso insiste mientras quede
 * algo dentro.
 */
export function EstadoDeConexion({ rutas = [] }: { rutas?: string[] }) {
  const router = useRouter();
  const [hayLinea, setHayLinea] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [recien, setRecien] = useState(0);

  const contar = useCallback(() => setPendientes(leerCola().length), []);

  /**
   * Deja guardadas las pantallas del menú mientras hay cobertura, para que
   * sin ella no se vea solo lo que se acabara de abrir. Se hace como mucho
   * cada diez minutos: son consultas de verdad contra la base de datos.
   */
  const precalentar = useCallback(() => {
    if (!navigator.onLine || !rutas.length) return;
    try {
      const ultimo = Number(window.localStorage.getItem(CADA_CUANTO.llave) ?? 0);
      if (Date.now() - ultimo < CADA_CUANTO.milisegundos) return;
      window.localStorage.setItem(CADA_CUANTO.llave, String(Date.now()));
    } catch {
      // Sin localStorage se precalienta cada vez, que tampoco pasa nada
    }
    navigator.serviceWorker?.ready
      .then((registro) => registro.active?.postMessage({ tipo: "precalentar", rutas }))
      .catch(() => {});
  }, [rutas]);

  const subir = useCallback(async () => {
    if (!leerCola().length) return;
    setSubiendo(true);
    const { subidos } = await subirLaCola();
    setSubiendo(false);
    contar();
    if (subidos) {
      setRecien(subidos);
      // Lo subido ya está en el servidor: la pantalla tiene que enterarse
      router.refresh();
      setTimeout(() => setRecien(0), 6000);
    }
  }, [contar, router]);

  useEffect(() => {
    contar();
    setHayLinea(navigator.onLine);

    const vuelve = () => {
      setHayLinea(true);
      subir();
      precalentar();
    };
    const se_va = () => setHayLinea(false);

    window.addEventListener("online", vuelve);
    window.addEventListener("offline", se_va);
    const dejarDeEscuchar = alCambiarLaCola(contar);

    // Al abrir la aplicación: lo que quedara pendiente de la última vez, y
    // dejar guardado el resto de pantallas por si luego no hay cobertura
    if (navigator.onLine) {
      subir();
      const cuando = window.setTimeout(precalentar, 4000);
      return () => {
        window.clearTimeout(cuando);
        window.removeEventListener("online", vuelve);
        window.removeEventListener("offline", se_va);
        dejarDeEscuchar();
      };
    }

    return () => {
      window.removeEventListener("online", vuelve);
      window.removeEventListener("offline", se_va);
      dejarDeEscuchar();
    };
  }, [contar, subir, precalentar]);

  /**
   * Al volver a la aplicación, traer lo que haya cambiado mientras tanto.
   *
   * Instalada en el móvil, la aplicación no se cierra: se queda de fondo con la
   * pantalla tal cual, y al volver horas después seguía enseñando lo de
   * entonces —el resultado que ya había metido el admin o la baja de otro no
   * salían hasta cambiar de pestaña—. `router.refresh()` vuelve a pedir los
   * datos sin recargar la página, así que no se pierde lo que haya a medio
   * escribir ni lo que haya abierto.
   *
   * Solo si ha estado fuera un rato: cambiar a WhatsApp a copiar algo y volver
   * no merece una ronda de consultas. Y sin línea no, que el plan B de Next al
   * fallar es recargar la página entera.
   */
  useEffect(() => {
    let seFueA = 0;
    const alCambiar = () => {
      if (document.visibilityState === "hidden") {
        seFueA = Date.now();
        return;
      }
      const fuera = seFueA ? Date.now() - seFueA : 0;
      seFueA = 0;
      if (fuera < AL_VOLVER.minimoFuera || !navigator.onLine) return;
      // Lo que quedara en la cola va primero: así lo que se pinta ya lo lleva
      subir().finally(() => router.refresh());
    };

    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, [router, subir]);

  /**
   * Sin conexión, los enlaces se pulsan a lo bruto: recargando la página.
   *
   * Por dentro Next cambia de pantalla sin recargar, pidiendo solo el trozo
   * que cambia, y ese trozo no está guardado. Tiene su propio plan B, pero
   * depende de cómo falle la petición; esto lo hace seguro: **sin línea, cada
   * enlace es una carga de página entera**, que es justo lo que el service
   * worker sabe servir de lo guardado.
   */
  useEffect(() => {
    const alPulsar = (evento: MouseEvent) => {
      if (navigator.onLine || evento.defaultPrevented) return;
      if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;

      const enlace = (evento.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!enlace || enlace.hasAttribute("download")) return;
      if (enlace.target && enlace.target !== "_self") return;

      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      // Un ancla dentro de la misma pantalla no es navegar
      if (destino.pathname === window.location.pathname && destino.hash) return;

      evento.preventDefault();
      evento.stopPropagation();
      window.location.assign(destino.href);
    };

    // En captura: hay que adelantarse al que trae Next
    document.addEventListener("click", alPulsar, true);
    return () => document.removeEventListener("click", alPulsar, true);
  }, []);

  if (hayLinea && !pendientes && !recien) return null;

  return (
    <div
      className={cx(
        // Abajo y no arriba: arriba taparía el selector de edición, y abajo es
        // donde ya se mira. A la derecha se le deja sitio al botón de apuntar
        "pointer-events-none fixed inset-x-0 z-40 px-3 pr-20 lg:pr-3",
        "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6",
      )}
      role="status"
    >
      <div
        className={cx(
          "pointer-events-auto mr-auto flex max-w-md items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur lg:mx-auto",
          !hayLinea
            ? "border-amber-400/30 bg-amber-950/80 text-amber-200"
            : pendientes
              ? "border-brand-500/30 bg-brand-950/85 text-brand-100"
              : "border-emerald-400/30 bg-emerald-950/85 text-emerald-200",
        )}
      >
        <span aria-hidden>{!hayLinea ? "📴" : pendientes ? "⏫" : "✅"}</span>
        <span className="min-w-0 flex-1">
          {!hayLinea ? (
            <>
              <strong className="font-semibold">Sin conexión.</strong> Lo que ves
              es de la última vez
              {pendientes ? ` · ${cuantos(pendientes)} sin subir` : ""}.
            </>
          ) : pendientes ? (
            <>
              {cuantos(pendientes)} esperando a subirse
              {subiendo ? "…" : "."}
            </>
          ) : (
            <>Subido{recien > 1 ? `s ${recien} apuntes` : ""}.</>
          )}
        </span>
        {hayLinea && pendientes > 0 && !subiendo ? (
          <button
            type="button"
            onClick={subir}
            className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-semibold hover:bg-white/20"
          >
            Subir ya
          </button>
        ) : null}
      </div>
    </div>
  );
}

function cuantos(n: number) {
  return n === 1 ? "1 apunte" : `${n} apuntes`;
}

/** Cada cuánto se vuelven a guardar las pantallas del menú. */
const CADA_CUANTO = {
  llave: "hexaapp.precalentado",
  milisegundos: 10 * 60 * 1000,
};

/** Cuánto tiene que estar la aplicación de fondo para refrescarla al volver. */
const AL_VOLVER = {
  minimoFuera: 30 * 1000,
};
