import { prisma } from "@/lib/db";
import { getTablaDeLaJornada } from "@/lib/puestos-servidor";
import { cx } from "@/lib/utils";

/**
 * **La tabla de la jornada** en un locke por puestos (ver lib/puestos.ts):
 * el puesto de cada uno, por qué, lo que suma y lo que se lleva. Mientras le
 * quede un combate por jugar es provisional, y no da nada todavía.
 */
export async function TablaDePuestos({ matchdayId }: { matchdayId: string }) {
  const tabla = await getTablaDeLaJornada(matchdayId);
  if (!tabla || !tabla.filas.length) return null;
  const ids = tabla.premios.flatMap((p) => p.objetos);
  const ruletas = tabla.premios.map((p) => p.ruleta).filter((r): r is string => Boolean(r));
  const [jugadores, objetos, deRuleta] = await Promise.all([
    prisma.participant.findMany({
      where: { id: { in: tabla.filas.map((f) => f.participantId) } },
      select: { id: true, displayName: true, color: true },
    }),
    ids.length ? prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [],
    ruletas.length ? prisma.roulette.findMany({ where: { id: { in: ruletas } }, select: { id: true, name: true } }) : [],
  ]);
  const quien = new Map(jugadores.map((j) => [j.id, j]));
  const objeto = new Map(objetos.map((o) => [o.id, o.name]));
  const ruleta = new Map(deRuleta.map((r) => [r.id, r.name]));
  const queSeLleva = (puesto: number) => {
    const p = tabla.premios[puesto - 1];
    return (
      [
        ...(p?.objetos ?? []).map((id) => objeto.get(id)),
        p?.ruleta && ruleta.has(p.ruleta) ? `tirada en ${ruleta.get(p.ruleta)}` : null,
      ]
        .filter(Boolean)
        .join(" + ") || "—"
    );
  };
  const conSigno = (n: number) => (n > 0 ? `+${n}` : String(n));
  const sinReto = new Set(tabla.sinReto);

  return (
    <div className="mt-4 border-t border-white/10 pt-4" data-tabla-de-puestos>
      <h3 className="rotulo mb-2">
        Tabla de la jornada{tabla.jugada ? "" : " · provisional"}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Jugador</th>
              <th className="py-1 pr-2 text-center" title="Victorias">V</th>
              <th className="py-1 pr-2 text-center" title="Salvados si ganó, debilitados (en negativo, los que le faltaron) si perdió">
                Dif.
              </th>
              <th className="py-1 pr-2 text-center" title="Críticos hechos menos recibidos, de las repeticiones">
                Crít.
              </th>
              <th className="py-1 pr-2 text-center">Pts</th>
              <th className="py-1">Premio</th>
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((f) => {
              const j = quien.get(f.participantId);
              return (
                <tr key={f.participantId} className="border-t border-white/5" data-puesto={f.puesto}>
                  <td className="py-1.5 pr-2 font-semibold text-white">{f.puesto}º</td>
                  <td className="py-1.5 pr-2">
                    <span style={{ color: j?.color }}>●</span> {j?.displayName ?? "?"}
                    {sinReto.has(f.participantId) ? (
                      <span
                        className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200"
                        title="No ha jugado ningún reto en esta jornada: le toca jugar con el equipo a la vista"
                      >
                        sin reto · equipo a la vista
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-2 text-center">{f.victorias}</td>
                  <td className="py-1.5 pr-2 text-center">{conSigno(f.diferencia)}</td>
                  <td className="py-1.5 pr-2 text-center">{conSigno(f.criticos)}</td>
                  <td className={cx("py-1.5 pr-2 text-center font-semibold", f.puntos > 0 ? "text-brand-200" : "text-slate-500")}>
                    {f.puntos > 0 ? `+${f.puntos}` : f.puntos}
                  </td>
                  <td className="py-1.5 text-xs text-slate-400">{queSeLleva(f.puesto)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {tabla.jugada
          ? "Los puntos ya cuentan y los premios están en la Bolsa y en la ruleta. Si se corrige un resultado, se rehace."
          : "Cuando se juegue el último combate, cada uno suma lo suyo y recibe su premio."}{" "}
        Los críticos salen de las repeticiones: sin enlace, cuentan 0.
      </p>
    </div>
  );
}
