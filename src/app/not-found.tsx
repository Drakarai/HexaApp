import Link from "next/link";
import { Icono } from "@/components/icono";

export const metadata = { title: "Página no encontrada" };

/**
 * Para direcciones que no son de ninguna sección. Va suelta, sin la barra de
 * navegación, porque a este punto se llega también sin haber iniciado sesión y
 * la barra necesita saber quién eres.
 */
export default function NoEncontradoGlobal() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl" aria-hidden>
        <Icono emoji="🧭" />
      </p>
      <h1 className="text-2xl font-bold text-white">Esta dirección no existe</h1>
      <p className="muted">
        Puede que el enlace esté mal escrito o que apunte a algo que ya no está.
      </p>
      <Link href="/" className="btn-primary">
        Volver al principio
      </Link>
    </main>
  );
}
