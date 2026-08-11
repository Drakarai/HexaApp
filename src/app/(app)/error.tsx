"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Cuando algo falla dentro de la aplicación. Antes salía la pantalla gris de
 * Next, en inglés y sin barra de navegación, así que no había ni forma de
 * volver: solo quedaba darle a atrás.
 *
 * El `digest` es el código con el que Next apunta el fallo en sus registros. En
 * producción el mensaje de verdad no llega al navegador —para no enseñar las
 * tripas—, así que ese código es lo único que sirve para buscarlo luego.
 */
export default function ErrorDeLaAplicacion({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="card mx-auto max-w-lg text-center">
      <p className="text-4xl" aria-hidden>
        💥
      </p>
      <h1 className="section-title mt-3">Se ha roto algo</h1>
      <p className="muted mt-2">
        No es culpa tuya. Prueba a reintentar; si vuelve a pasar, cuéntalo con
        lo que estabas haciendo.
      </p>

      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-slate-600">
          Código del fallo: {error.digest}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-primary" onClick={reset}>
          Reintentar
        </button>
        <Link href="/" className="btn-ghost">
          Volver al resumen
        </Link>
      </div>
    </section>
  );
}
