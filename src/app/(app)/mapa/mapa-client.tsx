"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  apuntarCapturaAction,
  borrarCapturaAction,
} from "@/app/actions/mapas";
import type { FormState } from "@/app/actions/auth";
import { Mapa } from "@/components/mapa";
import { colorDeZona } from "@/lib/zonas";
import { SpeciesPicker } from "@/components/species-picker";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import type { CapturaApuntada, MapaDeRegion, ZonaDelMapa } from "@/lib/mapas";
import { cx, formatDateTime } from "@/lib/utils";

/**
 * El mapa de capturas de una persona.
 *
 * Dos formas de llegar a lo mismo, porque el mapa se lleva regular con un móvil
 * de 390 píxeles: **el mapa**, para verlo de un vistazo, y **el buscador**, que
 * es lo que se usa de verdad mientras juegas.
 */
export function MapaDeCapturas({
  mapa,
  capturas,
}: {
  mapa: MapaDeRegion;
  capturas: CapturaApuntada[];
}) {
  const [abierta, setAbierta] = useState<ZonaDelMapa | null>(null);
  /** Grupo cuyo contenido se está enseñando para elegir */
  const [grupo, setGrupo] = useState<ZonaDelMapa | null>(null);
  /**
   * La zona que se ha tocado una vez. Las formas del mapa van sin nombre
   * escrito, así que **el primer toque dice cuál es y el segundo la abre**: sin
   * eso, en el móvil (donde no hay ratón que pasar por encima) estarías
   * apuntando capturas a ciegas.
   */
  const [avisada, setAvisada] = useState<ZonaDelMapa | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"mapa" | "lista">("lista");

  /** Cuántas capturas hay en cada zona **contando las de sus hijas**. */
  const porZona = useMemo(() => {
    const sueltas: Record<string, number> = {};
    for (const captura of capturas) {
      if (captura.zoneId) sueltas[captura.zoneId] = (sueltas[captura.zoneId] ?? 0) + 1;
    }
    const cuenta = { ...sueltas };
    for (const zona of mapa.zones) {
      if (!zona.children.length) continue;
      cuenta[zona.id] =
        (sueltas[zona.id] ?? 0) +
        zona.children.reduce((suma, hija) => suma + (sueltas[hija.id] ?? 0), 0);
    }
    return cuenta;
  }, [capturas, mapa.zones]);

  /** Todas las zonas capturables, padres e hijas, para la lista y el buscador */
  const todas = useMemo(
    () => mapa.zones.flatMap((zona) => [zona, ...zona.children]),
    [mapa.zones],
  );

  const filtradas = useMemo(() => {
    const aguja = busqueda.trim().toLowerCase();
    // Un grupo no se captura él mismo: en la lista salen sus hijas, no él
    const capturables = todas.filter((zona) => !zona.children.length);
    if (!aguja) return capturables;
    return capturables.filter((zona) => zona.name.toLowerCase().includes(aguja));
  }, [busqueda, todas]);

  /** Al tocar una zona del mapa: la primera vez dice cuál es, la segunda abre */
  function tocar(zona: ZonaDelMapa) {
    if (avisada?.id !== zona.id) {
      setAvisada(zona);
      return;
    }
    setAvisada(null);
    if (zona.children.length) setGrupo(zona);
    else setAbierta(zona);
  }

  const hechas = filtradas.filter((zona) => porZona[zona.id]).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setVista("lista")}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              vista === "lista"
                ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            ☰ Lista
          </button>
          <button
            type="button"
            onClick={() => setVista("mapa")}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              vista === "mapa"
                ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            🗺️ Mapa
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {hechas} de {filtradas.length} zonas con algo apuntado ·{" "}
          {capturas.length} {capturas.length === 1 ? "captura" : "capturas"}
        </p>
      </div>

      {vista === "mapa" ? (
        <>
          <Mapa
            mapa={mapa}
            cuentas={porZona}
            onZona={tocar}
            seleccionada={avisada?.id ?? abierta?.id ?? null}
          />
          <p className="mt-2 min-h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
            {avisada ? (
              <>
                <span className="font-semibold text-slate-100">
                  {avisada.name}
                </span>
                <span className="text-slate-400">
                  {" · "}
                  {avisada.children.length
                    ? "vuelve a tocarla para ver lo que tiene dentro"
                    : "vuelve a tocarla para apuntar lo que capturaste"}
                </span>
              </>
            ) : (
              <span className="text-slate-500">
                Toca una zona para saber cuál es.
              </span>
            )}
          </p>
        </>
      ) : (
        <>
          <input
            className="input mb-3"
            placeholder="Buscar una ruta o un sitio…"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          {filtradas.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filtradas.map((zona) => (
                <li key={zona.id}>
                  <FilaDeZona
                    zona={zona}
                    capturas={capturas.filter((c) => c.zoneId === zona.id)}
                    onAbrir={() => setAbierta(zona)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
              Ninguna zona se llama así.
            </p>
          )}
        </>
      )}

      {grupo ? (
        <ListaDelGrupo
          grupo={grupo}
          cuentas={porZona}
          onElegir={(hija) => {
            setGrupo(null);
            setAbierta(hija);
          }}
          onClose={() => setGrupo(null)}
        />
      ) : null}

      {abierta ? (
        <FichaDeZona
          zona={abierta}
          capturas={capturas.filter((c) => c.zoneId === abierta.id)}
          onClose={() => setAbierta(null)}
        />
      ) : null}
    </>
  );
}

