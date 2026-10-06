"use client";

import { createContext, useContext } from "react";

/**
 * Si el locke que se está mirando es de **Pokémon Añil** (ver lib/anil.ts): lo
 * pone el layout, como el estilo de sprites, y lo leen el buscador de especies
 * y la ficha de combate, que salen en una docena de pantallas y no saben de qué
 * locke son. Así Royaleon, Cefireon y los movimientos de Añil solo se ofrecen
 * donde existen.
 */
const EsAnil = createContext(false);

export function ProveedorDelJuego({ anil, children }: { anil: boolean; children: React.ReactNode }) {
  return <EsAnil.Provider value={anil}>{children}</EsAnil.Provider>;
}

export function useEsAnil() {
  return useContext(EsAnil);
}
