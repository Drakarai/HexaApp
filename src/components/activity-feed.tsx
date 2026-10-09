import { SpritePokemon } from "@/components/sprite-pokemon";
import type { ActivityEntry } from "@/lib/activity";
import { Avatar, EmptyState } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { Icono } from "@/components/icono";

/** Una línea de la cronología: una cosa suelta, o la misma cosa a varios el mismo día */
type Linea = { entrada: ActivityEntry; quienes: ActivityEntry[] };

// El grupo juega en España: el día cambia a medianoche de aquí, no de donde esté el servidor
const DIA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" });
const diaDe = (fecha: Date) => DIA.format(fecha);

function rotuloDelDia(fecha: Date) {
  const hoy = new Date();
  if (diaDe(fecha) === diaDe(hoy)) return "Hoy";
  if (diaDe(fecha) === diaDe(new Date(hoy.getTime() - 86_400_000))) return "Ayer";
  const texto = FECHA_LARGA.format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** «Álex, Rodri y Pablo» */
function enumerar(nombres: string[]) {
  return nombres.length < 2 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * Junta lo que se puede juntar: la misma cosa (`grupo`) el mismo día va en la
 * línea de la primera vez que sale, que es la más reciente.
 */
function agrupar(entradas: ActivityEntry[]): Linea[] {
  const lineas: Linea[] = [];
  const abiertas = new Map<string, Linea>();
  for (const entrada of entradas) {
    if (entrada.grupo) {
      const clave = `${diaDe(entrada.at)}|${entrada.grupo.clave}`;
      const linea = abiertas.get(clave);
      if (linea) {
        linea.quienes.push(entrada);
        continue;
      }
      const nueva = { entrada, quienes: [entrada] };
      abiertas.set(clave, nueva);
      lineas.push(nueva);
    } else {
      lineas.push({ entrada, quienes: [entrada] });
    }
  }
  return lineas;
}

/**
 * Cronología de lo que ha ido pasando, con una línea vertical uniendo todo.
 * Va **por días**, con su rótulo, y lo que le pasa a varios el mismo día (pasarse
 * el mismo gimnasio) va en una sola línea con todos.
 */
export function ActivityFeed({
  entries,
  compact = false,
  jugadores,
}: {
  entries: ActivityEntry[];
  /** En el resumen se enseñan menos cosas por entrada y sin rótulos de día */
  compact?: boolean;
  /**
   * Los que siguen jugando. Si lo de una línea lo han hecho todos, se dice
   * «Todos han superado a Blanca» en vez de seis nombres en fila.
   */
  jugadores?: number;
}) {
  if (!entries.length) {
    return (
      <EmptyState
        title="Todavía no ha pasado nada"
        hint="Aquí irán apareciendo las muertes, los puntos, los gimnasios superados y los giros de ruleta."
      />
    );
  }

  const lineas = agrupar(entries);
  let diaAnterior = "";

  return (
    <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-white/10">
      {lineas.flatMap(({ entrada, quienes }) => {
        const elementos = [];
        const dia = diaDe(entrada.at);
        if (!compact && dia !== diaAnterior) {
          elementos.push(
            <li key={`dia-${dia}`} className="relative pl-11 pt-1 first:pt-0">
              <span className="rotulo">{rotuloDelDia(entrada.at)}</span>
            </li>,
          );
        }
        diaAnterior = dia;
        const varios = quienes.length > 1;
        elementos.push(
          <li key={entrada.id} className="relative flex gap-3">
            <span
              className="z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 ring-ink-950"
              style={{ background: `${entrada.color}33` }}
              aria-hidden
            >
              <Icono emoji={entrada.icon} />
            </span>

            <div className="min-w-0 flex-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
              <div className="flex items-start gap-2.5">
                {varios ? (
                  // Las fotos de todos, montadas una sobre otra
                  <span className="flex shrink-0 -space-x-2">
                    {quienes.slice(0, 4).map((q) => (
                      <span key={q.id} className="rounded-full ring-2 ring-ink-900">
                        <Avatar name={q.who ?? ""} color={q.color} image={q.whoImage} participantId={q.whoId} size={24} />
                      </span>
                    ))}
                  </span>
                ) : entrada.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <SpritePokemon
                    src={entrada.image}
                    alt=""
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-lg bg-ink-850 object-contain"
                  />
                ) : entrada.who && !compact ? (
                  <Avatar
                    name={entrada.who}
                    color={entrada.color}
                    image={entrada.whoImage}
                    participantId={entrada.whoId}
                    size={28}
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {varios && entrada.grupo
                      ? `${
                          jugadores && jugadores > 2 && new Set(quienes.map((q) => q.whoId ?? q.who)).size >= jugadores
                            ? "Todos"
                            : enumerar(quienes.map((q) => q.who ?? "?"))
                        } ${entrada.grupo.plural}`
                      : entrada.title}
                  </p>
                  {entrada.detail ? <p className="truncate text-xs text-slate-500">{entrada.detail}</p> : null}
                </div>

                <time
                  className="shrink-0 text-xs text-slate-500"
                  dateTime={new Date(entrada.at).toISOString()}
                  title={formatDateTime(entrada.at)}
                >
                  {relativeTime(entrada.at)}
                </time>
              </div>
            </div>
          </li>,
        );
        return elementos;
      })}
    </ol>
  );
}
