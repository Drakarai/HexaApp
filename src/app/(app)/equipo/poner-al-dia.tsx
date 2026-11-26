"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aplicarPartidaAction, verPartidaAction, type PasoParaVer, type VistaDeLaPartida } from "@/app/actions/partida";
import type { PartidaLeida } from "@/lib/partida/essentials";
import type { PartidaOficial } from "@/lib/partida/oficial";
import { FormMessage } from "@/components/ui";
import { SpritePokemon } from "@/components/sprite-pokemon";

/**
 * **Poner el Equipo y PC como en la partida**, con una partida ya leída: qué
 * va a cambiar (cada cosa con su casilla) y el botón de aplicarlo. Es la mitad
 * de «Leer la partida» que no elige fichero, y va aparte para que la GTS haga
 * **exactamente lo mismo** con la partida que se sube allí.
 */

export type Leida = PartidaLeida | PartidaOficial;

const GRUPOS: { tipo: PasoParaVer["tipo"][]; titulo: string; pista: string }[] = [
  { tipo: ["actualizar"], titulo: "Al día", pista: "Ya estaban: se les pone lo del juego." },
  { tipo: ["nueva"], titulo: "Nuevos", pista: "No estaban en la app: se apuntan con su ficha, su fecha y su ruta." },
  { tipo: ["muere", "baja"], titulo: "Al cementerio", pista: "Están en la caja de caídos: solo se dan por muertos." },
];

const SIN_CONEXION = "No se ha podido hablar con el servidor.";

