"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Esconder o enseñar el compañero de la cabecera (ver lib/companero.ts). En
 * una cookie y no en localStorage por lo mismo que los sprites: el servidor
 * pinta la cabecera, y así no sale para desaparecer al momento.
 */
export function InterruptorDelCompanero({ puesto, cookie }: { puesto: boolean; cookie: string }) {
  const router = useRouter();
  const [marcado, setMarcado] = useState(puesto);
  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-brand-500"
        checked={marcado}
        onChange={(evento) => {
          const nuevo = evento.target.checked;
          setMarcado(nuevo);
          document.cookie = nuevo
            ? `${cookie}=; path=/; max-age=0; samesite=lax`
            : `${cookie}=no; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      />
      <span>
        <span className="font-semibold text-white">Que te acompañe arriba</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          Tu as, con su icono de caja, al lado de tu avatar. Salta cuando ganas, se pone triste
          si cae uno de los tuyos y grita si lo tocas. Solo en este dispositivo.
        </span>
      </span>
    </label>
  );
}
