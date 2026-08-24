"use client";

import { useActionState, useState } from "react";
import {
  anadirZonaAction,
  anidarZonaAction,
  borrarZonaAction,
  detectarZonasAction,
  editarZonaAction,
  guardarFondoAction,
  moverZonasAction,
} from "@/app/actions/mapas";
import type { FormState } from "@/app/actions/auth";
import { ImageInput } from "@/components/image-input";
import { Mapa } from "@/components/mapa";
import { FORMAS, TIPOS_DE_ZONA, colorDeZona } from "@/lib/zonas";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import type { MapaDeRegion, ZonaDelMapa } from "@/lib/mapas";
import { cx } from "@/lib/utils";

/**
 * El editor del mapa de una región.
 *
 * Se trabaja **sobre el mapa**: eliges una zona y ahí mismo la mueves, la
 * estiras por su esquina, le cambias la forma y el color, o la metes dentro de
 * otra. Nada de esto se hace bien desde una lista de cincuenta filas, que era
 * como estaba antes.
 */
export function EditorDeMapa({ mapa }: { mapa: MapaDeRegion }) {
  const [estadoMover, mover] = useActionState<FormState, FormData>(
    moverZonasAction,
    null,
  );
  const [elegidaId, setElegidaId] = useState<string | null>(null);

  const elegida =
    mapa.zones.find((zona) => zona.id === elegidaId) ??
    mapa.zones.flatMap((zona) => zona.children).find((h) => h.id === elegidaId) ??
    null;

  /** Las que no acaban dibujadas: las de dentro de un grupo y las sin forma. */
  const sueltas = [
    ...mapa.zones
      .filter((zona) => zona.shape === "none")
      .map((zona) => ({ zona, dentroDe: null as string | null })),
    ...mapa.zones.flatMap((padre) =>
      padre.children.map((hija) => ({ zona: hija, dentroDe: padre.name })),
    ),
  ];

  return (
    <div className="space-y-3">
      <Mapa
        mapa={mapa}
        editable
        seleccionada={elegidaId}
        onZona={(zona) => setElegidaId(zona.id)}
        onMover={(sitios) => {
          const datos = new FormData();
          datos.set("sitios", JSON.stringify(sitios));
          mover(datos);
        }}
      />
      {estadoMover?.error ? <FormMessage state={estadoMover} /> : null}

      {elegida ? (
        <div className="rounded-xl border border-brand-500/30 bg-brand-600/[0.07] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">
              {elegida.name}
            </p>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setElegidaId(null)}
            >
              ✕
            </button>
          </div>
          <PanelDeZona zona={elegida} mapa={mapa} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-slate-500">
          Toca una zona del mapa para moverla, estirarla por su esquina o
          cambiarle el nombre, la forma y el color.
        </p>
      )}

      {/*
        Al mapa no llegan ni las que están dentro de un grupo ni las que no
        tienen forma. Sin esta lista quedarían **inalcanzables**: metías una
        zona en un grupo y ya no había manera de volver a abrirla para sacarla.
      */}
      {sueltas.length ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            No se dibujan en el mapa
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sueltas.map(({ zona, dentroDe }) => (
              <button
                key={zona.id}
                type="button"
                onClick={() => setElegidaId(zona.id)}
                className={cx(
                  "chip cursor-pointer",
                  elegidaId === zona.id &&
                    "border-brand-500/40 bg-brand-600/20 text-white",
                )}
              >
                {zona.name}
                <span className="text-xs text-slate-500">
                  {dentroDe ? `en ${dentroDe}` : "sin forma"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Añadir una zona que falte. Sale en el centro y se coloca arrastrando. */
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
        <select name="kind" className="input w-40" defaultValue="ruta">
          {TIPOS_DE_ZONA.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </select>
        <select name="shape" className="input w-36" defaultValue="rect">
          {FORMAS.filter((forma) => forma.id !== "poly").map((forma) => (
            <option key={forma.id} value={forma.id}>
              {forma.nombre}
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
 * Sacar las zonas de la imagen de fondo mirando sus colores.
 *
 * Es lo que convierte colocar cincuenta zonas a mano en ponerles el nombre.
 */
export function DetectarZonas({
  slug,
  hayImagen,
}: {
  slug: string;
  hayImagen: boolean;
}) {
  const [estado, detectar] = useActionState<FormState, FormData>(
    detectarZonasAction,
    null,
  );

  return (
    <form action={detectar} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <p className="text-xs text-slate-500">
        Si el mapa de fondo es de los que llevan las casillas dibujadas —las
        ciudades en rojo y las rutas en blanco—, puedo sacarlas y crear una zona
        por cada una, en su sitio. Después solo hay que renombrarlas.
      </p>
      <FormMessage state={estado} />
      <SubmitButton className="btn-ghost btn-sm" pendingLabel="Mirando la imagen…">
        🔍 Sacar las zonas de la imagen
      </SubmitButton>
      {!hayImagen ? (
        <p className="text-xs text-amber-300/90">
          Antes hay que ponerle la imagen de fondo, aquí abajo.
        </p>
      ) : null}
    </form>
  );
}

/** La imagen de fondo y el tamaño del lienzo. */
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
        🖼️ {mapa.image ? "Cambiar el mapa de fondo" : "Ponerle el mapa de fondo"}
      </button>
    );
  }

  return (
    <form
      action={guardar}
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
    >
      <input type="hidden" name="slug" value={mapa.slug} />
      <ImageInput
        name="image"
        label="Imagen del mapa"
        defaultValue={mapa.image}
        maxSize={1600}
        hint="Cuanto más grande, mejor se verá: la imagen se estira al lienzo entero. Ponle abajo las mismas proporciones que tenga."
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

/** El cuadradito de color, para no tener que escribir un código hexadecimal. */
export function ColorDeZona({
  nombre,
  valor,
  tipo,
}: {
  nombre: string;
  valor: string | null;
  tipo: string;
}) {
  const [color, setColor] = useState(valor ?? "");
  const porDefecto = colorDeZona(tipo);

  return (
    <div>
      <label className="label">Color</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-ink-850 p-1"
          value={color || porDefecto}
          onChange={(evento) => setColor(evento.target.value)}
          aria-label="Elegir color"
        />
        {color ? (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setColor("")}
          >
            El de su tipo
          </button>
        ) : (
          <span className="text-xs text-slate-500">
            Ahora usa el de su tipo
          </span>
        )}
      </div>
      <input type="hidden" name={nombre} value={color} />
    </div>
  );
}

/**
 * El formulario de la zona elegida.
 *
 * Va aquí, en el cliente, y no en la página: un componente de servidor **no
 * puede pasarle una función** a uno de cliente (pasó, y la página entera se
 * quedó en blanco). Las acciones de servidor sí se pueden usar desde aquí, que
 * es justo para lo que están.
 */
function PanelDeZona({
  zona,
  mapa,
}: {
  zona: ZonaDelMapa;
  mapa: MapaDeRegion;
}) {
  return (
    <div className="space-y-3">
      <form action={editarZonaAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="zoneId" value={zona.id} />
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input
            key={`n-${zona.id}`}
            name="name"
            className="input"
            maxLength={60}
            defaultValue={zona.name}
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select
            key={`k-${zona.id}`}
            name="kind"
            className="input"
            defaultValue={zona.kind}
          >
            {TIPOS_DE_ZONA.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Forma</label>
          <select
            key={`s-${zona.id}`}
            name="shape"
            className="input"
            defaultValue={zona.shape}
          >
            {FORMAS.map((forma) => (
              <option key={forma.id} value={forma.id}>
                {forma.nombre}
              </option>
            ))}
          </select>
        </div>
        <ColorDeZona
          key={`c-${zona.id}`}
          nombre="color"
          valor={zona.color}
          tipo={zona.kind}
        />
        <div className="flex items-end">
          <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
        </div>
      </form>

      <form
        action={anidarZonaAction}
        className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3"
      >
        <input type="hidden" name="zoneId" value={zona.id} />
        <div className="min-w-48 flex-1">
          <label className="label">Dentro de</label>
          <select
            key={`p-${zona.id}`}
            name="parentId"
            className="input"
            defaultValue={zona.parentId ?? ""}
          >
            <option value="">— Suelta en el mapa —</option>
            {mapa.zones
              .filter((otra) => otra.id !== zona.id)
              .map((otra) => (
                <option key={otra.id} value={otra.id}>
                  {otra.name}
                </option>
              ))}
          </select>
        </div>
        <SubmitButton className="btn-ghost btn-sm">Mover ahí</SubmitButton>
        <p className="w-full text-xs text-slate-500">
          Una zona metida dentro de otra deja de dibujarse: al tocar a la de
          fuera, sale la lista de las que lleva dentro.
          {zona.children.length
            ? ` Ahora lleva dentro: ${zona.children.map((hija) => hija.name).join(", ")}.`
            : ""}
        </p>
      </form>

      <form action={borrarZonaAction} className="border-t border-white/10 pt-3">
        <input type="hidden" name="zoneId" value={zona.id} />
        <ConfirmSubmit
          className="btn-ghost btn-sm text-red-300"
          message={`¿Borrar "${zona.name}" del mapa? Las capturas que hubiera apuntadas ahí pasan a capturas extra.`}
        >
          Borrar la zona
        </ConfirmSubmit>
      </form>
    </div>
  );
}
