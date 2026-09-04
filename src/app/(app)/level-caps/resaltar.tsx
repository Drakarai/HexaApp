"use client";

import { useEffect } from "react";

/**
 * Lleva la página hasta un gimnasio y lo enciende un momento.
 *
 * Se usa al llegar desde el botón de apuntar: la lista puede tener ocho o diez
 * gimnasios y el que te toca marcar suele estar por la mitad. El resalte dura
 * poco a propósito —solo hace falta para encontrarlo con la vista— y se quita
 * solo, sin dejar nada raro en la página.
 */
export function Resaltar({ id }: { id: string }) {
  useEffect(() => {
    const nodo = document.getElementById(id);
    if (!nodo) return;

    nodo.scrollIntoView({ behavior: "smooth", block: "center" });
    nodo.classList.add("ring-2", "ring-brand-400");
    const reloj = setTimeout(
      () => nodo.classList.remove("ring-2", "ring-brand-400"),
      2500,
    );
    return () => clearTimeout(reloj);
  }, [id]);

  return null;
}
