"use client";

import { useActionState, useState } from "react";
import {
  borrarRoyaleAction,
  guardarCronicaAction,
  guardarMiCronicaAction,
  guardarPuestosAction,
} from "@/app/actions/royales";
import type { FormState } from "@/app/actions/auth";
import { Avatar, ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { MatchTeams, type TeamPokemon } from "@/components/match-team";
import { ReplayLink } from "@/components/replay-link";
import { cx, formatDate } from "@/lib/utils";
import { Icono } from "@/components/icono";

export type JugadorDeRoyale = {
  puestoId: string;
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** 1 es el que ganó. Vacío mientras no se haya jugado */
  puesto: number | null;
  vivos: number | null;
  notes: string | null;
  equipo: TeamPokemon[];
};

export type RoyaleVista = {
  id: string;
  label: string | null;
  cronica: string | null;
  replayUrl: string | null;
  playedAt: Date | null;
  jugadores: JugadorDeRoyale[];
};

/** Las medallas del podio. Del cuarto para abajo, el número pelado. */
const MEDALLAS = ["🥇", "🥈", "🥉"];

/**
 * Un Battle Royale dentro de una jornada.
 *
 * No se parece a un combate normal y por eso se enseña distinto: no hay dos
 * bandos ni un marcador, hay **un orden de llegada**. Y lleva crónica, que en
 * un royale es media gracia: lo que se cuenta después.
 */
export function Royale({
  royale,
  canManage,
  miParticipanteId,
  maximo,
}: {
  royale: RoyaleVista;
  canManage: boolean;
  miParticipanteId: string | null;
  /** Cuántos pokémon caben por jugador, según el formato */
  maximo: number;
}) {
  const [ordenando, setOrdenando] = useState(false);

  const jugados = royale.jugadores.filter((jugador) => jugador.puesto !== null);
  const enOrden = [...jugados].sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99));
  const sinPuesto = royale.jugadores.filter((jugador) => jugador.puesto === null);

  return (
    <section className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            <Icono emoji="👑" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">
              {royale.label || "Battle Royale"}
            </h3>
            <p className="text-xs text-slate-500">
              {royale.jugadores.length} jugadores ·{" "}
              {royale.playedAt ? formatDate(royale.playedAt) : "sin jugar"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReplayLink url={royale.replayUrl} />
          {canManage ? (
            <form action={borrarRoyaleAction}>
              <input type="hidden" name="royaleId" value={royale.id} />
              <ConfirmSubmit message="¿Borrar este royale con todo lo que lleva dentro?">
                ✕
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
      </div>

      {/* El orden de llegada, que es el resultado */}
      {enOrden.length ? (
        <ol className="space-y-1.5">
          {enOrden.map((jugador, indice) => (
            <li
              key={jugador.puestoId}
              className={cx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
                indice === 0
                  ? "border border-amber-400/40 bg-amber-400/10"
                  : "bg-white/[0.03]",
              )}
            >
              <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-300">
                {MEDALLAS[indice] ? <Icono emoji={MEDALLAS[indice]} /> : `${indice + 1}º`}
              </span>
              <Avatar
                name={jugador.displayName}
                color={jugador.color}
                image={jugador.avatarImage}
                size={22}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                {jugador.displayName}
              </span>
              {jugador.vivos !== null ? (
                <span className="shrink-0 text-xs text-slate-500">
                  {jugador.vivos} {jugador.vivos === 1 ? "vivo" : "vivos"}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-slate-500">
          Todavía no se ha jugado. Cuando termine, se apunta en qué orden
          quedaron.
        </p>
      )}

      {sinPuesto.length && enOrden.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Sin puesto: {sinPuesto.map((jugador) => jugador.displayName).join(", ")}.
        </p>
      ) : null}

      {canManage ? (
        <button
          type="button"
          className="btn-ghost btn-sm mt-3"
          onClick={() => setOrdenando(true)}
        >
          {enOrden.length ? "✎ Cambiar el orden" : <><Icono emoji="🏁" /> Apuntar el orden</>}
        </button>
      ) : null}

      {ordenando ? (
        <Ordenador
          royale={royale}
          onClose={() => setOrdenando(false)}
        />
      ) : null}

      {/* Lo que cuenta cada uno de lo suyo */}
      <div className="mt-3 space-y-1.5">
        {royale.jugadores.map((jugador) =>
          jugador.notes ? (
            <p key={jugador.puestoId} className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                {jugador.displayName}:
              </span>{" "}
              {jugador.notes}
            </p>
          ) : null,
        )}
      </div>

      <MiLinea
        jugadores={royale.jugadores}
        miParticipanteId={miParticipanteId}
        canManage={canManage}
      />

      <Cronica royale={royale} canManage={canManage} />

      <MatchTeams
        matchId={royale.id}
        royaleId={royale.id}
        canManage={canManage}
        maximo={maximo}
        rotulo={royale.label || "Battle Royale"}
        sides={royale.jugadores.map((jugador) => ({
          participantId: jugador.participantId,
          displayName: jugador.displayName,
          color: jugador.color,
          avatarImage: jugador.avatarImage,
          team: jugador.equipo,
        }))}
      />
    </section>
  );
}

/**
 * Apuntar el orden **tocando a la gente en el orden en que quedó**.
 *
 * Es la forma que aguanta un móvil: arrastrar seis filas con el dedo es un
 * suplicio y un desplegable por puesto son seis desplegables. Aquí se toca al
 * primero, luego al segundo, y ya está; y se puede deshacer.
 */
function Ordenador({
  royale,
  onClose,
}: {
  royale: RoyaleVista;
  onClose: () => void;
}) {
  const yaPuestos = royale.jugadores
    .filter((jugador) => jugador.puesto !== null)
    .sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99))
    .map((jugador) => jugador.participantId);

  const [orden, setOrden] = useState<string[]>(yaPuestos);
  const [estado, guardar] = useActionState<FormState, FormData>(
    guardarPuestosAction,
    null,
  );

  const porId = new Map(
    royale.jugadores.map((jugador) => [jugador.participantId, jugador]),
  );
  const quedan = royale.jugadores.filter(
    (jugador) => !orden.includes(jugador.participantId),
  );

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-ink-900 p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
        Tócalos en el orden en que quedaron
      </p>

      <ol className="mb-3 space-y-1.5">
        {orden.map((participantId, indice) => {
          const jugador = porId.get(participantId);
          if (!jugador) return null;
          return (
            <li
              key={participantId}
              className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5"
            >
              <span className="w-6 text-center text-sm font-bold text-slate-300">
                {MEDALLAS[indice] ? <Icono emoji={MEDALLAS[indice]} /> : `${indice + 1}º`}
              </span>
              <Avatar
                name={jugador.displayName}
                color={jugador.color}
                image={jugador.avatarImage}
                size={20}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                {jugador.displayName}
              </span>
              <button
                type="button"
                className="shrink-0 rounded px-2 py-0.5 text-xs text-red-300 hover:bg-white/5"
                onClick={() =>
                  setOrden(orden.filter((quien) => quien !== participantId))
                }
              >
                Quitar
              </button>
            </li>
          );
        })}
        {!orden.length ? (
          <li className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-center text-xs text-slate-600">
            Nadie todavía
          </li>
        ) : null}
      </ol>

      {quedan.length ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {quedan.map((jugador) => (
            <button
              key={jugador.participantId}
              type="button"
              className="chip cursor-pointer hover:border-brand-500/40 hover:bg-brand-600/10"
              onClick={() => setOrden([...orden, jugador.participantId])}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: jugador.color }}
                aria-hidden
              />
              {jugador.displayName}
            </button>
          ))}
        </div>
      ) : null}

      <form action={guardar} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="royaleId" value={royale.id} />
        <input type="hidden" name="orden" value={JSON.stringify(orden)} />
        <SubmitButton className="btn-primary btn-sm">Guardar el orden</SubmitButton>
        <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
          Cerrar
        </button>
        <p className="w-full text-xs text-slate-500">
          El primero se lleva los puntos de la jornada, igual que quien gana un
          combate.
        </p>
        <FormMessage state={estado} />
      </form>
    </div>
  );
}

