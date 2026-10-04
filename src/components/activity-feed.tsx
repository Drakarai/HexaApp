import { SpritePokemon } from "@/components/sprite-pokemon";
import type { ActivityEntry } from "@/lib/activity";
import { Avatar, EmptyState } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { Icono } from "@/components/icono";

/** Cronología de lo que ha ido pasando, con una línea vertical uniendo todo. */
export function ActivityFeed({
  entries,
  compact = false,
}: {
  entries: ActivityEntry[];
  /** En el resumen se enseñan menos cosas por entrada */
  compact?: boolean;
}) {
  if (!entries.length) {
    return (
      <EmptyState
        title="Todavía no ha pasado nada"
        hint="Aquí irán apareciendo las muertes, los puntos, los gimnasios superados y los giros de ruleta."
      />
    );
  }

  return (
    <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-white/10">
      {entries.map((entry) => (
        <li key={entry.id} className="relative flex gap-3">
          <span
            className="z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 ring-ink-950"
            style={{ background: `${entry.color}33` }}
            aria-hidden
          >
            <Icono emoji={entry.icon} />
          </span>

          <div className="min-w-0 flex-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
            <div className="flex items-start gap-2.5">
              {entry.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <SpritePokemon
                  src={entry.image}
                  alt=""
                  loading="lazy"
                  className="h-9 w-9 shrink-0 rounded-lg bg-ink-850 object-contain"
                />
              ) : entry.who && !compact ? (
                <Avatar
                  name={entry.who}
                  color={entry.color}
                  image={entry.whoImage}
                  size={28}
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">{entry.title}</p>
                {entry.detail ? (
                  <p className="truncate text-xs text-slate-500">
                    {entry.detail}
                  </p>
                ) : null}
              </div>

              <time
                className="shrink-0 text-xs text-slate-500"
                dateTime={new Date(entry.at).toISOString()}
                title={formatDateTime(entry.at)}
              >
                {relativeTime(entry.at)}
              </time>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
