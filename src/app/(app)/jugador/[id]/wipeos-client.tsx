"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  apuntarWipeoAction,
  perderElLockeAction,
  quitarWipeoAction,
} from "@/app/actions/wipeos";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { Icono } from "@/components/icono";

export type WipeoVista = {
  id: string;
  ocurridoAt: string;
  contra: string | null;
  notas: string | null;
};

/**
 * Los wipeos de un jugador: la cuenta, la lista y el formulario de apuntar.
 *
 * Se ponen **sin límite** y se quitan de una en una, que es lo que hace falta
 * cuando alguien apunta uno por error. Perder el locke es otra cosa: el propio
 * jugador lo dice aquí abajo, con «He perdido el locke», cuando wipea y decide
 * no seguir (y quien administra, desde *Competiciones*).
 */
export function Wipeos({
  participantId,
  nombre,
  wipeos,
  editable,
  perderLocke = null,
}: {
  participantId: string;
  nombre: string;
  wipeos: WipeoVista[];
  /** Si quien mira es el propio jugador o administra el locke */
  editable: boolean;
  /** Si sale «He perdido el locke» (solo al propio jugador), y si ya lo dio por perdido */
  perderLocke?: { perdido: boolean } | null;
}) {
  const [estado, apuntar] = useActionState<FormState, FormData>(
    apuntarWipeoAction,
    null,
  );
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.success) {
      formRef.current?.reset();
      setAbierto(false);
    }
  }, [estado]);

  return (
    <section className="card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">Wipeos</h2>
        <span className="text-sm font-semibold text-red-400">
          {wipeos.length === 0
            ? "ninguno"
            : `${wipeos.length} ${wipeos.length === 1 ? "vez" : "veces"}`}
        </span>
      </div>
      <p className="muted mb-4">
        Las veces que le han barrido el equipo entero en un combate. Es una
        marca, no una expulsión: perder el locke se decide aparte.
      </p>

      {wipeos.length ? (
        <ul className="mb-4 space-y-2">
          {wipeos.map((wipeo) => (
            <li
              key={wipeo.id}
              className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2"
            >
              <span aria-hidden className="text-base leading-6">
                <Icono emoji="💥" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200">
                  {wipeo.contra ? (
                    <>
                      Contra <strong>{wipeo.contra}</strong>
                    </>
                  ) : (
                    "Wipeo"
                  )}
                  <span className="ml-2 text-xs text-slate-500">
                    {wipeo.ocurridoAt}
                  </span>
                </p>
                {wipeo.notas ? (
                  <p className="mt-0.5 text-xs text-slate-400">{wipeo.notas}</p>
                ) : null}
              </div>
              {editable ? (
                <form action={quitarWipeoAction}>
                  <input type="hidden" name="wipeoId" value={wipeo.id} />
                  <ConfirmSubmit
                    className="btn-ghost btn-sm text-slate-500"
                    message="¿Quitar esta marca? Se apunta y se quita sin más: es para corregir un error."
                  >
                    ✕
                  </ConfirmSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {editable ? (
        abierto ? (
          <form ref={formRef} action={apuntar} className="space-y-3">
            <input type="hidden" name="participantId" value={participantId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Contra qué o quién</label>
                <input
                  name="contra"
                  className="input"
                  placeholder="Bruno, el líder del 4º gimnasio…"
                />
              </div>
              <div>
                <label className="label">Cuándo</label>
                <input name="ocurridoAt" type="date" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Qué pasó (opcional)</label>
              <textarea name="notas" className="textarea" rows={2} />
            </div>
            <FormMessage state={estado} />
            <div className="flex flex-wrap gap-2">
              <SubmitButton className="btn-primary btn-sm">
                <Icono emoji="💥" /> Apuntar el wipeo
              </SubmitButton>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setAbierto(false)}
              >
                Dejarlo
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setAbierto(true)}
          >
            ＋ Apuntar un wipeo de {nombre}
          </button>
        )
      ) : null}

      {perderLocke ? (
        <form action={perderElLockeAction} className="mt-4 border-t border-white/10 pt-3">
          <input type="hidden" name="participantId" value={participantId} />
          {perderLocke.perdido ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 text-sm text-red-300">
                <Icono emoji="💥" /> Diste este locke por perdido.
              </p>
              <ConfirmSubmit
                className="btn-ghost btn-sm"
                message="¿Vuelves al locke? Los combates que ya se dieron por perdidos se quedan como están."
              >
                Lo retomo
              </ConfirmSubmit>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 text-xs text-slate-400">
                ¿Has wipeado y no vas a seguir? Dalo por perdido: quedas fuera y
                tus combates sin jugar los gana el rival.
              </p>
              <ConfirmSubmit
                className="btn-ghost btn-sm text-red-300"
                message="¿Das el locke por perdido? Quedas fuera: tus combates sin jugar los gana tu rival y, si manda pasarse el juego, el título es suyo. Se puede deshacer."
              >
                <Icono emoji="💥" /> He perdido el locke
              </ConfirmSubmit>
            </div>
          )}
        </form>
      ) : null}
    </section>
  );
}
