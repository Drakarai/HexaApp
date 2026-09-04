"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { marcarVistaAction } from "@/app/actions/novedades";

/**
 * Apunta la visita a una pestaña para que su punto de novedades se apague.
 *
 * Va aquí, en el layout, y no en cada página: así una sección nueva entra sola
 * en el sistema con solo estar en el menú, sin que haya que acordarse de poner
 * nada dentro de ella.
 *
 * Solo escribe cuando esa pestaña **tiene aviso encendido**. Si no lo tiene, no
 * hay nada que apagar y guardar la fecha en cada paso de página sería escribir
 * en la base de datos para nada.
 */

/**
 * Las que ya se han apuntado en esta carga de la página. Vive fuera del
 * componente porque una revalidación lo puede volver a montar, y sin esto la
 * misma visita se guardaría varias veces.
 */
const yaApuntadas = new Set<string>();

export function MarcarVisto({
  /** De qué grupo del menú es cada dirección: { "/jornadas": "Combates", … } */
  rutas,
  avisos,
}: {
  rutas: Record<string, string>;
  avisos: Record<string, boolean>;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const entrada = Object.entries(rutas).find(([href]) =>
      pathname.startsWith(href),
    );
    const tab = entrada?.[1];
    if (!tab || !avisos[tab] || yaApuntadas.has(pathname)) return;

    yaApuntadas.add(pathname);
    void marcarVistaAction(tab);
  }, [pathname, rutas, avisos]);

  return null;
}
