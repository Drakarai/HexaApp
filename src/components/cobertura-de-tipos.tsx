"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  guardarEquipoDeTiposAction,
  type MiembroDelEquipo,
} from "@/app/actions/tipos";
import { searchSpecies, spriteCandidates } from "@/lib/pokedex";
import {
  colorDeTipo,
  comoSeLee,
  multiplicador,
  tiposDeGeneracion,
  tiposDePokemon,
  tipoPorId,
} from "@/lib/tipos";
import { cx } from "@/lib/utils";

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

export function CoberturaDeTipos({
  generacion,
  juego,
  inicial,
}: {
  /** La generación del juego de esta edición: manda sobre la tabla y los tipos */
  generacion: number;
  /** Cómo se llama, para poder decir de qué tabla se está hablando */
  juego: string | null;
  inicial: MiembroDelEquipo[];
}) {
  const [equipo, setEquipo] = useState<Sitio[]>(() =>
    Array.from({ length: HUECOS }, (_, i) => inicial[i] ?? null),
  );
  const [orden, setOrden] = useState<"peligro" | "tipo">("peligro");
  const [guardado, setGuardado] = useState(false);
  /** La primera pintada no guarda: si no, entrar ya escribiría en la base */
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    setGuardado(false);
    const reloj = setTimeout(() => {
      void guardarEquipoDeTiposAction(
        equipo.filter((sitio): sitio is MiembroDelEquipo => sitio !== null),
      ).then(() => setGuardado(true));
    }, ESPERA_PARA_GUARDAR);
    return () => clearTimeout(reloj);
  }, [equipo]);

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {equipo.map((sitio, posicion) => (
          <HuecoDelEquipo
            key={posicion}
            miembro={sitio}
            generacion={generacion}
            onElegir={(miembro) =>
              setEquipo((antes) =>
                antes.map((otro, i) => (i === posicion ? miembro : otro)),
              )
            }
          />
        ))}
      </div>

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
            Cuánto le entra a cada uno un ataque de ese tipo. Tabla de la{" "}
            <strong className="text-slate-400">{generacion}ª generación</strong>
            {juego ? ` (${juego})` : ""}
            {generacion < 6
              ? ", sin tipo Hada y con el Acero resistiendo Fantasma y Siniestro"
              : ""}
            .
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
          Mete algún pokémon arriba y sale la tabla.
        </p>
      )}

      <p className="text-xs text-slate-600">
        {guardado ? "Guardado. " : ""}El equipo se queda apuntado para la próxima
        vez, y es tan privado como las notas.
      </p>
    </div>
  );
}

/** Un hueco del equipo: o el pokémon que hay, o el buscador para ponerlo. */
function HuecoDelEquipo({
  miembro,
  generacion,
  onElegir,
}: {
  miembro: Sitio;
  generacion: number;
  onElegir: (miembro: Sitio) => void;
}) {
  if (!miembro) return <Buscador onElegir={onElegir} />;

  const tipos = tiposDePokemon(miembro.id, generacion);
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1.5">
      <Sprite pokemonId={miembro.id} />
      {/* Sin truncar: en dos columnas de móvil no cabe "Charizard" de una vez,
          y un nombre cortado a "Char…" no sirve para reconocer a nadie */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight text-slate-100">
          {miembro.nombre}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {tipos.length ? (
            tipos.map((id) => <Chapa key={id} tipoId={id} />)
          ) : (
            <span className="text-xs text-slate-600">sin tipos</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onElegir(null)}
        className="shrink-0 self-start rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
        aria-label={`Quitar a ${miembro.nombre}`}
      >
        ✕
      </button>
    </div>
  );
}

function Buscador({ onElegir }: { onElegir: (miembro: Sitio) => void }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const sugerencias = abierto ? searchSpecies(texto, 6) : [];

  return (
    <div className="relative">
      <input
        className="input"
        placeholder="Añadir pokémon…"
        value={texto}
        autoComplete="off"
        onChange={(evento) => {
          setTexto(evento.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        // Da tiempo a que el clic en una sugerencia llegue antes de cerrar
        onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(evento) => {
          if (evento.key === "Enter" && sugerencias.length) {
            evento.preventDefault();
            const elegida = sugerencias[0];
            onElegir({ id: elegida.forms[0].id, nombre: elegida.name });
          }
          if (evento.key === "Escape") setAbierto(false);
        }}
      />
      {sugerencias.length ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/10 bg-ink-850 py-1 shadow-xl">
          {sugerencias.map((especie) => (
            <li key={especie.dex}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() =>
                  onElegir({ id: especie.forms[0].id, nombre: especie.name })
                }
              >
                <span className="w-10 shrink-0 text-xs text-slate-500 tabular-nums">
                  #{especie.dex}
                </span>
                <span className="truncate">{especie.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** El sprite pixelado, que pesa menos de 1 KB y aquí solo hay que reconocerlo */
function Sprite({ pokemonId }: { pokemonId: number }) {
  const candidatas = spriteCandidates(pokemonId, false, "mini");
  /**
   * Se van probando en orden y, si se acaban, no se pinta nada: dejar el icono
   * de imagen rota en cada hueco queda peor que un cuadro vacío, y aquí el
   * sprite es un adorno —lo que importa son las chapas de tipo.
   */
  const [cual, setCual] = useState(0);
  const src = candidatas[cual];

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-850">
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

function Chapa({ tipoId, mini = false }: { tipoId: number; mini?: boolean }) {
  const tipo = tipoPorId(tipoId);
  if (!tipo) return null;
  const color = colorDeTipo(tipo.slug);

  return (
    <span
      title={tipo.nombre}
      className={cx(
        "inline-block rounded font-semibold text-white",
        mini ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]",
      )}
      style={{ background: color }}
    >
      {mini ? tipo.nombre.slice(0, 3) : tipo.nombre}
    </span>
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
