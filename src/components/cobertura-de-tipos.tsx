"use client";

import { ChapaDeTipo } from "@/components/chapa-de-tipo";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  guardarEquipoDeTiposAction,
  type MiembroDelEquipo,
  type QueTabla,
} from "@/app/actions/tipos";
import { searchSpecies, spriteCandidates } from "@/lib/pokedex";
import {
  coberturaOfensiva,
  comoSeLee,
  GENERACION_POR_DEFECTO,
  multiplicador,
  tiposDeGeneracion,
  tiposDePokemon,
  tipoPorId,
} from "@/lib/tipos";
import { cx } from "@/lib/utils";
import { tipoDelMovimiento, type TipoDeMovimiento } from "@/lib/tipo-del-movimiento";
import { DibujoVacio } from "@/components/dibujo-vacio";
import { Hoja } from "@/components/hoja";

/**
 * La calculadora de cobertura: metes tu equipo y te dice, tipo por tipo, cuánto
 * le entra a cada uno.
 *
 * Es **defensiva**: la pregunta que resuelve es "si el rival me saca un ataque
 * de Fuego, ¿a quién le duele?". Por eso un Charizard sale ×½ y un Durant ×4 en
 * esa misma fila. Debajo de cada columna no hay una nota media sino la cuenta
 * de cuántos son débiles y cuántos resisten, que es lo que se mira de verdad al
 * preparar un combate.
 *
 * Va en la pantalla de las notas y es igual de privada: el equipo se guarda por
 * participante y no hay ninguna pantalla que enseñe el de otro.
 *
 * La tabla es la de **la generación del locke**, no la de hoy: en Johto el
 * Acero resiste al Fantasma y el tipo Hada no existe.
 */

/** Cuántos caben. Seis, como el equipo de verdad. */
const HUECOS = 6;

/** Lo que se tarda en guardar tras dejar de tocar, para no escribir por letra */
const ESPERA_PARA_GUARDAR = 800;

/** Lo que hay en un sitio del equipo: un pokémon, o nada todavía */
type Sitio = MiembroDelEquipo | null;

/** Un pokémon vivo de tu Equipo y PC, para elegirlo sin teclear */
export type DeMiCaja = MiembroDelEquipo & {
  /** Para buscarlo también por especie, que el nombre es el mote */
  especie: string;
  enEquipo: boolean;
  /** El nombre de la caja del PC en la que está; null si va en el equipo */
  caja: string | null;
  shiny: boolean;
  captura: string;
  /** Los movimientos que hacen daño de su ficha completa; vacío si no los tiene */
  ataques: TipoDeMovimiento[];
};

