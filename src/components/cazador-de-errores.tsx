"use client";

import { useEffect } from "react";
import { avisarDeUnError } from "@/lib/avisar-de-errores";

/**
 * Escucha lo que se rompe en el navegador de cada uno —un fallo de JavaScript
 * suelto o una promesa que revienta sin que nadie la recoja— y lo manda al
 * registro de errores. Lo que se rompe al pintar una pantalla lo manda la
 * propia pantalla de error (`(app)/error.tsx`).
 */
export function CazadorDeErrores() {
  useEffect(() => {
    const alFallar = (evento: ErrorEvent) => {
      avisarDeUnError(evento.message || "Error sin mensaje", evento.error?.stack ?? `${evento.filename}:${evento.lineno}`);
    };
    const alRechazar = (evento: PromiseRejectionEvent) => {
      const razon = evento.reason as Error | string | undefined;
      avisarDeUnError(
        typeof razon === "string" ? razon : (razon?.message ?? "Promesa rechazada"),
        typeof razon === "object" ? (razon?.stack ?? null) : null,
      );
    };
    window.addEventListener("error", alFallar);
    window.addEventListener("unhandledrejection", alRechazar);
    return () => {
      window.removeEventListener("error", alFallar);
      window.removeEventListener("unhandledrejection", alRechazar);
    };
  }, []);
  return null;
}
