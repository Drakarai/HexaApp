"use client";

import { useActionState, useState } from "react";
import {
  borrarCopiaAction,
  crearCopiaAction,
  restaurarCopiaAction,
  restaurarFicheroAction,
} from "@/app/actions/copias";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { cx, formatDateTime } from "@/lib/utils";

export type CopiaView = {
  id: string;
  createdAt: string;
  kind: string;
  authorName: string | null;
  summary: string;
  rawSize: number;
};

const NOMBRE_DEL_MOTIVO: Record<string, string> = {
  auto: "Automática",
  manual: "A mano",
  previa: "Antes de restaurar",
};

const enMegas = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Las copias de seguridad. Tres cosas se pueden hacer con cada una: bajártela
 * —que es la única que sobrevive si se cae la base de datos—, restaurarla, o
 * tirarla.
 */
export function Backups({
  copias,
  seGuardan,
  cadaHoras,
}: {
  copias: CopiaView[];
  seGuardan: number;
  cadaHoras: number;
}) {
  const [aviso, hacerCopia, haciendo] = useActionState<FormState>(
    async () => crearCopiaAction(),
    null,
  );

  return (
    <section className="card">
      <h2 className="section-title mb-1">Copias de seguridad</h2>
      <p className="muted mb-4">
        Se hace una sola cada {cadaHoras} horas, cuando alguien entra, y se
        guardan las {seGuardan} últimas. Llevan todo dentro, fotos incluidas.{" "}
        <strong className="text-slate-300">
          Bájate una de vez en cuando
        </strong>
        : las de aquí viven en la misma base de datos que la aplicación, así que
        si se cae se van con ella.
      </p>

      <form action={hacerCopia} className="mb-4">
        <SubmitButton className="btn-ghost btn-sm">
          {haciendo ? "Copiando…" : "＋ Hacer una copia ahora"}
        </SubmitButton>
        <FormMessage state={aviso} />
      </form>

      {copias.length === 0 ? (
        <p className="muted">Todavía no hay ninguna copia.</p>
      ) : (
        <ul className="space-y-2">
          {copias.map((copia) => (
            <Copia key={copia.id} copia={copia} />
          ))}
        </ul>
      )}

      <RestaurarDesdeFichero />
    </section>
  );
}

function Copia({ copia }: { copia: CopiaView }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, restaurar] = useActionState(restaurarCopiaAction, null);

  return (
    <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {formatDateTime(copia.createdAt)}
          </p>
          <p className="truncate text-xs text-slate-500">
            {NOMBRE_DEL_MOTIVO[copia.kind] ?? copia.kind} · {enMegas(copia.rawSize)}
            {copia.authorName ? ` · ${copia.authorName}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={`/api/copia/${copia.id}`}
            className="btn-ghost btn-sm"
            download
          >
            ⬇ Descargar
          </a>
          <button
            type="button"
            className={cx("btn-ghost btn-sm", abierto && "text-amber-300")}
            onClick={() => setAbierto((estaba) => !estaba)}
          >
            ↺ Restaurar
          </button>
          <form action={borrarCopiaAction}>
            <input type="hidden" name="copiaId" value={copia.id} />
            <ConfirmSubmit message="¿Borrar esta copia?">✕</ConfirmSubmit>
          </form>
        </div>
      </div>

      <p className="mt-1.5 truncate text-[11px] text-slate-500" title={copia.summary}>
        {copia.summary}
      </p>

      {abierto ? (
        <form
          action={restaurar}
          className="mt-3 space-y-2 border-t border-white/10 pt-3"
        >
          <input type="hidden" name="copiaId" value={copia.id} />
          <p className="text-xs text-amber-300/90">
            Esto deja la aplicación exactamente como estaba el{" "}
            {formatDateTime(copia.createdAt)}. Todo lo apuntado después se
            pierde. Antes de tocar nada se guarda una copia de cómo está ahora,
            por si acaso.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="label">Escribe RESTAURAR para confirmar</label>
              <input
                name="confirmacion"
                className="input"
                autoComplete="off"
                placeholder="RESTAURAR"
              />
            </div>
            <SubmitButton className="btn-danger">Restaurar</SubmitButton>
          </div>
          <FormMessage state={estado} />
        </form>
      ) : null}
    </li>
  );
}

/** La salida de emergencia: si no queda base de datos, se sube el fichero. */
function RestaurarDesdeFichero() {
  const [abierto, setAbierto] = useState(false);
  const [estado, restaurar] = useActionState(restaurarFicheroAction, null);

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setAbierto((estaba) => !estaba)}
      >
        {abierto ? "▾" : "▸"} Restaurar desde un fichero descargado
      </button>

      {abierto ? (
        <form action={restaurar} className="mt-3 space-y-2">
          <p className="text-xs text-slate-400">
            Para cuando no queda nada: base de datos nueva y vacía, y el{" "}
            <code>.json</code> que te bajaste. Sube el fichero y la aplicación
            vuelve a estar como el día que lo descargaste.
          </p>
          <input
            type="file"
            name="fichero"
            accept="application/json,.json"
            className="input"
          />
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="label">Escribe RESTAURAR para confirmar</label>
              <input
                name="confirmacion"
                className="input"
                autoComplete="off"
                placeholder="RESTAURAR"
              />
            </div>
            <SubmitButton className="btn-danger">
              Restaurar del fichero
            </SubmitButton>
          </div>
          <FormMessage state={estado} />
        </form>
      ) : null}
    </div>
  );
}