export function CoberturaDeTipos({
  generacionDelLocke,
  juego,
  inicial,
  tablaInicial,
  deMiCaja = [],
}: {
  /** La generación del juego de esta edición */
  generacionDelLocke: number;
  /** Cómo se llama, para poder decir de qué tabla se está hablando */
  juego: string | null;
  inicial: MiembroDelEquipo[];
  tablaInicial: QueTabla;
  /** Lo vivo de tu Equipo y PC: se elige tocándolo en vez de buscarlo */
  deMiCaja?: DeMiCaja[];
}) {
  const [equipo, setEquipo] = useState<Sitio[]>(() =>
    Array.from({ length: HUECOS }, (_, i) => inicial[i] ?? null),
  );
  const [orden, setOrden] = useState<"peligro" | "tipo">("peligro");
  const [tabla, setTabla] = useState<QueTabla>(tablaInicial);
  const [guardado, setGuardado] = useState(false);
  /** La primera pintada no guarda: si no, entrar ya escribiría en la base */
  const primera = useRef(true);

  /**
   * La generación con la que se cuenta de verdad. Muchos grupos juegan los
   * combates en simuladores modernos aunque el locke sea de Johto, así que se
   * puede pedir la tabla de hoy: con tipo Hada, con Clefairy siendo Hada y sin
   * el Acero resistiendo Fantasma y Siniestro.
   */
  const generacion =
    tabla === "ahora" ? GENERACION_POR_DEFECTO : generacionDelLocke;
  /** Si el locke ya es moderno, el botón no cambiaría nada y no se enseña */
  const hayDiferencia = generacionDelLocke < GENERACION_POR_DEFECTO;

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    setGuardado(false);
    const reloj = setTimeout(() => {
      void guardarEquipoDeTiposAction(
        equipo.filter((sitio): sitio is MiembroDelEquipo => sitio !== null),
        tabla,
      ).then(() => setGuardado(true));
    }, ESPERA_PARA_GUARDAR);
    return () => clearTimeout(reloj);
  }, [equipo, tabla]);

  const puestos = equipo.filter(
    (sitio): sitio is MiembroDelEquipo => sitio !== null,
  );

  /** Los tipos de cada miembro, ya resueltos para esta generación */
  const suyos = useMemo(
    () =>
      puestos.map((miembro) => ({
        ...miembro,
        tipos: tiposDePokemon(miembro.id, generacion),
      })),
    [puestos, generacion],
  );

  /** Una fila por tipo de ataque: lo que le hace a cada uno y el recuento */
  const filas = useMemo(() => {
    const lista = tiposDeGeneracion(generacion).map((tipo) => {
      const contra = suyos.map((miembro) =>
        multiplicador(tipo.id, miembro.tipos, generacion),
      );
      return {
        tipo,
        contra,
        debiles: contra.filter((valor) => valor > 1).length,
        resisten: contra.filter((valor) => valor < 1).length,
      };
    });

    if (orden === "tipo") return lista;
    // Por peligro: primero lo que más gente se lleva por delante
    return [...lista].sort(
      (a, b) =>
        b.debiles - a.debiles ||
        a.resisten - b.resisten ||
        a.tipo.id - b.tipo.id,
    );
  }, [suyos, generacion, orden]);

  const peorFila = filas.find((fila) => fila.debiles > 0);

  /** Lo de atacar: a qué le pega fuerte el equipo con sus propios tipos */
  /**
   * Con qué pega cada uno: sus movimientos de daño si los tiene apuntados en la
   * ficha completa, y si no, los de su propio tipo, que es lo más probable.
   */
  const conQuePegan = useMemo(() => {
    const existen = new Set(tiposDeGeneracion(generacion).map((t) => t.id));
    return suyos.map((miembro) => {
      const deLaCaja = deMiCaja.find((p) => p.ataques.length && p.id === miembro.id && p.nombre === miembro.nombre);
      const deSusMovimientos = deLaCaja
        ? [...new Set(deLaCaja.ataques.map((a) => tipoDelMovimiento(a, generacion)))].filter((t) => existen.has(t))
        : [];
      return deLaCaja
        ? { nombre: miembro.nombre, tipos: deSusMovimientos, conMovimientos: true }
        : { nombre: miembro.nombre, tipos: miembro.tipos, conMovimientos: false };
    });
  }, [suyos, generacion, deMiCaja]);
  const ataque = useMemo(() => coberturaOfensiva(conQuePegan, generacion), [conQuePegan, generacion]);
  const conMovimientos = conQuePegan.filter((m) => m.conMovimientos).length;
  const sinCubrir = ataque.filter((fila) => fila.mejor < 2);

  /** El hueco para el que se está eligiendo; null con el selector cerrado */
  const [eligiendo, setEligiendo] = useState<number | null>(null);
  // El equipo guardado no sabe si es shiny: se mira en la caja
  const esShiny = (m: MiembroDelEquipo) =>
    deMiCaja.some((p) => p.shiny && p.id === m.id && p.nombre === m.nombre);
  const delEquipo = deMiCaja.filter((p) => p.enEquipo);

  return (
    <div className="space-y-4">
      {delEquipo.length || puestos.length ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {delEquipo.length ? (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() =>
                setEquipo(
                  Array.from({ length: HUECOS }, (_, i) =>
                    delEquipo[i] ? { id: delEquipo[i].id, nombre: delEquipo[i].nombre } : null,
                  ),
                )
              }
            >
              Mi equipo de ahora
            </button>
          ) : null}
          {puestos.length ? (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setEquipo(Array.from({ length: HUECOS }, () => null))}
            >
              Vaciar
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {equipo.map((sitio, posicion) => (
          <HuecoDelEquipo
            key={posicion}
            miembro={sitio}
            shiny={sitio ? esShiny(sitio) : false}
            generacion={generacion}
            onAbrir={() => setEligiendo(posicion)}
            onQuitar={() =>
              setEquipo((antes) => antes.map((otro, i) => (i === posicion ? null : otro)))
            }
          />
        ))}
      </div>

      {eligiendo !== null ? (
        <Selector
          equipo={equipo}
          hueco={eligiendo}
          deMiCaja={deMiCaja}
          generacion={generacion}
          esShiny={esShiny}
          onCambiar={setEquipo}
          onCerrar={() => setEligiendo(null)}
        />
      ) : null}

      {hayDiferencia ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 accent-brand-500"
            checked={tabla === "ahora"}
            onChange={(evento) =>
              setTabla(evento.target.checked ? "ahora" : "juego")
            }
          />
          <span className="min-w-0">
            <span className="block font-medium text-slate-200">
              Contar con la tabla de ahora
            </span>
            <span className="block text-xs leading-snug text-slate-500">
              {tabla === "ahora"
                ? "Con tipo Hada. Clefairy, Togepi, Marill y compañía pasan a Hada, y el Acero ya no resiste Fantasma ni Siniestro."
                : `Ahora mismo cuenta con la de ${juego ?? `la ${generacionDelLocke}ª generación`}. Márcalo si jugáis los combates con las reglas de hoy.`}
            </span>
          </span>
        </label>
      ) : null}

      {puestos.length ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setOrden("peligro")}
                className={cx(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  orden === "peligro"
                    ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                Por peligro
              </button>
              <button
                type="button"
                onClick={() => setOrden("tipo")}
                className={cx(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  orden === "tipo"
                    ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                Por tipo
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {peorFila
                ? `Lo que más duele: ${peorFila.tipo.nombre} (${peorFila.debiles} de ${puestos.length})`
                : "Ningún tipo le hace daño extra a nadie del equipo."}
            </p>
          </div>

          {/* La tabla se va a lo ancho en el móvil: seis columnas no caben en
              390 píxeles, y encoger los números los deja ilegibles */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-ink-900 px-2 py-2 text-left text-xs uppercase tracking-wide text-slate-500">
                    Ataque de
                  </th>
                  {suyos.map((miembro, i) => (
                    <th
                      key={i}
                      className="px-1.5 py-2 text-center text-xs font-semibold text-slate-300"
                    >
                      <span className="block max-w-20 truncate">
                        {miembro.nombre}
                      </span>
                      <span className="mt-0.5 flex justify-center gap-1">
                        {miembro.tipos.map((id) => (
                          <Chapa key={id} tipoId={id} mini />
                        ))}
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right text-xs uppercase tracking-wide text-slate-500">
                    Equipo
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr
                    key={fila.tipo.id}
                    className={cx(
                      "border-t border-white/5",
                      fila.debiles >= 3 && "bg-red-500/[0.07]",
                    )}
                  >
                    <th className="sticky left-0 z-10 bg-ink-900 px-2 py-1.5 text-left font-normal">
                      <Chapa tipoId={fila.tipo.id} />
                    </th>
                    {fila.contra.map((valor, i) => (
                      <td key={i} className="px-1.5 py-1.5 text-center">
                        <Celda valor={valor} />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs">
                      {fila.debiles ? (
                        <span className="font-semibold text-red-300">
                          {fila.debiles} débil{fila.debiles === 1 ? "" : "es"}
                        </span>
                      ) : null}
                      {fila.debiles && fila.resisten ? (
                        <span className="text-slate-600"> · </span>
                      ) : null}
                      {fila.resisten ? (
                        <span className="text-emerald-300/80">
                          {fila.resisten} resiste{fila.resisten === 1 ? "" : "n"}
                        </span>
                      ) : null}
                      {/* Ni débiles ni resistencias: la raya deja claro que la
                          casilla está mirada y no en blanco por un fallo */}
                      {!fila.debiles && !fila.resisten ? (
                        <span className="text-slate-600">—</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            Cuánto le entra a cada uno un ataque de ese tipo.{" "}
            {tabla === "ahora" ? (
              <>
                Tabla <strong className="text-slate-400">de ahora</strong>, con
                tipo Hada.
              </>
            ) : (
              <>
                Tabla de la{" "}
                <strong className="text-slate-400">
                  {generacion}ª generación
                </strong>
                {juego ? ` (${juego})` : ""}
                {generacion < 6
                  ? ", sin tipo Hada y con el Acero resistiendo Fantasma y Siniestro"
                  : ""}
                .
              </>
            )}
          </p>

          {/* Y al revés: a qué le pega fuerte el equipo */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              A qué le pegas fuerte
            </p>
            <p className="mb-3 text-xs text-slate-500">
              {sinCubrir.length
                ? `${conMovimientos ? "Con lo que lleva tu equipo" : "Con los tipos de tu equipo"} no le das fuerte a ${sinCubrir.length === 1 ? "un tipo" : `${sinCubrir.length} tipos`}: ${sinCubrir.map((f) => f.tipo.nombre).join(", ")}. Haría falta un movimiento de otro tipo, o alguien más.`
                : `${conMovimientos ? "Con lo que lleva tu equipo" : "Con los tipos de tu equipo"} le das fuerte a todos los tipos. Así da gusto.`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ataque.map((fila) => (
                <span
                  key={fila.tipo.id}
                  title={
                    fila.quienes.length
                      ? `Le pegan fuerte: ${fila.quienes.join(", ")}`
                      : "Nadie del equipo le pega fuerte con su tipo"
                  }
                  className={cx(
                    "inline-flex items-center gap-1 rounded-lg border px-1.5 py-1",
                    fila.mejor >= 2
                      ? "border-emerald-500/30 bg-emerald-500/[0.07]"
                      : "border-red-500/30 bg-red-500/[0.07] opacity-80",
                  )}
                >
                  <Chapa tipoId={fila.tipo.id} />
                  <span className={cx("text-xs tabular-nums", fila.mejor >= 2 ? "text-emerald-300" : "text-red-300")}>
                    {fila.mejor >= 2 ? `×${fila.mejor}` : "—"}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              {conMovimientos === conQuePegan.length
                ? "Cuenta con los movimientos de daño de la ficha de cada uno."
                : conMovimientos
                  ? `Cuenta con los movimientos de la ficha de ${conMovimientos === 1 ? "quien los tiene apuntados" : "los que los tienen apuntados"}, y con los de su propio tipo de los demás.`
                  : "Cuenta con los ataques del propio tipo de cada uno, que son los que más pegan. Si apuntas los movimientos en la ficha de Equipo y PC, cuenta con esos."}{" "}
              Pasa el ratón por un tipo para ver quién le pega.
            </p>
          </div>
        </>
      ) : (
        <div className="px-4 py-5 text-center">
          <DibujoVacio />
          <p className="mt-3 text-sm text-slate-500">Mete algún pokémon arriba y sale la tabla.</p>
        </div>
      )}

      <p className="text-xs text-slate-600">
        {guardado ? "Guardado. " : ""}El equipo se queda apuntado para la próxima
        vez, y es tan privado como las notas.
      </p>
    </div>
  );
}

/**
 * Un hueco del equipo: el pokémon que hay o el botón para elegirlo. Tocar al
 * que hay abre el selector para cambiarlo por otro.
 */
function HuecoDelEquipo({
  miembro,
  shiny,
  generacion,
  onAbrir,
  onQuitar,
}: {
  miembro: Sitio;
  shiny: boolean;
  generacion: number;
  onAbrir: () => void;
  onQuitar: () => void;
}) {
  if (!miembro) {
    return (
      <button
        type="button"
        onClick={onAbrir}
        className="flex min-h-[3.25rem] items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 p-1.5 text-sm text-slate-500 transition hover:border-brand-400/50 hover:bg-white/[0.04] hover:text-slate-200"
      >
        <span aria-hidden className="text-base leading-none">＋</span>
        Añadir
      </button>
    );
  }

  const tipos = tiposDePokemon(miembro.id, generacion);
  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1.5">
      <button
        type="button"
        onClick={onAbrir}
        title={`Cambiar a ${miembro.nombre}`}
        className="-m-0.5 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg p-0.5 text-left transition hover:bg-white/[0.05]"
      >
        <Sprite pokemonId={miembro.id} shiny={shiny} />
        {/* Sin truncar: en dos columnas de móvil no cabe "Charizard" de una vez,
            y un nombre cortado a "Char…" no sirve para reconocer a nadie */}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-tight text-slate-100">
            {miembro.nombre}
          </span>
          <span className="mt-1 flex flex-wrap gap-1">
            {tipos.length ? (
              tipos.map((id) => <Chapa key={id} tipoId={id} />)
            ) : (
              <span className="text-xs text-slate-600">sin tipos</span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onQuitar}
        className="shrink-0 self-start rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
        aria-label={`Quitar a ${miembro.nombre}`}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Sin acentos ni mayúsculas, para buscar por mote. Va aquí y no se importa de
 * lib/historia porque aquella arrastra la tabla de evoluciones al navegador.
 */
const paraBuscar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const mismo = (a: MiembroDelEquipo, b: MiembroDelEquipo) => a.id === b.id && a.nombre === b.nombre;

/**
 * Para elegir quién va en el equipo: tu caja entera a la vista, en cuadrícula
 * como el PC y agrupada por dónde está cada uno, y la Pokédex si se busca uno
 * que aún no tienes.
 *
 * Antes tu caja era una fila que había que recorrer de lado, y con treinta
 * pokémon no se encontraba a nadie. Aquí se ve todo de golpe y el buscador
 * filtra por mote o por especie.
 *
 * Se meten varios seguidos sin cerrar: cada uno va al hueco marcado arriba y
 * la marca salta al siguiente libre. Tocar a uno que ya está lo saca, y tocar
 * un hueco de arriba lo marca para cambiar al que hay.
 */
function Selector({
  equipo,
  hueco,
  deMiCaja,
  generacion,
  esShiny,
  onCambiar,
  onCerrar,
}: {
  equipo: Sitio[];
  hueco: number;
  deMiCaja: DeMiCaja[];
  generacion: number;
  esShiny: (m: MiembroDelEquipo) => boolean;
  onCambiar: (equipo: Sitio[]) => void;
  onCerrar: () => void;
}) {
  /** Dónde va el próximo que se toque; null con el equipo lleno */
  const [destino, setDestino] = useState<number | null>(hueco);
  const [texto, setTexto] = useState("");
  const buscador = useRef<HTMLInputElement>(null);

  // En el ordenador se escribe directamente; en el móvil el teclado taparía la caja
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) buscador.current?.focus();
  }, []);

  const dondeEsta = (m: MiembroDelEquipo) => equipo.findIndex((s) => s !== null && mismo(s, m));

  function tocar(m: MiembroDelEquipo) {
    const donde = dondeEsta(m);
    if (donde !== -1) {
      onCambiar(equipo.map((s, i) => (i === donde ? null : s)));
      setDestino(donde);
      return;
    }
    if (destino === null) return;
    const nuevo = equipo.map((s, i) => (i === destino ? { id: m.id, nombre: m.nombre } : s));
    onCambiar(nuevo);
    // El siguiente libre, empezando por el de después para ir en orden
    const siguiente = Array.from({ length: HUECOS }, (_, k) => (destino + 1 + k) % HUECOS).find(
      (i) => nuevo[i] === null,
    );
    setDestino(siguiente ?? null);
  }

  const busqueda = paraBuscar(texto);
  const grupos: { titulo: string; lista: DeMiCaja[] }[] = [];
  for (const p of deMiCaja) {
    if (busqueda && !paraBuscar(p.nombre).includes(busqueda) && !paraBuscar(p.especie).includes(busqueda)) {
      continue;
    }
    const titulo = p.enEquipo ? "Tu equipo" : (p.caja ?? "Caja");
    const grupo = grupos.find((g) => g.titulo === titulo);
    if (grupo) grupo.lista.push(p);
    else grupos.push({ titulo, lista: [p] });
  }
  const dePokedex = busqueda ? searchSpecies(texto, 12) : [];
  const puestos = equipo.filter(Boolean).length;
  const marcado = destino !== null ? equipo[destino] : null;

  return (
    <Hoja onCerrar={onCerrar} ancho="max-w-2xl" className="p-4 sm:p-5" etiqueta="Elegir el equipo">
      {/* Arriba y fijo: los seis huecos, para ver el equipo mientras se elige */}
      <div className="sticky -top-4 z-10 -mx-4 -mt-1 bg-ink-900/95 px-4 pb-3 pt-1 backdrop-blur sm:-top-5 sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-slate-100">Elige el equipo</p>
          <button type="button" className="btn-primary btn-sm" onClick={onCerrar}>
            Listo · {puestos}/{HUECOS}
          </button>
        </div>
        <div className="mt-2.5 grid grid-cols-6 gap-1.5">
          {equipo.map((sitio, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDestino(i)}
              aria-pressed={i === destino}
              title={sitio ? `Cambiar a ${sitio.nombre}` : `Hueco ${i + 1}`}
              className={cx(
                "flex aspect-square max-h-16 items-center justify-center justify-self-center rounded-xl border transition sm:w-16",
                "w-full",
                sitio ? "bg-white/[0.04]" : "border-dashed",
                i === destino
                  ? "border-brand-400 ring-2 ring-brand-400/40"
                  : "border-white/15 hover:border-white/30",
              )}
            >
              {sitio ? (
                <Sprite pokemonId={sitio.id} shiny={esShiny(sitio)} grande />
              ) : (
                <span aria-hidden className="text-slate-600">＋</span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          {destino === null
            ? "Equipo completo. Toca uno de arriba para cambiarlo, o uno de abajo que ya esté para sacarlo."
            : marcado
              ? `Toca otro para ponerlo en lugar de ${marcado.nombre}.`
              : "Toca para meterlo; tocar a uno que ya está lo saca."}
        </p>
        <input
          ref={buscador}
          className="input mt-2"
          type="search"
          placeholder={deMiCaja.length ? "Busca por mote o especie…" : "Busca un pokémon…"}
          value={texto}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            // Intro mete el primero que salga, como hacía el buscador de antes
            if (evento.key !== "Enter") return;
            evento.preventDefault();
            const primero = grupos[0]?.lista[0];
            const especie = dePokedex[0];
            if (primero) tocar(primero);
            else if (especie) tocar({ id: especie.forms[0].id, nombre: especie.name });
            else return;
            setTexto("");
          }}
        />
      </div>

      <div className="mt-1 space-y-4">
        {grupos.map((grupo) => (
          <section key={grupo.titulo}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {grupo.titulo}
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {grupo.lista.map((p) => (
                <Casilla
                  key={p.captura}
                  miembro={p}
                  detalle={paraBuscar(p.nombre) !== paraBuscar(p.especie) ? p.especie : null}
                  shiny={p.shiny}
                  generacion={generacion}
                  dentro={dondeEsta(p) !== -1}
                  lleno={destino === null}
                  onTocar={() => tocar(p)}
                />
              ))}
            </div>
          </section>
        ))}

        {busqueda ? (
          dePokedex.length ? (
            <section>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                De la Pokédex
              </p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {dePokedex.map((especie) => {
                  const miembro = { id: especie.forms[0].id, nombre: especie.name };
                  return (
                    <Casilla
                      key={especie.dex}
                      miembro={miembro}
                      detalle={`#${especie.dex}`}
                      shiny={false}
                      generacion={generacion}
                      dentro={dondeEsta(miembro) !== -1}
                      lleno={destino === null}
                      onTocar={() => tocar(miembro)}
                    />
                  );
                })}
              </div>
            </section>
          ) : grupos.length ? null : (
            <p className="py-6 text-center text-sm text-slate-500">Ni en tu caja ni en la Pokédex.</p>
          )
        ) : (
          <p className="text-center text-xs text-slate-500">
            {deMiCaja.length
              ? "¿Uno que aún no tienes? Búscalo arriba y sale de la Pokédex."
              : "Busca arriba cualquier pokémon de la Pokédex."}
          </p>
        )}
      </div>
    </Hoja>
  );
}

/** Un pokémon para elegir, con sus tipos: es lo que se mira al montar el equipo */
function Casilla({
  miembro,
  detalle,
  shiny,
  generacion,
  dentro,
  lleno,
  onTocar,
}: {
  miembro: MiembroDelEquipo;
  detalle: string | null;
  shiny: boolean;
  generacion: number;
  dentro: boolean;
  lleno: boolean;
  onTocar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTocar}
      disabled={!dentro && lleno}
      aria-pressed={dentro}
      title={dentro ? `Sacar a ${miembro.nombre}` : `Meter a ${miembro.nombre}`}
      className={cx(
        "relative flex min-w-0 flex-col items-center rounded-xl border px-1 pb-1.5 pt-1 transition disabled:opacity-35",
        dentro
          ? "border-brand-400/70 bg-brand-600/20"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]",
      )}
    >
      <Sprite pokemonId={miembro.id} shiny={shiny} grande />
      <span className="mt-0.5 w-full truncate text-center text-[11px] leading-tight text-slate-100">
        {miembro.nombre}
      </span>
      {detalle ? (
        <span className="w-full truncate text-center text-[10px] leading-tight text-slate-500">{detalle}</span>
      ) : null}
      <span className="mt-1 flex gap-0.5">
        {tiposDePokemon(miembro.id, generacion).map((id) => (
          <Chapa key={id} tipoId={id} mini />
        ))}
      </span>
      {dentro ? (
        <span
          aria-hidden
          className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white"
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}

/** El sprite pixelado, que pesa menos de 1 KB y aquí solo hay que reconocerlo */
function Sprite({ pokemonId, shiny = false, grande = false }: { pokemonId: number; shiny?: boolean; grande?: boolean }) {
  const candidatas = spriteCandidates(pokemonId, shiny, "mini");
  /**
   * Se van probando en orden y, si se acaban, no se pinta nada: dejar el icono
   * de imagen rota en cada hueco queda peor que un cuadro vacío, y aquí el
   * sprite es un adorno —lo que importa son las chapas de tipo.
   */
  const [cual, setCual] = useState(0);
  const src = candidatas[cual];

  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
        grande ? "h-11 w-11" : "h-9 w-9 bg-ink-850",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setCual((antes) => antes + 1)}
        />
      ) : null}
    </span>
  );
}

/** La chapa de un tipo, la de los juegos; en pequeño, solo su icono */
function Chapa({ tipoId, mini = false }: { tipoId: number; mini?: boolean }) {
  const tipo = tipoPorId(tipoId);
  if (!tipo) return null;
  return mini ? (
    <ChapaDeTipo slug={tipo.slug} nombre={tipo.nombre} forma="icono" alto={14} className="inline-block" />
  ) : (
    <ChapaDeTipo slug={tipo.slug} nombre={tipo.nombre} alto={16} className="inline-block" />
  );
}

/**
 * El número de una casilla. El color va por tramos y no por el valor exacto:
 * lo que importa de un vistazo es si eso duele, da igual, o no le hace nada.
 */
function Celda({ valor }: { valor: number }) {
  const estilo =
    valor === 0
      ? "bg-slate-500/15 text-slate-500"
      : valor >= 4
        ? "bg-red-500/30 text-red-200 font-bold"
        : valor > 1
          ? "bg-red-500/15 text-red-300 font-semibold"
          : valor <= 0.25
            ? "bg-emerald-500/25 text-emerald-200 font-semibold"
            : valor < 1
              ? "bg-emerald-500/12 text-emerald-300"
              : "text-slate-500";

  return (
    <span className={cx("inline-block min-w-10 rounded px-1 py-1", estilo)}>
      {comoSeLee(valor)}
    </span>
  );
}
