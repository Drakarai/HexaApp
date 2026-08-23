"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usarObjetoAction } from "@/app/actions/bolsa";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { ObjetoEnBolsa, OpcionDeObjeto } from "@/lib/bolsa";
import { cx } from "@/lib/utils";

/**
 * La bolsa de alguien. Cada objeto con su cantidad y, si es tuya, su botón de
 * gastarlo.
 *
 * Los que llevan opciones dentro ("Captura extra") abren un menú para elegir
 * con qué te quedas; los que no, se gastan de una y sin más ventanas, que era
 * justo lo que se pidió.
 */
export function Bolsa({
  objetos,
  puedoUsar,
}: {
  objetos: ObjetoEnBolsa[];
  puedoUsar: boolean;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {objetos.map((objeto) => (
        <FichaDeObjeto
          key={objeto.entryId}
          objeto={objeto}
          puedoUsar={puedoUsar}
        />
      ))}
    </ul>
  );
}

function FichaDeObjeto({
  objeto,
  puedoUsar,
}: {
  objeto: ObjetoEnBolsa;
  puedoUsar: boolean;
}) {
  const [estado, usar] = useActionState<FormState, FormData>(
    usarObjetoAction,
    null,
  );
  const [eligiendo, setEligiendo] = useState(false);
  const esGrupo = objeto.item.isGroup;
  const dentro = objeto.item.options;
  /** Un grupo al que todavía no le han puesto nada: no hay qué elegir */
  const grupoVacio = esGrupo && dentro.length === 0;
  // El menú se saca a document.body con un portal, así que sus botones acaban
  // fuera del <form>: se atan a él por su id, que para eso existe el atributo
  const formulario = `usar-${objeto.entryId}`;

  // Elegida una opción, el menú sobra: la fila ya se ha ido o ha bajado
  useEffect(() => {
    if (estado?.success) setEligiendo(false);
  }, [estado]);

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Dibujo src={objeto.item.image} nombre={objeto.item.name} />

        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="truncate font-semibold text-slate-100">
              {objeto.item.name}
            </span>
            {objeto.quantity > 1 ? (
              <span className="shrink-0 text-sm font-bold text-brand-300 tabular-nums">
                ×{objeto.quantity}
              </span>
            ) : null}
          </p>
          {objeto.item.description ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {objeto.item.description}
            </p>
          ) : null}
          {objeto.note ? (
            <p className="mt-1 text-xs text-slate-500">📝 {objeto.note}</p>
          ) : null}
          {esGrupo ? (
            <p className="mt-1 text-[11px] uppercase tracking-wide text-brand-300/80">
              {grupoVacio
                ? "📦 Grupo · todavía vacío"
                : `📦 Grupo · eliges 1 de ${dentro.length}`}
            </p>
          ) : null}
        </div>
      </div>

      {puedoUsar ? (
        <form id={formulario} action={usar} className="mt-auto">
          <input type="hidden" name="entryId" value={objeto.entryId} />
          {grupoVacio ? (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-xs text-slate-500">
              Nadie le ha puesto todavía qué se puede elegir
            </p>
          ) : esGrupo ? (
            <button
              type="button"
              className="btn-primary btn-sm w-full"
              onClick={() => setEligiendo(true)}
            >
              Elegir…
            </button>
          ) : (
            <SubmitButton
              className="btn-primary btn-sm w-full"
              pendingLabel="Usando…"
              onClick={(evento) => {
                if (!window.confirm(`¿Gastar ${objeto.item.name}?`)) {
                  evento.preventDefault();
                }
              }}
            >
              Usar
            </SubmitButton>
          )}

          {eligiendo ? (
            <Eleccion
              nombre={objeto.item.name}
              opciones={dentro}
              formulario={formulario}
              onClose={() => setEligiendo(false)}
            />
          ) : null}

          {estado ? (
            <div className="mt-2">
              <FormMessage state={estado} />
            </div>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}

/**
 * El menú de "¿con cuál te quedas?". Cada opción es un botón de enviar de
 * verdad, con su propio `optionId`: no hace falta guardar en ningún sitio cuál
 * se ha pulsado.
 *
 * Se saca a `document.body` con un portal porque las tarjetas llevan
 * `backdrop-blur` y eso rompe el posicionamiento fijo de lo que tienen dentro.
 * El precio es que los botones dejan de estar dentro del `<form>`, así que se
 * atan a él con `form=`; sin eso el menú se ve pero no envía nada.
 */
function Eleccion({
  nombre,
  opciones,
  formulario,
  onClose,
}: {
  nombre: string;
  opciones: OpcionDeObjeto[];
  /** El id del formulario al que pertenecen los botones */
  formulario: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    document.addEventListener("keydown", alPulsar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-1 flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400">
            {nombre}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost btn-sm shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-300">
          Elige con qué te quedas. Se gasta el objeto y se avisa al resto.
        </p>

        <ul className="space-y-2">
          {opciones.map((opcion) => (
            <li key={opcion.id}>
              <button
                type="submit"
                form={formulario}
                name="optionId"
                value={opcion.id}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-brand-500/40 hover:bg-brand-600/15"
              >
                <Dibujo src={opcion.image} nombre={opcion.name} pequeno />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                  {opcion.name}
                </span>
                <span aria-hidden className="shrink-0 text-slate-500">
                  ▸
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

/** El dibujo de un objeto, o un regalo genérico si se quedó sin él. */
export function Dibujo({
  src,
  nombre,
  pequeno = false,
}: {
  src: string | null;
  nombre: string;
  pequeno?: boolean;
}) {
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-850",
        pequeno ? "h-10 w-10" : "h-14 w-14",
      )}
    >
      {src ? (
        // Sale de /api/imagen: es un data URL guardado, no un enlace de fuera
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={nombre}
          className={cx("object-contain", pequeno ? "h-7 w-7" : "h-10 w-10")}
          loading="lazy"
        />
      ) : (
        <span className={pequeno ? "text-base" : "text-xl"} aria-hidden>
          🎁
        </span>
      )}
    </span>
  );
}
