"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addOptionAction,
  createRouletteAction,
  updateRouletteAction,
} from "@/app/actions/roulette";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { cx } from "@/lib/utils";

export function NewRouletteForm({ competitionId }: { competitionId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createRouletteAction,
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
        Crear una ruleta nueva
      </summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input
              name="name"
              className="input"
              placeholder="Castigos de la jornada"
              required
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input name="description" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Opciones (una por línea)</label>
          <textarea
            name="options"
            className="textarea"
            rows={6}
            placeholder={"Monotipo la próxima ruta\nSin objetos en el gimnasio\nRegalar un pokémon"}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="allowRepeats"
            defaultChecked
            className="accent-indigo-500"
          />
          Permitir que una opción salga más de una vez
        </label>
        <FormMessage state={state} />
        <SubmitButton>Crear ruleta</SubmitButton>
      </form>
    </details>
  );
}

type ClaseDeCasilla = "texto" | "objeto" | "tickets";

/**
 * Añadir una casilla. Tres clases, y las dos últimas son premios de verdad:
 * el objeto cae en la bolsa y los tickets en el saldo de la ruleta que se elija
 * —que puede ser esta misma, y entonces lo que toca es volver a girar—.
 *
 * El rótulo de un premio no se escribe: lo pone el servidor con el nombre del
 * objeto o de la ruleta. Escribirlo a mano era la forma segura de acabar con
 * una casilla que dice "Ultra Ball" y reparte otra cosa.
 */
export function AddOptionForm({
  rouletteId,
  catalogo,
  ruletas,
}: {
  rouletteId: string;
  /** El catálogo de la bolsa, que es global y no de cada edición */
  catalogo: Array<{ id: string; name: string }>;
  /** Las ruletas de esta competición, para los tickets */
  ruletas: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addOptionAction,
    null,
  );
  const [clase, setClase] = useState<ClaseDeCasilla>("texto");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="rouletteId" value={rouletteId} />
      {/* Va en el formulario para que el servidor no tenga que adivinar qué es
          por lo que venga relleno */}
      <input type="hidden" name="clase" value={clase} />

      <div>
        <label className="label">Nueva casilla</label>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          <Pestana activa={clase === "texto"} onClick={() => setClase("texto")}>
            ✍️ Texto
          </Pestana>
          <Pestana
            activa={clase === "objeto"}
            onClick={() => setClase("objeto")}
          >
            🎒 Objeto
          </Pestana>
          <Pestana
            activa={clase === "tickets"}
            onClick={() => setClase("tickets")}
          >
            🎟️ Tickets
          </Pestana>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {clase === "texto" ? (
          <div className="min-w-40 flex-1">
            <label className="label">Qué dice</label>
            <input
              name="label"
              className="input"
              placeholder="Monotipo la próxima ruta"
            />
          </div>
        ) : clase === "objeto" ? (
          <div className="min-w-40 flex-1">
            <label className="label">Objeto</label>
            <select name="itemId" className="input" defaultValue="">
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
        ) : (
          <div className="min-w-40 flex-1">
            <label className="label">Tickets de</label>
            <select name="ticketsDeId" className="input" defaultValue="">
              <option value="" disabled>
                Elige la ruleta
              </option>
              {ruletas.map((ruleta) => (
                <option key={ruleta.id} value={ruleta.id}>
                  {ruleta.name}
                  {ruleta.id === rouletteId ? " (esta misma)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {clase !== "texto" ? (
          <div className="w-20">
            <label className="label">Cuántos</label>
            <input
              name="cantidad"
              type="number"
              min={1}
              max={99}
              defaultValue={1}
              className="input"
            />
          </div>
        ) : null}

        <div className="w-20">
          <label className="label">Peso</label>
          <input
            name="weight"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            className="input"
          />
        </div>
        <div className="w-16">
          <label className="label">Color</label>
          <input
            name="color"
            type="color"
            defaultValue="#6366f1"
            className="input h-9.5 p-1"
          />
        </div>
        <SubmitButton className="btn-ghost">Añadir</SubmitButton>
      </div>

      {clase === "objeto" && !catalogo.length ? (
        <p className="text-xs text-slate-500">
          El catálogo de objetos está vacío: créalos en Administración → Bolsa.
        </p>
      ) : null}
      {clase !== "texto" ? (
        <p className="text-xs text-slate-500">
          {clase === "objeto"
            ? "Al salir, el objeto cae solo en la bolsa de quien gire. Si giras tú como organización, eliges abajo a quién dárselo."
            : "Al salir, los tickets se suman al saldo de esa ruleta. Los de esta misma son otra tirada aquí."}
        </p>
      ) : null}

      <FormMessage state={state} />
    </form>
  );
}

function Pestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition",
        activa
          ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
      )}
    >
      {children}
    </button>
  );
}

export function RouletteSettingsForm({
  roulette,
}: {
  roulette: {
    id: string;
    name: string;
    description: string | null;
    allowRepeats: boolean;
    spinSeconds: number;
  };
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setOpen(true)}
      >
        ⚙ Ajustes de la ruleta
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateRouletteAction(formData);
        setOpen(false);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="rouletteId" value={roulette.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input name="name" className="input" defaultValue={roulette.name} />
        </div>
        <div>
          <label className="label">Descripción</label>
          <input
            name="description"
            className="input"
            defaultValue={roulette.description ?? ""}
          />
        </div>
      </div>
      <div className="w-40">
        <label className="label">Duración del giro (s)</label>
        <input
          name="spinSeconds"
          type="number"
          min={1}
          max={30}
          className="input"
          defaultValue={roulette.spinSeconds}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="allowRepeats"
          defaultChecked={roulette.allowRepeats}
          className="accent-indigo-500"
        />
        Permitir repeticiones
      </label>
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