/** Lo que cuenta cada jugador de su propio royale. */
function MiLinea({
  jugadores,
  miParticipanteId,
  canManage,
}: {
  jugadores: JugadorDeRoyale[];
  miParticipanteId: string | null;
  canManage: boolean;
}) {
  const [estado, guardar] = useActionState<FormState, FormData>(
    guardarMiCronicaAction,
    null,
  );

  /**
   * Cada uno escribe lo suyo. Un administrador puede escribir por otro —como
   * en las bajas—, pero por defecto se le ofrece su propia línea, que es lo
   * que va a querer el 99% de las veces.
   */
  const mio = jugadores.find(
    (jugador) => jugador.participantId === miParticipanteId,
  );
  if (!mio && !canManage) return null;
  const quien = mio ?? jugadores[0];
  if (!quien) return null;

  return (
    <details className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <summary className="cursor-pointer list-none text-xs font-semibold text-slate-300">
        <Icono emoji="✍️" /> Contar cómo me fue
      </summary>
      <form action={guardar} className="mt-2 space-y-2">
        <input type="hidden" name="puestoId" value={quien.puestoId} />
        <input
          name="notes"
          className="input"
          maxLength={200}
          defaultValue={quien.notes ?? ""}
          placeholder="Me tumbó Draka en el turno 3 con un crítico"
        />
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label className="label">Pokémon vivos</label>
            <input
              name="vivos"
              type="number"
              min={0}
              max={6}
              defaultValue={quien.vivos ?? ""}
              className="input"
            />
          </div>
          <SubmitButton className="btn-ghost btn-sm">Guardar</SubmitButton>
        </div>
        <FormMessage state={estado} />
      </form>
    </details>
  );
}

