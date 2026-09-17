"use client";

import { useState } from "react";

/**
 * Lo que se le puede hacer a un jugador —retirarlo, darle el locke por perdido,
 * sacarlo de la edición—, guardado detrás de un botón.
 *
 * Estaban los tres a la vista, uno al lado del otro y en ámbar y rojo: con seis
 * jugadores eran dieciocho botones de aviso en una pantalla donde lo que se
 * hace casi siempre es mirar quién juega. Y son cosas de una vez en todo el
 * locke, no del día a día.
 *
 * Lo de dentro llega ya montado desde el servidor (los formularios con sus
 * acciones): esto solo decide si se ve.
 */
export function AccionesDeJugador({
  nombre,
  children,
}: {
  /** Para que el botón diga de quién son las acciones, y no solo "⋯" */
  nombre: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn-ghost btn-sm mt-2"
        title={`Retirar, dar por perdido o sacar a ${nombre}`}
      >
        ⋯ Más
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
      {children}
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="btn-ghost btn-sm ml-auto text-slate-500"
      >
        Cerrar
      </button>
    </div>
  );
}