function FilaDeZona({
  zona,
  capturas,
  onAbrir,
}: {
  zona: ZonaDelMapa;
  capturas: CapturaApuntada[];
  onAbrir: () => void;
}) {
  const color = colorDeZona(zona.kind);
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-left transition hover:border-brand-500/40 hover:bg-brand-600/10"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
        {zona.name}
      </span>
      {capturas.length ? (
        <span className="flex shrink-0 -space-x-2">
          {capturas.slice(0, 3).map((captura) =>
            captura.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={captura.id}
                src={captura.image}
                alt={captura.species}
                className="h-7 w-7 rounded-full bg-ink-850 object-contain ring-1 ring-white/10"
              />
            ) : (
              <span
                key={captura.id}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-850 text-[10px] ring-1 ring-white/10"
              >
                ●
              </span>
            ),
          )}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-slate-600">vacía</span>
      )}
    </button>
  );
}

/**
 * Lo que lleva dentro un grupo: una ciudad con su cueva, su torre y lo que sea.
 * Elegir una es exactamente igual que tocar una zona suelta del mapa.
 */
function ListaDelGrupo({
  grupo,
  cuentas,
  onElegir,
  onClose,
}: {
  grupo: ZonaDelMapa;
  cuentas: Record<string, number>;
  onElegir: (hija: ZonaDelMapa) => void;
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
            {grupo.name}
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
          Aquí se puede capturar en varios sitios. Elige en cuál.
        </p>

        <ul className="space-y-2">
          {grupo.children.map((hija) => {
            const cuantas = cuentas[hija.id] ?? 0;
            return (
              <li key={hija.id}>
                <button
                  type="button"
                  onClick={() => onElegir(hija)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-brand-500/40 hover:bg-brand-600/15"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: hija.color ?? colorDeZona(hija.kind) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                    {hija.name}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {cuantas ? `${cuantas} apuntado${cuantas === 1 ? "" : "s"}` : "vacía"}
                  </span>
                  <span aria-hidden className="shrink-0 text-slate-500">
                    ▸
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

/** El panel de una zona: lo que ya tienes ahí y el formulario para añadir. */
function FichaDeZona({
  zona,
  capturas,
  onClose,
}: {
  zona: ZonaDelMapa;
  capturas: CapturaApuntada[];
  onClose: () => void;
}) {
  const [estado, apuntar] = useActionState<FormState, FormData>(
    apuntarCapturaAction,
    null,
  );
  // Vaciar el buscador de especie después de apuntar: lleva estado propio y un
  // reset() del formulario no lo limpiaría
  const [vuelta, setVuelta] = useState(0);

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

  const color = colorDeZona(zona.kind);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: color }}
              aria-hidden
            />
            <h2 className="truncate text-lg font-bold text-white">{zona.name}</h2>
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

        {capturas.length ? (
          <ul className="mb-4 space-y-2">
            {capturas.map((captura) => (
              <Capturado key={captura.id} captura={captura} />
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">
            Todavía no has apuntado nada aquí.
          </p>
        )}

        <form
          action={async (formData) => {
            await apuntar(formData);
            setVuelta((n) => n + 1);
          }}
          className="space-y-3 border-t border-white/10 pt-4"
        >
          <input type="hidden" name="zoneId" value={zona.id} />
          <SpeciesPicker key={vuelta} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Mote</label>
              <input name="nickname" className="input" maxLength={40} />
            </div>
            <div>
              <label className="label">Apunte (opcional)</label>
              <input
                name="notes"
                className="input"
                maxLength={120}
                placeholder="Se me escapó el primero"
              />
            </div>
          </div>
          <FormMessage state={estado} />
          <SubmitButton className="btn-primary btn-sm">Apuntar</SubmitButton>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function Capturado({ captura }: { captura: CapturaApuntada }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-850">
        {captura.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={captura.image}
            alt={captura.species}
            className="h-9 w-9 object-contain"
          />
        ) : (
          <span aria-hidden>❔</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">
          {captura.nickname ? (
            <>
              {captura.nickname}{" "}
              <span className="text-slate-500">({captura.species})</span>
            </>
          ) : (
            captura.species
          )}
        </p>
        <p className="truncate text-xs text-slate-500">
          {captura.notes ?? formatDateTime(captura.createdAt)}
        </p>
      </div>
      <form action={borrarCapturaAction} className="shrink-0">
        <input type="hidden" name="captureId" value={captura.id} />
        <ConfirmSubmit
          className="btn-ghost btn-sm text-red-300"
          message={`¿Borrar ${captura.nickname ?? captura.species}?`}
        >
          ✕
        </ConfirmSubmit>
      </form>
    </li>
  );
}

/**
 * Las capturas que no salen de ninguna zona del mapa: un regalo, un
 * intercambio, la captura de premio de un reto. Van aparte porque no tienen
 * sitio donde ponerse.
 */
export function CapturasExtra({ capturas }: { capturas: CapturaApuntada[] }) {
  const [estado, apuntar] = useActionState<FormState, FormData>(
    apuntarCapturaAction,
    null,
  );
  const [vuelta, setVuelta] = useState(0);
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">Capturas extra</h2>
          <p className="text-sm text-slate-400">
            Lo que no viene de una zona: regalos, intercambios, premios de un
            reto…
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setAbierto(!abierto)}
        >
          {abierto ? "Cerrar" : "＋ Apuntar una"}
        </button>
      </div>

      {abierto ? (
        <form
          action={async (formData) => {
            await apuntar(formData);
            setVuelta((n) => n + 1);
          }}
          className="card mb-3 space-y-3"
        >
          <SpeciesPicker key={vuelta} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Mote</label>
              <input name="nickname" className="input" maxLength={40} />
            </div>
            <div>
              <label className="label">De dónde salió</label>
              <input
                name="notes"
                className="input"
                maxLength={120}
                placeholder="Premio del reto contra Draka"
              />
            </div>
          </div>
          <FormMessage state={estado} />
          <SubmitButton className="btn-primary btn-sm">Apuntar</SubmitButton>
        </form>
      ) : null}

      {capturas.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {capturas.map((captura) => (
            <Capturado key={captura.id} captura={captura} />
          ))}
        </ul>
      ) : abierto ? null : (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
          Nada por aquí todavía.
        </p>
      )}
    </section>
  );
}
