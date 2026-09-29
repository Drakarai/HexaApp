import type { ResumenDelLocke } from "@/lib/resumen-del-locke";
import { formatDate } from "@/lib/utils";
import { Icono } from "@/components/icono";

/** "1 jornada" / "6 jornadas". Todo lo de aquí acaba en vocal o en o. */
const plural = (cuantos: number, palabra: string) =>
  cuantos === 1 ? palabra : `${palabra}s`;

/** Una cifra del resumen, con su rótulo debajo. */
function Cifra({
  valor,
  rotulo,
  detalle,
}: {
  valor: string | number;
  rotulo: string;
  detalle?: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center">
      <p className="text-xl font-black text-white sm:text-2xl">{valor}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
        {rotulo}
      </p>
      {detalle ? (
        <p className="mt-1 truncate text-[11px] text-slate-400">{detalle}</p>
      ) : null}
    </div>
  );
}

/** Una mención con el color de su dueño. */
function Mencion({
  emoji,
  rotulo,
  nombre,
  color,
  detalle,
}: {
  emoji: string;
  rotulo: string;
  nombre: string;
  color: string;
  detalle: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
      <span className="text-lg" aria-hidden>
        <Icono emoji={emoji} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          {rotulo}
        </p>
        <p className="truncate text-sm font-semibold text-white">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: color }}
            aria-hidden
          />
          {nombre}
        </p>
      </div>
      <span className="shrink-0 text-xs text-slate-400">{detalle}</span>
    </li>
  );
}

/**
 * Cómo fue el locke, en cifras. Nada de esto se guarda: se cuenta al abrir el
 * hall (ver `lib/resumen-del-locke.ts`).
 */
export function ResumenDelLocke({
  resumen,
  cooperativo = false,
}: {
  resumen: ResumenDelLocke;
  /** Un Soul Link: sin jornadas ni carreras por los gimnasios que contar */
  cooperativo?: boolean;
}) {
  const menciones = [
    resumen.masMvps
      ? {
          emoji: "⭐",
          rotulo: "Más MVPs de jornada",
          nombre: resumen.masMvps.displayName,
          color: resumen.masMvps.color,
          detalle: `${resumen.masMvps.cuantas}`,
        }
      : null,
    // Si no cayó nadie, "el que más perdió · 0 caídos" no es una mención
    resumen.masBajas && resumen.masBajas.cuantas > 0
      ? {
          emoji: "🪦",
          rotulo: "El que más perdió",
          nombre: resumen.masBajas.displayName,
          color: resumen.masBajas.color,
          detalle: `${resumen.masBajas.cuantas} ${plural(resumen.masBajas.cuantas, "caído")}`,
        }
      : null,
    /* Solo si de verdad es distinto: con un empate a bajas, "el que más" y "el
       que menos" salen siendo el mismo y quedaría raro */
    resumen.menosBajas &&
    resumen.masBajas &&
    resumen.menosBajas.cuantas !== resumen.masBajas.cuantas
      ? {
          emoji: "🛡️",
          rotulo: "El más cuidadoso",
          nombre: resumen.menosBajas.displayName,
          color: resumen.menosBajas.color,
          detalle: `${resumen.menosBajas.cuantas} ${plural(resumen.menosBajas.cuantas, "caído")}`,
        }
      : null,
    // En solitario las coronas serían todas suyas: no es mención de nada
    // Y en un Soul Link no se juega a llegar antes: se va a la vez
    resumen.masCoronas && resumen.jugadores > 1 && !cooperativo
      ? {
          emoji: "👑",
          rotulo: "El primero en los gimnasios",
          nombre: resumen.masCoronas.displayName,
          color: resumen.masCoronas.color,
          detalle: `${resumen.masCoronas.cuantas} ${plural(resumen.masCoronas.cuantas, "corona")}`,
        }
      : null,
  ].filter((mencion) => mencion !== null);

  return (
    <section className="card mb-6">
      <h2 className="section-title">Cómo fue</h2>
      <p className="muted mb-4">
        Del {formatDate(resumen.desde)}
        {resumen.hasta ? ` al ${formatDate(resumen.hasta)}` : ""}
        {resumen.dias ? ` · ${resumen.dias} ${plural(resumen.dias, "día")}` : ""}.
      </p>

      <div className={cooperativo ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-4"}>
        {cooperativo ? null : (
          <>
            <Cifra valor={resumen.jornadas} rotulo={plural(resumen.jornadas, "jornada")} />
            <Cifra valor={resumen.combates} rotulo={plural(resumen.combates, "combate")} />
          </>
        )}
        <Cifra
          valor={resumen.bajas}
          rotulo={plural(resumen.bajas, "caído")}
          detalle={
            resumen.zonaMasMortifera
              ? `${resumen.zonaMasMortifera.bajas} en ${resumen.zonaMasMortifera.name}`
              : null
          }
        />
        <Cifra
          valor={resumen.retos}
          rotulo={plural(resumen.retos, "reto")}
          detalle={
            resumen.wipeos ? `${resumen.wipeos} ${plural(resumen.wipeos, "wipeo")}` : null
          }
        />
      </div>

      {resumen.causaMasRepetida ? (
        <p className="mt-3 text-sm text-slate-400">
          La causa que más se repite en la caja:{" "}
          <strong className="text-slate-200">«{resumen.causaMasRepetida.texto}»</strong>,{" "}
          {resumen.causaMasRepetida.veces} veces.
        </p>
      ) : null}

      {menciones.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {menciones.map((mencion) => (
            <Mencion key={mencion.rotulo} {...mencion} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
