"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hacerProdigiosoAction, type PokemonDelProdigioso } from "@/app/actions/prodigioso";
import type { CapturaParaElegir } from "@/lib/gts-servidor";
import { PartidaOficialNoValida, type PartidaOficial } from "@/lib/partida/oficial";
import { PonerAlDia } from "@/app/(app)/equipo/poner-al-dia";
import { Elegir, bajar, leerLaPartida, type DeLaPartida } from "@/app/(app)/gts/gts-client";
import { AnimacionDelIntercambio } from "@/components/animacion-del-intercambio";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { Icono } from "@/components/icono";
import { cx, formatDate } from "@/lib/utils";

type FichaGuardada = {
  especie: string;
  pokemonId: number | null;
  mote: string | null;
  nivel: number | null;
  shiny: boolean;
  sexo: "M" | "F" | null;
};
export type ProdigiosoHecho = { id: string; fecha: string; sale: FichaGuardada; llega: FichaGuardada };

const nombreDe = (f: { mote: string | null; especie: string }) => f.mote ?? f.especie;

/**
 * El Prodigioso en tres pasos: **subir la partida** (y con ella poner al día el
 * Equipo y PC, que es obligatorio: lo que se cambia tiene que ser lo que hay),
 * **elegir** uno y **confirmar**. Vuelve la partida nueva para bajarla, y sale la
 * animación del intercambio, en turquesa y sin entrenador.
 */
