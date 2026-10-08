"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aplicarPartidaAction, verPartidaAction, type PasoParaVer, type VistaDeLaPartida } from "@/app/actions/partida";
import { leerPartida, PartidaNoValida, type PartidaLeida } from "@/lib/partida/essentials";
import { FormMessage } from "@/components/ui";
import { SpritePokemon } from "@/components/sprite-pokemon";

/**
 * **Leer la partida** de Pokémon Añil (solo en sus lockes). El fichero se lee
 * aquí, en el navegador, y al servidor va solo lo sacado de él: unos KB, y la
 * partida no se guarda en ningún sitio.
 *
 * Primero se enseña qué va a pasar —con cada cosa marcada, para quitar lo que
 * no cuadre— y luego se aplica. Todo lo aplicado es un solo «Deshacer».
 */

const GRUPOS: { tipo: PasoParaVer["tipo"][]; titulo: string; pista: string }[] = [
  { tipo: ["actualizar"], titulo: "Al día", pista: "Ya estaban: se les pone lo del juego." },
  { tipo: ["nueva"], titulo: "Nuevos", pista: "No estaban en la app: se apuntan con su ficha, su fecha y su ruta." },
  { tipo: ["muere", "baja"], titulo: "Al cementerio", pista: "Están en la caja de caídos: solo se dan por muertos." },
];

export function LeerPartida({ jugadores, miId }: { jugadores: { id: string; displayName: string }[]; miId: string | null }) {
  const router = useRouter();
  const [para, setPara] = useState(miId ?? jugadores[0]?.id ?? "");
  const [partida, setPartida] = useState<PartidaLeida | null>(null);
  const [vista, setVista] = useState<VistaDeLaPartida | null>(null);
  const [quitados, setQuitados] = useState<Set<string>>(new Set());
  const [estado, setEstado] = useState<{ error?: string; success?: string } | null>(null);
  const [ocupado, empezar] = useTransition();

  function ver(leida: PartidaLeida, cajaDeCaidos: number | null, participantId = para) {
    setEstado(null);
    empezar(async () => {
      const respuesta = await verPartidaAction({ participantId, partida: leida, cajaDeCaidos });
      if (respuesta.error) {
        setEstado({ error: respuesta.error });
        setVista(null);
      } else {
        setVista(respuesta.vista ?? null);
        setQuitados(new Set());
      }
    });
  }

  async function alElegir(fichero: File | undefined) {
    if (!fichero) return;
    setVista(null);
    setEstado(null);
    try {
      const leida = leerPartida(new Uint8Array(await fichero.arrayBuffer()));
      setPartida(leida);
      // Los caídos suelen ir en la última caja
      ver(leida, leida.cajas.length ? leida.cajas.length - 1 : null);
    } catch (error) {
      setPartida(null);
      setEstado({
        error: error instanceof PartidaNoValida ? error.message : "No he podido leer ese fichero. ¿Es la partida del Añil?",
      });
    }
  }

  function aplicar() {
    if (!partida || !vista) return;
    const claves = vista.pasos.map((p) => p.clave).filter((c) => !quitados.has(c));
    empezar(async () => {
      const respuesta = await aplicarPartidaAction({
        participantId: para,
        partida,
        cajaDeCaidos: vista.cajaDeCaidos,
        claves,
      });
      if (respuesta.error) {
        setEstado({ error: respuesta.error });
        return;
      }
      setEstado({ success: respuesta.aviso });
      setVista(null);
      setPartida(null);
      router.refresh();
    });
  }

  const marcados = vista ? vista.pasos.filter((p) => !quitados.has(p.clave)).length : 0;
  const alternar = (clave: string) =>
    setQuitados((antes) => {
      const ahora = new Set(antes);
      if (ahora.has(clave)) ahora.delete(clave);
      else ahora.add(clave);
      return ahora;
    });

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Leer la partida del Añil
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-slate-400">
          Sube tu <strong className="text-slate-200">Partida N.rxdata</strong> (en Windows, en la carpeta del Añil dentro
          de <code className="text-slate-300">%APPDATA%</code>) y se ponen al día tus pokémon: especie, forma, shiny,
          naturaleza, habilidad, objeto y movimientos. Los que no estén se apuntan, y los de la caja de caídos van al
          cementerio. Las medallas no se tocan. Antes de cambiar nada te enseña qué va a hacer.
        </p>

        {jugadores.length > 1 ? (
          <div>
            <label className="label">De quién es la partida</label>
            <select
              className="input"
              value={para}
              onChange={(evento) => {
                setPara(evento.target.value);
                if (partida) ver(partida, vista?.cajaDeCaidos ?? null, evento.target.value);
              }}
            >
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.displayName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <input
          type="file"
          accept=".rxdata"
          className="input"
          aria-label="Partida del Añil"
          onChange={(evento) => {
            void alElegir(evento.target.files?.[0]);
            // Para poder volver a elegir el mismo fichero después de jugar
            evento.target.value = "";
          }}
        />

        {partida && vista ? (
          <div className="space-y-4">
            <div>
              <label className="label">Caja de caídos</label>
              <select
                className="input"
                value={vista.cajaDeCaidos ?? ""}
                disabled={ocupado}
                onChange={(evento) => ver(partida, evento.target.value === "" ? null : Number(evento.target.value))}
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
              {vista.iguales ? <li>{vista.iguales} ya estaban al día.</li> : null}
              {vista.yaCaidos ? <li>{vista.yaCaidos} de la caja de caídos ya estaban en el cementerio.</li> : null}
              {vista.caidosEnLaApp.length ? (
                <li>
                  Vivos en el juego pero caídos en la app (se dejan): {vista.caidosEnLaApp.join(", ")}.
                </li>
              ) : null}
              {vista.soloEnLaApp.length ? (
                <li>En la app pero no en la partida (se dejan como están): {vista.soloEnLaApp.join(", ")}.</li>
              ) : null}
              {vista.desconocidos.length ? (
                <li>No sé qué pokémon son (se saltan): {vista.desconocidos.join(", ")}.</li>
              ) : null}
            </ul>

            {vista.pasos.length ? (
              <button type="button" className="btn-primary w-full" disabled={ocupado || !marcados} onClick={aplicar}>
                {ocupado ? "Un momento…" : `Aplicar ${marcados} ${marcados === 1 ? "cambio" : "cambios"}`}
              </button>
            ) : (
              <p className="text-sm text-slate-300">Todo está ya como en tu partida.</p>
            )}
          </div>
        ) : ocupado ? (
          <p className="text-sm text-slate-400">Leyendo la partida…</p>
        ) : null}

        <FormMessage state={estado} />
      </div>
    </details>
  );
}
