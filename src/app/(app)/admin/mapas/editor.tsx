"use client";

import { startTransition, useActionState, useState } from "react";
import {
  anadirZonaAction,
  anadirTrozoAction,
  anidarZonaAction,
  borrarZonaAction,
  detectarZonasAction,
  editarZonaAction,
  guardarFondoAction,
  moverZonasAction,
  recolocarZonasAction,
  rellenarRegionAction,
  type EstadoDelEditor,
} from "@/app/actions/mapas";
import { ImageInput } from "@/components/image-input";
import { Mapa } from "@/components/mapa";
import { FORMAS, TIPOS_DE_ZONA, colorDeZona, lienzoProbable, zonasQueSeSalen } from "@/lib/zonas";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import type { MapaDeRegion, TrozoDeZona, ZonaDelMapa } from "@/lib/mapas";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { DibujoVacio } from "@/components/dibujo-vacio";

type AlCambiar = (mapa: MapaDeRegion) => void;

/**
 * Una acción del editor que, al volver, le pasa al editor el mapa como ha
 * quedado. Las acciones ya no refrescan la página (ver `EstadoDelEditor`): es
 * esto lo que repinta lo que se ha tocado, sin saltos ni recargas.
 */
function useAccionDelEditor(
  accion: (antes: EstadoDelEditor, datos: FormData) => Promise<EstadoDelEditor>,
  alCambiar: AlCambiar,
) {
  return useActionState<EstadoDelEditor, FormData>(async (antes, datos) => {
    const resultado = await accion(antes, datos);
    if (resultado?.mapa) alCambiar(resultado.mapa);
    // El mapa ya está guardado arriba: no hace falta tenerlo dos veces
    return resultado ? { error: resultado.error, success: resultado.success } : resultado;
  }, null);
}

/**
 * La región que se está editando, entera: la cabecera con sus cuentas, el
 * mapa, y lo de añadir zonas, sacarlas de la imagen y el fondo. **Guarda el
 * mapa aquí**, en el navegador, y cada cambio lo sustituye por el que devuelve
 * el servidor.
 */
export function RegionEnEdicion({
  mapa: delServidor,
  hayDeFabrica,
}: {
  mapa: MapaDeRegion;
  /** Si hay zonas escritas de fábrica para rellenar una región vacía */
  hayDeFabrica: boolean;
}) {
  const [mapa, setMapa] = useState(delServidor);
  // Al cambiar de región (o rellenarla de fábrica) manda lo que llega del servidor
  const [anterior, setAnterior] = useState(delServidor);
  if (delServidor !== anterior) {
    setAnterior(delServidor);
    setMapa(delServidor);
  }

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">{mapa.name}</h2>
        <span className="text-xs text-slate-500">
          {mapa.zones.length} {mapa.zones.length === 1 ? "zona" : "zonas"} ·
          lienzo {mapa.width}×{mapa.height}
        </span>
      </div>

      <ZonasFuera mapa={mapa} alCambiar={setMapa} />

      {mapa.zones.length ? (
        <EditorDeMapa mapa={mapa} alCambiar={setMapa} />
      ) : (
        <div className="px-4 py-6 text-center">
          <DibujoVacio dibujo="mapa" />
          <p className="mt-3 text-sm text-slate-300">Este mapa está vacío.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Ponle abajo la imagen del mapa y saca las zonas de ella, o ve
            añadiéndolas a mano y colocándolas encima.
          </p>
          {hayDeFabrica ? (
            <form action={rellenarRegionAction} className="mt-3">
              <input type="hidden" name="slug" value={mapa.slug} />
              <button type="submit" className="btn-ghost btn-sm">
                O usar los nombres de {mapa.name} que traigo escritos
              </button>
            </form>
          ) : null}
        </div>
      )}

      <div className="space-y-3 border-t border-white/5 pt-4">
        <NuevaZona slug={mapa.slug} alCambiar={setMapa} />
        <div className="border-t border-white/5 pt-3">
          <DetectarZonas slug={mapa.slug} hayImagen={Boolean(mapa.image)} alCambiar={setMapa} />
        </div>
        <div className="border-t border-white/5 pt-3">
          <FondoDelMapa mapa={mapa} alCambiar={setMapa} />
        </div>
      </div>
    </section>
  );
}

/**
 * El editor del mapa de una región.
 *
 * Se trabaja **sobre el mapa**: eliges una zona y ahí mismo la mueves, la
 * estiras por su esquina, le cambias la forma y el color, o la metes dentro de
 * otra. Nada de esto se hace bien desde una lista de cincuenta filas, que era
 * como estaba antes.
 */
