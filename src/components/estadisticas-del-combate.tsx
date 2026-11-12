"use client";

import { useEffect, useState, useTransition } from "react";
import { Hoja } from "@/components/hoja";
import { SpritePokemon } from "@/components/sprite-pokemon";
import {
  elegirCapturaDelCombateAction,
  estadisticasDeCombatesAction,
  type EstadisticasDelCombateLeidas,
  type PokemonDelCombate,
} from "@/app/actions/estadisticas";
import type { RefCombate } from "@/lib/estadisticas";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";

/**
 * Lo que hizo cada pokémon en un combate de jornada, sacado de su repetición:
 * para decidir a quién votar como MVP con algo más que la memoria.
 *
 * Se pide al abrir y se guarda aquí mientras dure la página: la repetición ya
 * está leída y guardada en el servidor, así que pedirla otra vez no cuesta,
 * pero tampoco hace falta.
 */
const yaLeidas = new Map<string, Promise<EstadisticasDelCombateLeidas>>();
function leer(refs: RefCombate[]) {
  const clave = refs.map((r) => `${r.tipo}:${r.id}`).join(",");
  const guardada = yaLeidas.get(clave);
  if (guardada) return guardada;
  const promesa = estadisticasDeCombatesAction(refs);
  yaLeidas.set(clave, promesa);
  // Si falla, que se pueda volver a intentar al abrirla otra vez
  promesa.then((r) => r.error && yaLeidas.delete(clave)).catch(() => yaLeidas.delete(clave));
  return promesa;
}

export type QueSeMira =
  | { tipo: "combate" }
  | { tipo: "pokemon"; teamId: string; nombre: string; imagen: string | null };

/** Las filas, en el orden en que se leen */
const FILAS: { campo: keyof PokemonDelCombate; rotulo: string; corto: string }[] = [
  { campo: "kos", rotulo: "KOs", corto: "KO" },
  { campo: "danoHecho", rotulo: "Daño hecho", corto: "Daño" },
  { campo: "criticosHechos", rotulo: "Críticos hechos", corto: "Crít." },
  { campo: "supereficaces", rotulo: "Golpes muy eficaces", corto: "Muy ef." },
  { campo: "danoRecibido", rotulo: "Daño recibido", corto: "Recib." },
  { campo: "criticosRecibidos", rotulo: "Críticos recibidos", corto: "Crít. rec." },
  { campo: "fallos", rotulo: "Ataques fallados", corto: "Fallos" },
  { campo: "esquivados", rotulo: "Ataques esquivados", corto: "Esquiv." },
  { campo: "turnos", rotulo: "Turnos en el campo", corto: "Turnos" },
  { campo: "turnosPerdidos", rotulo: "Turnos sin poder moverse", corto: "Sin mov." },
];

type Sumable = Exclude<(typeof FILAS)[number]["campo"], "cayo">;

/** Lo de un pokémon en varios combates, sumado: lo que se enseña al tocarlo en una serie */
function sumarDe(datos: EstadisticasDelCombateLeidas, teamId: string) {
  const suyos = (datos.combates ?? []).flatMap((c) =>
    (c.lados ?? []).flatMap((l) => l.pokemon).filter((p) => p.teamId === teamId),
  );
  if (!suyos.length) return null;
  const total = { ...suyos[0] };
  for (const p of suyos.slice(1)) {
    for (const f of FILAS) (total[f.campo as Sumable] as number) += Number(p[f.campo]);
    total.cayo = total.cayo || p.cayo;
    total.ultimoEnPie = total.ultimoEnPie || p.ultimoEnPie;
  }
  return { total, combates: suyos.length, caidas: suyos.filter((p) => p.cayo).length };
}

/** El daño va en % de una vida, sumado: 230 es «dos vidas y pico» */
function valor(p: PokemonDelCombate, campo: keyof PokemonDelCombate) {
  const n = p[campo];
  if (campo === "danoHecho" || campo === "danoRecibido") return `${Math.round(Number(n))} %`;
  return String(n);
}

