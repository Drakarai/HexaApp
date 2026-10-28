import { SpritePokemon } from "@/components/sprite-pokemon";
import type { ActivityEntry, TipoDeActividad } from "@/lib/activity";
import { Avatar, EmptyState } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { TextoQueSeAbre } from "@/components/texto-que-se-abre";

/** Una línea de la cronología: una cosa suelta, o la misma cosa a varios el mismo día */
type Linea = { entrada: ActivityEntry; quienes: ActivityEntry[] };

// El grupo juega en España: el día cambia a medianoche de aquí, no de donde esté el servidor
const DIA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
const FECHA_CORTA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric" });
const diaDe = (fecha: Date) => DIA.format(fecha);

const MES = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", month: "long" });
const MES_Y_ANO = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", month: "long", year: "numeric" });
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** El día de Madrid como número de días, para restar dos fechas sin líos de horas */
function numeroDeDia(fecha: Date) {
  const [d, m, a] = diaDe(fecha).split("/").map(Number);
  return Date.UTC(a, m - 1, d) / 86_400_000;
}

/**
 * El tramo de la cronología: Hoy, Ayer, Esta semana y luego por meses. Día a
 * día, una semana tranquila eran siete rótulos para siete cosas; lo que se
 * busca es «qué ha pasado últimamente», no la fecha exacta, que va al lado.
 */
function tramoDe(fecha: Date) {
  const hoy = new Date();
  const dias = numeroDeDia(hoy) - numeroDeDia(fecha);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return "Esta semana";
  if (MES_Y_ANO.format(fecha) === MES_Y_ANO.format(hoy)) return "Este mes";
  return mayuscula(
    fecha.getFullYear() === hoy.getFullYear() ? MES.format(fecha) : MES_Y_ANO.format(fecha),
  );
}

/**
 * Cada tipo con su icono y su color: el punto de la línea va del color de lo
 * que pasó, no del jugador, para que se lea la semana de un vistazo (mucho
 * rojo, muchas muertes). La página los usa también para filtrar.
 */
export const TIPOS_DE_ACTIVIDAD: { tipo: TipoDeActividad; nombre: string; icono: string; color: string }[] = [
  { tipo: "muerte", nombre: "Muertes", icono: "💀", color: "#f43f5e" },
  { tipo: "combate", nombre: "Combates", icono: "⚔️", color: "#818cf8" },
  { tipo: "hito", nombre: "Hitos", icono: "🎯", color: "#f59e0b" },
  { tipo: "puntos", nombre: "Puntos", icono: "➕", color: "#10b981" },
  { tipo: "ruleta", nombre: "Ruleta", icono: "🎡", color: "#a855f7" },
  { tipo: "objeto", nombre: "Objetos", icono: "🎒", color: "#0ea5e9" },
];
const COLOR_DEL_TIPO = new Map(TIPOS_DE_ACTIVIDAD.map((t) => [t.tipo, t.color]));

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
 * Va **por tramos** (hoy, ayer, esta semana, por meses), con su rótulo, y lo que le pasa a varios el mismo día (pasarse
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
  // Cuántas hay en cada tramo, para el rótulo
  const enElTramo = new Map<string, number>();
  for (const { entrada } of lineas) {
    const tramo = tramoDe(entrada.at);
    enElTramo.set(tramo, (enElTramo.get(tramo) ?? 0) + 1);
  }
  let tramoAnterior = "";

  return (
    <ol
      className={
        compact
          ? "relative space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-white/10"
          : "relative space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-brand-500/50 before:via-white/10 before:to-transparent"
      }
    >
      {lineas.flatMap(({ entrada, quienes }) => {
        const elementos = [];
        const tramo = tramoDe(entrada.at);
        if (!compact && tramo !== tramoAnterior) {
          elementos.push(
            <li key={`tramo-${tramo}`} className="relative flex items-center gap-3 pt-3 first:pt-0">
              {/* El nudo del tramo, encima de la línea */}
              <span aria-hidden className="z-10 ml-[9px] h-3.5 w-3.5 rounded-full bg-brand-400 ring-4 ring-ink-900" />
              <span className="rounded-full border border-white/10 bg-ink-850 px-3 py-1">
                <span className="rotulo text-slate-200">{tramo}</span>
                <span className="ml-2 text-xs text-slate-500">{enElTramo.get(tramo)}</span>
              </span>
            </li>,
          );
        }
        tramoAnterior = tramo;
        const varios = quienes.length > 1;
        const colorDelPunto = compact ? entrada.color : (COLOR_DEL_TIPO.get(entrada.tipo) ?? entrada.color);
        elementos.push(
          <li key={entrada.id} className="relative flex gap-3">
            <span
              className="z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 ring-ink-950"
              style={{
                background: `${colorDelPunto}33`,
                boxShadow: compact ? undefined : `inset 0 0 0 1px ${colorDelPunto}88`,
              }}
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
                  {entrada.detail ? <TextoQueSeAbre texto={entrada.detail} className="text-xs text-slate-500" /> : null}
                </div>

                <time
                  className="shrink-0 text-xs text-slate-500"
                  dateTime={new Date(entrada.at).toISOString()}
                  title={formatDateTime(entrada.at)}
                >
                  {compact || tramo === "Hoy" || tramo === "Ayer"
                    ? relativeTime(entrada.at)
                    : // Pasado ayer, «hace 12 días» dice menos que la fecha
                      mayuscula(FECHA_CORTA.format(entrada.at))}
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
