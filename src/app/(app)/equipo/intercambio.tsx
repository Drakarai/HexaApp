"use client";

import { useState } from "react";
import { SpeciesPicker } from "@/components/species-picker";
import { Icono } from "@/components/icono";

/**
 * Cambiarlo a un entrenador del juego, de los que te dan otro a cambio del
 * tuyo. Plegado: no se hace casi nunca, y abierto se comería media ficha.
 * Quien llama hace el cambio (ver `intercambiarAction`), que es quien sabe de
 * avisos y de la cola sin conexión.
 */
export function Intercambio({
  nombre,
  ocupado,
  onIntercambiar,
}: {
  /** El mote, o la especie si no tiene */
  nombre: string;
  ocupado: boolean;
  onIntercambiar: (datos: { species: string; pokemonId: number | null; nickname: string; shiny: boolean }) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  // Se remonta al terminar para vaciar el buscador, que lleva su estado
  const [vuelta, setVuelta] = useState(0);

  if (!abierto) {
    return (
      <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => setAbierto(true)}>
        <Icono emoji="🔁" /> Intercambiar…
      </button>
    );
  }

  return (
    <form
      key={vuelta}
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        const species = String(datos.get("species") ?? "").trim();
        if (!species) return;
        if (!window.confirm(`¿Cambiar a ${nombre} por ${species}? ${nombre} se va de tu caja. Se puede deshacer.`)) {
          return;
        }
        const id = Number(datos.get("pokemonId") ?? "");
        onIntercambiar({
          species,
          pokemonId: Number.isInteger(id) && id > 0 ? id : null,
          nickname: String(datos.get("nickname") ?? ""),
          shiny: datos.get("shiny") === "on",
        });
        setAbierto(false);
        setVuelta((v) => v + 1);
      }}
    >
      <p className="text-sm text-slate-300">
        Lo que te dan a cambio de <strong className="text-white">{nombre}</strong>. Se queda con su hueco,
        su ruta y su vínculo.
      </p>
      <SpeciesPicker />
      <div>
        <label className="label">Mote (opcional)</label>
        <input name="nickname" className="input" maxLength={40} placeholder="El que trae del otro entrenador" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={ocupado}>
          <Icono emoji="🔁" /> Intercambiar
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
