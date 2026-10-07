"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CLAVE_DEL_PASEO } from "@/components/companero";

/**
 * Esconder o enseñar el compañero de la cabecera (ver lib/companero.ts). En
 * una cookie y no en localStorage por lo mismo que los sprites: el servidor
 * pinta la cabecera, y así no sale para desaparecer al momento.
 *
 * El paseo, en cambio, es cosa solo del navegador: va en localStorage.
 */
export function InterruptorDelCompanero({ puesto, cookie }: { puesto: boolean; cookie: string }) {
  const router = useRouter();
  const [marcado, setMarcado] = useState(puesto);
  const [paseo, setPaseo] = useState(true);
  useEffect(() => {
    try {
      setPaseo(localStorage.getItem(CLAVE_DEL_PASEO) !== '"no"');
    } catch {
      // sin almacenamiento, se queda puesto
    }
  }, []);

  return (
    <div className="mt-4 space-y-2">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
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
            Tu as, con su icono de caja, al lado de tu avatar. Tócale y te dirá algo de lo suyo o
            de cómo va el locke. Salta cuando ganas, se pone triste si cae uno de los tuyos y de
            noche duerme. Solo en este dispositivo.
          </span>
        </span>
      </label>
      {marcado ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-brand-500"
            checked={paseo}
            onChange={(evento) => {
              setPaseo(evento.target.checked);
              try {
                localStorage.setItem(CLAVE_DEL_PASEO, JSON.stringify(evento.target.checked ? "si" : "no"));
              } catch {
                // sin almacenamiento no se puede guardar: se queda como estaba
              }
            }}
          />
          <span>
            <span className="font-semibold text-white">Que se dé un paseo de vez en cuando</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Baja, cruza la pantalla por abajo y vuelve a su sitio. De prueba: si molesta, se quita aquí.
            </span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
