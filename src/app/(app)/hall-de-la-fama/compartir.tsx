"use client";

import { useState } from "react";
import { Icono } from "@/components/icono";

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
}: {
  url: string;
  /** Con qué nombre se guarda: "resumen-hexalocke-2.png" */
  fichero: string;
  titulo: string;
}) {
  const [haciendo, setHaciendo] = useState<"compartir" | "descargar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function laImagen() {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error("No se ha podido hacer la imagen.");
    return new File([await respuesta.blob()], fichero, { type: "image/png" });
  }

  function descargar(imagen: File) {
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(imagen);
    enlace.download = fichero;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
  }

  async function hacer(que: "compartir" | "descargar") {
    setHaciendo(que);
    setError(null);
    try {
      const imagen = await laImagen();
      if (que === "compartir" && navigator.canShare?.({ files: [imagen] })) {
        await navigator.share({ files: [imagen], title: titulo });
      } else {
        descargar(imagen);
      }
    } catch (fallo) {
      // Cerrar el menú de compartir sin elegir nada no es un error
      if ((fallo as Error).name !== "AbortError") {
        setError((fallo as Error).message || "No se ha podido compartir.");
      }
    } finally {
      setHaciendo(null);
    }
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
          <img src={url} alt={`Resumen de ${titulo}`} width={1080} height={1350} loading="lazy" className="h-auto w-full" />
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
