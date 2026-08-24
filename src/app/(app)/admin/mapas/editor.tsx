"use client";

import { useActionState, useState } from "react";
import {
  anadirZonaAction,
  guardarFondoAction,
  moverZonasAction,
} from "@/app/actions/mapas";
import type { FormState } from "@/app/actions/auth";
import { ImageInput } from "@/components/image-input";
import { Mapa } from "@/components/mapa";
import { TIPOS_DE_ZONA } from "@/lib/zonas";
import { FormMessage, SubmitButton } from "@/components/ui";
import { IMAGE_SIZES } from "@/lib/image";
import type { MapaDeRegion } from "@/lib/mapas";

/**
 * El editor del mapa de una región: arrastrar las zonas, añadir, y ponerle de
 * fondo la imagen del mapa oficial si alguien la sube.
 *
 * Renombrar y borrar una zona van en la lista de al lado, con formularios de
 * servidor normales: aquí solo está lo que necesita el ratón.
 */
export function EditorDeMapa({ mapa }: { mapa: MapaDeRegion }) {
  const [estadoMover, mover] = useActionState<FormState, FormData>(
    moverZonasAction,
    null,
  );

  return (
    <div className="space-y-3">
      <Mapa
        mapa={mapa}
        editable
        onMover={(sitios) => {
          const datos = new FormData();
          datos.set("sitios", JSON.stringify(sitios));
          mover(datos);
        }}
      />
      {estadoMover ? <FormMessage state={estadoMover} /> : null}
    </div>
  );
}

/** Añadir una zona que falte. Sale en el centro y se arrastra a su sitio. */
export function NuevaZona({ slug }: { slug: string }) {
  const [estado, anadir] = useActionState<FormState, FormData>(
    anadirZonaAction,
    null,
  );

  return (
    <form action={anadir} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          className="input min-w-40 flex-1"
          maxLength={60}
          placeholder="Ruta 49"
        />
        <select name="kind" className="input w-44" defaultValue="ruta">
          {TIPOS_DE_ZONA.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </select>
      </div>
      <FormMessage state={estado} />
      <SubmitButton className="btn-primary btn-sm">Añadir zona</SubmitButton>
    </form>
  );
}

/**
 * La imagen de fondo y el tamaño del lienzo.
 *
 * Va detrás de un botón porque es lo que menos se toca: la mayoría de las veces
 * el esquema vale y nadie sube nada.
 */
export function FondoDelMapa({ mapa }: { mapa: MapaDeRegion }) {
  const [estado, guardar] = useActionState<FormState, FormData>(
    guardarFondoAction,
    null,
  );
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setAbierto(true)}
      >
        🖼️ {mapa.image ? "Cambiar el fondo" : "Ponerle el mapa de fondo"}
      </button>
    );
  }

  return (
    <form action={guardar} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <input type="hidden" name="slug" value={mapa.slug} />
      <ImageInput
        name="image"
        label="Imagen del mapa"
        defaultValue={mapa.image}
        maxSize={1600}
        hint="La imagen se estira al lienzo entero, así que ponle las mismas proporciones que el ancho y el alto de abajo."
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ancho del lienzo</label>
          <input
            name="width"
            type="number"
            className="input"
            min={200}
            max={4000}
            defaultValue={mapa.width}
          />
        </div>
        <div>
          <label className="label">Alto</label>
          <input
            name="height"
            type="number"
            className="input"
            min={200}
            max={4000}
            defaultValue={mapa.height}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Si cambias el tamaño, las zonas se quedan donde estaban en números, así
        que tendrás que recolocarlas.
      </p>
      <FormMessage state={estado} />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setAbierto(false)}
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}

/** La lista de zonas, plegable: con cincuenta ocupa mucho. */
export function ListaDeZonas({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
      >
        {abierto ? "Cerrar la lista" : "✎ Renombrar o borrar zonas"}
      </button>
      {abierto ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
