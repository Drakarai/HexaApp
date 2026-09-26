import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LoginForm } from "./login-form";
import { OlvidarLoGuardado } from "@/components/service-worker";
import { destinoSeguro } from "@/lib/volver";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string | string[] }>;
}) {
  // A dónde iba antes de que le pidieran entrar (ver lib/volver.ts)
  const volver = destinoSeguro((await searchParams).volver);

  const user = await getCurrentUser();
  if (user) redirect(volver);

  // Aplicación recién instalada: aún no hay ninguna cuenta que crear
  if ((await prisma.user.count()) === 0) redirect("/instalacion");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-4xl">⬢</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            HexaApp
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestor de lockes competitivos
          </p>
        </div>
        <div className="card">
          <LoginForm volver={volver} />
          {/* Aquí se acaba al cerrar sesión: fuera las pantallas guardadas */}
          <OlvidarLoGuardado />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          ¿No tienes cuenta? Pídesela a un administrador de la competición.
        </p>
      </div>
    </main>
  );
}
