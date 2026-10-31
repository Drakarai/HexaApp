"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addMatchAction,
  cambiarSerieDeJornadaAction,
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
import { leerResultadoDeRepeticionAction, type ResultadoLeido } from "@/app/actions/showdown";
import { cx } from "@/lib/utils";

type Option = { id: string; displayName: string };

/** Las dos maneras de jugar una jornada de dualocke */
const SERIES = [
  { valor: 3, nombre: "Al mejor de 3", detalle: "Con el mismo equipo, como la final" },
  { valor: 1, nombre: "Un combate", detalle: "A una sola partida" },
] as const;

export function NewMatchdayForm({
  competitionId,
  conSerie = false,
}: {
  competitionId: string;
  /** En un dualocke: elegir entre un combate y al mejor de tres */
  conSerie?: boolean;
}) {
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

        {conSerie && !royale ? (
          <fieldset>
            <legend className="label">Cómo se juega</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERIES.map((serie) => (
                <label
                  key={serie.valor}
                  className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm has-[:checked]:border-brand-400/60 has-[:checked]:bg-brand-600/15"
                >
                  <input
                    type="radio"
                    name="alMejorDe"
                    value={serie.valor}
                    defaultChecked={serie.valor === 3}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <span>
                    <span className="block font-semibold text-white">{serie.nombre}</span>
                    <span className="block text-xs text-slate-400">{serie.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

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
        <select name="participantAId" className="input" key={String(participants[0]?.id)} defaultValue={participants[0]?.id}>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-32 flex-1">
        <label className="label">Jugador B</label>
        <select name="participantBId" className="input" key={String(participants[1]?.id)} defaultValue={participants[1]?.id}>
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

  return <FormularioDeResultado match={match} onCerrar={() => setOpen(false)} />;
}

type ElResultado = Parameters<typeof MatchResultForm>[0]["match"];

/**
 * El resultado a mano o **leído de la repetición**: con el enlace de Showdown
 * se rellenan el ganador, la diferencia y el día, y se guarda con el mismo
 * botón de siempre. Va primero el enlace porque es lo que rellena lo demás.
 */
function FormularioDeResultado({ match, onCerrar }: { match: ElResultado; onCerrar: () => void }) {
  const [ganador, setGanador] = useState(match.winnerId ?? "");
  const [diferencia, setDiferencia] = useState(match.pokemonDiff === null ? "" : String(match.pokemonDiff));
  const [fecha, setFecha] = useState("");
  const [enlace, setEnlace] = useState(match.replayUrl ?? "");
  const [leyendo, setLeyendo] = useState(false);
  const [leido, setLeido] = useState<ResultadoLeido | null>(null);
  const nombre = (id: string) => (id === match.a.id ? match.a.name : match.b.name);

  async function leer() {
    setLeyendo(true);
    try {
      const resultado = await leerResultadoDeRepeticionAction(match.id, enlace);
      setLeido(resultado);
      if (resultado.error) return;
      setGanador(resultado.ganadorId ?? "");
      setDiferencia(resultado.diferencia === null || resultado.diferencia === undefined ? "" : String(resultado.diferencia));
      if (resultado.fecha) setFecha(resultado.fecha);
    } catch {
      setLeido({ error: "Sin conexión: esto necesita línea. Prueba cuando vuelva." });
    } finally {
      setLeyendo(false);
    }
  }

  /** Si se ha leído al revés, se da la vuelta a quién es quién, no solo al ganador */
  function alReves() {
    if (!leido?.enShowdown || !leido.enPie) return;
    const otro = (id: string) => (id === match.a.id ? match.b.id : match.a.id);
    const darLaVuelta = <T,>(mapa: Record<string, T>) =>
      Object.fromEntries(Object.entries(mapa).map(([id, valor]) => [otro(id), valor]));
    // Ya no es una suposición: lo ha dicho quien lo apunta
    setLeido({ ...leido, enShowdown: darLaVuelta(leido.enShowdown), enPie: darLaVuelta(leido.enPie), por: undefined });
    if (ganador) setGanador(otro(ganador));
  }

  return (
    <form
      action={async (formData) => {
        await setMatchResultAction(formData);
        onCerrar();
      }}
      className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-4"
    >
      <input type="hidden" name="matchId" value={match.id} />
      <div className="sm:col-span-4">
        <label className="label" htmlFor={`repeticion-${match.id}`}>Enlace del combate</label>
        <div className="flex gap-2">
          <input
            id={`repeticion-${match.id}`}
            name="replayUrl"
            className="input min-w-0 flex-1"
            inputMode="url"
            value={enlace}
            onChange={(evento) => setEnlace(evento.target.value)}
            placeholder="https://replay.pokemonshowdown.com/..."
          />
          <button
            type="button"
            className="btn-ghost btn-sm shrink-0"
            disabled={leyendo || !enlace.trim()}
            onClick={leer}
          >
            {leyendo ? "Leyendo…" : "Leer el resultado"}
          </button>
        </div>
        {leido?.error ? (
          <p className="mt-1 text-xs text-red-300">{leido.error}</p>
        ) : leido?.enShowdown && leido.enPie ? (
          <div
            className={cx(
              "mt-2 rounded-lg border px-3 py-2 text-xs",
              leido.por === "orden"
                ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-100/90"
                : "border-emerald-500/25 bg-emerald-500/[0.05] text-slate-300",
            )}
          >
            <p>
              {[match.a.id, match.b.id]
                .map((id) => `«${leido.enShowdown![id]}» es ${nombre(id)} (${leido.enPie![id]} en pie)`)
                .join(" · ")}
              {leido.ganadorId ? "" : " · Quedaron en empate."}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {leido.por === "orden"
                  ? "No he sabido quién es quién y lo he puesto por orden: míralo."
                  : !leido.por
                    ? "Le has dado la vuelta."
                    : leido.por === "equipo"
                    ? "Lo he sacado por sus pokémon."
                    : "Lo he sacado por el nombre."}{" "}
                Revísalo y guarda.
              </span>
              <button type="button" className="underline decoration-dotted hover:text-white" onClick={alReves}>
                Están al revés
              </button>
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Con la repetición de Showdown, «Leer el resultado» rellena lo de abajo. También vale
            un vídeo, pero ese no se lee: con él sale el botón de &quot;Ver combate&quot;.
          </p>
        )}
      </div>
      <div>
        <label className="label">Ganador</label>
        <select name="winnerId" className="input" value={ganador} onChange={(evento) => setGanador(evento.target.value)}>
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
          value={diferencia}
          onChange={(evento) => setDiferencia(evento.target.value)}
        />
      </div>
      <div>
        <label className="label">Fecha</label>
        <input name="playedAt" type="date" className="input" value={fecha} onChange={(evento) => setFecha(evento.target.value)} />
      </div>
      <div>
        <label className="label">Notas</label>
        <input name="notes" className="input" defaultValue={match.notes ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-4">
        <SubmitButton>Guardar resultado</SubmitButton>
        <button type="button" className="btn-ghost" onClick={onCerrar}>
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

/**
 * Cambiar una jornada de dualocke entre un combate y al mejor de tres. Solo
 * mientras no haya nada apuntado en ella: lo comprueba también el servidor.
 */
export function ElegirSerie({
  matchdayId,
  alMejorDe,
  bloqueada,
}: {
  matchdayId: string;
  alMejorDe: number;
  /** Ya hay algo apuntado: se enseña, pero no se cambia */
  bloqueada: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => cambiarSerieDeJornadaAction(formData),
    null,
  );

  if (bloqueada) {
    return (
      <span
        className="chip"
        title="Ya hay algo apuntado en la jornada: el formato ya no se cambia"
      >
        {alMejorDe === 1 ? "Un combate" : `Al mejor de ${alMejorDe}`}
      </span>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="matchdayId" value={matchdayId} />
      <div role="group" aria-label="Cómo se juega la jornada" className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        {SERIES.map((serie) => (
          <button
            key={serie.valor}
            type="submit"
            name="alMejorDe"
            value={serie.valor}
            aria-pressed={alMejorDe === serie.valor}
            className={
              alMejorDe === serie.valor
                ? "rounded-md bg-brand-600/25 px-2 py-0.5 text-xs font-medium text-white ring-1 ring-brand-500/40"
                : "rounded-md px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200"
            }
          >
            {serie.nombre}
          </button>
        ))}
      </div>
      {state?.error ? <span className="text-xs text-red-300">{state.error}</span> : null}
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