/** Un botón que abre las tablas de uno o varios combates (los de una llave de la final) */
export function BotonDeEstadisticas({ refs, titulo }: { refs: RefCombate[]; titulo: string }) {
  const [abierta, setAbierta] = useState(false);
  if (!refs.length) return null;
  return (
    <>
      <button type="button" className="btn-ghost btn-sm" onClick={() => setAbierta(true)}>
        <Icono emoji="📊" /> {titulo}
      </button>
      {abierta ? (
        <EstadisticasDelCombate refs={refs} titulo={titulo} mira={{ tipo: "combate" }} onCerrar={() => setAbierta(false)} />
      ) : null}
    </>
  );
}

export function EstadisticasDelCombate({
  refs,
  mira,
  onCerrar,
  titulo = "Estadísticas del combate",
}: {
  /** Uno, o los de una serie o una final: al tocar un pokémon se suma lo suyo en todos */
  refs: RefCombate[];
  mira: QueSeMira;
  onCerrar: () => void;
  titulo?: string;
}) {
  const [datos, setDatos] = useState<EstadisticasDelCombateLeidas | null>(null);

  useEffect(() => {
    let vivo = true;
    leer(refs)
      .then((r) => vivo && setDatos(r))
      .catch(() => vivo && setDatos({ error: "No se han podido leer las estadísticas. Prueba otra vez." }));
    return () => {
      vivo = false;
    };
    // Las refs llegan nuevas en cada render; lo que cuenta es a qué combates apuntan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs.map((r) => `${r.tipo}:${r.id}`).join(",")]);

  return (
    <Hoja onCerrar={onCerrar} ancho={mira.tipo === "combate" ? "max-w-3xl" : "max-w-sm"} className="p-5">
      <div className="mb-3 flex items-center gap-3">
        {mira.tipo === "pokemon" && mira.imagen ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
            <SpritePokemon src={mira.imagen} alt="" className="h-full w-full object-contain" />
          </span>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {mira.tipo === "pokemon" ? (
            mira.nombre
          ) : (
            <>
              <Icono emoji="📊" /> {titulo}
            </>
          )}
        </h2>
        <button type="button" className="btn-ghost btn-sm" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
      </div>

      {!datos ? (
        <p className="py-6 text-center text-sm text-slate-400">Leyendo la repetición…</p>
      ) : datos.error || !datos.combates ? (
        <p className="py-6 text-center text-sm text-rose-300">{datos.error}</p>
      ) : mira.tipo === "pokemon" ? (
        <DeUnPokemon datos={datos} teamId={mira.teamId} />
      ) : (
        <DelCombate datos={datos} varios={refs.length > 1} />
      )}
    </Hoja>
  );
}

function DeUnPokemon({ datos, teamId }: { datos: EstadisticasDelCombateLeidas; teamId: string }) {
  const suma = sumarDe(datos, teamId);
  const este = suma?.total;
  const eleccion = datos.elegir?.[teamId];
  const conRepeticion = datos.combates?.filter((c) => c.lados).length ?? 0;
  return (
    <>
      {suma && (datos.combates?.length ?? 0) > 1 ? (
        <p className="mb-2 text-xs text-slate-400">
          Sumado de {suma.combates === 1 ? "el combate" : `los ${suma.combates} combates`} en que salió
          {conRepeticion < (datos.combates?.length ?? 0) ? " (de los que tienen repetición)" : ""}.
        </p>
      ) : null}
      {este ? (
        <dl className="divide-y divide-white/5 text-sm" data-estadisticas-pokemon>
          {FILAS.map((f) => (
            <div key={f.campo} className="flex items-center justify-between py-1.5">
              <dt className="text-slate-400">{f.rotulo}</dt>
              <dd className="font-semibold tabular-nums">{valor(este, f.campo)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-slate-400">{suma.combates > 1 ? "Veces que cayó" : "¿Acabó en pie?"}</dt>
            <dd className="font-semibold">
              {suma.combates > 1 ? (
                suma.caidas
              ) : este.cayo ? (
                <>
                  <Icono emoji="💀" /> Cayó
                </>
              ) : este.ultimoEnPie ? (
                "El último en pie"
              ) : (
                "Sí"
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="py-4 text-center text-sm text-slate-400">
          {conRepeticion
            ? "En la repetición no sale: o no llegó a salir al campo, o se apuntó con otro nombre."
            : (datos.combates?.find((c) => c.error)?.error ?? "Aún no hay repetición de la que sacarlo.")}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        El daño va en % de la vida del rival, sumado: 200 % son dos pokémon enteros.
      </p>
      {eleccion ? <CualDeTuCaja teamId={teamId} eleccion={eleccion} /> : null}
    </>
  );
}

/**
 * Dos iguales sin mote en la caja: el dueño dice cuál era, para que sus números
 * se le sumen al que toca. Solo le llega a quien puede tocar esa caja.
 */
const ORDINALES = ["primero", "segundo", "tercero", "cuarto", "quinto"];

function CualDeTuCaja({
  teamId,
  eleccion,
}: {
  teamId: string;
  eleccion: NonNullable<EstadisticasDelCombateLeidas["elegir"]>[string];
}) {
  const [elegido, setElegido] = useState(eleccion.elegido ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, startTransition] = useTransition();

  return (
    <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
      <label className="block text-sm font-semibold text-amber-200" htmlFor={`caja-${teamId}`}>
        ¿Cuál de tu caja es?
      </label>
      <p className="mt-0.5 text-xs text-slate-400">
        Tienes más de uno que podría ser este. Dilo y sus números se le suman al que toca; esto solo lo ves tú.
      </p>
      <select
        id={`caja-${teamId}`}
        className="input mt-2"
        value={elegido}
        disabled={pendiente}
        onChange={(evento) => {
          const nuevo = evento.target.value;
          setElegido(nuevo);
          setGuardado(false);
          setError(null);
          startTransition(async () => {
            const r = await elegirCapturaDelCombateAction(teamId, nuevo || null);
            if (r.error) setError(r.error);
            else {
              eleccion.elegido = nuevo || null;
              setGuardado(true);
            }
          });
        }}
      >
        <option value="">Que lo adivine la app</option>
        {eleccion.opciones.map((o, i) => (
          <option key={o.captureId} value={o.captureId}>
            {o.mote ?? o.especie} · el que capturaste {ORDINALES[i] ?? `en ${i + 1}.º lugar`}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-rose-300">{error}</p> : null}
      {guardado ? <p className="mt-1 text-xs text-emerald-300">Apuntado.</p> : null}
    </div>
  );
}

function DelCombate({ datos, varios }: { datos: EstadisticasDelCombateLeidas; varios: boolean }) {
  return (
    <div className="space-y-5" data-estadisticas-combate>
      {datos.combates!.map((combate, indice) => (
        <div key={indice} className="space-y-3">
          {varios ? <h3 className="rotulo">Combate {indice + 1}</h3> : null}
          {combate.lados ? (
            combate.lados.map((lado) => <TablaDeUnLado key={lado.participantId} lado={lado} />)
          ) : (
            <p className="text-xs text-slate-500">{combate.error}</p>
          )}
        </div>
      ))}
      <p className="text-xs text-slate-500">
        El daño va en % de la vida del rival, sumado: 200 % son dos pokémon enteros.
      </p>
    </div>
  );
}

function TablaDeUnLado({ lado }: { lado: NonNullable<NonNullable<EstadisticasDelCombateLeidas["combates"]>[number]["lados"]>[number] }) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-slate-300">{lado.nombre}</h4>
      {lado.pokemon.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1 pr-2 text-left font-medium">Pokémon</th>
                {FILAS.map((f) => (
                  <th key={f.campo} className="px-1 py-1 text-right font-medium" title={f.rotulo}>
                    {f.corto}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lado.pokemon.map((p) => (
                <tr key={p.nombre} className={cx(p.cayo && "text-slate-500")}>
                  <td className="max-w-[9rem] truncate py-1.5 pr-2">
                    {p.cayo ? <Icono emoji="💀" className="mr-1 inline" /> : null}
                    {p.mote ?? p.especie}
                  </td>
                  {FILAS.map((f) => (
                    <td key={f.campo} className="px-1 py-1.5 text-right tabular-nums">
                      {valor(p, f.campo)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-500">No se ha podido saber qué lado de la repetición era.</p>
      )}
    </div>
  );
}
