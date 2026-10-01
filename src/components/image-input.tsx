"use client";

import { useId, useRef, useState } from "react";
import { IMAGEN_SIN_CAMBIOS, imageToDataUrl } from "@/lib/image";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { PISTA_DE_PEGAR, SOLO_CON_RATON, useSoltarYPegar } from "@/components/soltar-y-pegar";

/**
 * Selector de imagen con dos vías: subir un archivo del ordenador (se
 * redimensiona en el navegador y se guarda dentro de la base de datos) o pegar
 * la URL de una imagen de internet. El valor final viaja en un input oculto.
 *
 * `defaultValue` es la **dirección** de la imagen que ya hay, solo para verla:
 * mientras no se toque nada se manda la marca IMAGEN_SIN_CAMBIOS, para no
 * reenviar esa dirección y borrar la imagen buena. Vaciarlo sí la borra.
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
  // Vista previa de la que ya había; desaparece en cuanto se elige otra
  const [previa, setPrevia] = useState(defaultValue ?? "");
  const [value, setValue] = useState("");
  const sinCambios = !value && Boolean(previa);
  const mostrada = value || previa;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const { props: soltar, arrastrando } = useSoltarYPegar((archivos) => handleFile(archivos[0]));

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setValue(await imageToDataUrl(file, maxSize));
      setPrevia("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div
      {...soltar}
      className={cx(
        "rounded-xl transition-colors",
        arrastrando && "bg-brand-600/10 outline-2 outline-offset-4 outline-dashed outline-brand-400/70",
      )}
    >
      <span className="label">{arrastrando ? "Suéltala para subirla" : label}</span>
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-ink-850",
            shape === "circle" ? "rounded-full" : "rounded-xl",
          )}
        >
          {mostrada ? (
            // Puede ser un data URL o un enlace externo, así que <img> normal
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mostrada}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setError("No se pudo cargar esa imagen.")}
            />
          ) : (
            <span className="text-2xl opacity-40" aria-hidden>
              <Icono emoji="🖼️" />
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
            {mostrada ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setValue("");
                  setPrevia("");
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
              setPrevia("");
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
          {!value && !busy ? (
            <p className={cx("text-xs text-slate-500", SOLO_CON_RATON)}>{PISTA_DE_PEGAR}</p>
          ) : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      </div>

      <input
        type="hidden"
        name={name}
        value={sinCambios ? IMAGEN_SIN_CAMBIOS : value}
      />
    </div>
  );
}
