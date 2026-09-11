"use client";

import {
  datosDelFormulario,
  encolar,
  type TipoDeApunte,
} from "@/lib/cola";
import type { FormState } from "@/app/actions/auth";

/**
 * Envuelve un formulario para que funcione sin conexión.
 *
 * Con línea no cambia nada: se manda al servidor como siempre. Sin línea —o
 * si el envío se queda por el camino, que es lo que pasa de verdad con dos
 * rayas de cobertura— el apunte se guarda en el móvil y se sube solo después.
 *
 * El mensaje que devuelve **nunca dice "guardado"**: dice que está pendiente.
 * Mentir aquí sería la peor forma de perder una captura.
 */

type Accion = (prev: FormState, formData: FormData) => Promise<FormState>;

export function conCola(
  accion: Accion,
  tipo: TipoDeApunte,
  /** Cómo se lee el apunte en la lista de pendientes */
  resumen: (formData: FormData) => string,
  /** Campos que el formulario no lleva y hacen falta al subirlo */
  extra?: (formData: FormData) => Record<string, string>,
): Accion {
  return async (prev, formData) => {
    if (sinLinea()) return aLaCola(tipo, formData, resumen, extra);

    try {
      return await accion(prev, formData);
    } catch (error) {
      // Un error del servidor (una regla, un permiso) no se encola: se enseña
      if (!pareceCorteDeRed(error)) throw error;
      return aLaCola(tipo, formData, resumen, extra);
    }
  };
}

function aLaCola(
  tipo: TipoDeApunte,
  formData: FormData,
  resumen: (formData: FormData) => string,
  extra?: (formData: FormData) => Record<string, string>,
): FormState {
  const datos = { ...datosDelFormulario(formData), ...(extra?.(formData) ?? {}) };
  encolar(tipo, datos, resumen(formData));
  return {
    success: "Sin conexión: guardado en el móvil. Se subirá solo al volver la línea.",
  };
}

function sinLinea() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Si el envío no llegó a salir. Un `TypeError` es lo que suelta el navegador
 * cuando la petición no sale; el resto de errores son del servidor y hay que
 * enseñarlos tal cual, no esconderlos en una cola.
 */
function pareceCorteDeRed(error: unknown) {
  if (error instanceof TypeError) return true;
  const texto = error instanceof Error ? error.message.toLowerCase() : "";
  return texto.includes("fetch") || texto.includes("network") || texto.includes("load failed");
}
