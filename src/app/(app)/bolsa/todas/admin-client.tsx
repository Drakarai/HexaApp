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
import { cx } from "@/lib/utils";
import { Dibujo } from "../bolsa-client";
import { Icono } from "@/components/icono";

/** Crear algo del catálogo: un objeto de los juegos, uno propio o un grupo. */
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
      <ObjetoPicker key={vuelta} yaPuestos={yaPuestos} permitirGrupo />
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
              {objeto.isGroup ? ` (grupo de ${objeto.options.length})` : ""}
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
 * Meter un objeto dentro de un grupo: es lo que saldrá a elegir cuando alguien
 * lo use. Se buscan con el mismo buscador que los del catálogo, porque casi
 * siempre son cosas del juego (Globo Helio, Casco Dentado…).
 *
 * Un grupo recién creado está vacío y no sirve de nada, así que ahí el
 * formulario sale ya abierto en vez de detrás de un botón.
 */
export function NuevaOpcion({
  itemId,
  vacio = false,
  etiqueta = "＋ Añadir un objeto al grupo",
}: {
  itemId: string;
  /** El grupo no tiene nada dentro: se abre solo */
  vacio?: boolean;
  etiqueta?: string;
}) {
  const [estado, anadir] = useActionState<FormState, FormData>(
    anadirOpcionAction,
    null,
  );
  const [vuelta, setVuelta] = useState(0);
  const [abierto, setAbierto] = useState(vacio);

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setAbierto(true)}
      >
        {etiqueta}
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
        {vacio ? null : (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setAbierto(false)}
          >
            Cerrar
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Una fila del catálogo.
 *
 * Lo de dentro de un grupo **no se esconde detrás de "Editar"**: es lo que le
 * da sentido y hay que verlo de un vistazo. Detrás del botón queda solo lo de
 * cambiar el nombre, la imagen y borrarlo.
 */
export function FichaDeCatalogo({
  objeto,
  dentro,
  edicion,
}: {
  objeto: ObjetoDelCatalogo;
  /** Los objetos del grupo y el formulario para meterle más */
  dentro?: React.ReactNode;
  /** Cambiar nombre e imagen y borrarlo, detrás del botón */
  edicion: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  const clase = objeto.isGroup
    ? `grupo de ${objeto.options.length} ${objeto.options.length === 1 ? "objeto" : "objetos"}`
    : objeto.apiSlug
      ? "de los juegos"
      : "propio";

  return (
    <li
      className={cx(
        "rounded-xl border p-3",
        objeto.isGroup
          ? "border-brand-500/25 bg-brand-600/[0.06]"
          : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="flex items-start gap-3">
        <Dibujo src={objeto.image} nombre={objeto.name} pequeno />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-100">
            {objeto.isGroup ? <><Icono emoji="📦" /> </> : null}
            {objeto.name}
          </p>
          <p className="text-xs text-slate-500">
            {clase} ·{" "}
            {objeto.enBolsas
              ? `en ${objeto.enBolsas} ${objeto.enBolsas === 1 ? "bolsa" : "bolsas"}`
              : "en ninguna bolsa"}
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

      {dentro ? <div className="mt-3">{dentro}</div> : null}
      {abierto ? <div className="mt-3 space-y-3">{edicion}</div> : null}
    </li>
  );
}
