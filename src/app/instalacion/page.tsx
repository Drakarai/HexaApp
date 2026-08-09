import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Instalación" };

// Hay que consultar la base de datos en cada visita: si no, Next serviría una
// versión guardada de la página y seguiría ofreciendo crear el administrador
// después de haberlo creado.
export const dynamic = "force-dynamic";

/**
 * Primera pantalla al abrir una aplicación recién desplegada: crea la cuenta
 * de administrador. Deja de estar disponible en cuanto existe un usuario.
 */
export default async function SetupPage() {
  const users = await prisma.user.count();
  if (users > 0) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-4xl" aria-hidden>
            ⬢
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Bienvenido a HexaApp
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            No hay ninguna cuenta todavía. Crea la tuya: será la de
            administrador, la que manda en todo.
          </p>
        </div>
        <div className="card">
          <SetupForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Después podrás crear las cuentas de los demás jugadores desde
          Administración.
        </p>
      </div>
    </main>
  );
}
