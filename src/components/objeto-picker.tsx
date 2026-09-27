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
import { Icono } from "@/components/icono";

type Tipo = "juegos" | "inventado" | "grupo";

/**
 * Elegir qué se crea. Tres formas, y la tercera es la que hace falta para lo
 * de "Objeto competitivo":
 *
 * - **De los juegos**: se busca por su nombre en español y el servidor se baja
 *   el dibujo al guardar, igual que el buscador de especies. Lo único que viaja
 *   es cuál es (`apiSlug`).
 * - **Objeto propio**: uno inventado ("Captura extra"), con la imagen que
 *   subas. Se gasta directamente.
 * - **Grupo**: uno que por dentro lleva varios ("Objeto competitivo" → Globo
 *   Helio, Casco Dentado…). Al usarlo sale la lista para quedarse con uno. Los
 *   de dentro se le añaden después, desde su ficha del catálogo.
 */
export function ObjetoPicker({
  /** Los que ya están en el catálogo, para avisar antes de repetir */
  yaPuestos = [],
  /** Un grupo dentro de otro grupo no tiene sentido, así que se puede quitar */
  permitirGrupo = false,
}: {
  yaPuestos?: string[];
  permitirGrupo?: boolean;
}) {
  const [tipo, setTipo] = useState<Tipo>("juegos");

  return (
    <div className="space-y-3">
      {/* Qué clase de objeto es. Va en el formulario para que el servidor no
          tenga que adivinarlo por lo que venga relleno. */}
      <input type="hidden" name="tipo" value={tipo} />

      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
        <Pestana activa={tipo === "juegos"} onClick={() => setTipo("juegos")}>
          <Icono emoji="🎒" /> De los juegos
        </Pestana>
        <Pestana
          activa={tipo === "inventado"}
          onClick={() => setTipo("inventado")}
        >
          <Icono emoji="✨" /> Propio
        </Pestana>
        {permitirGrupo ? (
          <Pestana activa={tipo === "grupo"} onClick={() => setTipo("grupo")}>
            <Icono emoji="📦" /> Grupo
          </Pestana>
        ) : null}
      </div>

      {tipo === "juegos" ? (
        <DeLosJuegos yaPuestos={yaPuestos} />
      ) : (
        <Propio grupo={tipo === "grupo"} />
      )}
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

function Propio({ grupo }: { grupo: boolean }) {
  const campo = useId();
  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor={campo}>
          {grupo ? "Nombre del grupo" : "Nombre"}
        </label>
        <input
          id={campo}
          name="name"
          className="input"
          maxLength={60}
          placeholder={grupo ? "Objeto competitivo" : "Captura extra"}
        />
      </div>
      <ImageInput
        name="image"
        label="Imagen"
        maxSize={IMAGE_SIZES.objeto}
        hint="Cuadrada y con fondo transparente queda mejor."
      />
      {grupo ? (
        <p className="rounded-lg border border-brand-500/25 bg-brand-600/10 px-3 py-2 text-xs text-slate-300">
          Un grupo no se gasta sin más: al usarlo sale la lista de lo que lleva
          dentro para quedarse con uno. Los objetos del grupo se le añaden
          justo después, en su ficha del catálogo.
        </p>
      ) : null}
    </div>
  );
}
