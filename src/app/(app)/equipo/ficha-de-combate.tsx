"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { ChapaDeTipo } from "@/components/chapa-de-tipo";
import { cambiarFichaDeCombateAction } from "@/app/actions/equipo-y-caja";
import { leerShowdownAction } from "@/app/actions/showdown";
import { sinConexion } from "@/lib/acciones-sin-conexion";
import type { FichaDeCombate as Ficha } from "@/lib/soul-link";
import { cx } from "@/lib/utils";
import { useEsAnil } from "@/components/juego-del-locke";

type Aviso = { tipo: "ok" | "error"; texto: string };

/** Lo que se carga al editar: la lista entera de movimientos, objetos y habilidades */
type Listas = {
  movimientos: { s: string; n: string }[];
  naturalezas: { s: string; n: string; sube: string | null; baja: string | null }[];
  objetos: { slug: string; nombre: string }[];
  habilidades: { s: string; n: string; d: string }[];
  movimientoPorNombre: (nombre: string) => { s: string; n: string } | undefined;
  habilidadPorNombre: (nombre: string) => { s: string; n: string; d: string } | undefined;
  habilidadesDe: (pokemonId: number | null) => string[];
  megaPorPiedra: (pokemonId: number | null, especie: string, objeto: string | null) => number | null;
  plano: (texto: string) => string;
};

/**
 * Los objetos que tiene sentido que lleve un pokémon: fuera los clave, las
 * cartas, las MT y las Poké Balls, que en la lista solo estorban.
 */
const NO_SE_LLEVAN = new Set(["Objetos clave", "Correo", "MT y MO", "Bolas"]);

/**
 * Con `conAnil`, lo de Pokémon Añil: sus movimientos, objetos, habilidades y
 * megapiedras (ver lib/anil.ts). Las megapiedras van aquí para que, al poner o
 * quitar la piedra, la habilidad que se edita sea ya la de la forma que toca.
 */
async function cargarListas(conAnil: boolean): Promise<Listas> {
  const [m, o, h, mg] = await Promise.all([
    import("@/lib/movimientos"),
    import("@/lib/objetos"),
    import("@/lib/habilidades"),
    import("@/lib/megas"),
  ]);
  return {
    movimientos: m.movimientosDelJuego(conAnil),
    naturalezas: m.NATURALEZAS,
    objetos: o.objetosDelJuego(conAnil).filter((objeto) => !NO_SE_LLEVAN.has(objeto.grupo)),
    habilidades: h.habilidadesDelJuego(conAnil),
    movimientoPorNombre: (nombre) => m.movimientoPorNombre(nombre, conAnil),
    habilidadPorNombre: (nombre) => h.habilidadPorNombre(nombre, conAnil),
    habilidadesDe: (pokemonId) => h.habilidadesDe(pokemonId, conAnil),
    megaPorPiedra: (pokemonId, especie, objeto) => mg.megaPorPiedra(pokemonId, especie, objeto, conAnil),
    plano: m.plano,
  };
}

/** "Ataque Especial" → "At. Esp.", para que quepa en la chapa de la naturaleza */
function corta(estadistica: string) {
  return estadistica.replace("Ataque Especial", "At. Esp.").replace("Defensa Especial", "Def. Esp.");
}

/**
 * La **ficha completa** de un pokémon del Equipo y PC: naturaleza, objeto y
 * sus cuatro movimientos, todo opcional y sin nivel. Se ve donde se ve su
 * ficha (la tuya, o la de todos en un Soul Link) y la edita quien puede tocar
 * la caja. Se puede rellenar a mano o pegando su set exportado de Showdown.
 */
