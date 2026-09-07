"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  anadirPremioAction,
  createChallengeAction,
  quitarPremioAction,
  setChallengeResultAction,
} from "@/app/actions/challenges";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

type Opcion = { id: string; displayName: string };

export function NewChallengeForm({
  competitionId,
  participants,
}: {
  competitionId: string;
  participants: Opcion[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createChallengeAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Crear reto
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Jugador A</label>
            <select
              name="participantAId"
              className="input"
              defaultValue={participants[0]?.id}
            >
              {participants.map((jugador) => (
                <option key={jugador.id} value={jugador.id}>
                  {jugador.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Jugador B</label>
            <select
              name="participantBId"
              className="input"
              defaultValue={participants[1]?.id}
            >
              {participants.map((jugador) => (
                <option key={jugador.id} value={jugador.id}>
                  {jugador.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Premio</label>
            <input
              name="prize"
              className="input"
              placeholder="Elige un pokémon del rival"
            />
          </div>
          <div>
            <label className="label">Castigo</label>
            <input
              name="punishment"
              className="input"
              placeholder="Libera a su inicial"
            />
          </div>
        </div>
        <FormMessage state={state} />
        <SubmitButton>Crear reto</SubmitButton>
      </form>
    </details>
  );
}

export function ChallengeResultForm({
  reto,
}: {
  reto: {
    id: string;
    winnerId: string | null;
    pokemonDiff: number | null;
    replayUrl: string | null;
    prize: string | null;
    punishment: string | null;
    notes: string | null;
    a: { id: string; name: string };
    b: { id: string; name: string };
  };
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-2"
        onClick={() => setAbierto(true)}
      >
        {reto.winnerId ? "✎ Cambiar resultado" : "✓ Anotar resultado"}
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await setChallengeResultAction(formData);
        setAbierto(false);
      }}
      className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-3"
    >
      <input type="hidden" name="challengeId" value={reto.id} />
      <div>
        <label className="label">Ganador</label>
        <select
          name="winnerId"
          className="input"
          defaultValue={reto.winnerId ?? ""}
        >
          <option value="">Sin resultado</option>
          <option value={reto.a.id}>{reto.a.name}</option>
          <option value={reto.b.id}>{reto.b.name}</option>
        </select>
      </div>
      <div>
        <label className="label">Dif. pokémon</label>
        <input
          name="pokemonDiff"
          type="number"
          min={0}
          max={6}
          className="input"
          defaultValue={reto.pokemonDiff ?? ""}
        />
      </div>
      <div>
        <label className="label">Fecha</label>
        <input name="playedAt" type="date" className="input" />
      </div>
      <div>
        <label className="label">Premio</label>
        <input
          name="prize"
          className="input"
          defaultValue={reto.prize ?? ""}
          placeholder="Elige un pokémon del rival"
        />
      </div>
      <div>
        <label className="label">Castigo</label>
        <input
          name="punishment"
          className="input"
          defaultValue={reto.punishment ?? ""}
          placeholder="Libera a su inicial"
        />
      </div>
      <div>
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={reto.notes ?? ""} />
      </div>
      <div className="sm:col-span-3">
        <label className="label">Enlace del combate</label>
        <input
          name="replayUrl"
          className="input"
          inputMode="url"
          defaultValue={reto.replayUrl ?? ""}
          placeholder="https://replay.pokemonshowdown.com/..."
        />
        <p className="mt-1 text-xs text-slate-500">
          Pega aquí la repetición de Showdown o el vídeo. Si lo dejas vacío, no
          sale el botón de &quot;Ver combate&quot;.
        </p>
      </div>
      <div className="flex gap-2 sm:col-span-3">
        <SubmitButton>Guardar resultado</SubmitButton>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setAbierto(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Los objetos que se lleva quien gane el reto, y el botón de añadir otro.
 *
 * Es aparte del premio escrito a mano porque son dos cosas distintas: el texto
 * es cualquier cosa ("eliges su starter") y esto **cae solo en su bolsa** al
 * apuntar el resultado.
 */
export function PremioEnObjetos({
  challengeId,
  premios,
  catalogo,
  yaEntregado,
}: {
  challengeId: string;
  premios: Array<{
    id: string;
    quantity: number;
    entregadoA: string | null;
    item: { name: string; image: string | null };
  }>;
  catalogo: Array<{ id: string; name: string }>;
  /** Nombre de quien ya se los ha llevado, si el reto está jugado */
  yaEntregado: string | null;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    anadirPremioAction,
    null,
  );

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        Objetos del premio
      </p>

      {premios.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {premios.map((premio) => (
            <li
              key={premio.id}
              className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-1 pl-2 pr-1 text-sm text-emerald-100"
            >
              {premio.item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={premio.item.image}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
              ) : null}
              <span>
                {premio.quantity > 1 ? `${premio.quantity} × ` : ""}
                {premio.item.name}
              </span>
              <form action={quitarPremioAction}>
                <input type="hidden" name="premioId" value={premio.id} />
                <button
                  type="submit"
                  className="rounded-full px-1.5 text-emerald-300/70 transition hover:bg-emerald-500/20 hover:text-emerald-100"
                  title="Quitar del premio"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          Ninguno. Si añades objetos, caen solos en la bolsa del que gane.
        </p>
      )}

      {yaEntregado && premios.length ? (
        <p className="mt-2 text-xs text-emerald-300/80">
          Ya están en la bolsa de {yaEntregado}.
        </p>
      ) : null}

      {catalogo.length ? (
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="challengeId" value={challengeId} />
          <div className="min-w-40 flex-1">
            <label className="label">Objeto</label>
            <select name="itemId" className="input" required defaultValue="">
              <option value="" disabled>
                Elige uno
              </option>
              {catalogo.map((objeto) => (
                <option key={objeto.id} value={objeto.id}>
                  {objeto.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="label">Cantidad</label>
            <input
              name="quantity"
              type="number"
              min={1}
              max={99}
              defaultValue={1}
              className="input"
            />
          </div>
          <SubmitButton className="btn-ghost btn-sm">Añadir</SubmitButton>
          <div className="w-full">
            <FormMessage state={state} />
          </div>
        </form>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          El catálogo de objetos está vacío: créalos en Administración → Bolsa.
        </p>
      )}
    </div>
  );
}
