import Link from "next/link";

export function NoCompetition({ canCreate }: { canCreate: boolean }) {
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
