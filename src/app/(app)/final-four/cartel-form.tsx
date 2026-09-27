"use client";

import { useActionState } from "react";
import { guardarCartelDelFinalAction } from "@/app/actions/final-four";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { ImageListInput } from "@/components/image-list-input";
import { IMAGE_SIZES } from "@/lib/image";
import { Icono } from "@/components/icono";

/**
 * Las ilustraciones del final del locke.
 *
 * Es el relevo de las medallas: mientras quedan gimnasios, la tarjeta del
 * resumen enseña la medalla del que toca; cuando ya no queda ninguno, enseña
 * esto. Se pueden poner desde el principio, aunque todavía no haya cuadro.
 */
export function CartelDelFinal({
  competitionId,
  nombre,
  imagenes,
}: {
  competitionId: string;
  /** "Final Four" o "Jornada Final", según el formato */
  nombre: string;
  /** Las direcciones de las que ya hay, para verlas */
  imagenes: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    guardarCartelDelFinalAction,
    null,
  );

  return (
    <details className="card group mt-6">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        <Icono emoji="🖼️" /> Imágenes de {nombre}
      </summary>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competitionId} />
        <ImageListInput
          name="images"
          label={`Cartel de ${nombre}`}
          defaultValues={imagenes}
          maxSize={IMAGE_SIZES.badge}
          hint="Salen de fondo en la tarjeta del resumen cuando ya no quedan level caps que superar, alternándose como las medallas."
        />
        <FormMessage state={state} />
        <SubmitButton>Guardar el cartel</SubmitButton>
      </form>
    </details>
  );
}