/** La crónica: qué pasó, para leerlo dentro de un mes y reírse. */
function Cronica({
  royale,
  canManage,
}: {
  royale: RoyaleVista;
  canManage: boolean;
}) {
  const [estado, guardar] = useActionState<FormState, FormData>(
    guardarCronicaAction,
    null,
  );

  return (
    <div className="mt-3">
      {royale.cronica ? (
        <blockquote className="rounded-lg border-l-2 border-red-400/40 bg-black/20 px-3 py-2 text-sm text-slate-300">
          {royale.cronica.split("\n").map((linea, indice) => (
            <p key={indice} className={indice ? "mt-1.5" : undefined}>
              {linea}
            </p>
          ))}
        </blockquote>
      ) : null}

      {canManage ? (
        <details className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
          <summary className="cursor-pointer list-none text-xs font-semibold text-slate-300">
            {royale.cronica ? "✎ Cambiar la crónica" : <><Icono emoji="📜" /> Escribir la crónica</>}
          </summary>
          <form action={guardar} className="mt-2 space-y-2">
            <input type="hidden" name="royaleId" value={royale.id} />
            <div>
              <label className="label">Nombre</label>
              <input
                name="label"
                className="input"
                maxLength={60}
                defaultValue={royale.label ?? ""}
                placeholder="Battle Royale"
              />
            </div>
            <div>
              <label className="label">Qué pasó</label>
              <textarea
                name="cronica"
                className="textarea"
                rows={4}
                maxLength={2000}
                defaultValue={royale.cronica ?? ""}
                placeholder="Empezó con todos midiéndose y acabó con Pablo barriendo con un Gyarados a +2…"
              />
            </div>
            <div>
              <label className="label">Enlace del combate</label>
              <input
                name="replayUrl"
                className="input"
                defaultValue={royale.replayUrl ?? ""}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
            <FormMessage state={estado} />
            <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}
