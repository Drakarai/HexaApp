"use client";

import { useActionState, useEffect, useState } from "react";
import { enlacePublicoAction } from "@/app/actions/competitions";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { Icono } from "@/components/icono";

/**
 * El enlace público de la clasificación, en los ajustes de la edición: crearlo,
 * copiarlo, cambiarlo (que corta el acceso a quien tuviera el de antes) o
 * quitarlo. Ver `app/clasificacion/[clave]`.
 */
export function EnlacePublico({ competitionId, clave }: { competitionId: string; clave: string | null }) {
  const [estado, accion] = useActionState<FormState, FormData>(enlacePublicoAction, null);
  const [copiado, setCopiado] = useState(false);
  // La dirección completa necesita saber dónde está la app: eso solo lo sabe el navegador
  const [origen, setOrigen] = useState("");
  useEffect(() => setOrigen(window.location.origin), []);
  const enlace = clave ? `${origen}/clasificacion/${clave}` : null;

  async function copiar() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: el enlace está a la vista para copiarlo a mano
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-semibold text-slate-200">Enlace público de la clasificación</p>
      <p className="mb-3 mt-1 text-xs text-slate-400">
        Para que la siga gente de fuera sin cuenta. Solo enseña la tabla: ni fotos, ni equipos, ni mapas.
      </p>

      {enlace ? (
        <div className="mb-3 flex items-center gap-2">
          <input readOnly value={enlace} className="input min-w-0 flex-1 text-xs" onFocus={(e) => e.target.select()} aria-label="Enlace público" />
          <button type="button" onClick={copiar} className="btn-ghost btn-sm shrink-0">
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      ) : null}

      <form action={accion} className="flex flex-wrap gap-2">
        <input type="hidden" name="competitionId" value={competitionId} />
        {clave ? (
          <>
            <SubmitButton
              name="que"
              value="cambiar"
              className="btn-ghost btn-sm"
              onClick={(evento) => {
                if (!confirm("¿Cambiar el enlace? El de ahora dejará de funcionar para quien lo tenga.")) evento.preventDefault();
              }}
            >
              <Icono emoji="🔁" /> Cambiar el enlace
            </SubmitButton>
            <SubmitButton name="que" value="quitar" className="btn-ghost btn-sm text-red-300">
              Quitarlo
            </SubmitButton>
          </>
        ) : (
          <SubmitButton name="que" value="crear" className="btn-ghost btn-sm">
            <Icono emoji="🔗" /> Crear el enlace
          </SubmitButton>
        )}
      </form>
      <FormMessage state={estado} />
    </div>
  );
}