export function FichaDeCombate({
  captureId,
  especie,
  ficha,
  editable,
  onAviso,
}: {
  captureId: string;
  especie: string;
  ficha: Ficha;
  editable: boolean;
  onAviso: (aviso: Aviso) => void;
}) {
  const [editando, setEditando] = useState(false);
  const vacia = !ficha.naturaleza && !ficha.objeto && !ficha.habilidad && !ficha.movimientos.length;

  if (editando) {
    return (
      <Editor
        captureId={captureId}
        especie={especie}
        ficha={ficha}
        onAviso={onAviso}
        onCerrar={() => setEditando(false)}
      />
    );
  }

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center gap-2">
        <p className="rotulo">Para combatir</p>
        {editable ? (
          <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setEditando(true)}>
            {vacia ? "Apuntar" : "Editar"}
          </button>
        ) : null}
      </div>

      {vacia ? (
        <p className="text-sm text-slate-500">
          {editable
            ? "Naturaleza, objeto, habilidad y movimientos, para tenerlos a mano. También se pegan de Showdown."
            : "Sin apuntar."}
        </p>
      ) : (
        <>
          {ficha.naturaleza || ficha.objeto || ficha.habilidad ? (
            <div className="flex flex-wrap gap-1.5">
              {ficha.naturaleza ? (
                <span className="chip text-xs" title="Naturaleza">
                  {ficha.naturaleza.nombre}
                  {ficha.naturaleza.sube && ficha.naturaleza.baja ? (
                    <span className="ml-1 font-normal text-slate-400">
                      <span className="text-emerald-300">+{corta(ficha.naturaleza.sube)}</span>{" "}
                      <span className="text-red-300">−{corta(ficha.naturaleza.baja)}</span>
                    </span>
                  ) : (
                    <span className="ml-1 font-normal text-slate-500">neutra</span>
                  )}
                </span>
              ) : null}
              {ficha.objeto ? (
                <span className="chip gap-1 text-xs" title="Lo que lleva">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ficha.objeto.imagen} alt="" className="h-5 w-5 [image-rendering:pixelated]" />
                  {ficha.objeto.nombre}
                </span>
              ) : null}
              {ficha.habilidad ? (
                <span className="chip text-xs" title={ficha.habilidad.descripcion || "Habilidad"}>
                  <span className="mr-1 font-normal text-slate-500">{ficha.conMega ? "Habilidad mega" : "Habilidad"}</span>
                  {ficha.habilidad.nombre}
                </span>
              ) : null}
            </div>
          ) : null}
          {ficha.habilidad?.descripcion ? (
            <p className="mt-1.5 text-xs leading-snug text-slate-500">{ficha.habilidad.descripcion}</p>
          ) : null}
          {ficha.movimientos.length ? (
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {ficha.movimientos.map((m) => (
                <li
                  key={m.slug}
                  className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5"
                >
                  {m.tipo ? (
                    <ChapaDeTipo slug={m.tipo.slug} nombre={m.tipo.nombre} forma="icono" alto={16} />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{m.nombre}</span>
                  <span
                    className="shrink-0 text-[10px] tabular-nums text-slate-500"
                    title={m.clase === 0 ? "De estado" : m.clase === 1 ? "Físico" : "Especial"}
                  >
                    {m.clase === 0 ? "estado" : (m.potencia ?? "—")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}

function Editor({
  captureId,
  especie,
  ficha,
  onAviso,
  onCerrar,
}: {
  captureId: string;
  especie: string;
  ficha: Ficha;
  onAviso: (aviso: Aviso) => void;
  onCerrar: () => void;
}) {
  const id = useId();
  const anil = useEsAnil();
  const [listas, setListas] = useState<Listas | null>(null);
  const [naturaleza, setNaturaleza] = useState(ficha.naturaleza?.slug ?? "");
  const [objeto, setObjeto] = useState(ficha.objeto?.nombre ?? "");
  // Las dos habilidades, por su nombre: la de siempre y la de su mega (ver lib/megas.ts)
  const [habilidad, setHabilidad] = useState("");
  const [habilidadMega, setHabilidadMega] = useState("");
  const [movimientos, setMovimientos] = useState<string[]>(() =>
    Array.from({ length: 4 }, (_, i) => ficha.movimientos[i]?.nombre ?? ""),
  );
  const [pegado, setPegado] = useState("");
  const [pendiente, empezar] = useTransition();

  useEffect(() => {
    let vigente = true;
    cargarListas(anil)
      .then((cargadas) => {
        if (!vigente) return;
        const nombre = (slug: string | null) => cargadas.habilidades.find((h) => h.s === slug)?.n ?? "";
        setHabilidad(nombre(ficha.habilidades.normal));
        setHabilidadMega(nombre(ficha.habilidades.mega));
        setListas(cargadas);
      })
      .catch(() => vigente && onAviso({ tipo: "error", texto: "Sin conexión: la lista de movimientos no carga." }));
    return () => {
      vigente = false;
    };
    // Solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El objeto escrito, si es uno de la lista; y si es su megapiedra, la mega que saldría
  const slugDelObjeto = listas && objeto.trim()
    ? listas.objetos.find((o) => listas.plano(o.nombre) === listas.plano(objeto))?.slug
    : null;
  const mega = listas ? listas.megaPorPiedra(ficha.base, especie, slugDelObjeto ?? null) : null;
  const [valorHabilidad, ponerHabilidad] = mega ? [habilidadMega, setHabilidadMega] : [habilidad, setHabilidad];
  const habilidadElegida = listas && valorHabilidad.trim() ? listas.habilidadPorNombre(valorHabilidad) : undefined;
  // Las suyas primero en la lista; luego todas
  const suyas = listas ? listas.habilidadesDe(mega ?? ficha.base) : [];
  const habilidadesOrdenadas = listas
    ? [
        ...suyas.flatMap((s) => listas.habilidades.filter((h) => h.s === s)),
        ...listas.habilidades.filter((h) => !suyas.includes(h.s)),
      ]
    : [];

  function guardar() {
    if (!listas) return;
    const slugObjeto = slugDelObjeto;
    if (slugObjeto === undefined) {
      onAviso({ tipo: "error", texto: `No conozco el objeto «${objeto.trim()}». Elígelo de la lista.` });
      return;
    }
    const slugsDeHabilidad: (string | null)[] = [];
    for (const nombre of [habilidad, habilidadMega]) {
      if (!nombre.trim()) {
        slugsDeHabilidad.push(null);
        continue;
      }
      const encontrada = listas.habilidadPorNombre(nombre);
      if (!encontrada) {
        onAviso({ tipo: "error", texto: `No conozco la habilidad «${nombre.trim()}». Elígela de la lista.` });
        return;
      }
      slugsDeHabilidad.push(encontrada.s);
    }
    const slugs: string[] = [];
    for (const nombre of movimientos.map((m) => m.trim()).filter(Boolean)) {
      const movimiento = listas.movimientoPorNombre(nombre);
      if (!movimiento) {
        onAviso({ tipo: "error", texto: `No conozco el movimiento «${nombre}». Elígelo de la lista.` });
        return;
      }
      slugs.push(movimiento.s);
    }
    empezar(async () => {
      const respuesta = await sinConexion(() =>
        cambiarFichaDeCombateAction({
          captureId,
          naturaleza: naturaleza || null,
          objeto: slugObjeto,
          habilidad: slugsDeHabilidad[0],
          habilidadMega: slugsDeHabilidad[1],
          movimientos: slugs,
        }),
      );
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      onAviso({ tipo: "ok", texto: respuesta.aviso ?? "Ficha guardada." });
      onCerrar();
    });
  }

  function leerPegado() {
    if (!listas) return;
    empezar(async () => {
      let leido: Awaited<ReturnType<typeof leerShowdownAction>>;
      try {
        leido = await leerShowdownAction(pegado);
      } catch {
        onAviso({ tipo: "error", texto: "Sin conexión: esto necesita línea. Prueba cuando vuelva." });
        return;
      }
      const equipo = leido.equipo;
      if (leido.error || !equipo?.length) {
        onAviso({ tipo: "error", texto: leido.error ?? "Eso no parece un set de Showdown." });
        return;
      }
      // Si se pega un equipo entero, el de la misma especie; si no, el primero
      const set = equipo.find((p) => listas.plano(p.especie) === listas.plano(especie)) ?? equipo[0];
      if (set.naturaleza) setNaturaleza(set.naturaleza);
      if (set.objeto) setObjeto(listas.objetos.find((o) => o.slug === set.objeto)?.nombre ?? "");
      // La de Showdown es la de antes de megaevolucionar
      if (set.habilidad) setHabilidad(listas.habilidades.find((h) => h.s === set.habilidad)?.n ?? "");
      if (set.movimientos.length) {
        setMovimientos(
          Array.from(
            { length: 4 },
            (_, i) => listas.movimientos.find((m) => m.s === set.movimientos[i])?.n ?? "",
          ),
        );
      }
      setPegado("");
      onAviso(
        set.dudas.length
          ? { tipo: "error", texto: `Leído, pero: ${set.dudas.join(" ")}` }
          : { tipo: "ok", texto: "Leído de Showdown. Revísalo y guarda." },
      );
    });
  }

  return (
    <section className="mt-4 space-y-3 rounded-xl border border-brand-400/30 bg-white/[0.02] p-3">
      <p className="rotulo">Para combatir</p>

      {!listas ? (
        <div className="space-y-2" aria-label="Cargando movimientos">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[0.06]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`${id}-naturaleza`}>
                Naturaleza
              </label>
              <select
                id={`${id}-naturaleza`}
                className="input"
                value={naturaleza}
                onChange={(evento) => setNaturaleza(evento.target.value)}
              >
                <option value="">Sin apuntar</option>
                {listas.naturalezas.map((n) => (
                  <option key={n.s} value={n.s}>
                    {n.n}
                    {n.sube && n.baja ? ` (+${corta(n.sube)} −${corta(n.baja)})` : " (neutra)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`${id}-objeto`}>
                Objeto
              </label>
              <input
                id={`${id}-objeto`}
                className="input"
                list={`${id}-objetos`}
                value={objeto}
                autoComplete="off"
                placeholder="Nada"
                onChange={(evento) => setObjeto(evento.target.value)}
              />
              <datalist id={`${id}-objetos`}>
                {listas.objetos.map((o) => (
                  <option key={o.slug} value={o.nombre} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="label" htmlFor={`${id}-habilidad`}>
              {mega ? "Habilidad de la mega" : "Habilidad"}
            </label>
            <input
              id={`${id}-habilidad`}
              className={cx("input", valorHabilidad.trim() && !habilidadElegida && "border-amber-400/50")}
              list={`${id}-habilidades`}
              value={valorHabilidad}
              autoComplete="off"
              placeholder={suyas.length ? (listas.habilidades.find((h) => h.s === suyas[0])?.n ?? "Sin apuntar") : "Sin apuntar"}
              onChange={(evento) => ponerHabilidad(evento.target.value)}
            />
            <datalist id={`${id}-habilidades`}>
              {habilidadesOrdenadas.map((h) => (
                <option key={h.s} value={h.n} />
              ))}
            </datalist>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {habilidadElegida?.d ||
                (mega
                  ? "Con su megapiedra lleva la habilidad de la mega, aparte de la suya: quitársela vuelve a la de siempre."
                  : suyas.length
                    ? "Las suyas salen primero en la lista."
                    : "")}
            </p>
          </div>

          <div>
            <p className="label">Movimientos</p>
            <div className="grid grid-cols-2 gap-2">
              {movimientos.map((valor, i) => (
                <input
                  key={i}
                  className={cx("input", valor && !listas.movimientoPorNombre(valor) && "border-amber-400/50")}
                  list={`${id}-movimientos`}
                  value={valor}
                  autoComplete="off"
                  aria-label={`Movimiento ${i + 1}`}
                  placeholder={`Movimiento ${i + 1}`}
                  onChange={(evento) =>
                    setMovimientos((antes) => antes.map((m, j) => (j === i ? evento.target.value : m)))
                  }
                />
              ))}
            </div>
            <datalist id={`${id}-movimientos`}>
              {listas.movimientos.map((m) => (
                <option key={m.s} value={m.n} />
              ))}
            </datalist>
          </div>

          <details className="group rounded-lg border border-white/10 px-3 py-2">
            <summary className="cursor-pointer list-none text-sm text-slate-300">
              <span className="mr-1.5 inline-block transition group-open:rotate-90">▸</span>
              Pegar de Showdown
            </summary>
            <textarea
              className="input mt-2 min-h-28 font-mono text-xs"
              value={pegado}
              onChange={(evento) => setPegado(evento.target.value)}
              placeholder={"Brasas (Charizard) @ Leftovers\nTimid Nature\n- Flamethrower\n- Air Slash"}
            />
            <button
              type="button"
              className="btn-ghost btn-sm mt-2"
              disabled={pendiente || !pegado.trim()}
              onClick={leerPegado}
            >
              Leer
            </button>
            <p className="mt-1 text-[11px] text-slate-500">
              El set de un pokémon, o el equipo entero: se queda con el de su especie.
            </p>
          </details>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary btn-sm" disabled={pendiente || !listas} onClick={guardar}>
          Guardar
        </button>
        <button type="button" className="btn-ghost btn-sm" disabled={pendiente} onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
