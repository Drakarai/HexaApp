"use client";

import { useState } from "react";
import { entregarPremioAction } from "@/app/actions/roulette";
import { SubmitButton } from "@/components/ui";

/**
 * A quién se le da lo que ha salido.
 *
 * Sale cuando gira la organización, que no está gastando el ticket de nadie y
 * por tanto la tirada todavía no es de nadie. Sirve también para corregir: dar
 * un premio a quien no era y darse cuenta al momento es justo lo que pasa, así
 * que un premio ya entregado se puede pasar a otro y la aplicación se encarga
 * de quitárselo al primero.
 */
export function EntregarPremio({
  spinId,
  premio,
  actual,
  jugadores,
}: {
  spinId: string;
  /** Lo que tocó, dicho en palabras */
  premio: string;
  /** A quién se le dio ya, si se le dio a alguien */
  actual: string | null;
  jugadores: Array<{ id: string; displayName: string }>;
}) {
  // Entregado y quieto: el desplegable solo estorba hasta que haga falta
  const [cambiando, setCambiando] = useState(false);

  if (actual && !cambiando) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-1"
        onClick={() => setCambiando(true)}
      >
        ✎ Dárselo a otro
      </button>
    );
  }

  if (!jugadores.length) {
    return (
      <p className="mt-1 text-xs text-slate-500">
        No hay jugadores a los que dárselo.
      </p>
    );
  }

  return (
    <form action={entregarPremioAction} className="mt-2 flex flex-wrap gap-2">
      <input type="hidden" name="spinId" value={spinId} />
      <select
        name="participantId"
        className="input h-8 w-auto flex-1 py-0 text-xs"
        defaultValue={actual ?? ""}
        aria-label={`A quién se le da ${premio}`}
      >
        <option value="" disabled>
          ¿Para quién es {premio}?
        </option>
        {jugadores.map((jugador) => (
          <option key={jugador.id} value={jugador.id}>
            {jugador.displayName}
          </option>
        ))}
      </select>
      <SubmitButton className="btn-ghost btn-sm">Dárselo</SubmitButton>
    </form>
  );
}
