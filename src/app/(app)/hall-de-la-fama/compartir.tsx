"use client";

import { useState } from "react";
import { Icono } from "@/components/icono";
import { compartirImagen } from "@/lib/compartir-imagen";

/**
 * La imagen del resumen del locke (ver `api/resumen`), con su botón de
 * mandarla. En el móvil abre el menú de compartir del sistema, que es el que
 * lleva al grupo de WhatsApp; donde no lo hay —casi todos los ordenadores—, se
 * descarga y ya se pega a mano.
 */
export function CompartirResumen({
  url,
  fichero,
  titulo,
  alto = 1350,
}: {
  url: string;
  /** Alto de la imagen: la de un locke en solitario es cuadrada */
  alto?: number;
  /** Con qué nombre se guarda: "resumen-hexalocke-2.png" */
  fichero: string;
  titulo: string;
}) {
  const [haciendo, setHaciendo] = useState<"compartir" | "descargar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hacer(que: "compartir" | "descargar") {
    setHaciendo(que);
    setError(null);
    setError(await compartirImagen(url, fichero, titulo, que));
    setHaciendo(null);
  }

  return (
    <section className="card mb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mx-auto block w-44 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:mx-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- es una imagen generada, no hay nada que optimizar */}
          <img src={url} alt={`Resumen de ${titulo}`} width={1080} height={alto} loading="lazy" className="h-auto w-full" />
        </a>
        <div className="min-w-0 flex-1">
          <h2 className="section-title mb-1">Para el grupo</h2>
          <p className="muted mb-4">
            El locke entero en una imagen: el campeón con su equipo, el podio, las
            cifras y quién se llevó cada mención. Lista para mandarla.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={haciendo !== null}
              onClick={() => hacer("compartir")}
            >
              <Icono emoji="📤" /> {haciendo === "compartir" ? "Preparando…" : "Compartir"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={haciendo !== null}
              onClick={() => hacer("descargar")}
            >
              <Icono emoji="⬇️" /> {haciendo === "descargar" ? "Preparando…" : "Descargar"}
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
