import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

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
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          ¿No tienes cuenta? Pídesela a un administrador de la competición.
        </p>
      </div>
    </main>
  );
}
