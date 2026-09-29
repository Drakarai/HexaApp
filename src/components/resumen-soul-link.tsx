import Link from "next/link";
import { Avatar } from "@/components/ui";
import { Icono } from "@/components/icono";
import { colocar } from "@/lib/equipo-y-caja";
import type { EquiposDelLocke } from "@/lib/soul-link";

/**
 * La portada de un Soul Link.
 *
 * Donde en un locke de competir va la clasificación, aquí van **los equipos de
 * todos**: el de cada uno en una fila, cuántos lleva en la caja y cuántos ha
 * perdido, y si ya se ha pasado la Liga. No hay tabla porque no se compite;
 * lo que se mira es cómo va el grupo.
 */
export function ResumenSoulLink({
  equipos,
  liga,
}: {
  equipos: EquiposDelLocke;
  liga: { superada: boolean; jugadores: { id: string; ligaPasada: boolean }[] };
}) {
  const pasada = new Set(liga.jugadores.filter((j) => j.ligaPasada).map((j) => j.id));

  return (
    <>
      {liga.superada ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          <span aria-hidden>
            <Icono emoji="🏆" />
          </span>
          <span>
            <strong className="font-semibold">Soul Link superado.</strong> Os habéis
            pasado la Liga todos. Rellenad los equipos en el hall de la fama.
          </span>
        </p>
      ) : null}

      <ul className="space-y-3">
        {equipos.tableros.map((tablero) => {
          const { equipo } = colocar(tablero.vivos);
          const enCaja = tablero.vivos.length - equipo.filter(Boolean).length;
          return (
            <li key={tablero.participantId} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-2">
                <Avatar
                  name={tablero.displayName}
                  color={tablero.color}
                  image={tablero.avatarImage}
                  size={24}
                  participantId={tablero.participantId}
                />
                <span className="truncate text-sm font-medium text-white">{tablero.displayName}</span>
                {pasada.has(tablero.participantId) ? (
                  <span className="chip text-[10px]">
                    <Icono emoji="🏆" /> Liga
                  </span>
                ) : null}
                {tablero.fuera ? <span className="chip text-[10px]">Fuera</span> : null}
                <span className="ml-auto shrink-0 text-xs text-slate-500">
                  {enCaja} en caja · {tablero.caidos.length} caídos
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {equipo.map((pokemon, hueco) => (
                  <span
                    key={pokemon?.id ?? hueco}
                    className="flex aspect-square items-center justify-center rounded-lg border border-white/5 bg-ink-850"
                    title={pokemon ? `${pokemon.nickname ?? pokemon.species} (${pokemon.species})` : "Hueco libre"}
                  >
                    {pokemon?.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pokemon.imagen} alt={pokemon.species} className="h-full w-full object-contain p-0.5" />
                    ) : null}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {equipos.tableros.every((t) => !t.vivos.length) ? (
        <p className="mt-3 text-sm text-slate-400">
          Todavía no hay capturas.{" "}
          <Link href="/equipo?apuntar=1" className="text-brand-400 hover:underline">
            Apunta la primera
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
