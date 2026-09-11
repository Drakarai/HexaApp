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
export function EstadoDeConexion() {
  const router = useRouter();
  const [hayLinea, setHayLinea] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [recien, setRecien] = useState(0);

  const contar = useCallback(() => setPendientes(leerCola().length), []);

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
    };
    const se_va = () => setHayLinea(false);

    window.addEventListener("online", vuelve);
    window.addEventListener("offline", se_va);
    const dejarDeEscuchar = alCambiarLaCola(contar);

    // Al abrir la aplicación, lo que quedara de la última vez
    if (navigator.onLine) subir();

    return () => {
      window.removeEventListener("online", vuelve);
      window.removeEventListener("offline", se_va);
      dejarDeEscuchar();
    };
  }, [contar, subir]);

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
