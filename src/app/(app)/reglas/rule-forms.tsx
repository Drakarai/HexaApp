"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createRuleAction, renombrarTituloAction, updateRuleAction } from "@/app/actions/rules";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

const BODY_HINT =
  'Cada línea que empiece por "- " se muestra como viñeta. Usa **texto** para negrita.';

/**
 * Los nombres de los campos, **como se llaman en la página**: el reglamento
 * tiene títulos («Título I · Modalidad») y dentro artículos. El formulario
 * llamaba «Título» al nombre del artículo y «Categoría» al título, y así no
 * había quien encontrara dónde cambiar qué.
 *
 * El título se escribe, pero ofrece los que ya hay: escrito un pelo distinto
 * («modalidad» por «Modalidad») salía un título nuevo con un solo artículo.
 */
function CampoDeTitulo({ titulos, defaultValue }: { titulos: string[]; defaultValue?: string }) {
  const lista = useId();
  return (
    <div>
      <label className="label">Título en el que va</label>
      <input
        name="category"
        className="input"
        list={lista}
        defaultValue={defaultValue}
        placeholder="Uno de los que hay, o uno nuevo"
        autoComplete="off"
      />
      <datalist id={lista}>
        {titulos.map((titulo) => (
          <option key={titulo} value={titulo} />
        ))}
      </datalist>
    </div>
  );
}

/** Al final de la página: un artículo en cualquier título, o en uno nuevo */
export function NewRuleForm({ competitionId, titulos }: { competitionId: string; titulos: string[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createRuleAction,
    null,
  );

  return (
    <details className="card group" open={!titulos.length || undefined}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        {titulos.length ? "Añadir un título nuevo" : "Escribir el primer artículo"}
      </summary>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoDeTitulo titulos={titulos} />
          <div>
            <label className="label">Nombre del primer artículo</label>
            <input name="title" className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Lo que dice</label>
          <textarea name="body" className="textarea" rows={6} />
          <p className="mt-1 text-xs text-slate-500">{BODY_HINT}</p>
        </div>
        <FormMessage state={state} />
        <SubmitButton>Añadir</SubmitButton>
      </form>
    </details>
  );
}

/**
 * Al pie de cada título: un artículo más **en ese título**, detrás del último.
 * Antes solo se podía desde el formulario del final, escribiendo el título a
 * mano y bien escrito.
 */
export function NuevoArticulo({
  competitionId,
  titulo,
  categoria,
  despuesDe,
}: {
  competitionId: string;
  /** Cómo se enseña el título, para el botón */
  titulo: string;
  /** Lo que se guarda (vacío en el título por defecto) */
  categoria: string;
  /** El último artículo del título: el nuevo va detrás */
  despuesDe: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(createRuleAction, null);
  const formulario = useRef<HTMLFormElement>(null);

  // Añadido, se cierra: el artículo ya sale en la lista, que es la confirmación
  useEffect(() => {
    if (state?.success) {
      formulario.current?.reset();
      setAbierto(false);
    }
  }, [state]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-brand-300 transition hover:bg-white/[0.03] sm:px-6"
      >
        ＋ Añadir un artículo a «{titulo}»
      </button>
    );
  }

  return (
    <form ref={formulario} action={formAction} className="space-y-3 px-4 py-4 sm:px-6">
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="category" value={categoria} />
      <input type="hidden" name="despuesDe" value={despuesDe} />
      <p className="antetitulo">Artículo nuevo en «{titulo}»</p>
      <div>
        <label className="label">Nombre del artículo</label>
        <input name="title" className="input" required autoFocus />
      </div>
      <div>
        <label className="label">Lo que dice</label>
        <textarea name="body" className="textarea" rows={5} />
        <p className="mt-1 text-xs text-slate-500">{BODY_HINT}</p>
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton>Añadir</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Cambiar el nombre de un título, junto a él. Un título es el nombre que
 * comparten sus artículos: se cambia en todos de una vez (ver la acción).
 */
export function RenombrarTitulo({ competitionId, titulo }: { competitionId: string; titulo: string }) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(renombrarTituloAction, null);

  useEffect(() => {
    if (state?.success) setAbierto(false);
  }, [state]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn-ghost btn-sm shrink-0"
        title={`Cambiar el nombre del título «${titulo}»`}
      >
        ✎ Nombre
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 w-full space-y-2">
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="antes" value={titulo} />
      <div className="flex gap-2">
        <input
          name="nuevo"
          className="input min-w-0 flex-1"
          defaultValue={titulo}
          aria-label="Nombre del título"
          required
          maxLength={80}
          autoFocus
        />
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Cambia en todos sus artículos. Si le pones el nombre de otro título, se juntan.
      </p>
      <FormMessage state={state} />
    </form>
  );
}

export function EditRuleForm({
  rule,
  empezado,
  titulos,
}: {
  rule: { id: string; title: string; body: string; category: string | null };
  /** Con el locke en marcha, un cambio se avisa a todos (si no se desmarca) */
  empezado: boolean;
  /** Los títulos que hay, para cambiarlo de uno a otro sin escribirlo a mano */
  titulos: string[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-4"
        onClick={() => setOpen(true)}
      >
        ✎ Editar el artículo
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateRuleAction(formData);
        setOpen(false);
      }}
      className="mt-4 space-y-3 border-t border-white/10 pt-4"
    >
      <input type="hidden" name="ruleId" value={rule.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre del artículo</label>
          <input name="title" className="input" defaultValue={rule.title} required />
        </div>
        <CampoDeTitulo titulos={titulos} defaultValue={rule.category ?? ""} />
      </div>
      <div>
        <label className="label">Lo que dice</label>
        <textarea
          name="body"
          className="textarea"
          rows={8}
          defaultValue={rule.body}
        />
        <p className="mt-1 text-xs text-slate-500">{BODY_HINT}</p>
      </div>
      {empezado ? (
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="avisar"
            defaultChecked
            className="mt-0.5 accent-indigo-500"
          />
          <span>
            Avisar a todos del cambio
            <span className="block text-xs text-slate-500">
              Quítalo si solo corriges una errata: así no le sale a nadie como
              regla cambiada.
            </span>
          </span>
        </label>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
