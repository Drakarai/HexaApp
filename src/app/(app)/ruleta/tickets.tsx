"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  grantTicketsAction,
  quickGrantTicketAction,
} from "@/app/actions/tickets";
import type { FormState } from "@/app/actions/auth";
import {
  Avatar,
  EnlaceDeJugador,
  FormMessage,
  SubmitButton,
} from "@/components/ui";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

export type TicketRow = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  balance: number;
};

/** Panel de administrador: quién tiene tickets y reparto de los mismos. */
export function TicketsPanel({
  competitionId,
  rouletteId,
  rouletteName,
  rows,
}: {
  competitionId: string;
  rouletteId: string;
  rouletteName: string;
  rows: TicketRow[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    grantTicketsAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <section className="card">
      <h2 className="section-title mb-1">Tickets de {rouletteName}</h2>
      <p className="muted mb-4">
        Un ticket es una tirada <strong>de esta ruleta</strong>: no sirve para
        las demás. Se gasta al girar, y los administradores giran sin gastar.
      </p>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.participantId}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
          >
            <EnlaceDeJugador
              participantId={row.participantId}
              name={row.displayName}
              className="min-w-0 flex-1 gap-2"
            >
              <Avatar
                name={row.displayName}
                color={row.color}
                image={row.avatarImage}
                size={26}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {row.displayName}
              </span>
            </EnlaceDeJugador>

            <form action={quickGrantTicketAction}>
              <input type="hidden" name="competitionId" value={competitionId} />
              <input type="hidden" name="rouletteId" value={rouletteId} />
              <input
                type="hidden"
                name="participantId"
                value={row.participantId}
              />
              <input type="hidden" name="delta" value="-1" />
              <button
                type="submit"
                className="btn-ghost btn-sm px-2"
                title="Quitar un ticket"
                disabled={row.balance <= 0}
              >
                −
              </button>
            </form>

            <span
              className={cx(
                "w-12 text-center text-sm font-bold tabular-nums",
                row.balance > 0 ? "text-amber-300" : "text-slate-600",
              )}
            >
              <Icono emoji="🎟️" /> {row.balance}
            </span>

            <form action={quickGrantTicketAction}>
              <input type="hidden" name="competitionId" value={competitionId} />
              <input type="hidden" name="rouletteId" value={rouletteId} />
              <input
                type="hidden"
                name="participantId"
                value={row.participantId}
              />
              <input type="hidden" name="delta" value="1" />
              <button
                type="submit"
                className="btn-ghost btn-sm px-2"
                title="Dar un ticket"
              >
                +
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form
        ref={formRef}
        action={formAction}
        className="mt-4 space-y-3 border-t border-white/10 pt-4"
      >
        <input type="hidden" name="competitionId" value={competitionId} />
        <input type="hidden" name="rouletteId" value={rouletteId} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">Jugador</label>
            <select name="participantId" className="input" required>
              {rows.map((row) => (
                <option key={row.participantId} value={row.participantId}>
                  {row.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tickets</label>
            <input
              name="amount"
              type="number"
              className="input"
              placeholder="1"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Motivo</label>
          <input
            name="reason"
            className="input"
            placeholder="Premio por ganar la jornada 3"
          />
        </div>
        <FormMessage state={state} />
        <SubmitButton className="btn-ghost">
          Dar tickets de {rouletteName}
        </SubmitButton>
      </form>
    </section>
  );
}

/** Aviso del saldo propio, encima de la ruleta. */
export function MyTickets({
  balance,
  isManager,
  rouletteName,
  soloMira = false,
  archivada = false,
}: {
  balance: number;
  isManager: boolean;
  rouletteName: string;
  /**
   * Un espectador no tiene saldo ni puede tenerlo: decirle que pida un ticket
   * era mandarle a por algo que no le pueden dar.
   */
  soloMira?: boolean;
  /** La edición está archivada: por eso no se gira, no por ser espectador */
  archivada?: boolean;
}) {
  if (isManager) {
    return (
      <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
        Como administrador giras sin gastar tickets.
      </p>
    );
  }

  if (soloMira) {
    return (
      <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
        {archivada
          ? "Esta edición está archivada: su ruleta ya no se gira."
          : "Estás mirando este locke: la ruleta la giran los que lo juegan."}
      </p>
    );
  }

  return (
    <p
      className={cx(
        "mb-4 rounded-lg border px-3 py-2 text-sm",
        balance > 0
          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
          : "border-white/10 bg-white/[0.03] text-slate-400",
      )}
    >
      {balance > 0 ? (
        <>
          <Icono emoji="🎟️" /> Tienes <strong>{balance}</strong>{" "}
          {balance === 1 ? "ticket" : "tickets"} de {rouletteName}: cada tirada
          gasta uno.
        </>
      ) : (
        <>
          No tienes tickets de {rouletteName}. Pídele uno a un administrador
          para poder girar aquí.
        </>
      )}
    </p>
  );
}
