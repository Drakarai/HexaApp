"use client";

import { useMemo, useState, useTransition } from "react";
import { guardarOcultosDelPalmaresAction } from "@/app/actions/palmares";
import { Avatar } from "@/components/ui";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";
import type { Categoria, Cuenta, FilaDelPalmares } from "@/lib/palmares";

const MEDALS = ["🥇", "🥈", "🥉"];

type Pestana = "todo" | Categoria;

const PESTANAS: { cual: Pestana; rotulo: string }[] = [
  { cual: "todo", rotulo: "Todo" },
  { cual: "grupo", rotulo: "Grupo" },
  { cual: "dual", rotulo: "Dualocke" },
  { cual: "solitario", rotulo: "Solitario" },
];

/** Cómo se dice cada categoría en el desglose de una persona */
const EN_EL_DESGLOSE: Record<Categoria, string> = {
  grupo: "de grupo",
  dual: "dual",
  solitario: "en solitario",
};

const EXPLICACION: Record<Pestana, string> = {
  todo: "Sumando todas las ediciones. Las victorias y derrotas son de los combates de jornada.",
  grupo: "Lockes de tres o más: los que se ganan en la final.",
  dual: "Lockes de dos: los que se ganan por mayoría de jornadas.",
  solitario: "Lockes de uno: se ganan pasándose la Liga.",
};

/**
 * La tabla de personas del palmarés.
 *
 * **Cada uno elige quién sale.** Por defecto, él y toda la gente con la que ha
 * compartido locke; desde "Elegir quién sale" quita a quien no quiera ver y lo
 * vuelve a poner cuando quiera. Él siempre sale: es su palmarés.
 *
 * **Y se separa por tamaño de locke**, porque ganar un Hexalocke de seis no es
 * lo mismo que un dualocke. Las pestañas cambian la tabla entera a esa
 * categoría; en "Todo", debajo de cada nombre va de dónde salen sus títulos.
 */
