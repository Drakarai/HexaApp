"use client";

import { useEffect, useState, useTransition } from "react";
import { Hoja } from "@/components/hoja";
import { SpritePokemon } from "@/components/sprite-pokemon";
import {
  elegirCapturaDelCombateAction,
  estadisticasDelCombateAction,
  type EstadisticasDelCombateLeidas,
  type PokemonDelCombate,
} from "@/app/actions/estadisticas";
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
function leer(matchId: string) {
  let promesa = yaLeidas.get(matchId);
  if (!promesa) {
    promesa = estadisticasDelCombateAction(matchId);
    yaLeidas.set(matchId, promesa);
    // Si falla, que se pueda volver a intentar al abrirla otra vez
    promesa.then((r) => r.error && yaLeidas.delete(matchId)).catch(() => yaLeidas.delete(matchId));
  }
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
];

/** El daño va en % de una vida, sumado: 230 es «dos vidas y pico» */
function valor(p: PokemonDelCombate, campo: keyof PokemonDelCombate) {
  const n = p[campo];
  if (campo === "danoHecho" || campo === "danoRecibido") return `${Math.round(Number(n))} %`;
  return String(n);
}

export function EstadisticasDelCombate({
  matchId,
  mira,
  onCerrar,
}: {
  matchId: string;
  mira: QueSeMira;
  onCerrar: () => void;
}) {
  const [datos, setDatos] = useState<EstadisticasDelCombateLeidas | null>(null);

  useEffect(() => {
    let vivo = true;
    leer(matchId)
      .then((r) => vivo && setDatos(r))
      .catch(() => vivo && setDatos({ error: "No se han podido leer las estadísticas. Prueba otra vez." }));
    return () => {
      vivo = false;
    };
  }, [matchId]);

  return (
    <Hoja onCerrar={onCerrar} ancho={mira.tipo === "combate" ? "max-w-3xl" : "max-w-sm"} className="p-5">
      <div className="mb-3 flex items-center gap-3">
        {mira.tipo === "pokemon" && mira.imagen ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
            <SpritePokemon src={mira.imagen} alt="" className="h-full w-full object-contain" />
          </span>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {mira.tipo === "pokemon" ? mira.nombre : "📊 Estadísticas del combate"}
        </h2>
        <button type="button" className="btn-ghost btn-sm" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
      </div>

      {!datos ? (
        <p className="py-6 text-center text-sm text-slate-400">Leyendo la repetición…</p>
      ) : datos.error || !datos.lados ? (
        <p className="py-6 text-center text-sm text-rose-300">{datos.error}</p>
      ) : mira.tipo === "pokemon" ? (
        <DeUnPokemon datos={datos} teamId={mira.teamId} />
      ) : (
        <DelCombate datos={datos} />
      )}
    </Hoja>
  );
}

function DeUnPokemon({ datos, teamId }: { datos: EstadisticasDelCombateLeidas; teamId: string }) {
  const este = datos.lados?.flatMap((l) => l.pokemon).find((p) => p.teamId === teamId);
  const eleccion = datos.elegir?.[teamId];
  return (
    <>
      {este ? (
        <dl className="divide-y divide-white/5 text-sm" data-estadisticas-pokemon>
          {FILAS.map((f) => (
            <div key={f.campo} className="flex items-center justify-between py-1.5">
              <dt className="text-slate-400">{f.rotulo}</dt>
              <dd className="font-semibold tabular-nums">{valor(este, f.campo)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-slate-400">¿Acabó en pie?</dt>
            <dd className="font-semibold">{este.cayo ? "💀 Cayó" : "Sí"}</dd>
          </div>
        </dl>
      ) : (
        <p className="py-4 text-center text-sm text-slate-400">
          En la repetición no sale: o no llegó a salir al campo, o se apuntó con otro nombre.
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

function DelCombate({ datos }: { datos: EstadisticasDelCombateLeidas }) {
  return (
    <div className="space-y-4" data-estadisticas-combate>
      {datos.lados!.map((lado) => (
        <div key={lado.participantId}>
          <h3 className="mb-1 text-sm font-semibold text-slate-300">{lado.nombre}</h3>
          {lado.pokemon.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-xs">
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
                        {p.cayo ? "💀 " : ""}
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
      ))}
      <p className="text-xs text-slate-500">
        El daño va en % de la vida del rival, sumado: 200 % son dos pokémon enteros.
      </p>
    </div>
  );
}
