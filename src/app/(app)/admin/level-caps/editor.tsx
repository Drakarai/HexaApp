"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  anadirItemPlantillaAction,
  borrarItemPlantillaAction,
  copiarDeOtraPlantillaAction,
  editarItemPlantillaAction,
  moverItemPlantillaAction,
} from "@/app/actions/plantillas";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { ImageListInput } from "@/components/image-list-input";
import { IMAGE_SIZES } from "@/lib/image";
import { LEVEL_CAP_KIND_LABELS, LEVEL_CAP_KINDS } from "@/lib/constants";
import type { ItemDePlantilla } from "@/lib/plantillas";

const TIPOS = Object.values(LEVEL_CAP_KINDS);

/**
 * Un hito de la plantilla, editable en su sitio. Se guarda al darle a Guardar,
 * no al escribir: son cuatro campos y así no se manda una petición por tecla.
 */
export function ItemDeLaPlantilla({
  item,
  imagenes,
  primero,
  ultimo,
}: {
  item: ItemDePlantilla;
  /** Direcciones de sus medallas, no las medallas: ver lib/imagen-url.ts */
  imagenes: string[];
  primero: boolean;
  ultimo: boolean;
}) {
  return (
    <li className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <form action={editarItemPlantillaAction} className="grid gap-2 sm:grid-cols-12">
        <input type="hidden" name="itemId" value={item.id} />
        <div className="sm:col-span-4">
          <label className="label">Nombre</label>
          <input name="label" className="input" defaultValue={item.label} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Nivel</label>
          <input
            name="cap"
            type="number"
            min={1}
            max={100}
            className="input"
            defaultValue={item.cap}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Tipo</label>
          <select name="kind" className="input" key={String(item.kind)} defaultValue={item.kind}>
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {LEVEL_CAP_KIND_LABELS[tipo] ?? tipo}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="label">Dónde y de qué</label>
          <input
            name="notes"
            className="input"
            defaultValue={item.notes ?? ""}
            placeholder="Ciudad Malva · Volador"
          />
        </div>
        <div className="sm:col-span-12">
          <ImageListInput
            name="images"
            label="Medallas o líderes"
            defaultValues={imagenes}
            maxSize={IMAGE_SIZES.badge}
            hint="Se copian al locke con el resto: así una edición nueva sale ya con sus medallas puestas."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-12">
          <SubmitButton className="btn-ghost btn-sm">Guardar</SubmitButton>
        </div>
      </form>

      <div className="mt-2 flex flex-wrap gap-2 border-t border-white/5 pt-2">
        <MoverBoton itemId={item.id} hacia="arriba" disabled={primero} />
        <MoverBoton itemId={item.id} hacia="abajo" disabled={ultimo} />
        <form action={borrarItemPlantillaAction} className="ml-auto">
          <input type="hidden" name="itemId" value={item.id} />
          <ConfirmSubmit
            className="btn-ghost btn-sm"
            message={`¿Quitar "${item.label}" de la plantilla? Los lockes que ya lo tuvieran no se tocan.`}
          >
            ✕
          </ConfirmSubmit>
        </form>
      </div>
    </li>
  );
}

function MoverBoton({
  itemId,
  hacia,
  disabled,
}: {
  itemId: string;
  hacia: "arriba" | "abajo";
  disabled: boolean;
}) {
  return (
    <form action={moverItemPlantillaAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="hacia" value={hacia} />
      <button
        type="submit"
        className="btn-ghost btn-sm disabled:opacity-30"
        disabled={disabled}
        title={hacia === "arriba" ? "Subir" : "Bajar"}
      >
        {hacia === "arriba" ? "↑" : "↓"}
      </button>
    </form>
  );
}

/** Añadir un hito que no venía de fábrica. */
export function NuevoItemDePlantilla({ grupoId }: { grupoId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    anadirItemPlantillaAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // El selector de imagen lleva su propio estado: un reset() del formulario no
  // lo limpiaría, así que se remonta con la clave
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setResetKey((n) => n + 1);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-12"
    >
      <input type="hidden" name="grupoId" value={grupoId} />
      <div className="sm:col-span-4">
        <label className="label">Nombre</label>
        <input name="label" className="input" placeholder="Pegaso" required />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Nivel</label>
        <input
          name="cap"
          type="number"
          min={1}
          max={100}
          className="input"
          defaultValue={20}
        />
      </div>
      <div className="sm:col-span-3">
        <label className="label">Tipo</label>
        <select name="kind" className="input" defaultValue={LEVEL_CAP_KINDS.GYM}>
          {TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {LEVEL_CAP_KIND_LABELS[tipo] ?? tipo}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-3">
        <label className="label">Dónde y de qué</label>
        <input name="notes" className="input" placeholder="Ciudad Malva · Volador" />
      </div>
      <div className="sm:col-span-12">
        <ImageListInput
          key={resetKey}
          name="images"
          label="Medallas o líderes"
          maxSize={IMAGE_SIZES.badge}
          hint="Opcional. Se copian al locke junto con el hito."
        />
      </div>
      <div className="sm:col-span-12">
        <FormMessage state={state} />
        <SubmitButton className="btn-ghost mt-1">Añadir hito</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Copiar los hitos de otra plantilla ya hecha.
 *
 * Una tercera versión o un remake se parecen muchísimo a su pareja original, y
 * lo que cambia son dos o tres cosas. Copiar y retocar es mucho menos trabajo
 * que escribirlo todo otra vez, y evita que la aplicación tenga que fingir que
 * se sabe de memoria las diferencias de cada versión.
 */
export function CopiarDeOtra({
  grupoId,
  candidatos,
}: {
  grupoId: string;
  /** Los grupos que ya tienen hitos preparados */
  candidatos: Array<{ id: string; nombre: string; hitos: number }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    copiarDeOtraPlantillaAction,
    null,
  );

  if (!candidatos.length) return null;

  return (
    <form action={formAction} className="border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <label className="label">Copiar los hitos de</label>
          <select name="origenId" className="input" required defaultValue="">
            <option value="" disabled>
              Elige una plantilla
            </option>
            {candidatos.map((candidato) => (
              <option key={candidato.id} value={candidato.id}>
                {candidato.nombre} ({candidato.hitos})
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="grupoId" value={grupoId} />
        <SubmitButton className="btn-ghost">Copiar</SubmitButton>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Para las terceras versiones y los remakes: trae las de su pareja y
        cambia solo lo que sea distinto. Solo añade lo que falte.
      </p>
      <FormMessage state={state} />
    </form>
  );
}
