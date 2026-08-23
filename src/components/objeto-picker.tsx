"use client";

import { useId, useState } from "react";
import { ImageInput } from "@/components/image-input";
import { IMAGE_SIZES } from "@/lib/image";
import {
  buscarObjetos,
  spriteDeObjeto,
  type ObjetoDelJuego,
} from "@/lib/objetos";
import { cx } from "@/lib/utils";

/**
 * Elegir un objeto: o uno de los juegos, buscándolo por su nombre en español, o
 * uno inventado con la imagen que quieras.
 *
 * Funciona como el buscador de especies: lo único que viaja al servidor es
 * **cuál** es el objeto (`apiSlug`), y el dibujo se lo baja el servidor al
 * guardar. Los inventados sí mandan su imagen, ya reducida en el navegador.
 */
export function ObjetoPicker({
  /** Los que ya están en el catálogo, para avisar antes de repetir */
  yaPuestos = [],
}: {
  yaPuestos?: string[];
}) {
  const [inventado, setInventado] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
        <Pestana activa={!inventado} onClick={() => setInventado(false)}>
          🎒 De los juegos
        </Pestana>
        <Pestana activa={inventado} onClick={() => setInventado(true)}>
          ✨ Inventado
        </Pestana>
      </div>

      {inventado ? <Inventado /> : <DeLosJuegos yaPuestos={yaPuestos} />}
    </div>
  );
}

function Pestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition",
        activa
          ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
      )}
    >
      {children}
    </button>
  );
}

function DeLosJuegos({ yaPuestos }: { yaPuestos: string[] }) {
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<ObjetoDelJuego | null>(null);
  const [abierto, setAbierto] = useState(false);
  const campo = useId();

  const sugerencias = abierto ? buscarObjetos(texto) : [];
  const repetido = elegido ? yaPuestos.includes(elegido.slug) : false;

  function elegir(objeto: ObjetoDelJuego) {
    setElegido(objeto);
    setTexto(objeto.nombre);
    setAbierto(false);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="label" htmlFor={campo}>
          Objeto
        </label>
        <input
          id={campo}
          className="input"
          value={texto}
          autoComplete="off"
          placeholder="Ultra Ball"
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAbierto(true);
            setElegido(null);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && sugerencias.length) {
              evento.preventDefault();
              elegir(sugerencias[0]);
            }
            if (evento.key === "Escape") setAbierto(false);
          }}
        />

        {sugerencias.length && !elegido ? (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-white/10 bg-ink-850 py-1 shadow-xl">
            {sugerencias.map((objeto) => (
              <li key={objeto.slug}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                  onMouseDown={(evento) => evento.preventDefault()}
                  onClick={() => elegir(objeto)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spriteDeObjeto(objeto.slug)}
                    alt=""
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {objeto.nombre}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {objeto.grupo}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-850">
          {elegido ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spriteDeObjeto(elegido.slug)}
              alt=""
              className="h-9 w-9 object-contain"
            />
          ) : (
            <span className="text-lg opacity-30" aria-hidden>
              ？
            </span>
          )}
        </div>
        <p className="min-w-0 flex-1 text-xs text-slate-500">
          {repetido ? (
            <span className="text-amber-300">
              Ese objeto ya está en el catálogo.
            </span>
          ) : elegido ? (
            <>
              <span className="text-slate-300">{elegido.nombre}</span>. El dibujo
              se descarga solo al guardar.
            </>
          ) : (
            "Escribe el nombre en español y elígelo de la lista."
          )}
        </p>
      </div>

      {/* Lo único que viaja: cuál es. El nombre va también, para guardarlo tal
          cual sin tener que fiarse del cliente para lo demás. */}
      {elegido ? (
        <>
          <input type="hidden" name="apiSlug" value={elegido.slug} />
          <input type="hidden" name="name" value={elegido.nombre} />
        </>
      ) : null}
    </div>
  );
}

function Inventado() {
  const campo = useId();
  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor={campo}>
          Nombre
        </label>
        <input
          id={campo}
          name="name"
          className="input"
          maxLength={60}
          placeholder="Captura extra"
        />
      </div>
      <ImageInput
        name="image"
        label="Imagen"
        maxSize={IMAGE_SIZES.objeto}
        hint="Cuadrada y con fondo transparente queda mejor."
      />
    </div>
  );
}
