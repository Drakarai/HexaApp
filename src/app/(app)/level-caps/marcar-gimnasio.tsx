"use client";

import { useState, useTransition } from "react";
import { toggleGymClearAction } from "@/app/actions/level-caps";
import { encolar } from "@/lib/cola";
import { cx } from "@/lib/utils";

/**
 * La casilla de "me lo he pasado" de cada jugador en cada hito.
 *
 * Es un componente de cliente y no un formulario a secas **para que funcione
 * sin conexión**: si el envío no sale, se guarda en la cola del móvil y la
 * casilla se marca igual, con su puntito de "pendiente", para no tener que
 * acordarse luego de cuál era.
 *
 * A la cola no va "cámbialo" sino **cómo tiene que quedar**: si mientras tanto
 * lo marca un administrador desde su casa, al subirse esto no lo desmarca.
 */
export function MarcarGimnasio({
  levelCapId,
  participantId,
  nombre,
  color,
  hito,
  superado,
  editable,
  retirado,
  primero = false,
}: {
  levelCapId: string;
  participantId: string;
  nombre: string;
  color: string;
  /** Cómo se llama el gimnasio, para la lista de pendientes */
  hito: string;
  superado: boolean;
  editable: boolean;
  retirado: boolean;
  /** Se lo pasó antes que nadie: lleva la corona */
  primero?: boolean;
}) {
  const [enCola, setEnCola] = useState<boolean | null>(null);
  const [enviando, empezar] = useTransition();

  const marcado = enCola ?? superado;

  function alPulsar() {
    if (!editable) return;
    const quiero = !marcado;

    const datos = new FormData();
    datos.set("levelCapId", levelCapId);
    datos.set("participantId", participantId);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return aLaCola(quiero);
    }

    empezar(async () => {
      try {
        await toggleGymClearAction(datos);
      } catch {
        // Se cortó por el camino: no se pierde, se encola
        aLaCola(quiero);
      }
    });
  }

  function aLaCola(quiero: boolean) {
    encolar(
      "gimnasio",
      {
        levelCapId,
        participantId,
        estado: quiero ? "1" : "0",
      },
      `${hito} · ${nombre}${quiero ? "" : " (quitar)"}`,
    );
    setEnCola(quiero);
  }

  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={!editable || enviando}
      title={
        (primero ? `👑 ${nombre} fue el primero en pasárselo. ` : "") +
        (retirado
          ? `${nombre} se retiró del locke`
          : editable
            ? marcado
              ? "Marcar como no superado"
              : "Marcar como superado"
            : "Solo puedes marcar tus propios gimnasios")
      }
      className={cx(
        "chip transition",
        retirado
          ? "text-slate-500 line-through opacity-50"
          : marcado
            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
            : "opacity-70",
        editable ? "cursor-pointer hover:opacity-100" : "cursor-not-allowed",
        enCola !== null && "ring-1 ring-amber-400/50",
      )}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {/* Mientras está en la cola no se sabe si sigue siendo el primero */}
      {primero && enCola === null ? <span aria-hidden>👑</span> : null}
      {nombre}
      <span aria-hidden>
        {retirado ? "—" : enCola !== null ? "⏳" : marcado ? "✓" : "○"}
      </span>
    </button>
  );
}
