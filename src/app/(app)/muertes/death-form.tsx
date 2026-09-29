"use client";

import { useActionState, useMemo, useRef, useEffect, useState } from "react";
import { createDeathAction } from "@/app/actions/deaths";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { SitioPicker } from "@/components/sitio-picker";
import type { ZonaParaElegir } from "@/lib/mapas";
import { Pendientes } from "@/components/pendientes";
import { conCola } from "@/lib/acciones-sin-conexion";

export type CapturaQueCae = {
  id: string;
  participantId: string;
  /** "Chispa (Charmander) · Ruta 1" */
  rotulo: string;
};

export function NewDeathForm({
  participants,
  defaultParticipantId,
  lockedToParticipantId,
  zonas,
  capturas = [],
  enSoulLink = false,
  abiertoDeEntrada = false,
}: {
  participants: Array<{ id: string; displayName: string }>;
  defaultParticipantId: string;
  /** Si el usuario no es admin, solo puede registrar sus propias muertes. */
  lockedToParticipantId: string | null;
  /** Las zonas del mapa de esta región, para decir dónde cayó */
  zonas: ZonaParaElegir[];
  /**
   * Los pokémon vivos de la caja que quien apunta puede dar por muertos: los
   * suyos, y en un Soul Link también los de los demás si administra. Fuera del
   * Soul Link la caja es privada y aquí solo llegan los suyos.
   */
  capturas?: CapturaQueCae[];
  enSoulLink?: boolean;
  /** Llega con el formulario ya desplegado, desde el botón de apuntar */
  abiertoDeEntrada?: boolean;
}) {
  const [para, setPara] = useState(lockedToParticipantId ?? defaultParticipantId);
  const [deLaCaja, setDeLaCaja] = useState("");
  const suyas = capturas.filter((c) => c.participantId === para);
  const elegida = suyas.find((c) => c.id === deLaCaja) ?? null;
  /**
   * Una baja se apunta donde se juega, que muchas veces es donde no hay
   * cobertura. Si el envío no sale, se queda en la cola del móvil.
   */
  const registrar = useMemo(
    () =>
      conCola(createDeathAction, "baja", (formData) => {
        const captura = capturas.find((c) => c.id === formData.get("captureId"));
        if (captura) return captura.rotulo;
        const especie = String(formData.get("species") ?? "").trim();
        const mote = String(formData.get("nickname") ?? "").trim();
        return [mote || especie || "Un pokémon", mote && especie ? `(${especie})` : ""]
          .filter(Boolean)
          .join(" ");
      }),
    [capturas],
  );
  const [state, formAction] = useActionState<FormState, FormData>(registrar, null);
  const formRef = useRef<HTMLFormElement>(null);
  const detallesRef = useRef<HTMLDetailsElement>(null);
  // La clave fuerza a recrear el selector de imagen tras guardar, para que la
  // vista previa no se quede con el sprite de la baja anterior.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setResetKey((key) => key + 1);
      setDeLaCaja("");
    }
  }, [state]);

  // Viniendo del botón de apuntar el formulario ya está abierto, pero queda
  // debajo de los filtros de jugador: sin esto habría que buscarlo bajando.
  useEffect(() => {
    if (abiertoDeEntrada) {
      detallesRef.current?.scrollIntoView({ block: "center" });
    }
  }, [abiertoDeEntrada]);

  return (
    <details className="card group" open={abiertoDeEntrada} ref={detallesRef}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Registrar una baja
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        {lockedToParticipantId ? (
          <input
            type="hidden"
            name="participantId"
            value={lockedToParticipantId}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {lockedToParticipantId ? null : (
            <div>
              <label className="label">Jugador</label>
              <select
                name="participantId"
                className="input"
                value={para}
                onChange={(evento) => {
                  setPara(evento.target.value);
                  setDeLaCaja("");
                }}
              >
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}
          {suyas.length ? (
            <div>
              <label className="label">De la caja</label>
              <select
                name="captureId"
                className="input"
                value={deLaCaja}
                onChange={(evento) => setDeLaCaja(evento.target.value)}
              >
                <option value="">No, lo escribo</option>
                {suyas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {elegida ? null : (
            <div>
              <label className="label">Mote</label>
              <input name="nickname" className="input" placeholder="Chispas" />
            </div>
          )}
          <div>
            <label className="label">Causa (opcional)</label>
            <input name="cause" className="input" placeholder="Crítico de Scyther" />
          </div>
        </div>

        {/* Elegido de la caja, el pokémon, su mote y su ruta ya se saben */}
        {elegida ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
            Cae <strong className="text-white">{elegida.rotulo}</strong>
            {enSoulLink ? " y, por el vínculo, su pareja con él." : "."} Se quita de
            tu caja y se puede deshacer desde Equipo y PC.
          </p>
        ) : (
          <>
            <SitioPicker zonas={zonas} label="Dónde cayó (opcional)" />

            {/* La clave lo reinicia tras guardar, para que no se quede el pokémon
                anterior en el buscador ni en las vistas previas */}
            <SpeciesPicker key={resetKey} />
          </>
        )}

        <FormMessage state={state} />
        <SubmitButton>Registrar baja</SubmitButton>
      </form>

      <Pendientes tipo="baja" />
    </details>
  );
}
