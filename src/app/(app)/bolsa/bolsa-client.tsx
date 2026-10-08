"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  deshacerUsoAction,
  usarObjetoAction,
  type EstadoDeUso,
} from "@/app/actions/bolsa";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { ObjetoEnBolsa, OpcionDeObjeto } from "@/lib/bolsa";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { Hoja } from "@/components/hoja";

/**
 * La bolsa, **como la de los juegos**: a un lado la lista de lo que llevas,
 * con su cantidad, y al otro el objeto elegido con su descripción en un
 * recuadro de texto y el botón de usarlo. En el móvil, el elegido va debajo
 * de la lista. Antes era una rejilla de tarjetas iguales que, con dos
 * objetos, dejaba la pantalla vacía.
 *
 * Los que llevan opciones dentro ("Captura extra") abren un menú para elegir
 * con qué te quedas; los que no, se gastan de una y sin más ventanas, que era
 * justo lo que se pidió.
 */
export function Bolsa({
  objetos,
  puedoUsar,
  vacia = null,
}: {
  objetos: ObjetoEnBolsa[];
  puedoUsar: boolean;
  /** Lo que se enseña si no queda nada */
  vacia?: React.ReactNode;
}) {
  /**
   * Gastar va con **un solo estado para toda la bolsa**, no uno por objeto: si
   * era el último, el objeto desaparece en cuanto se gasta, y con él se iba
   * el aviso —y ahora, el botón de deshacer—. Se apunta qué objeto lo pidió
   * para enseñar los errores debajo del suyo.
   */
  const [estado, usar] = useActionState<EstadoDeUso, FormData>(
    usarObjetoAction,
    null,
  );
  const [ficha, setFicha] = useState<string | null>(null);
  const enviar = (datos: FormData) => {
    setFicha(String(datos.get("entryId") ?? ""));
    usar(datos);
  };
  const [elegido, setElegido] = useState<string | null>(null);
  // Si el elegido se ha gastado entero, se pasa al primero que quede
  const actual = objetos.find((o) => o.entryId === elegido) ?? objetos[0] ?? null;
  const unidades = objetos.reduce((suma, objeto) => suma + objeto.quantity, 0);

  return (
    <>
      {estado?.usoId ? <Deshacer key={estado.usoId} estado={estado} /> : null}
      {objetos.length && actual ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
            <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-brand-600/25 to-transparent px-4 py-3">
              <Icono emoji="🎒" />
              <p className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-white">
                Bolsillo
              </p>
              <p className="ml-auto text-xs text-slate-400">
                {objetos.length} {objetos.length === 1 ? "objeto" : "objetos"} · {unidades}{" "}
                {unidades === 1 ? "unidad" : "unidades"}
              </p>
            </header>
            <ul role="listbox" aria-label="Lo que llevas" className="divide-y divide-white/5">
              {objetos.map((objeto) => {
                const esEste = objeto.entryId === actual.entryId;
                return (
                  <li key={objeto.entryId} role="option" aria-selected={esEste}>
                    <button
                      type="button"
                      onClick={() => setElegido(objeto.entryId)}
                      className={cx(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                        esEste ? "bg-brand-600/20" : "hover:bg-white/[0.04]",
                      )}
                    >
                      {/* El cursor de los juegos, en el elegido */}
                      <span aria-hidden className={cx("w-2 shrink-0 text-brand-300", !esEste && "invisible")}>
                        ▸
                      </span>
                      <Dibujo src={objeto.item.image} nombre={objeto.item.name} pequeno />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-100">{objeto.item.name}</span>
                        {objeto.item.isGroup ? (
                          <span className="block text-xs text-brand-300/90">Para elegir uno</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-slate-200">
                        ×{objeto.quantity}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <FichaDeObjeto
            key={actual.entryId}
            objeto={actual}
            puedoUsar={puedoUsar}
            usar={enviar}
            estado={ficha === actual.entryId && estado?.error ? estado : null}
            usoReciente={estado?.entryId === actual.entryId ? estado.usoId : undefined}
          />
        </div>
      ) : (
        vacia
      )}
    </>
  );
}

/** Cuánto se enseña el botón de deshacer (el servidor deja algo más) */
const SEGUNDOS_PARA_DESHACER = 60;

/**
 * El aviso de lo que se acaba de gastar, con su botón de arrepentirse durante
 * un minuto: gastar se hace de un toque, y darle sin querer no tenía vuelta
 * atrás.
 */
function Deshacer({ estado }: { estado: NonNullable<EstadoDeUso> }) {
  const [resultado, setResultado] = useState<FormState>(null);
  const [deshaciendo, empezar] = useTransition();
  const [aTiempo, setATiempo] = useState(true);

  useEffect(() => {
    const reloj = setTimeout(() => setATiempo(false), SEGUNDOS_PARA_DESHACER * 1000);
    return () => clearTimeout(reloj);
  }, []);

  if (resultado?.success) {
    return (
      <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
        <Icono emoji="↩️" /> {resultado.success}
      </p>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 text-sm">
      <p className="min-w-0 text-emerald-100">
        <Icono emoji="✅" /> {estado.success}
        {resultado?.error ? (
          <span className="mt-1 block text-rose-300">{resultado.error}</span>
        ) : null}
      </p>
      {aTiempo ? (
        <button
          type="button"
          className="btn-ghost btn-sm shrink-0"
          disabled={deshaciendo}
          onClick={() =>
            empezar(async () => setResultado(await deshacerUsoAction(estado.usoId!)))
          }
        >
          {deshaciendo ? "Deshaciendo…" : "Deshacer"}
        </button>
      ) : null}
    </div>
  );
}

function FichaDeObjeto({
  objeto,
  puedoUsar,
  usar,
  estado,
  usoReciente,
}: {
  objeto: ObjetoEnBolsa;
  puedoUsar: boolean;
  usar: (datos: FormData) => void;
  /** El error de gastar esta, si lo hubo */
  estado: EstadoDeUso;
  /** El último gasto de esta ficha: al llegar uno nuevo, el menú de elegir sobra */
  usoReciente?: string;
}) {
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
    if (usoReciente) setEligiendo(false);
  }, [usoReciente]);

  return (
    <section className="card flex flex-col gap-4 lg:sticky lg:top-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Dibujo src={objeto.item.image} nombre={objeto.item.name} grande />
        <p className="text-lg font-semibold text-white">
          {objeto.item.name}
          <span className="ml-2 text-base font-bold tabular-nums text-brand-300">×{objeto.quantity}</span>
        </p>
        {esGrupo ? (
          <p className="text-[11px] uppercase tracking-wide text-brand-300/80">
            <Icono emoji="📦" />{" "}
            {grupoVacio ? "Grupo · todavía vacío" : `Grupo · eliges 1 de ${dentro.length}`}
          </p>
        ) : null}
      </div>

      {/* El recuadro de texto de abajo, como en la bolsa de los juegos */}
      <div className="min-h-16 rounded-xl border-2 border-white/15 bg-ink-950/70 px-4 py-3 text-sm leading-relaxed text-slate-200">
        {objeto.item.description ?? <span className="text-slate-500">Sin descripción.</span>}
        {objeto.note ? (
          <p className="mt-2 text-xs text-slate-400">
            <Icono emoji="📝" /> {objeto.note}
          </p>
        ) : null}
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
    </section>
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
  return (
    <Hoja onCerrar={onClose} ancho="max-w-md" fondo="bg-black/80" className="p-4 sm:p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <p className="antetitulo">
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
    </Hoja>
  );
}

/** El dibujo de un objeto, o un regalo genérico si se quedó sin él. */
export function Dibujo({
  src,
  nombre,
  pequeno = false,
  grande = false,
}: {
  src: string | null;
  nombre: string;
  pequeno?: boolean;
  grande?: boolean;
}) {
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-850",
        pequeno ? "h-10 w-10" : grande ? "h-20 w-20 rounded-2xl" : "h-14 w-14",
      )}
    >
      {src ? (
        // Sale de /api/imagen: es un data URL guardado, no un enlace de fuera
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={nombre}
          className={cx("object-contain", pequeno ? "h-7 w-7" : grande ? "h-14 w-14" : "h-10 w-10")}
          loading="lazy"
        />
      ) : (
        <span className={pequeno ? "text-base" : grande ? "text-3xl" : "text-xl"} aria-hidden>
          <Icono emoji="🎁" />
        </span>
      )}
    </span>
  );
}
