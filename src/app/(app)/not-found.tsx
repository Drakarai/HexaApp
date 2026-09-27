import Link from "next/link";
import { Icono } from "@/components/icono";

/**
 * Para los `notFound()` de dentro de la aplicación: el perfil de un jugador que
 * ya no existe, una edición borrada. Se pinta dentro de la barra de navegación,
 * así que se puede seguir a otro sitio sin dar marcha atrás.
 */
export default function NoEncontrado() {
  return (
    <section className="card mx-auto max-w-lg text-center">
      <p className="text-4xl" aria-hidden>
        <Icono emoji="🔍" />
      </p>
      <h1 className="section-title mt-3">Aquí no hay nada</h1>
      <p className="muted mt-2">
        Esa página no existe, o lo que buscabas se borró. Pasa con los enlaces
        viejos.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">
          Ir al resumen
        </Link>
        <Link href="/puntos" className="btn-ghost">
          Ver la clasificación
        </Link>
      </div>
    </section>
  );
}
