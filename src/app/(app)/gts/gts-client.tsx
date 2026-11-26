"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aceptarOfertaDeLaGtsAction,
  depositarEnLaGtsAction,
  ofrecerEnLaGtsAction,
  rechazarOfertaDeLaGtsAction,
  resolverIntercambioDeLaGtsAction,
  retirarDeLaGtsAction,
  retirarOfertaDeLaGtsAction,
} from "@/app/actions/gts";
import type {
  CapturaParaElegir,
  DepositoVisto,
  FichaVista,
  IntercambioVisto,
  OfertaVista,
} from "@/lib/gts-servidor";
import { NOMBRE_DE_ESTADISTICA, type VentanaDeLaGts } from "@/lib/gts";
import {
  leerPartidaOficial,
  PartidaOficialNoValida,
} from "@/lib/partida/oficial";
import { bytesDelHueco } from "@/lib/partida/oficial/gen67";
import { fichaCompleta67 } from "@/lib/partida/oficial/ficha-gen67";
import type { Familia } from "@/lib/partida/oficial/comun";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";

type Resultado = { error?: string; aviso?: string };

/** Lo que se ha sacado de la partida subida: cada pokémon con los bytes de su hueco */
type DeLaPartida = {
  clave: string;
  dex: number;
  mote: string | null;
  nivel: number | null;
  donde: string;
  pk: string;
};

