"use client";

import { useEffect, useState } from "react";
import {
  desbloquear,
  guardarPreferencia,
  leerPreferencia,
  sonarGrito,
  type PreferenciaDeGritos,
} from "@/lib/gritos";
import { cx } from "@/lib/utils";

const OPCIONES: { valor: PreferenciaDeGritos; nombre: string; detalle: string }[] = [
  {
    valor: "juego",
    nombre: "Los del juego",
    detalle: "Clásicos en los lockes hasta la 5ª generación; los de ahora en el resto.",
  },
  { valor: "clasicos", nombre: "Clásicos", detalle: "Los de siempre, de la Game Boy y la DS." },
  { valor: "actuales", nombre: "Actuales", detalle: "Los rehechos desde X e Y." },
  { valor: "no", nombre: "Sin gritos", detalle: "Que no suene nada." },
];

/**
 * Qué gritos suenan en este dispositivo. Va en el navegador y no en la cuenta
 * porque es cosa del aparato: en el móvil del trabajo apetece silencio y en
 * el de casa no.
 */
export function PreferenciaDeGritosPicker({ muestra }: { muestra: number }) {
  // Hasta montar no se sabe lo guardado: se pinta lo de por defecto
  const [actual, setActual] = useState<PreferenciaDeGritos>("juego");
  useEffect(() => setActual(leerPreferencia()), []);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          aria-pressed={actual === opcion.valor}
          onClick={() => {
            guardarPreferencia(opcion.valor);
            setActual(opcion.valor);
            // Para oír cómo suena lo elegido
            desbloquear();
            sonarGrito(muestra);
          }}
          className={cx(
            "rounded-xl border p-3 text-left transition",
            actual === opcion.valor
              ? "border-brand-400/60 bg-brand-600/15"
              : "border-white/10 bg-white/[0.02] hover:border-white/20",
          )}
        >
          <span className="block text-sm font-semibold text-white">{opcion.nombre}</span>
          <span className="mt-0.5 block text-xs text-slate-400">{opcion.detalle}</span>
        </button>
      ))}
    </div>
  );
}
