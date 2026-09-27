"use client";

import { useState } from "react";
import { Icono } from "@/components/icono";

/**
 * Tu nombre de usuario con un botón de copiarlo. Es lo que le tienes que pasar
 * a quien organiza para que te apunte, y copiarlo evita el clásico "¿era con
 * mayúscula?" por el grupo.
 */
export function UsuarioCopiable({ username }: { username: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(username);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles (algunos navegadores sin https): el
      // usuario sigue ahí escrito para copiarlo a mano
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex items-center gap-2 rounded-lg border border-brand-400/30 bg-brand-600/10 px-3 py-1.5 font-mono text-sm text-brand-100 transition hover:bg-brand-600/20"
      title="Copiar tu usuario"
    >
      @{username}
      <span className="text-xs text-brand-300">
        {copiado ? "✓ Copiado" : <Icono emoji="📋" />}
      </span>
    </button>
  );
}
