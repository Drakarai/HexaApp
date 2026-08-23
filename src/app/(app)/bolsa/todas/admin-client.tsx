"use client";

import { useActionState, useState } from "react";
import {
  anadirOpcionAction,
  crearObjetoAction,
  darObjetoAction,
} from "@/app/actions/bolsa";
import type { FormState } from "@/app/actions/auth";
import { ObjetoPicker } from "@/components/objeto-picker";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { ObjetoDelCatalogo } from "@/lib/bolsa";
import { Dibujo } from "../bolsa-client";

/** Crear un objeto del catálogo: de la lista de los juegos o inventado. */
export function NuevoObjeto({ yaPuestos }: { yaPuestos: string[] }) {
  const [estado, crear] = useActionState<FormState, FormData>(
    crearObjetoAction,
    null,
  );
  // Vaciar el buscador después de crear: si no, el siguiente sale con el
  // anterior escrito y es fácil crearlo dos veces
  const [vuelta, setVuelta] = useState(0);

  return (
    <form
      action={async (formData) => {
        await crear(formData);
        setVuelta((n) => n + 1);
      }}
      className="space-y-3"
    >
      <ObjetoPicker key={vuelta} yaPuestos={yaPuestos} />
      <div>
        <label className="label">Para qué sirve (opcional)</label>
        <input
          name="description"
          className="input"
          maxLength={140}
          placeholder="Repite una captura de una ruta que ya hayas hecho"
        />
      </div>
      <FormMessage state={estado} />
      <SubmitButton className="btn-primary btn-sm">
        Añadir al catálogo
      </SubmitButton>
    </form>
  );
}

/** Meter un objeto en la bolsa de alguien. */
export function DarObjeto({
  participantId,
  catalogo,
}: {
  participantId: string;
  catalogo: ObjetoDelCatalogo[];
}) {
  const [estado, dar] = useActionState<FormState, FormData>(
    darObjetoAction,
    null,
  );

  if (!catalogo.length) {
    return (
      <p className="text-xs text-slate-500">
        Antes hay que crear objetos en el catálogo, abajo.
      </p>
    );
  }

  return (
    <form action={dar} className="space-y-2">
      <input type="hidden" name="participantId" value={participantId} />
      <div className="flex flex-wrap gap-2">
        <select name="itemId" className="input min-w-40 flex-1" defaultValue="">
          <option value="" disabled>
            Elige un objeto…
          </option>
          {catalogo.map((objeto) => (
            <option key={objeto.id} value={objeto.id}>
              {objeto.name}
              {objeto.options.length ? " (con opciones)" : ""}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="quantity"
          className="input w-20"
          min={1}
          max={99}
          defaultValue={1}
          aria-label="Cantidad"
        />
      </div>
      <input
        name="note"
        className="input"
        maxLength={120}
        placeholder="Apunte (opcional): de dónde ha salido"
      />
      <FormMessage state={estado} />
      <SubmitButton className="btn-primary btn-sm">Dárselo</SubmitButton>
    </form>
  );
}

/**
 * Las opciones de un objeto: lo que sale a elegir cuando alguien lo usa.
 * Se añaden con el mismo buscador que los objetos, porque casi siempre son
 * cosas del juego.
 */
export function NuevaOpcion({ itemId }: { itemId: string }) {
  const [estado, anadir] = useActionState<FormState, FormData>(
    anadirOpcionAction,
    null,
  );
  const [vuelta, setVuelta] = useState(0);
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setAbierto(true)}
      >
        ＋ Añadir una opción
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await anadir(formData);
        setVuelta((n) => n + 1);
      }}
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <ObjetoPicker key={vuelta} />
      <FormMessage state={estado} />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary btn-sm">Añadir</SubmitButton>
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

/** Una fila del catálogo con lo que se puede hacerle. */
export function FichaDeCatalogo({
  objeto,
  children,
}: {
  objeto: ObjetoDelCatalogo;
  /** Los formularios de servidor (editar, borrar, borrar opciones) */
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start gap-3">
        <Dibujo src={objeto.image} nombre={objeto.name} pequeno />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-100">{objeto.name}</p>
          <p className="text-xs text-slate-500">
            {[
              objeto.apiSlug ? "de los juegos" : "inventado",
              objeto.options.length
                ? `${objeto.options.length} opciones`
                : "sin opciones",
              objeto.enBolsas
                ? `en ${objeto.enBolsas} ${objeto.enBolsas === 1 ? "bolsa" : "bolsas"}`
                : "en ninguna bolsa",
            ].join(" · ")}
          </p>
          {objeto.description ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {objeto.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm shrink-0"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
        >
          {abierto ? "Cerrar" : "Editar"}
        </button>
      </div>

      {abierto ? <div className="mt-3 space-y-3">{children}</div> : null}
    </li>
  );
}
