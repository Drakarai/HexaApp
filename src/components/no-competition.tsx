import Link from "next/link";
import { prisma } from "@/lib/db";

/**
 * Lo que se ve cuando no hay ninguna edición delante. Son dos situaciones
 * distintas y decir lo mismo en las dos confunde: o no existe todavía ninguna,
 * o existen pero ninguna es tuya. En el segundo caso lo que hay que hacer no es
 * crear nada, sino pedir que te dejen entrar.
 */
export async function NoCompetition({ canCreate }: { canCreate: boolean }) {
  const hayAlguna = (await prisma.competition.count()) > 0;

  if (hayAlguna && !canCreate) {
    return (
      <div className="card text-center">
        <p className="text-4xl" aria-hidden>
          🔒
        </p>
        <h2 className="mt-3 text-lg font-semibold text-white">
          Aquí no hay nada tuyo
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          Los lockes solo los ven quienes los juegan o los han jugado. Si
          quieres seguir uno desde fuera, pídele a un administrador que te dé
          acceso de espectador.
        </p>
      </div>
    );
  }

  return (
    <div className="card text-center">
      <p className="text-4xl" aria-hidden>
        🗂️
      </p>
      <h2 className="mt-3 text-lg font-semibold text-white">
        Todavía no hay ninguna competición
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
        {canCreate
          ? "Crea la primera competición para empezar a cargar reglas, level caps y jugadores."
          : "Pídele a un administrador que cree una competición y te añada como jugador."}
      </p>
      {canCreate ? (
        <Link href="/competiciones" className="btn-primary mt-5">
          Crear competición
        </Link>
      ) : null}
    </div>
  );
}
