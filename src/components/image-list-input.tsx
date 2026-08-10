"use client";

import { useId, useRef, useState } from "react";
import { IMAGEN_SIN_CAMBIOS, imageToDataUrl } from "@/lib/image";
import { cx } from "@/lib/utils";

/**
 * Lista ordenada de imágenes. Cada una se sube del ordenador o se pega como
 * enlace, igual que en el selector de una sola. Si hay más de una, en la
 * pantalla se irán alternando con un fundido.
 *
 * `defaultValues` son las **direcciones** de las que ya hay, solo para verlas.
 * Cada una viaja de vuelta como "__igual__:N", donde N es el sitio que ocupaba
 * al abrir el formulario: así se pueden reordenar y quitar sin tener que
 * mandar las imágenes enteras otra vez.
 */
export function ImageListInput({
  name,
  label,
  defaultValues = [],
  maxSize,
  hint,
  max = 8,
}: {
  name: string;
  label: string;
  defaultValues?: string[];
  maxSize: number;
  hint?: string;
  max?: number;
}) {
  // `vista` es lo que se enseña; `enviar`, lo que va al servidor
  type Imagen = { vista: string; enviar: string };
  const [values, setValues] = useState<Imagen[]>(() =>
    defaultValues.map((vista, index) => ({
      vista,
      enviar: `${IMAGEN_SIN_CAMBIOS}:${index}`,
    })),
  );
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const full = values.length >= max;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const hueco = max - values.length;
      const nuevas: Imagen[] = [];
      for (const file of Array.from(files).slice(0, hueco)) {
        const dataUrl = await imageToDataUrl(file, maxSize);
        nuevas.push({ vista: dataUrl, enviar: dataUrl });
      }
      setValues((current) => [...current, ...nuevas]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function move(from: number, direction: -1 | 1) {
    const to = from + direction;
    if (to < 0 || to >= values.length) return;
    setValues((current) => {
      const copia = [...current];
      [copia[from], copia[to]] = [copia[to], copia[from]];
      return copia;
    });
  }

  return (
    <div>
      <span className="label">{label}</span>

      {values.length ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {values.map((image, index) => (
            <li
              key={`${index}-${image.enviar.slice(-16)}`}
              className="rounded-xl border border-white/10 bg-ink-850 p-1.5"
            >
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.vista}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-0.5">
                <button
                  type="button"
                  className="btn-ghost btn-sm px-1.5 py-0.5"
                  title="Mover antes"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="btn-danger btn-sm px-1.5 py-0.5"
                  title="Quitar"
                  onClick={() =>
                    setValues((current) => current.filter((_, i) => i !== index))
                  }
                >
                  ✕
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm px-1.5 py-0.5"
                  title="Mover después"
                  disabled={index === values.length - 1}
                  onClick={() => move(index, 1)}
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className={cx("btn-ghost btn-sm", (busy || full) && "opacity-50")}
        >
          {busy ? "Procesando…" : values.length ? "Añadir otra" : "Subir imagen"}
        </label>
        <input
          ref={fileRef}
          id={id}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={busy || full}
          onChange={(event) => addFiles(event.target.files)}
        />

        <input
          type="url"
          className="input max-w-64 flex-1"
          placeholder="…o pega un enlace y añádelo"
          value={url}
          disabled={full}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (!url.trim()) return;
            setValues((current) => [
              ...current,
              { vista: url.trim(), enviar: url.trim() },
            ]);
            setUrl("");
          }}
        />
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={!url.trim() || full}
          onClick={() => {
            setValues((current) => [
              ...current,
              { vista: url.trim(), enviar: url.trim() },
            ]);
            setUrl("");
          }}
        >
          Añadir enlace
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {full
          ? `Máximo ${max} imágenes.`
          : values.length > 1
            ? `${values.length} imágenes: se irán alternando con un fundido.`
            : (hint ?? "Puedes añadir varias y se alternarán solas.")}
      </p>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}

      {values.map((image, index) => (
        <input key={index} type="hidden" name={name} value={image.enviar} />
      ))}
    </div>
  );
}