const plano = (texto: string | null | undefined) =>
  (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

function leerLaPartida(datos: Uint8Array, familia: Familia): DeLaPartida[] {
  const partida = leerPartidaOficial(datos);
  if (partida.familia !== familia) {
    throw new PartidaOficialNoValida(
      "Esa partida es de otro juego que el del locke.",
    );
  }
  const generacion = familia === "xy" || familia === "oras" ? 6 : 7;
  return partida.pokemon.flatMap((p) => {
    const bytes = bytesDelHueco(datos, familia, p.donde);
    const ficha = bytes
      ? fichaCompleta67(bytes, generacion, familia === "usum")
      : null;
    if (!bytes || !ficha) return [];
    const donde =
      p.donde.lugar === "equipo"
        ? `Equipo, ${p.donde.hueco + 1}º`
        : `${partida.cajas[p.donde.caja] ?? `Caja ${p.donde.caja + 1}`}, hueco ${p.donde.hueco + 1}`;
    return [
      {
        clave:
          p.donde.lugar === "equipo"
            ? `e${p.donde.hueco}`
            : `c${p.donde.caja}-${p.donde.hueco}`,
        dex: p.especie,
        mote: p.mote,
        nivel: ficha.nivel,
        donde,
        pk: base64(bytes),
      },
    ];
  });
}

/** Los de la partida que pueden ser el elegido de la caja: por mote, o por especie si no tiene */
function candidatos(captura: CapturaParaElegir, partida: DeLaPartida[]) {
  if (captura.mote)
    return partida.filter((p) => plano(p.mote) === plano(captura.mote));
  return partida.filter((p) => !p.mote && p.dex === captura.dex);
}

export function PanelDeLaGts({
  yo,
  puedeGestionar,
  familia,
  ventana,
  aVista,
  veto,
  misBoletos,
  boletos,
  depositos,
  intercambios,
  misCapturas,
}: {
  yo: string | null;
  puedeGestionar: boolean;
  familia: Familia | null;
  ventana: VentanaDeLaGts;
  aVista: boolean;
  veto: boolean;
  misBoletos: number | null;
  boletos: {
    participantId: string;
    nombre: string;
    color: string;
    quedan: number;
  }[];
  depositos: DepositoVisto[];
  intercambios: IntercambioVisto[];
  misCapturas: CapturaParaElegir[];
}) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [mensaje, setMensaje] = useState<Resultado | null>(null);
  // La partida se sube una vez y vale para poner y para ofrecer
  const [partida, setPartida] = useState<DeLaPartida[] | null>(null);
  const abierta = Boolean(yo) && ventana.estado === "abierta";

  const hacer = (accion: () => Promise<Resultado>, pregunta?: string) => {
    if (pregunta && !window.confirm(pregunta)) return;
    empezar(async () => {
      const r = await accion();
      setMensaje(r);
      if (!r.error) router.refresh();
    });
  };

  const mios = depositos.filter((d) => d.esMio);
  const deOtros = depositos.filter((d) => !d.esMio);
  const porAprobar = intercambios.filter((i) => i.estado === "porAprobar");
  const hechos = intercambios.filter((i) => i.estado === "aceptada");

  return (
    <div className="space-y-5" data-gts>
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">
              {ventana.estado === "abierta"
                ? "La GTS está abierta"
                : ventana.estado === "falta-el-hito"
                  ? "Todavía no se te ha abierto"
                  : "La GTS está cerrada"}
            </h2>
            <p className="muted mt-1">
              {ventana.estado === "abierta"
                ? `Hasta que se acabe ${ventana.jornada ?? `la jornada ${ventana.checkpoint}`}. Lo que llegue se puede usar ya en ella: cambiadlo antes de jugar los combates.`
                : ventana.estado === "falta-el-hito"
                  ? `Se te abre cuando pases ${ventana.hito}, y dura hasta que se acabe su jornada.`
                  : "Se abre en cada checkpoint de jornada: desde que pasas su level cap hasta que se acaba la jornada."}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {aVista
                ? "A la vista: se ve la ficha entera de lo que se pone."
                : "Oculta: solo se ve especie, mote, nivel y sexo hasta recibirlo."}
              {veto ? " La organización aprueba cada intercambio." : ""}
            </p>
          </div>
          {misBoletos !== null ? (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center"
              data-mis-boletos
            >
              <div className="text-2xl font-bold text-white">{misBoletos}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                {misBoletos === 1 ? "boleto" : "boletos"}
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {boletos.map((b) => (
            <span key={b.participantId}>
              <span style={{ color: b.color }}>●</span> {b.nombre}: {b.quedan}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Dos boletos al empezar y uno por cada jornada acabada. Cada
          intercambio gasta uno a cada uno de los dos.
        </p>
      </section>

      {mensaje ? (
        <p
          role="status"
          className={cx(
            "rounded-xl px-4 py-2 text-sm",
            mensaje.error
              ? "bg-rose-500/10 text-rose-200"
              : "bg-emerald-500/10 text-emerald-200",
          )}
        >
          {mensaje.error ?? mensaje.aviso}
        </p>
      ) : null}

      {abierta && familia ? (
        <SubirPartida
          familia={familia}
          partida={partida}
          onPartida={setPartida}
        />
      ) : null}

      {abierta ? (
        <Poner
          capturas={misCapturas}
          familia={familia}
          partida={partida}
          ocupado={ocupado || (misBoletos ?? 0) < 1}
          sinBoletos={(misBoletos ?? 0) < 1}
          onPoner={(captureId, pk, busco) =>
            hacer(() =>
              depositarEnLaGtsAction({
                participantId: yo!,
                captureId,
                pk,
                busco,
              }),
            )
          }
        />
      ) : null}

      {mios.length ? (
        <section className="space-y-3">
          <h2 className="section-title">Lo tuyo en la GTS</h2>
          {mios.map((d) => (
            <div key={d.id} className="card" data-deposito-mio>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <TarjetaDePokemon ficha={d.ficha} busco={d.busco} />
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={ocupado}
                  onClick={() =>
                    hacer(
                      () => retirarDeLaGtsAction(d.id),
                      "¿Quitarlo de la GTS? Las ofertas que tenga se caen.",
                    )
                  }
                >
                  Retirar
                </button>
              </div>
              <h3 className="rotulo mb-2 mt-4">
                {d.ofertas.length
                  ? `Te ofrecen (${d.ofertas.length})`
                  : "Todavía no te han ofrecido nada"}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {d.ofertas.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    data-oferta
                  >
                    <p className="mb-2 text-xs text-slate-400">
                      De{" "}
                      <strong style={{ color: o.de.color }}>
                        {o.de.nombre}
                      </strong>
                    </p>
                    <TarjetaDePokemon ficha={o.ficha} />
                    {abierta ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={ocupado}
                          onClick={() =>
                            hacer(
                              () => aceptarOfertaDeLaGtsAction(o.id),
                              `¿Cambiar a ${nombreDe(d.ficha)} por ${nombreDe(o.ficha)}? Gastáis un boleto cada uno.`,
                            )
                          }
                        >
                          <Icono emoji="🔁" /> Aceptar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          disabled={ocupado}
                          onClick={() =>
                            hacer(() => rechazarOfertaDeLaGtsAction(o.id))
                          }
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="section-title">En la GTS</h2>
        {deOtros.length === 0 ? (
          <p className="muted">No hay nada puesto por los demás.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {deOtros.map((d) => (
              <DepositoDeOtro
                key={d.id}
                deposito={d}
                abierta={abierta}
                capturas={misCapturas}
                familia={familia}
                partida={partida}
                ocupado={ocupado}
                sinBoletos={(misBoletos ?? 0) < 1}
                onOfrecer={(captureId, pk) =>
                  hacer(() =>
                    ofrecerEnLaGtsAction({
                      participantId: yo!,
                      depositoId: d.id,
                      captureId,
                      pk,
                    }),
                  )
                }
                onRetirar={(oferta) =>
                  hacer(() => retirarOfertaDeLaGtsAction(oferta.id))
                }
              />
            ))}
          </div>
        )}
      </section>

      {porAprobar.length ? (
        <section className="space-y-3">
          <h2 className="section-title">Esperando a la organización</h2>
          {porAprobar.map((i) => (
            <div key={i.ofertaId} className="card" data-por-aprobar>
              <Intercambio intercambio={i} />
              {puedeGestionar ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={ocupado}
                    onClick={() =>
                      hacer(() =>
                        resolverIntercambioDeLaGtsAction(i.ofertaId, true),
                      )
                    }
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={ocupado}
                    onClick={() =>
                      hacer(
                        () =>
                          resolverIntercambioDeLaGtsAction(i.ofertaId, false),
                        "¿Vetar este intercambio? Cada uno se queda con el suyo y nadie gasta boleto.",
                      )
                    }
                  >
                    Vetar
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {hechos.length ? (
        <section className="space-y-3">
          <h2 className="section-title">Intercambios hechos</h2>
          {hechos.map((i) => (
            <div key={i.ofertaId} className="card" data-intercambio>
              <Intercambio intercambio={i} />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

const nombreDe = (f: { mote: string | null; especie: string }) =>
  f.mote ?? f.especie;

function Intercambio({ intercambio: i }: { intercambio: IntercambioVisto }) {
  return (
    <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <div>
        <p className="mb-2 text-xs text-slate-400">
          Lo puso{" "}
          <strong style={{ color: i.a.jugador.color }}>
            {i.a.jugador.nombre}
          </strong>
        </p>
        <TarjetaDePokemon ficha={i.a.ficha} />
      </div>
      <div className="self-center text-center text-slate-500">
        <Icono emoji="🔁" />
      </div>
      <div>
        <p className="mb-2 text-xs text-slate-400">
          Lo dio{" "}
          <strong style={{ color: i.b.jugador.color }}>
            {i.b.jugador.nombre}
          </strong>
        </p>
        <TarjetaDePokemon ficha={i.b.ficha} />
      </div>
    </div>
  );
}

function DepositoDeOtro({
  deposito: d,
  abierta,
  capturas,
  familia,
  partida,
  ocupado,
  sinBoletos,
  onOfrecer,
  onRetirar,
}: {
  deposito: DepositoVisto;
  abierta: boolean;
  capturas: CapturaParaElegir[];
  familia: Familia | null;
  partida: DeLaPartida[] | null;
  ocupado: boolean;
  sinBoletos: boolean;
  onOfrecer: (captureId: string, pk: string | null) => void;
  onRetirar: (oferta: OfertaVista) => void;
}) {
  const [ofreciendo, setOfreciendo] = useState(false);
  const miOferta = d.ofertas.find((o) => o.esMia) ?? null;
  return (
    <div className="card" data-deposito>
      <p className="mb-2 text-xs text-slate-400">
        Lo pone{" "}
        <strong style={{ color: d.dueno.color }}>{d.dueno.nombre}</strong>
      </p>
      <TarjetaDePokemon ficha={d.ficha} busco={d.busco} />
      {miOferta ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs text-slate-400">Le has ofrecido</p>
          <TarjetaDePokemon ficha={miOferta.ficha} />
          <button
            type="button"
            className="btn-ghost btn-sm mt-2"
            disabled={ocupado}
            onClick={() => onRetirar(miOferta)}
          >
            Retirar la oferta
          </button>
        </div>
      ) : abierta ? (
        ofreciendo ? (
          <div className="mt-3">
            <Elegir
              capturas={capturas}
              familia={familia}
              partida={partida}
              boton="Ofrecer"
              ocupado={ocupado}
              onElegir={(captureId, pk) => {
                onOfrecer(captureId, pk);
                setOfreciendo(false);
              }}
              onCancelar={() => setOfreciendo(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-sm mt-3"
            disabled={ocupado || sinBoletos}
            title={sinBoletos ? "No te quedan boletos" : undefined}
            onClick={() => setOfreciendo(true)}
          >
            <Icono emoji="🔁" /> Ofrecer uno tuyo
          </button>
        )
      ) : null}
    </div>
  );
}

function SubirPartida({
  familia,
  partida,
  onPartida,
}: {
  familia: Familia;
  partida: DeLaPartida[] | null;
  onPartida: (p: DeLaPartida[] | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="card" data-subir-partida>
      <h2 className="section-title">Tu partida</h2>
      <p className="muted mt-1">
        En este juego la GTS va con la partida: lo que pongas u ofrezcas se lee
        de ella (nivel, IV, EV, entrenador…), y es lo que luego hará falta para
        meterlo en la del otro. Súbela tal y como está ahora, el «main».
      </p>
      {/* El botón del navegador habla en su idioma («Choose File»): se esconde y se pone uno propio */}
      <label className="btn-ghost btn-sm mt-3 inline-flex cursor-pointer">
        <Icono emoji="⏫" /> {partida ? "Subir otra vez" : "Subir la partida"}
        <input
          type="file"
          className="sr-only"
          aria-label="Tu partida"
          onChange={async (evento) => {
            const fichero = evento.target.files?.[0];
            if (!fichero) return;
            try {
              const leidos = leerLaPartida(
                new Uint8Array(await fichero.arrayBuffer()),
                familia,
              );
              setError(null);
              onPartida(leidos);
            } catch (e) {
              setError(
                e instanceof PartidaOficialNoValida
                  ? e.message
                  : "No he podido leer esa partida.",
              );
              onPartida(null);
            }
          }}
        />
      </label>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      {partida ? (
        <p className="mt-2 text-sm text-emerald-300">
          Leída: {partida.length} pokémon.
        </p>
      ) : null}
    </section>
  );
}

function Poner({
  capturas,
  familia,
  partida,
  ocupado,
  sinBoletos,
  onPoner,
}: {
  capturas: CapturaParaElegir[];
  familia: Familia | null;
  partida: DeLaPartida[] | null;
  ocupado: boolean;
  sinBoletos: boolean;
  onPoner: (captureId: string, pk: string | null, busco: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busco, setBusco] = useState("");
  if (!abierto) {
    return (
      <div>
        <button
          type="button"
          className="btn-primary"
          disabled={ocupado}
          onClick={() => setAbierto(true)}
        >
          <Icono emoji="🔁" /> Poner un pokémon en la GTS
        </button>
        {sinBoletos ? (
          <p className="mt-1 text-xs text-slate-500">
            No te quedan boletos: se gana uno con cada jornada acabada.
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <section className="card" data-poner>
      <h2 className="section-title mb-3">Poner un pokémon</h2>
      <div className="mb-3">
        <label className="label" htmlFor="busco">
          Qué buscas a cambio (opcional)
        </label>
        <input
          id="busco"
          className="input"
          maxLength={80}
          placeholder="Algo de tipo agua, alguien con Trampa Rocas…"
          value={busco}
          onChange={(e) => setBusco(e.target.value)}
        />
      </div>
      <Elegir
        capturas={capturas}
        familia={familia}
        partida={partida}
        boton="Ponerlo"
        ocupado={ocupado}
        onElegir={(captureId, pk) => {
          onPoner(captureId, pk, busco);
          setAbierto(false);
          setBusco("");
        }}
        onCancelar={() => setAbierto(false)}
      />
    </section>
  );
}

/**
 * Elegir uno de tu caja y, si el juego va con partida, cuál es en ella. Se
 * busca solo por mote (o por especie si no tiene); si no sale o hay dos, se
 * elige a mano.
 */
function Elegir({
  capturas,
  familia,
  partida,
  boton,
  ocupado,
  onElegir,
  onCancelar,
}: {
  capturas: CapturaParaElegir[];
  familia: Familia | null;
  partida: DeLaPartida[] | null;
  boton: string;
  ocupado: boolean;
  onElegir: (captureId: string, pk: string | null) => void;
  onCancelar: () => void;
}) {
  const [elegido, setElegido] = useState<string | null>(null);
  const [hueco, setHueco] = useState<string | null>(null);
  const captura = capturas.find((c) => c.id === elegido) ?? null;
  const posibles = useMemo(
    () => (captura && partida ? candidatos(captura, partida) : []),
    [captura, partida],
  );
  const enLaPartida =
    hueco ?? (posibles.length === 1 ? posibles[0].clave : null);
  const delHueco = partida?.find((p) => p.clave === enLaPartida) ?? null;
  const listo = Boolean(captura) && (!familia || Boolean(delHueco));

  if (!capturas.length) {
    return (
      <p className="muted">
        No tienes ningún pokémon vivo que no esté ya en la GTS.
      </p>
    );
  }
  return (
    <div className="space-y-3" data-elegir>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {capturas.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              aria-pressed={c.id === elegido}
              className={cx(
                "flex w-full flex-col items-center rounded-xl border p-1.5 text-center text-[11px] transition",
                c.id === elegido
                  ? "border-brand-400 bg-brand-500/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
              )}
              onClick={() => {
                setElegido(c.id);
                setHueco(null);
              }}
            >
              <SpritePokemon
                src={c.imagen}
                alt=""
                pokemonId={c.pokemonId}
                shiny={c.shiny}
                className="h-12 w-12"
              />
              <span className="w-full truncate">{c.mote ?? c.especie}</span>
            </button>
          </li>
        ))}
      </ul>

      {familia && captura ? (
        !partida ? (
          <p className="text-sm text-amber-200">
            Sube tu partida arriba para leer su ficha.
          </p>
        ) : posibles.length === 1 && !hueco ? (
          <p className="text-sm text-slate-300">
            En la partida: {posibles[0].donde}
            {posibles[0].nivel ? ` · Nv. ${posibles[0].nivel}` : ""}.{" "}
            <button
              type="button"
              className="text-xs text-slate-500 hover:underline"
              onClick={() => setHueco(posibles[0].clave)}
            >
              No es ese
            </button>
          </p>
        ) : (
          <div>
            <label className="label" htmlFor="hueco-de-la-partida">
              {posibles.length
                ? "Hay varios que pueden ser: ¿cuál es?"
                : "No lo encuentro por su mote: ¿cuál es en la partida?"}
            </label>
            <select
              id="hueco-de-la-partida"
              className="input"
              value={enLaPartida ?? ""}
              onChange={(e) => setHueco(e.target.value || null)}
            >
              <option value="">Elige…</option>
              {[
                ...posibles,
                ...partida.filter((p) => !posibles.includes(p)),
              ].map((p) => (
                <option key={p.clave} value={p.clave}>
                  {p.donde} · {p.mote ?? `nº ${p.dex}`}
                  {p.nivel ? ` · Nv. ${p.nivel}` : ""}
                </option>
              ))}
            </select>
          </div>
        )
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={!listo || ocupado}
          onClick={() => captura && onElegir(captura.id, delHueco?.pk ?? null)}
        >
          {boton}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TarjetaDePokemon({
  ficha: f,
  busco,
}: {
  ficha: FichaVista;
  busco?: string | null;
}) {
  return (
    <div className="min-w-0 flex-1" data-ficha-gts>
      <div className="flex items-center gap-3">
        <SpritePokemon
          src={f.imagen}
          alt=""
          pokemonId={f.pokemonId}
          shiny={f.shiny}
          className="h-16 w-16 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">
            {f.mote ?? f.especie}
            {f.sexo ? (
              <span
                className={
                  f.sexo === "M" ? "ml-1 text-sky-300" : "ml-1 text-pink-300"
                }
              >
                {f.sexo === "M" ? "♂" : "♀"}
              </span>
            ) : null}
            {f.shiny ? <span className="ml-1 text-amber-300">★</span> : null}
          </p>
          <p className="text-xs text-slate-400">
            {f.mote ? `${f.especie} · ` : ""}
            {f.nivel ? `Nv. ${f.nivel}` : "Nivel sin saber"}
          </p>
          {busco ? (
            <p className="mt-0.5 text-xs text-brand-300">Busca: {busco}</p>
          ) : null}
        </div>
      </div>
      {f.oculta ? (
        <p className="mt-2 text-xs text-slate-500">
          El resto de su ficha se ve al recibirlo.
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-xs text-slate-300">
          <p>
            {[f.naturaleza, f.habilidad, f.objeto ? `lleva ${f.objeto}` : null]
              .filter(Boolean)
              .join(" · ") || "Sin naturaleza, habilidad ni objeto apuntados"}
          </p>
          {f.movimientos.length ? (
            <p className="text-slate-400">{f.movimientos.join(" · ")}</p>
          ) : null}
          {f.ivs ? <Estadisticas rotulo="IV" valores={f.ivs} /> : null}
          {f.evs ? <Estadisticas rotulo="EV" valores={f.evs} /> : null}
          {f.entrenador || f.ball ? (
            <p className="text-slate-500">
              {f.entrenador
                ? `EO ${f.entrenador.nombre} (${String(f.entrenador.id).padStart(6, "0")})`
                : ""}
              {f.entrenador && f.ball ? " · " : ""}
              {f.ball ?? ""}
            </p>
          ) : null}
          {!f.dePartida ? (
            <p className="text-slate-500">
              Lo apuntado en la app: el juego no se ha leído.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Estadisticas({
  rotulo,
  valores,
}: {
  rotulo: string;
  valores: number[];
}) {
  return (
    <p className="text-slate-400">
      <span className="mr-1 text-slate-500">{rotulo}</span>
      {valores.map((v, i) => `${NOMBRE_DE_ESTADISTICA[i]} ${v}`).join(" · ")}
    </p>
  );
}
