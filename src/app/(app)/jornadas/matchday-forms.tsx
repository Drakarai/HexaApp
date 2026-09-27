"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addMatchAction,
  createMatchdayAction,
  darPorRetiradaAction,
  setMatchResultAction,
} from "@/app/actions/matchdays";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { ElegirFormato } from "@/components/formato";
import { crearRoyaleAction } from "@/app/actions/royales";
import { esRoyale } from "@/lib/formatos-de-combate";
import { Icono } from "@/components/icono";

type Option = { id: string; displayName: string };

export function NewMatchdayForm({ competitionId }: { competitionId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createMatchdayAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  /**
   * El formato se lleva en estado porque cambia el formulario: un Battle
   * Royale no se empareja —no hay parejas— así que esa casilla desaparece y en
   * su sitio se explica lo que va a pasar.
   */
  const [formato, setFormato] = useState("singles");
  const royale = esRoyale(formato);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Crear jornada
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Nombre</label>
            <input name="label" className="input" placeholder="Jornada 1" required />
          </div>
          <div>
            <label className="label">Hito</label>
            <input name="milestone" className="input" placeholder="2da medalla" />
          </div>
          <div>
            <label className="label">Puntos por victoria</label>
            <input
              name="pointsForWin"
              type="number"
              min={0}
              max={10}
              defaultValue={1}
              className="input"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ElegirFormato valor={formato} onCambio={setFormato} />
          <div>
            <label className="label">Condiciones (opcional)</label>
            <input
              name="condiciones"
              className="input"
              maxLength={120}
              placeholder="Monotipo agua, sin objetos…"
            />
          </div>
        </div>

        {royale ? (
          <p className="rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-xs text-red-200/90">
            <Icono emoji="👑" /> Se creará <strong>un Battle Royale con todos los jugadores</strong>{" "}
            dentro de la jornada. No hay emparejamientos: al terminar se apunta
            en qué orden quedaron, y el primero se lleva los puntos.
          </p>
        ) : (
          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="emparejar"
              defaultChecked
              className="mt-0.5 accent-indigo-500"
            />
            <span>
              Emparejar sola
              <span className="block text-xs text-slate-500">
                Reparte los combates siguiendo la liguilla: nadie repite rival
                hasta haber jugado contra todos. Se pueden borrar y poner otros.
              </span>
            </span>
          </label>
        )}
        <FormMessage state={state} />
        <SubmitButton>Crear jornada</SubmitButton>
      </form>
    </details>
  );
}

