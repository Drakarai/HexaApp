"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  apuntarCapturaAction,
  borrarCapturaAction,
} from "@/app/actions/mapas";
import type { FormState } from "@/app/actions/auth";
import { Mapa, type CuentaDeZona } from "@/components/mapa";
import { colorDeZona } from "@/lib/zonas";
import { SpeciesPicker } from "@/components/species-picker";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { Pendientes } from "@/components/pendientes";
import { conCola } from "@/lib/acciones-sin-conexion";
import type { CapturaApuntada, MapaDeRegion, ZonaDelMapa } from "@/lib/mapas";
import { cx, formatDateTime } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { Hoja } from "@/components/hoja";
import { SpritePokemon } from "@/components/sprite-pokemon";

/**
 * El mapa de capturas de una persona.
 *
 * Dos formas de llegar a lo mismo, porque el mapa se lleva regular con un móvil
 * de 390 píxeles: **el mapa**, para verlo de un vistazo, y **el buscador**, que
 * es lo que se usa de verdad mientras juegas.
 */
type Cuales = "todas" | "libres" | "usadas";
const CLAVE_DE_CUALES = "hexaapp-mapa-cuales";

export function MapaDeCapturas({
  mapa,
  capturas,
  bajas,
  competitionId,
  buscarDeEntrada = false,
  busquedaDeEntrada = "",
  soloMirar = false,
}: {
  mapa: MapaDeRegion;
  capturas: CapturaApuntada[];
  /** Los pokémon tuyos que han caído en cada zona, para las calaveras */
  bajas: Record<string, number>;
  /**
   * En qué edición se está apuntando. Solo hace falta para la cola de
   * pendientes: un apunte que se queda sin subir tiene que saber a qué locke
   * vuelve, no sea que entre medias se cambie de edición.
   */
  competitionId: string;
  /** Llega con el buscador enfocado, desde el botón de apuntar */
  buscarDeEntrada?: boolean;
  /** Llega con una ruta ya escrita en el buscador, desde el buscador rápido */
  busquedaDeEntrada?: string;
  /** Edición archivada: se ve lo apuntado, pero ya no se apunta ni se borra */
  soloMirar?: boolean;
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
  const [busqueda, setBusqueda] = useState(busquedaDeEntrada);
  const [vista, setVista] = useState<"mapa" | "lista">("lista");
  const [cuales, setCuales] = useState<Cuales>("todas");
  const buscador = useRef<HTMLInputElement>(null);

  // La elección de «Libres», recordada en el dispositivo: quien la usa, la usa siempre
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_DE_CUALES);
      if (guardada === "libres" || guardada === "usadas") setCuales(guardada);
    } catch {
      // Sin almacenamiento (modo privado): se empieza por todas
    }
  }, []);
  function elegirCuales(valor: Cuales) {
    setCuales(valor);
    try {
      localStorage.setItem(CLAVE_DE_CUALES, valor);
    } catch {
      // Igual que arriba
    }
  }

  /**
   * Llegando desde el botón de apuntar, el cursor ya está en el buscador: lo
   * que se viene a hacer es escribir la ruta donde acaba de salir algo.
   */
  useEffect(() => {
    if (buscarDeEntrada) buscador.current?.focus();
  }, [buscarDeEntrada]);

  /**
   * Lo apuntado en cada zona **contando lo de sus hijas**: capturas buenas por
   * un lado y encuentros fallados por otro, porque el mapa los pinta distinto.
   */
  const porZona = useMemo(() => {
    const sueltas: Record<string, CuentaDeZona> = {};
    for (const captura of capturas) {
      if (!captura.zoneId) continue;
      const antes = sueltas[captura.zoneId] ?? { hechas: 0, fallos: 0 };
      if (captura.failed) antes.fallos += 1;
      else antes.hechas += 1;
      sueltas[captura.zoneId] = antes;
    }

    const cuenta: Record<string, CuentaDeZona> = { ...sueltas };
    for (const zona of mapa.zones) {
      if (!zona.children.length) continue;
      cuenta[zona.id] = zona.children.reduce(
        (suma, hija) => ({
          hechas: suma.hechas + (sueltas[hija.id]?.hechas ?? 0),
          fallos: suma.fallos + (sueltas[hija.id]?.fallos ?? 0),
        }),
        sueltas[zona.id] ?? { hechas: 0, fallos: 0 },
      );
    }
    return cuenta;
  }, [capturas, mapa.zones]);

  /**
   * Las bajas, sumando también las de las hijas en el padre: si perdiste algo
   * dentro de una ciudad, la calavera tiene que verse en la ciudad, que es lo
   * único que se dibuja en el mapa.
   */
  const bajasPorZona = useMemo(() => {
    const cuenta: Record<string, number> = { ...bajas };
    for (const zona of mapa.zones) {
      if (!zona.children.length) continue;
      cuenta[zona.id] = zona.children.reduce(
        (suma, hija) => suma + (bajas[hija.id] ?? 0),
        bajas[zona.id] ?? 0,
      );
    }
    return cuenta;
  }, [bajas, mapa.zones]);

  /** Todas las zonas capturables, padres e hijas, para la lista y el buscador */
  const todas = useMemo(
    () => mapa.zones.flatMap((zona) => [zona, ...zona.children]),
    [mapa.zones],
  );

  // Un grupo no se captura él mismo: en la lista salen sus hijas, no él
  const capturables = useMemo(() => todas.filter((zona) => !zona.children.length), [todas]);
  /**
   * Libre es **sin nada apuntado**: ni captura ni encuentro fallado, que en un
   * locke también gasta la ruta. Es lo que se pregunta al jugar: ¿dónde me
   * queda por capturar?
   */
  const esLibre = (zona: ZonaDelMapa) => !porZona[zona.id]?.hechas && !porZona[zona.id]?.fallos;
  const libres = capturables.filter(esLibre).length;

  const filtradas = useMemo(() => {
    const aguja = busqueda.trim().toLowerCase();
    return capturables.filter(
      (zona) =>
        (!aguja || zona.name.toLowerCase().includes(aguja)) &&
        (cuales === "todas" || (cuales === "libres") === esLibre(zona)),
    );
    // esLibre solo lee porZona, que ya está en la lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, capturables, cuales, porZona]);

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

  // La cuenta de arriba es de todas: con «Libres» marcado saldría siempre «0 de N»
  const hechas = capturables.filter((zona) => porZona[zona.id]?.hechas).length;
  const falladas = capturables.filter(
    (zona) => !porZona[zona.id]?.hechas && porZona[zona.id]?.fallos,
  ).length;

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
            <Icono emoji="🗺️" /> Mapa
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {hechas} de {capturables.length} zonas capturadas
          {falladas ? ` · ${falladas} sin premio` : ""} ·{" "}
          {capturas.filter((captura) => !captura.failed).length}{" "}
          {capturas.filter((captura) => !captura.failed).length === 1
            ? "captura"
            : "capturas"}
        </p>
      </div>

      {vista === "mapa" ? (
        <>
          <Mapa
            mapa={mapa}
            cuentas={porZona}
            bajas={bajasPorZona}
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
            ref={buscador}
            className="input mb-2"
            placeholder="Buscar una ruta o un sitio…"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Qué zonas enseñar">
            {(
              [
                ["todas", `Todas · ${capturables.length}`],
                ["libres", `Libres · ${libres}`],
                ["usadas", `Usadas · ${capturables.length - libres}`],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={cuales === valor}
                onClick={() => elegirCuales(valor)}
                className={cx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  cuales === valor
                    ? "border-brand-500/50 bg-brand-600/25 text-white"
                    : "border-white/10 text-slate-400 hover:text-slate-200",
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
          {filtradas.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filtradas.map((zona) => (
                <li key={zona.id}>
                  <FilaDeZona
                    zona={zona}
                    capturas={capturas.filter((c) => c.zoneId === zona.id)}
                    caidos={bajas[zona.id] ?? 0}
                    onAbrir={() => setAbierta(zona)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
              {cuales === "libres" && !busqueda.trim()
                ? "No te queda ninguna ruta libre."
                : cuales === "usadas" && !busqueda.trim()
                  ? "Todavía no has apuntado nada en ninguna."
                  : "Ninguna zona se llama así."}
            </p>
          )}
        </>
      )}

      {grupo ? (
        <ListaDelGrupo
          grupo={grupo}
          cuentas={porZona}
          bajas={bajas}
          onElegir={(hija) => {
            setGrupo(null);
            setAbierta(hija);
          }}
          onClose={() => setGrupo(null)}
        />
      ) : null}

      <Pendientes tipo="captura" />

      {abierta ? (
        <FichaDeZona
          zona={abierta}
          capturas={capturas.filter((c) => c.zoneId === abierta.id)}
          caidos={bajas[abierta.id] ?? 0}
          competitionId={competitionId}
          soloMirar={soloMirar}
          onClose={() => setAbierta(null)}
        />
      ) : null}
    </>
  );
}

function FilaDeZona({
  zona,
  capturas,
  caidos,
  onAbrir,
}: {
  zona: ZonaDelMapa;
  capturas: CapturaApuntada[];
  /** Pokémon tuyos que han caído ahí, según el cementerio */
  caidos: number;
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
      {caidos ? (
        <span
          title={`Aquí has perdido ${caidos} ${caidos === 1 ? "pokémon" : "pokémon"}`}
          className="shrink-0 rounded-md bg-red-500/10 px-1.5 py-0.5 text-xs text-red-300"
        >
          <Icono emoji="💀" />{caidos > 1 ? ` ${caidos}` : ""}
        </span>
      ) : null}
      {capturas.length ? (
        <span className="flex shrink-0 -space-x-2">
          {capturas.slice(0, 3).map((captura) =>
            // Los fallados no tienen sprite: van con su ✕, igual que en el mapa
            captura.failed ? (
              <span
                key={captura.id}
                title={`${captura.species}: no se pudo capturar`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-850 text-xs font-bold text-red-400 ring-1 ring-red-500/30"
              >
                ✕
              </span>
            ) : captura.image ? (
              <SpritePokemon
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
  bajas,
  onElegir,
  onClose,
}: {
  grupo: ZonaDelMapa;
  cuentas: Record<string, CuentaDeZona>;
  bajas: Record<string, number>;
  onElegir: (hija: ZonaDelMapa) => void;
  onClose: () => void;
}) {
  return (
    <Hoja onCerrar={onClose} ancho="max-w-md" fondo="bg-black/80" className="p-4 sm:p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <p className="antetitulo">
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
          const cuantas = cuentas[hija.id] ?? { hechas: 0, fallos: 0 };
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
                {bajas[hija.id] ? (
                  <span className="shrink-0 text-xs text-red-300">
                    <Icono emoji="💀" />{bajas[hija.id] > 1 ? ` ${bajas[hija.id]}` : ""}
                  </span>
                ) : null}
                <span className="shrink-0 text-xs text-slate-500">
                  {cuantas.hechas
                    ? `${cuantas.hechas} apuntado${cuantas.hechas === 1 ? "" : "s"}`
                    : cuantas.fallos
                      ? "✕ sin premio"
                      : "vacía"}
                </span>
                <span aria-hidden className="shrink-0 text-slate-500">
                  ▸
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Hoja>
  );
}

/**
 * Apuntar una captura, aguantando sin conexión: si no hay línea se queda en la
 * cola del móvil con su resumen —"Sentret en Ruta 29"— y sube sola después.
 */
function capturaConCola(competitionId: string, zona: string | null) {
  return conCola(
    apuntarCapturaAction,
    "captura",
    (formData) => {
      const especie = String(formData.get("species") ?? "").trim() || "Pokémon";
      const fallado = formData.get("failed") === "on" ? " (fallado)" : "";
      return `${especie}${fallado} · ${zona ?? "captura extra"}`;
    },
    // La edición no va en el formulario (en línea, la acción la saca de la
    // sesión), pero a la cola sí: al subirla más tarde va a este locke aunque
    // entre medias se haya cambiado de edición
    () => ({ competitionId }),
  );
}

/** El panel de una zona: lo que ya tienes ahí y el formulario para añadir. */
function FichaDeZona({
  zona,
  capturas,
  caidos,
  competitionId,
  soloMirar,
  onClose,
}: {
  zona: ZonaDelMapa;
  capturas: CapturaApuntada[];
  /** Pokémon tuyos que han caído ahí, según el cementerio */
  caidos: number;
  competitionId: string;
  soloMirar: boolean;
  onClose: () => void;
}) {
  const apuntarAunqueNoHayaLinea = useMemo(
    () => capturaConCola(competitionId, zona.name),
    [competitionId, zona.name],
  );
  const [estado, apuntar] = useActionState<FormState, FormData>(
    apuntarAunqueNoHayaLinea,
    null,
  );
  // Vaciar el buscador de especie después de apuntar: lleva estado propio y un
  // reset() del formulario no lo limpiaría
  const [vuelta, setVuelta] = useState(0);

  const color = colorDeZona(zona.kind);

  return (
    <Hoja onCerrar={onClose} ancho="max-w-lg" fondo="bg-black/80" className="p-4 sm:p-5">
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

      {/* Lo que has perdido ahí sale del cementerio, no de aquí: por eso solo
          se cuenta y no se puede tocar desde esta ventana */}
      {caidos ? (
        <p className="mb-3 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-red-200">
          <Icono emoji="💀" /> Aquí has perdido {caidos} {caidos === 1 ? "pokémon" : "pokémon"}.{" "}
          <span className="text-red-300/70">Se apunta en la Caja.</span>
        </p>
      ) : null}

      {capturas.length ? (
        <ul className="mb-4 space-y-2">
          {capturas.map((captura) => (
            <Capturado key={captura.id} captura={captura} soloMirar={soloMirar} />
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-slate-500">
          {soloMirar ? "Aquí no apuntaste nada." : "Todavía no has apuntado nada aquí."}
        </p>
      )}

      {soloMirar ? null : (
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
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-slate-300">
          <input type="checkbox" name="failed" className="accent-red-400" />
          ✕ No lo pude capturar (se escapó, se murió…)
        </label>
        <FormMessage state={estado} />
        <SubmitButton className="btn-primary btn-sm">Apuntar</SubmitButton>
      </form>
      )}
    </Hoja>
  );
}

function Capturado({
  captura,
  soloMirar = false,
}: {
  captura: CapturaApuntada;
  soloMirar?: boolean;
}) {
  return (
    <li
      className={cx(
        "flex items-center gap-3 rounded-xl border p-2.5",
        captura.failed
          ? "border-red-500/25 bg-red-500/[0.06]"
          : "border-white/10 bg-white/[0.02]",
      )}
    >
      <span
        className={cx(
          "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-ink-850",
          captura.failed ? "border-red-500/30" : "border-white/10",
        )}
      >
        {captura.failed ? (
          // No se baja sprite de los fallados: en su sitio va la ✕
          <span className="text-xl font-bold text-red-400" aria-label="No capturado">
            ✕
          </span>
        ) : captura.image ? (
          <SpritePokemon
            src={captura.image}
            alt={captura.species}
            className="h-9 w-9 object-contain"
          />
        ) : (
          <span aria-hidden><Icono emoji="❔" /></span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cx(
            "truncate text-sm font-medium",
            captura.failed ? "text-slate-400 line-through" : "text-slate-100",
          )}
        >
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
          {captura.failed ? (
            <span className="text-red-300/80">
              No se pudo capturar
              {captura.notes ? ` · ${captura.notes}` : ""}
            </span>
          ) : (
            (captura.notes ?? formatDateTime(captura.createdAt))
          )}
        </p>
      </div>
      {soloMirar ? null : (
        <form action={borrarCapturaAction} className="shrink-0">
          <input type="hidden" name="captureId" value={captura.id} />
          <ConfirmSubmit
            className="btn-ghost btn-sm text-red-300"
            message={`¿Borrar ${captura.nickname ?? captura.species}?`}
          >
            ✕
          </ConfirmSubmit>
        </form>
      )}
    </li>
  );
}

/**
 * Las capturas que no salen de ninguna zona del mapa: un regalo, un
 * intercambio, la captura de premio de un reto. Van aparte porque no tienen
 * sitio donde ponerse.
 */
export function CapturasExtra({
  capturas,
  competitionId,
  soloMirar = false,
}: {
  capturas: CapturaApuntada[];
  competitionId: string;
  soloMirar?: boolean;
}) {
  const apuntarAunqueNoHayaLinea = useMemo(
    () => capturaConCola(competitionId, null),
    [competitionId],
  );
  const [estado, apuntar] = useActionState<FormState, FormData>(
    apuntarAunqueNoHayaLinea,
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
        {soloMirar ? null : (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setAbierto(!abierto)}
          >
            {abierto ? "Cerrar" : "＋ Apuntar una"}
          </button>
        )}
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
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-slate-300">
            <input type="checkbox" name="failed" className="accent-red-400" />
            ✕ No lo pude capturar (se escapó, se murió…)
          </label>
          <FormMessage state={estado} />
          <SubmitButton className="btn-primary btn-sm">Apuntar</SubmitButton>
        </form>
      ) : null}

      {capturas.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {capturas.map((captura) => (
            <Capturado key={captura.id} captura={captura} soloMirar={soloMirar} />
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
