"use client";

import { useActionState, useEffect, useState } from "react";
import { setGymVideoAction } from "@/app/actions/level-caps";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { urlIncrustada, videoDeYouTube } from "@/lib/youtube";
import { cx } from "@/lib/utils";
import { Hoja } from "@/components/hoja";

export type VideoDeGimnasio = {
  participantId: string;
  displayName: string;
  color: string;
  /** La dirección guardada, o null si todavía no ha puesto ninguna */
  url: string | null;
  /** Si quien mira puede poner o cambiar el suyo */
  editable: boolean;
};

/**
 * Los vídeos de un gimnasio: un botón por jugador que se lo haya pasado.
 *
 * Los vídeos **no están aquí**: viven en YouTube y de cada uno solo se guarda
 * el enlace. Un combate de gimnasio son unos 115 MB y la base de datos gratis
 * entera son 500 MB, así que meterlos dentro no era una opción; y aunque lo
 * fuera, Vercel corta cualquier subida a la aplicación en 4,5 MB.
 */
export function GymVideos({
  levelCapId,
  label,
  jugadores,
  mio = null,
}: {
  levelCapId: string;
  /** El nombre del gimnasio, para el título del reproductor */
  label: string;
  jugadores: VideoDeGimnasio[];
  /** Cuál de ellos eres tú, si juegas */
  mio?: string | null;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [verLosDemas, setVerLosDemas] = useState(false);

  const conVideo = jugadores.filter((jugador) => jugador.url);
  const puedenPoner = jugadores.filter(
    (jugador) => !jugador.url && jugador.editable,
  );

  // Ni vídeos ni nada que puedas añadir: no se enseña la fila
  if (!conVideo.length && !puedenPoner.length) return null;

  /**
   * De los que faltan solo se ofrece el tuyo. A la organización le salían los
   * seis, así que cada gimnasio sin vídeos arrastraba seis pastillas vacías:
   * ocho gimnasios eran cuarenta y ocho botones para no ver ningún vídeo. Los
   * de los demás siguen estando, detrás del "y los demás".
   */
  const porPoner = verLosDemas
    ? puedenPoner
    : puedenPoner.filter((jugador) => jugador.participantId === mio);
  const escondidos = puedenPoner.length - porPoner.length;

  const elegido = jugadores.find(
    (jugador) => jugador.participantId === abierto,
  );

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
        {conVideo.length
          ? `Vídeos del combate · ${conVideo.length}`
          : "Vídeos del combate"}
      </p>

      <div className="flex flex-wrap gap-2">
        {conVideo.map((jugador) => (
          <button
            key={jugador.participantId}
            type="button"
            onClick={() => setAbierto(jugador.participantId)}
            className="chip cursor-pointer transition hover:bg-white/10"
            style={{
              borderColor: `${jugador.color}55`,
              backgroundColor: `${jugador.color}1a`,
            }}
          >
            <span aria-hidden style={{ color: jugador.color }}>
              ▶
            </span>
            <span className="text-slate-200">{jugador.displayName}</span>
          </button>
        ))}

        {porPoner.map((jugador) => (
          <button
            key={jugador.participantId}
            type="button"
            onClick={() => setAbierto(jugador.participantId)}
            className="chip cursor-pointer border-dashed text-slate-500 transition hover:text-slate-300"
          >
            ＋ {jugador.displayName}
          </button>
        ))}

        {escondidos ? (
          <button
            type="button"
            onClick={() => setVerLosDemas(true)}
            className="chip cursor-pointer border-dashed text-slate-600 transition hover:text-slate-400"
          >
            ＋ el de otro ({escondidos})
          </button>
        ) : null}
      </div>

      {elegido ? (
        <Reproductor
          levelCapId={levelCapId}
          label={label}
          jugador={elegido}
          onClose={() => setAbierto(null)}
        />
      ) : null}
    </div>
  );
}

function Reproductor({
  levelCapId,
  label,
  jugador,
  onClose,
}: {
  levelCapId: string;
  label: string;
  jugador: VideoDeGimnasio;
  onClose: () => void;
}) {
  const [estado, guardar] = useActionState<FormState, FormData>(
    setGymVideoAction,
    null,
  );
  // Sin vídeo se abre directo en el formulario; con vídeo, viéndolo
  const [editando, setEditando] = useState(!jugador.url);

  useEffect(() => {
    if (estado?.success) onClose();
  }, [estado, onClose]);

  const video = jugador.url ? videoDeYouTube(jugador.url) : null;

  // Portal, como el resto de diálogos: las tarjetas llevan backdrop-blur y eso
  // rompe el posicionamiento fijo de lo que tienen dentro
  return (
    <Hoja onCerrar={onClose} ancho="max-w-3xl" fondo="bg-black/80" className="p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="antetitulo">
            {label}
          </p>
          <p className="truncate text-sm text-slate-300">
            El combate de{" "}
            <span style={{ color: jugador.color }}>{jugador.displayName}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost btn-sm shrink-0"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {video && !editando ? (
        <>
          {/* 16:9 de verdad: el reproductor se estira con el ancho que haya */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <iframe
              src={urlIncrustada(video)}
              title={`${label} · ${jugador.displayName}`}
              // Negro también en el propio marco: mientras carga, o si hay
              // mala conexión, un iframe vacío se pinta blanco y deslumbra
              className="aspect-video w-full bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={jugador.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm"
            >
              Verlo en YouTube ↗
            </a>
            {jugador.editable ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setEditando(true)}
              >
                ✎ Cambiar el enlace
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {editando ? (
        <form
          action={guardar}
          className={cx("space-y-2", video && "mt-4 border-t border-white/10 pt-4")}
        >
          <input type="hidden" name="levelCapId" value={levelCapId} />
          <input
            type="hidden"
            name="participantId"
            value={jugador.participantId}
          />
          <label className="label">Enlace de YouTube</label>
          <input
            name="url"
            className="input"
            inputMode="url"
            autoComplete="off"
            defaultValue={jugador.url ?? ""}
            placeholder="https://youtu.be/..."
          />
          <p className="text-xs text-slate-500">
            Vale el enlace de compartir, el de la barra del navegador o el de
            la aplicación del móvil. Súbelo a YouTube como{" "}
            <strong className="text-slate-400">no listado</strong> y solo lo
            verá quien tenga el enlace. Si lo dejas vacío, se quita el vídeo.
          </p>
          <FormMessage state={estado} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton className="btn-primary btn-sm">
              Guardar
            </SubmitButton>
            {video ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setEditando(false)}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </Hoja>
  );
}