export function AddMatchForm({
  matchdayId,
  participants,
}: {
  matchdayId: string;
  participants: Option[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addMatchAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="matchdayId" value={matchdayId} />
      <div className="min-w-32 flex-1">
        <label className="label">Jugador A</label>
        <select name="participantAId" className="input" defaultValue={participants[0]?.id}>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-32 flex-1">
        <label className="label">Jugador B</label>
        <select name="participantBId" className="input" defaultValue={participants[1]?.id}>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.displayName}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton className="btn-ghost">Añadir combate</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function MatchResultForm({
  match,
}: {
  match: {
    id: string;
    winnerId: string | null;
    pokemonDiff: number | null;
    replayUrl: string | null;
    notes: string | null;
    a: { id: string; name: string };
    b: { id: string; name: string };
  };
}) {
  const [open, setOpen] = useState(false);
  const [retirada, setRetirada] = useState(false);

  if (retirada) {
    return <FormularioDeRetirada match={match} onCerrar={() => setRetirada(false)} />;
  }

  if (!open) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setOpen(true)}
        >
          {match.winnerId ? "✎ Cambiar resultado" : "✓ Anotar resultado"}
        </button>
        {/* Aparte del resultado normal: no es lo mismo perder jugando que no
            aparecer, y mezclarlo en el mismo formulario lo escondía */}
        <button
          type="button"
          className="btn-ghost btn-sm text-amber-300"
          onClick={() => setRetirada(true)}
        >
          <Icono emoji="🏳️" /> Dar por retirada
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await setMatchResultAction(formData);
        setOpen(false);
      }}
      className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-4"
    >
      <input type="hidden" name="matchId" value={match.id} />
      <div>
        <label className="label">Ganador</label>
        <select
          name="winnerId"
          className="input"
          defaultValue={match.winnerId ?? ""}
        >
          <option value="">Sin resultado</option>
          <option value={match.a.id}>{match.a.name}</option>
          <option value={match.b.id}>{match.b.name}</option>
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
          defaultValue={match.pokemonDiff ?? ""}
        />
      </div>
      <div>
        <label className="label">Fecha</label>
        <input name="playedAt" type="date" className="input" />
      </div>
      <div>
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={match.notes ?? ""} />
      </div>
      <div className="sm:col-span-4">
        <label className="label">Enlace del combate</label>
        <input
          name="replayUrl"
          className="input"
          inputMode="url"
          defaultValue={match.replayUrl ?? ""}
          placeholder="https://replay.pokemonshowdown.com/..."
        />
        <p className="mt-1 text-xs text-slate-500">
          Pega aquí la repetición de Showdown o el vídeo. Si lo dejas vacío, no
          sale el botón de &quot;Ver combate&quot;.
        </p>
      </div>
      <div className="flex gap-2 sm:col-span-4">
        <SubmitButton>Guardar resultado</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Dar un combate por retirada: uno de los dos no se presenta.
 *
 * Va en su propio formulario y no como una opción más del resultado porque no
 * es un resultado cualquiera: se elige **quién no apareció**, no quién ganó,
 * que es como se cuenta en el grupo, y el castigo lo pone la aplicación para
 * que sea el mismo siempre.
 */
function FormularioDeRetirada({
  match,
  onCerrar,
}: {
  match: {
    id: string;
    a: { id: string; name: string };
    b: { id: string; name: string };
  };
  onCerrar: () => void;
}) {
  const [seRetiraId, setSeRetiraId] = useState(match.a.id);
  const gana = seRetiraId === match.a.id ? match.b : match.a;

  return (
    <form
      action={async (formData) => {
        await darPorRetiradaAction(formData);
        onCerrar();
      }}
      className="mt-3 grid gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 sm:grid-cols-3"
    >
      <input type="hidden" name="matchId" value={match.id} />
      <div className="sm:col-span-3">
        <p className="text-sm font-semibold text-amber-200">
          <Icono emoji="🏳️" /> Dar el combate por retirada
        </p>
      </div>
      <div>
        <label className="label">No se presentó</label>
        <select
          name="seRetiraId"
          className="input"
          value={seRetiraId}
          onChange={(evento) => setSeRetiraId(evento.target.value)}
        >
          <option value={match.a.id}>{match.a.name}</option>
          <option value={match.b.id}>{match.b.name}</option>
        </select>
      </div>
      <div>
        <label className="label">Fecha</label>
        <input name="playedAt" type="date" className="input" />
      </div>
      <div className="flex items-end">
        <p className="text-xs leading-snug text-amber-200/80">
          Gana <strong>{gana.name}</strong> con diferencia de 3.
        </p>
      </div>
      <div className="flex gap-2 sm:col-span-3">
        <SubmitButton className="btn-primary btn-sm">
          Dar por retirada
        </SubmitButton>
        <button type="button" className="btn-ghost btn-sm" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Otro Battle Royale más en la misma jornada ("Ronda 2"). */
export function NuevoRoyale({ matchdayId }: { matchdayId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    crearRoyaleAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="matchdayId" value={matchdayId} />
      <div className="min-w-40 flex-1">
        <label className="label">Otro royale</label>
        <input name="label" className="input" placeholder="Ronda 2" maxLength={60} />
      </div>
      <SubmitButton className="btn-ghost btn-sm"><Icono emoji="👑" /> Añadir royale</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