export function PanelDelProdigioso({
  participantId,
  bonos,
  modo,
  capturas,
  hechos,
}: {
  participantId: string;
  bonos: { porJornadas: number; enLaBolsa: number };
  modo: { porBst: boolean; legendarios: boolean; porNivel: boolean };
  capturas: CapturaParaElegir[];
  hechos: ProdigiosoHecho[];
}) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [fichero, setFichero] = useState<File | null>(null);
  const [partida, setPartida] = useState<PartidaOficial | null>(null);
  const [huecos, setHuecos] = useState<DeLaPartida[] | null>(null);
  const [alDia, setAlDia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [animando, setAnimando] = useState<{ sale: PokemonDelProdigioso; llega: PokemonDelProdigioso } | null>(null);
  const total = bonos.porJornadas + bonos.enLaBolsa;

  async function alSubir(f: File | undefined) {
    if (!f) return;
    setError(null);
    setAviso(null);
    setAlDia(false);
    try {
      const leida = leerLaPartida(new Uint8Array(await f.arrayBuffer()), "usum");
      setFichero(f);
      setPartida(leida.partida);
      setHuecos(leida.huecos);
    } catch (e) {
      setError(e instanceof PartidaOficialNoValida ? e.message : "No he podido leer esa partida.");
      setFichero(null);
      setPartida(null);
      setHuecos(null);
    }
  }

  function cambiar(captureId: string, pk: string | null) {
    const captura = capturas.find((c) => c.id === captureId);
    const hueco = huecos?.find((h) => h.pk === pk);
    if (!captura || !hueco || !fichero) return;
    const nombre = captura.mote ?? captura.especie;
    if (
      !window.confirm(
        `¿Mandar a ${nombre} al Intercambio Prodigioso? Se va para siempre y no se puede deshacer, y gastas un bono.`,
      )
    ) {
      return;
    }
    setError(null);
    empezar(async () => {
      const datos = new FormData();
      datos.set("participantId", participantId);
      datos.set("captureId", captureId);
      datos.set("hueco", hueco.clave);
      datos.set("partida", fichero);
      const r = await hacerProdigiosoAction(datos).catch(() => ({
        error: "No se ha podido hablar con el servidor. Si no se ha bajado ninguna partida, no ha pasado nada.",
        partida: undefined,
        aviso: undefined,
        sale: undefined,
        llega: undefined,
      }));
      if (r.error || !r.partida || !r.sale || !r.llega) {
        setError(r.error ?? "No ha llegado la partida.");
        return;
      }
      bajar(r.partida, "main");
      setAviso(
        `${r.aviso} Se ha bajado tu partida nueva («main»): ponla en lugar de la vieja. Para otro Prodigioso, sube esa nueva.`,
      );
      setAnimando({ sale: r.sale, llega: r.llega });
      // La partida subida ya no es la de ahora: para otro, hay que subir la nueva
      setFichero(null);
      setPartida(null);
      setHuecos(null);
      setAlDia(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5" data-prodigioso>
      {animando ? (
        <AnimacionDelIntercambio
          variante="prodigioso"
          sale={{ ...animando.sale, dueno: "" }}
          llega={{ ...animando.llega, dueno: "" }}
          alCerrar={() => setAnimando(null)}
        />
      ) : null}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Cómo va</h2>
            <p className="muted mt-1">
              {modo.porBst
                ? "Llega uno parecido en BST al que das."
                : "Llega uno del todo al azar, de toda la Pokédex."}{" "}
              {modo.porNivel ? "En la etapa que tendría a su nivel. " : ""}
              {modo.legendarios ? "Pueden salir legendarios. " : "Sin legendarios, míticos ni Ultraentes. "}
              Al mismo nivel, con naturaleza, IV, movimientos y habilidad al azar, EV a 0 y sin objeto. En su mismo
              hueco del equipo o de la caja.
            </p>
          </div>
          <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.06] px-4 py-2 text-center" data-mis-bonos>
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-[11px] uppercase tracking-wide text-teal-200/80">{total === 1 ? "bono" : "bonos"}</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Uno por cada jornada acabada{bonos.enLaBolsa ? `, y ${bonos.enLaBolsa} en tu bolsa` : ""}. Se gastan primero los
          de las jornadas.
        </p>
      </section>

      {total < 1 ? (
        <p className="muted">No te quedan bonos. Se gana uno con cada jornada acabada, o como premio.</p>
      ) : (
        <>
          <section className="card" data-subir-partida>
            <h2 className="section-title">1. Tu partida</h2>
            <p className="muted mt-1">
              Sube tu «main» tal y como está ahora. Antes de cambiar nada, tu Equipo y PC tiene que estar como en ella.
            </p>
            <label className="btn-ghost btn-sm mt-3 inline-flex cursor-pointer">
              <Icono emoji="⏫" /> {partida ? "Subir otra" : "Subir la partida"}
              <input
                type="file"
                className="sr-only"
                aria-label="Tu partida"
                onChange={(evento) => {
                  void alSubir(evento.target.files?.[0]);
                  evento.target.value = "";
                }}
              />
            </label>
            {partida ? (
              <div className="mt-4 border-t border-white/5 pt-4">
                <h3 className="rotulo mb-2">Tu Equipo y PC, como en la partida</h3>
                <PonerAlDia participantId={participantId} partida={partida} plegado onAlDia={setAlDia} />
              </div>
            ) : null}
          </section>

          {partida && huecos ? (
            <section className={cx("card", !alDia && "opacity-60")} data-elegir-prodigioso>
              <h2 className="section-title mb-3">2. El que se va</h2>
              {alDia ? (
                <Elegir
                  capturas={capturas}
                  familia="usum"
                  partida={huecos}
                  boton={ocupado ? "Intercambiando…" : "Intercambiar"}
                  ocupado={ocupado}
                  onElegir={cambiar}
                  onCancelar={() => setAlDia(true)}
                />
              ) : (
                <p className="muted">Primero pon al día tu Equipo y PC con la partida (arriba).</p>
              )}
            </section>
          ) : null}
        </>
      )}

      {error ? <p className="rounded-xl bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</p> : null}
      {aviso ? (
        <p role="status" className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {aviso}
        </p>
      ) : null}

      {hechos.length ? (
        <section className="space-y-3">
          <h2 className="section-title">Tus intercambios prodigiosos</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {hechos.map((h) => (
              <li key={h.id} className="card flex items-center gap-3" data-prodigioso-hecho>
                <Pokemon ficha={h.sale} />
                <Icono emoji="🔁" />
                <Pokemon ficha={h.llega} />
                <div className="ml-auto flex flex-col items-end gap-1">
                  <span className="text-[11px] text-slate-500">{formatDate(h.fecha)}</span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() =>
                      setAnimando({
                        sale: { nombre: nombreDe(h.sale), pokemonId: h.sale.pokemonId, shiny: h.sale.shiny, sexo: h.sale.sexo },
                        llega: { nombre: nombreDe(h.llega), pokemonId: h.llega.pokemonId, shiny: h.llega.shiny, sexo: h.llega.sexo },
                      })
                    }
                  >
                    Ver
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Pokemon({ ficha }: { ficha: FichaGuardada }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <SpritePokemon src={null} alt="" pokemonId={ficha.pokemonId} shiny={ficha.shiny} className="h-12 w-12 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {nombreDe(ficha)}
          {ficha.shiny ? <span className="ml-1 text-amber-300">★</span> : null}
        </p>
        <p className="text-xs text-slate-400">{ficha.nivel ? `Nv. ${ficha.nivel}` : ""}</p>
      </div>
    </div>
  );
}