export function CuentaDeCadaUno({
  gente,
  yoId,
  ocultosDeEntrada,
}: {
  gente: FilaDelPalmares[];
  yoId: string;
  ocultosDeEntrada: string[];
}) {
  const [pestana, setPestana] = useState<Pestana>("todo");
  const [ocultos, setOcultos] = useState(() => new Set(ocultosDeEntrada));
  const [eligiendo, setEligiendo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, startTransition] = useTransition();

  const salen = gente.filter((fila) => fila.userId === yoId || !ocultos.has(fila.userId));

  // Solo las pestañas en las que hay algo: sin lockes en solitario, sobra
  const conAlgo = PESTANAS.filter(
    ({ cual }) => cual === "todo" || salen.some((fila) => fila.porCategoria[cual].lockes > 0),
  );
  const pestanaVisible = conAlgo.some((p) => p.cual === pestana) ? pestana : "todo";
  const cuentaDe = (fila: FilaDelPalmares): Cuenta =>
    pestanaVisible === "todo" ? fila.total : fila.porCategoria[pestanaVisible];

  const filas = salen
    .filter((fila) => cuentaDe(fila).lockes > 0)
    .sort((a, b) => {
      const ca = cuentaDe(a);
      const cb = cuentaDe(b);
      return (
        cb.ganados - ca.ganados ||
        cb.victorias - ca.victorias ||
        a.displayName.localeCompare(b.displayName, "es")
      );
    });

  function cambiar(userId: string) {
    const siguiente = new Set(ocultos);
    if (siguiente.has(userId)) siguiente.delete(userId);
    else siguiente.add(userId);
    guardar(siguiente);
  }

  function guardar(siguiente: Set<string>) {
    setOcultos(siguiente);
    startTransition(() => guardarOcultosDelPalmaresAction([...siguiente]));
  }

  const candidatos = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");
    return gente
      .filter((fila) => fila.userId !== yoId)
      .filter((fila) => !texto || fila.displayName.toLocaleLowerCase("es").includes(texto))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
  }, [gente, yoId, busqueda]);
  const otros = gente.length - 1;

  return (
    <section className="card mb-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">La cuenta de cada uno</h2>
        {otros > 0 ? (
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-expanded={eligiendo}
            onClick={() => setEligiendo((antes) => !antes)}
          >
            {eligiendo ? "Listo" : "Elegir quién sale"}
          </button>
        ) : null}
      </div>

      {eligiendo ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="mb-2 text-xs text-slate-400">
            Salen {salen.length - 1} de {otros}, más tú. Aquí solo está la gente con la
            que has compartido algún locke{guardando ? " · guardando…" : ""}.
          </p>
          <input
            type="search"
            className="input mb-2"
            placeholder="Buscar por nombre"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {candidatos.map((fila) => (
              <li key={fila.userId}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5">
                  <input
                    type="checkbox"
                    className="accent-indigo-500"
                    checked={!ocultos.has(fila.userId)}
                    onChange={() => cambiar(fila.userId)}
                  />
                  <Avatar name={fila.displayName} color={fila.color} image={fila.avatarImage} size={22} />
                  <span className="truncate">{fila.displayName}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {fila.total.lockes} {fila.total.lockes === 1 ? "locke" : "lockes"}
                  </span>
                </label>
              </li>
            ))}
            {!candidatos.length ? (
              <li className="px-2 py-1.5 text-sm text-slate-500">Nadie con ese nombre.</li>
            ) : null}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={!ocultos.size}
              onClick={() => guardar(new Set())}
            >
              Que salgan todos
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={ocultos.size === otros}
              onClick={() => guardar(new Set(gente.map((f) => f.userId).filter((id) => id !== yoId)))}
            >
              Solo yo
            </button>
          </div>
        </div>
      ) : null}

      {conAlgo.length > 2 ? (
        <div className="mb-3 flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {conAlgo.map(({ cual, rotulo }) => (
            <button
              key={cual}
              type="button"
              onClick={() => setPestana(cual)}
              aria-pressed={pestanaVisible === cual}
              className={cx(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                pestanaVisible === cual
                  ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      ) : null}

      <p className="muted mb-4">{EXPLICACION[pestanaVisible]}</p>

      <ul className="space-y-2">
        {filas.map((fila, index) => {
          const cuenta = cuentaDe(fila);
          const desglose =
            pestanaVisible === "todo"
              ? (["grupo", "dual", "solitario"] as const)
                  .filter((categoria) => fila.porCategoria[categoria].ganados > 0)
                  .map(
                    (categoria) =>
                      `${fila.porCategoria[categoria].ganados} ${EN_EL_DESGLOSE[categoria]}`,
                  )
              : [];
          const soloLiga = pestanaVisible === "solitario";
          return (
            <li
              key={fila.userId}
              className={cx(
                "rounded-xl border px-3 py-2.5",
                index === 0 && cuenta.ganados > 0
                  ? "border-amber-400/30 bg-amber-400/[0.05]"
                  : "border-white/5 bg-white/[0.03]",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-lg">
                  {cuenta.ganados > 0 && index < 3 ? (
                    <Icono emoji={MEDALS[index]} />
                  ) : (
                    <span className="text-sm text-slate-500">{index + 1}º</span>
                  )}
                </span>
                <Avatar name={fila.displayName} color={fila.color} image={fila.avatarImage} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {fila.displayName}
                    {fila.userId === yoId ? <span className="ml-1 text-xs font-normal text-slate-500">(tú)</span> : null}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {cuenta.lockes} {cuenta.lockes === 1 ? "locke" : "lockes"}
                    {/* De dónde salen sus títulos, en una línea: así no hace
                        falta ir pestaña por pestaña para saberlo */}
                    {desglose.length ? (
                      <>
                        {" · "}
                        <Icono emoji="🏆" /> {desglose.join(" · ")}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              {/* Las cifras debajo y no al lado: con cuatro columnas en un
                  móvil el nombre se quedaba en dos letras */}
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Cifra
                  valor={cuenta.ganados}
                  rotulo={<><Icono emoji="🏆" /> {soloLiga ? "Ligas" : "Lockes"}</>}
                />
                {/* En solitario no hay combates entre jugadores */}
                {soloLiga ? (
                  <Cifra valor={cuenta.lockes} rotulo="Jugados" />
                ) : (
                  <Cifra valor={`${cuenta.victorias}-${cuenta.derrotas}`} rotulo="V-D" />
                )}
                <Cifra valor={cuenta.bajas} rotulo={<><Icono emoji="💀" /> Caídos</>} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Cifra({ valor, rotulo }: { valor: string | number; rotulo: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
      <p className="text-base font-black text-white">{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{rotulo}</p>
    </div>
  );
}
