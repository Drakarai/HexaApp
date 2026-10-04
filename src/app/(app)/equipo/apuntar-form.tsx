"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { apuntarEnCajaAction } from "@/app/actions/equipo-y-caja";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { SitioPicker } from "@/components/sitio-picker";
import type { ZonaParaElegir } from "@/lib/mapas";
import { conCola } from "@/lib/acciones-sin-conexion";
import { Pendientes } from "@/components/pendientes";

export type SueltoParaVincular = {
  id: string;
  participantId: string;
  rotulo: string;
};

/**
 * Apuntar una captura desde el Equipo y PC. Es lo que hace falta en un juego
 * sin mapa (un fangame desde cero), pero vale igual con mapa: la ruta se elige
 * de la lista y la captura sale también en el Mapa de capturas.
 *
 * El vínculo se busca solo por la ruta; el desplegable de "vincular con" es
 * para cuando no coincide lo escrito ("Ruta 1" y "ruta uno") o para elegir a
 * mano cuál de los sueltos de otro va con este.
 */
export function ApuntarEnCaja({
  zonas,
  jugadores,
  miId,
  sueltos,
  esSoulLink,
  abierto,
  competitionId,
}: {
  zonas: ZonaParaElegir[];
  /** A quién se le puede apuntar: uno mismo o, quien administra, cualquiera */
  jugadores: { id: string; displayName: string }[];
  miId: string | null;
  sueltos: SueltoParaVincular[];
  esSoulLink: boolean;
  abierto: boolean;
  /** Para la cola sin conexión: lo apuntado va a este locke aunque se cambie */
  competitionId: string;
}) {
  /**
   * Una captura se apunta donde se juega, que es donde falta la cobertura: sin
   * línea se queda en el móvil y sube sola, como las del mapa.
   */
  const apuntar = useMemo(
    () =>
      conCola(
        apuntarEnCajaAction,
        "caja",
        (formData) => {
          const especie = String(formData.get("species") ?? "").trim() || "Pokémon";
          const ruta = String(formData.get("location") ?? "").trim();
          return ruta ? `${especie} · ${ruta}` : especie;
        },
        () => ({ competitionId }),
      ),
    [competitionId],
  );
  const [state, formAction] = useActionState<FormState, FormData>(apuntar, null);
  const [para, setPara] = useState(miId ?? jugadores[0]?.id ?? "");
  // Se remonta tras guardar para vaciar el buscador de especie, que lleva su estado
  const [vuelta, setVuelta] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setVuelta((v) => v + 1);
    }
  }, [state]);

  const deOtros = sueltos.filter((s) => s.participantId !== para);

  return (
    <details className="card group" open={abierto}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Apuntar una captura
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        {jugadores.length > 1 ? (
          <div>
            <label className="label">Para</label>
            <select
              name="participantId"
              className="input"
              value={para}
              onChange={(evento) => setPara(evento.target.value)}
            >
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.displayName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="participantId" value={para} />
        )}

        <SpeciesPicker key={vuelta} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Mote</label>
            <input name="nickname" className="input" maxLength={40} placeholder="Opcional" />
          </div>
          <SitioPicker
            key={`sitio-${vuelta}`}
            zonas={zonas}
            label="Ruta"
            placeholder="Ruta 1, Bosque Verde…"
          />
        </div>

        <div>
          <label className="label">Apunte (opcional)</label>
          <input
            name="notes"
            className="input"
            maxLength={120}
            placeholder="2ª captura, huevo de regalo, intercambio…"
          />
        </div>

        {esSoulLink && deOtros.length ? (
          <div>
            <label className="label">Vincular con</label>
            <select name="vincularCon" className="input" defaultValue="" key={`con-${vuelta}-${para}`}>
              <option value="">Solo, por la ruta</option>
              {deOtros.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rotulo}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Si otro ya capturó en la misma ruta, se vinculan solos. Esto es para
              elegirlo a mano.
            </p>
          </div>
        ) : null}

        <FormMessage state={state} />
        <SubmitButton>Apuntar</SubmitButton>
      </form>

      <Pendientes tipo="caja" />
    </details>
  );
}
