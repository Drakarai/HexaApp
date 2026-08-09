"use client";

import { useId, useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/image";
import { cx } from "@/lib/utils";

/**
 * Selector de imagen con dos vías: subir un archivo del ordenador (se
 * redimensiona en el navegador y se guarda dentro de la base de datos) o pegar
 * la URL de una imagen de internet. El valor final viaja en un input oculto.
 */
export function ImageInput({
  name,
  label,
  defaultValue,
  maxSize,
  hint,
  shape = "square",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  maxSize: number;
  hint?: string;
  shape?: "square" | "circle";
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setValue(await fileToDataUrl(file, maxSize));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-ink-850",
            shape === "circle" ? "rounded-full" : "rounded-xl",
          )}
        >
          {value ? (
            // Puede ser un data URL o un enlace externo, así que <img> normal
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setError("No se pudo cargar esa imagen.")}
            />
          ) : (
            <span className="text-2xl opacity-40" aria-hidden>
              🖼️
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={id}
              className={cx("btn-ghost btn-sm", busy && "opacity-50")}
            >
              {busy ? "Procesando…" : "Subir imagen"}
            </label>
            <input
              ref={fileRef}
              id={id}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {value ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setValue("");
                  setError(null);
                }}
              >
                Quitar
              </button>
            ) : null}
          </div>

          <input
            type="url"
            className="input"
            placeholder="…o pega el enlace de una imagen"
            value={value.startsWith("data:") ? "" : value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
          {value.startsWith("data:") ? (
            <p className="text-xs text-slate-500">
              Imagen subida y guardada en la base de datos.
            </p>
          ) : hint ? (
            <p className="text-xs text-slate-500">{hint}</p>
          ) : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      </div>

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