export function PonerAlDia({
  participantId,
  partida,
  onAplicado,
  plegado = false,
}: {
  participantId: string;
  partida: Leida;
  onAplicado?: () => void;
  /** La lista de cambios plegada, con el botón a la vista: dentro de otra pantalla (la GTS) */
  plegado?: boolean;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<VistaDeLaPartida | null>(null);
  const [quitados, setQuitados] = useState<Set<string>>(new Set());
  const [estado, setEstado] = useState<{ error?: string; success?: string } | null>(null);
  const [ocupado, empezar] = useTransition();
  const aplicando = useRef(false);

  function ver(cajaDeCaidos: number | null) {
    setEstado(null);
    empezar(async () => {
      const respuesta = await verPartidaAction({ participantId, partida, cajaDeCaidos }).catch(() => ({
        error: SIN_CONEXION,
        vista: undefined,
      }));
      if (respuesta.error) {
        setEstado({ error: respuesta.error });
        setVista(null);
      } else {
        setVista(respuesta.vista ?? null);
        setQuitados(new Set());
      }
    });
  }

  // Los caídos suelen ir en la última caja
  useEffect(() => {
    setVista(null);
    ver(partida.cajas.length ? partida.cajas.length - 1 : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida, participantId]);

  function aplicar() {
    // Un doble toque no la aplica dos veces: el botón tarda un instante en apagarse
    if (!vista || aplicando.current) return;
    aplicando.current = true;
    const claves = vista.pasos.map((p) => p.clave).filter((c) => !quitados.has(c));
    empezar(async () => {
      /**
       * Si se corta la conexión (o el servidor tarda demasiado) la llamada falla
       * sin respuesta, y sin recogerlo se caía la pantalla entera. No se sabe
       * si llegó a aplicarse: se dice, y volver a leerla no duplica nada.
       */
      const respuesta = await aplicarPartidaAction({ participantId, partida, cajaDeCaidos: vista.cajaDeCaidos, claves })
        .catch(() => ({
          error: `${SIN_CONEXION} Puede que se aplicara: vuelve a leer la partida y mira qué falta (lo que ya esté no se repite).`,
          aviso: undefined,
        }))
        .finally(() => {
          aplicando.current = false;
        });
      if (respuesta.error) {
        setEstado({ error: respuesta.error });
        return;
      }
      setEstado({ success: respuesta.aviso });
      setVista(null);
      onAplicado?.();
      router.refresh();
    });
  }

  const marcados = vista ? vista.pasos.filter((p) => !quitados.has(p.clave)).length : 0;
  const alCementerio = vista
    ? vista.pasos.filter((p) => (p.tipo === "muere" || p.tipo === "baja") && !quitados.has(p.clave)).length
    : 0;
  const alternar = (clave: string) =>
    setQuitados((antes) => {
      const ahora = new Set(antes);
      if (ahora.has(clave)) ahora.delete(clave);
      else ahora.add(clave);
      return ahora;
    });

  return (
    <div className="space-y-4" data-poner-al-dia>
      {!vista && ocupado ? <p className="text-sm text-slate-400">Mirando qué cambia en tu Equipo y PC…</p> : null}
      {vista ? (
        <>
          <Plegable plegado={plegado} cuantos={vista.pasos.length}>
          <div>
            <label className="label">Caja de caídos</label>
            <select
              className="input"
              value={vista.cajaDeCaidos ?? ""}
              disabled={ocupado}
              onChange={(evento) => ver(evento.target.value === "" ? null : Number(evento.target.value))}
            >
              <option value="">Ninguna: no hay caídos en la partida</option>
              {vista.cajas.map((nombre, i) => (
                <option key={i} value={i}>
                  {nombre}
                  {i === vista.cajas.length - 1 ? " (la última)" : ""}
                </option>
              ))}
            </select>
          </div>

          {vista.sinLugares ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Este juego no guarda dónde se capturó cada pokémon ni cuándo: los nuevos se apuntan sin ruta y con la fecha
              de hoy. Ponles la ruta desde su ficha.
            </p>
          ) : vista.sinFecha ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Este juego no guarda cuándo se capturó cada pokémon: los nuevos se apuntan con la fecha de hoy.
            </p>
          ) : null}

          {vista.sinMapas ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              La app aún no sabe cómo se llama cada mapa del Añil, así que los nuevos se apuntan sin ruta (salvo los
              regalos con nombre). Ponla tú desde su ficha.
            </p>
          ) : null}

          {GRUPOS.map((grupo) => {
            const pasos = vista.pasos.filter((p) => grupo.tipo.includes(p.tipo));
            if (!pasos.length) return null;
            return (
              <section key={grupo.titulo}>
                <h3 className="section-title">
                  {grupo.titulo} <span className="text-slate-500">· {pasos.length}</span>
                </h3>
                <p className="mb-2 text-xs text-slate-500">{grupo.pista}</p>
                <ul className="divide-y divide-white/5">
                  {pasos.map((paso) => (
                    <li key={paso.clave}>
                      <label className="flex cursor-pointer items-start gap-3 py-2">
                        <input
                          type="checkbox"
                          className="mt-2"
                          checked={!quitados.has(paso.clave)}
                          onChange={() => alternar(paso.clave)}
                        />
                        {paso.pokemonId ? (
                          <SpritePokemon
                            src={null}
                            pokemonId={paso.pokemonId}
                            shiny={paso.shiny}
                            alt={paso.nombre}
                            className="h-10 w-10 shrink-0 object-contain"
                          />
                        ) : (
                          <span className="h-10 w-10 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-100">
                            {paso.nombre}
                            {paso.enElJuego ? <span className="font-normal text-slate-500"> · {paso.enElJuego}</span> : null}
                          </span>
                          {paso.detalle.map((linea, i) => (
                            <span key={i} className="block text-xs text-slate-400">
                              {linea}
                            </span>
                          ))}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <ul className="space-y-1 text-xs text-slate-500">
            {vista.iguales ? (
              <li>{vista.iguales === 1 ? "1 ya estaba al día." : `${vista.iguales} ya estaban al día.`}</li>
            ) : null}
            {vista.yaCaidos ? (
              <li>
                {vista.yaCaidos === 1
                  ? "1 de la caja de caídos ya estaba en el cementerio."
                  : `${vista.yaCaidos} de la caja de caídos ya estaban en el cementerio.`}
              </li>
            ) : null}
            {vista.caidosEnLaApp.length ? (
              <li>Vivos en el juego pero caídos en la app (se dejan): {vista.caidosEnLaApp.join(", ")}.</li>
            ) : null}
            {vista.soloEnLaApp.length ? (
              <li>En la app pero no en la partida (se dejan como están): {vista.soloEnLaApp.join(", ")}.</li>
            ) : null}
            {vista.desconocidos.length ? (
              <li>No sé qué pokémon son (se saltan): {vista.desconocidos.join(", ")}.</li>
            ) : null}
          </ul>

          </Plegable>

          {/**
           * Lo único delicado: dar por muertos a los de una caja. Si la que se
           * toma por caja de caídos no lo es, caerían vivos; se avisa justo
           * antes del botón, con cuántos y de qué caja (y Deshacer lo arregla).
           */}
          {alCementerio && vista.cajaDeCaidos !== null ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              Ojo: {alCementerio === 1 ? "1 irá" : `${alCementerio} irán`} al cementerio, los de «
              {vista.cajas[vista.cajaDeCaidos]}». Si esa no es tu caja de caídos, cámbiala arriba o desmárcalos.
            </p>
          ) : null}

          {vista.pasos.length ? (
            <button type="button" className="btn-primary w-full" disabled={ocupado || !marcados} onClick={aplicar}>
              {ocupado ? "Un momento…" : `Aplicar ${marcados} ${marcados === 1 ? "cambio" : "cambios"}`}
            </button>
          ) : (
            <p className="text-sm text-slate-300">Todo está ya como en tu partida.</p>
          )}
        </>
      ) : null}

      <FormMessage state={estado} />
    </div>
  );
}

/** En la GTS la lista va plegada: con una partida grande ocupaba la pantalla entera */
function Plegable({ plegado, cuantos, children }: { plegado: boolean; cuantos: number; children: React.ReactNode }) {
  if (!plegado) return <>{children}</>;
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm text-slate-300">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        {cuantos ? `Ver qué cambia (${cuantos})` : "Ver el detalle"}
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}