function EditorDeMapa({ mapa, alCambiar }: { mapa: MapaDeRegion; alCambiar: AlCambiar }) {
  const [estadoMover, mover] = useAccionDelEditor(moverZonasAction, alCambiar);
  const [elegidaId, setElegidaId] = useState<string | null>(null);

  const elegida =
    mapa.zones.find((zona) => zona.id === elegidaId) ??
    mapa.zones.flatMap((zona) => zona.children).find((h) => h.id === elegidaId) ??
    null;
  // O un trozo de una ruta partida, con la ruta de la que es
  const rutaDelTrozo = elegida ? null : (mapa.zones.find((zona) => zona.trozos.some((t) => t.id === elegidaId)) ?? null);
  const trozo = rutaDelTrozo?.trozos.find((t) => t.id === elegidaId) ?? null;

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
          datos.set("slug", mapa.slug);
          datos.set("sitios", JSON.stringify(sitios));
          // Fuera de un formulario, la acción tiene que ir en una transición
          startTransition(() => mover(datos));
        }}
      />
      {estadoMover?.error ? <FormMessage state={estadoMover} /> : null}

      {trozo && rutaDelTrozo ? (
        <div className="rounded-xl border border-brand-500/30 bg-brand-600/[0.07] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">Otro trozo de «{rutaDelTrozo.name}»</p>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setElegidaId(null)}>
              ✕
            </button>
          </div>
          <PanelDeTrozo
            trozo={trozo}
            ruta={rutaDelTrozo}
            mapa={mapa}
            alCambiar={alCambiar}
            alVolver={() => setElegidaId(rutaDelTrozo.id)}
          />
        </div>
      ) : elegida ? (
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
          {elegida.shape === "poly" ? (
            <p className="mb-3 text-xs text-slate-400">
              Arrastra los puntos blancos de las esquinas para darle forma; el «+» de en medio de
              cada lado añade una esquina, y dos toques en una la quitan. Las esquinas se pegan en
              línea recta con las de al lado cuando pasan cerca.
            </p>
          ) : null}
          <PanelDeZona zona={elegida} mapa={mapa} alCambiar={alCambiar} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-slate-500">
          Toca una zona del mapa para moverla, estirarla por su esquina,
          girarla con el tirador ↻ o cambiarle el nombre, la forma y el color.
          Para una ruta en L o con forma rara, ponle la forma «A medida».
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

/**
 * Las zonas que se salen del lienzo. Pasaba al cambiar su tamaño antes de que
 * las zonas se movieran con él: se quedaban en sus números, fuera del dibujo,
 * y parecía que se habían borrado. Se dice qué tamaño tenía y se recolocan.
 */
function ZonasFuera({ mapa, alCambiar }: { mapa: MapaDeRegion; alCambiar: AlCambiar }) {
  const [estado, recolocar] = useAccionDelEditor(recolocarZonasAction, alCambiar);
  const todas = mapa.zones.flatMap((zona) => [zona, ...zona.children]);
  const fuera = zonasQueSeSalen(todas, mapa.width, mapa.height);
  if (!fuera.length) return estado?.success ? <FormMessage state={estado} /> : null;
  const probable = lienzoProbable(todas);

  return (
    <form
      action={recolocar}
      className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-sm"
    >
      <input type="hidden" name="slug" value={mapa.slug} />
      <p className="text-amber-100">
        <strong>
          {fuera.length === 1 ? "Una zona se sale" : `${fuera.length} zonas se salen`} del mapa
        </strong>{" "}
        ({fuera.slice(0, 4).map((zona) => zona.name).join(", ")}
        {fuera.length > 4 ? "…" : ""}). No están borradas: siguen en los números del tamaño de
        lienzo de antes. Pon el tamaño que tenía cuando las colocaste y se recolocan sobre la
        imagen.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Ancho de antes</label>
          <input
            name="anchoAntes"
            type="number"
            className="input w-28"
            min={100}
            max={10000}
            defaultValue={probable.ancho}
            required
          />
        </div>
        <div>
          <label className="label">Alto de antes</label>
          <input
            name="altoAntes"
            type="number"
            className="input w-28"
            min={100}
            max={10000}
            defaultValue={probable.alto}
            required
          />
        </div>
        <SubmitButton className="btn-primary btn-sm" pendingLabel="Recolocando…">
          Recolocarlas
        </SubmitButton>
      </div>
      <FormMessage state={estado} />
    </form>
  );
}

/** Añadir una zona que falte. Sale en el centro y se coloca arrastrando. */
function NuevaZona({ slug, alCambiar }: { slug: string; alCambiar: AlCambiar }) {
  const [estado, anadir] = useAccionDelEditor(anadirZonaAction, alCambiar);

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
          {FORMAS.map((forma) => (
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
function DetectarZonas({
  slug,
  hayImagen,
  alCambiar,
}: {
  slug: string;
  hayImagen: boolean;
  alCambiar: AlCambiar;
}) {
  const [estado, detectar] = useAccionDelEditor(detectarZonasAction, alCambiar);

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
        <Icono emoji="🔍" /> Sacar las zonas de la imagen
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
function FondoDelMapa({ mapa, alCambiar }: { mapa: MapaDeRegion; alCambiar: AlCambiar }) {
  const [estado, guardar] = useAccionDelEditor(guardarFondoAction, alCambiar);
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => setAbierto(true)}
      >
        <Icono emoji="🖼️" /> {mapa.image ? "Cambiar el mapa de fondo" : "Ponerle el mapa de fondo"}
      </button>
    );
  }

  return (
    <form
      // Con lo guardado de `key`, por lo mismo que el panel de la zona (ver
      // allí): si no, tras guardar volvían el ancho y el alto de antes
      key={`fondo-${mapa.width}-${mapa.height}-${mapa.relleno}-${mapa.image ?? ""}`}
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
      <Relleno inicial={Math.round(mapa.relleno * 100)} />
      <p className="text-xs text-slate-500">
        Si cambias el tamaño, las zonas se mueven con él y siguen en su sitio
        sobre la imagen.
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

/**
 * Cuánto se rellenan las zonas de este mapa.
 *
 * Con un mapa de casillas dibujadas interesa el 100: la zona se pinta entera y
 * se ve de lejos. Con una imagen de verdad —las islas de Alola, que son un
 * dibujo detallado y no una cuadrícula— eso tapa el mapa, así que se baja y
 * cada zona se queda en un punto de color encima del sitio que marca.
 */
function Relleno({ inicial }: { inicial: number }) {
  const [valor, setValor] = useState(inicial);

  return (
    <div>
      <label className="label" htmlFor="relleno">
        Relleno de las zonas · {valor}%
      </label>
      <input
        id="relleno"
        name="relleno"
        type="range"
        min={10}
        max={100}
        step={5}
        value={valor}
        onChange={(evento) => setValor(Number(evento.target.value))}
        className="w-full accent-brand-500"
      />
      <p className="text-xs text-slate-500">
        Bájalo si el mapa de fondo es un dibujo detallado: las zonas quedan como
        puntos encima en vez de taparlo. El borde se sigue viendo igual.
      </p>
    </div>
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
  alCambiar,
}: {
  zona: ZonaDelMapa;
  mapa: MapaDeRegion;
  alCambiar: AlCambiar;
}) {
  const [estadoEditar, editar] = useAccionDelEditor(editarZonaAction, alCambiar);
  const [estadoAnidar, anidar] = useAccionDelEditor(anidarZonaAction, alCambiar);
  const [estadoBorrar, borrar] = useAccionDelEditor(borrarZonaAction, alCambiar);
  const [estadoTrozo, anadirTrozo] = useAccionDelEditor(anadirTrozoAction, alCambiar);

  /**
   * Cómo está guardada la zona ahora mismo. Los formularios van con ella de
   * `key` para **volver a montarse con lo guardado** cada vez que cambia: al
   * terminar una acción, React devuelve los campos a sus valores del principio,
   * así que tras guardar el tipo o la forma volvían a salir los de antes —y al
   * guardar otra cosa se mandaban esos y se deshacía el cambio—. Solo el nombre
   * y el color parecían guardarse.
   */
  const guardada = [zona.id, zona.name, zona.kind, zona.shape, zona.angle, zona.color ?? ""].join("|");

  return (
    <div className="space-y-3">
      <form key={`editar-${guardada}`} action={editar} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="slug" value={mapa.slug} />
        <input type="hidden" name="zoneId" value={zona.id} />
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input
            name="name"
            className="input"
            maxLength={60}
            defaultValue={zona.name}
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select
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
          nombre="color"
          valor={zona.color}
          tipo={zona.kind}
        />
        <div>
          <label className="label">Giro</label>
          <div className="flex items-center gap-2">
            <input
              name="angle"
              type="number"
              className="input w-24"
              min={0}
              max={359}
              step={5}
              defaultValue={zona.angle}
            />
            <span className="text-xs text-slate-500">
              grados, o con el tirador ↻ del mapa
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
          {estadoEditar?.success ? (
            <span className="pb-1.5 text-xs text-emerald-300">{estadoEditar.success}</span>
          ) : null}
        </div>
        {estadoEditar?.error ? (
          <div className="sm:col-span-2">
            <FormMessage state={estadoEditar} />
          </div>
        ) : null}
      </form>

      {/* Una ruta partida: empieza, en medio hay algo que ocupa su sitio, y
          sigue al otro lado. Los trozos se pintan como ella y al tocarlos se
          abre ella; no tiene sentido en una zona que no se dibuja */}
      {!zona.parentId ? (
        <form action={anadirTrozo} className="border-t border-white/10 pt-3">
          <input type="hidden" name="slug" value={mapa.slug} />
          <input type="hidden" name="zoneId" value={zona.id} />
          <p className="label">Ruta partida</p>
          <p className="mb-2 text-xs text-slate-500">
            Si la ruta sigue al otro lado de algo que ocupa su sitio, añádele otro trozo: se pinta
            como ella, lo apuntado es lo mismo y al tocarlo se abre ella.
            {zona.trozos.length
              ? ` Ahora tiene ${zona.trozos.length + 1} trozos: toca cualquiera en el mapa para moverlo, cambiarle la forma o quitarlo.`
              : ""}
          </p>
          <SubmitButton className="btn-ghost btn-sm">＋ Añadir otro trozo</SubmitButton>
          {estadoTrozo?.success ? <p className="mt-1 text-xs text-emerald-300">{estadoTrozo.success}</p> : null}
          {estadoTrozo?.error ? <FormMessage state={estadoTrozo} /> : null}
        </form>
      ) : null}

      <form
        key={`anidar-${zona.id}-${zona.parentId ?? ""}`}
        action={anidar}
        className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3"
      >
        <input type="hidden" name="slug" value={mapa.slug} />
        <input type="hidden" name="zoneId" value={zona.id} />
        <div className="min-w-48 flex-1">
          <label className="label">Dentro de</label>
          <select
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
        {estadoAnidar?.error ? <FormMessage state={estadoAnidar} /> : null}
      </form>

      <form action={borrar} className="border-t border-white/10 pt-3">
        <input type="hidden" name="slug" value={mapa.slug} />
        <input type="hidden" name="zoneId" value={zona.id} />
        {estadoBorrar?.error ? <FormMessage state={estadoBorrar} /> : null}
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

/**
 * Lo que se le puede hacer a un trozo de una ruta partida: su forma, su giro y
 * quitarlo. El nombre, el tipo y el color son los de su ruta, así que aquí no
 * salen; para eso se vuelve a ella.
 */
function PanelDeTrozo({
  trozo,
  ruta,
  mapa,
  alCambiar,
  alVolver,
}: {
  trozo: TrozoDeZona;
  ruta: ZonaDelMapa;
  mapa: MapaDeRegion;
  alCambiar: AlCambiar;
  alVolver: () => void;
}) {
  const [estadoEditar, editar] = useAccionDelEditor(editarZonaAction, alCambiar);
  const [estadoBorrar, borrar] = useAccionDelEditor(borrarZonaAction, alCambiar);

  return (
    <div className="space-y-3">
      {trozo.shape === "poly" ? (
        <p className="text-xs text-slate-400">
          Arrastra los puntos blancos de las esquinas para darle forma; el «+» de cada lado añade
          una esquina, y dos toques en una la quitan.
        </p>
      ) : null}
      {/* Con lo guardado de key, como el panel de la zona: si no, el
          desplegable volvía a la forma de antes al guardar */}
      <form key={`trozo-${trozo.id}-${trozo.shape}-${trozo.angle}`} action={editar} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="slug" value={mapa.slug} />
        <input type="hidden" name="zoneId" value={trozo.id} />
        <input type="hidden" name="name" value={ruta.name} />
        <input type="hidden" name="kind" value={ruta.kind} />
        <div>
          <label className="label">Forma</label>
          <select name="shape" className="input" defaultValue={trozo.shape}>
            {FORMAS.filter((forma) => forma.id !== "none").map((forma) => (
              <option key={forma.id} value={forma.id}>
                {forma.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Giro</label>
          <input name="angle" type="number" className="input" min={0} max={359} step={5} defaultValue={trozo.angle} />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
          <button type="button" className="btn-ghost btn-sm" onClick={alVolver}>
            Ir a «{ruta.name}»
          </button>
          {estadoEditar?.success ? <span className="text-xs text-emerald-300">{estadoEditar.success}</span> : null}
        </div>
        {estadoEditar?.error ? (
          <div className="sm:col-span-2">
            <FormMessage state={estadoEditar} />
          </div>
        ) : null}
      </form>

      <form action={borrar} className="border-t border-white/10 pt-3">
        <input type="hidden" name="slug" value={mapa.slug} />
        <input type="hidden" name="zoneId" value={trozo.id} />
        {estadoBorrar?.error ? <FormMessage state={estadoBorrar} /> : null}
        <ConfirmSubmit
          className="btn-ghost btn-sm text-red-300"
          message={`¿Quitar este trozo de «${ruta.name}»? La ruta y lo apuntado en ella se quedan.`}
        >
          Quitar este trozo
        </ConfirmSubmit>
      </form>
    </div>
  );
}
