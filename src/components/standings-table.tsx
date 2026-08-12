import type { StandingRow } from "@/lib/competition";
import { AceBadge } from "@/components/ace-badge";
import { Avatar } from "@/components/ui";
import { TitleBadge } from "@/components/title-badge";
import { cx } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

export function StandingsTable({
  rows,
  highlightUserId,
  qualifiedSlots = 2,
  compact = false,
  editableParticipantIds = [],
}: {
  rows: StandingRow[];
  highlightUserId?: string;
  /** Participantes cuyo as puede editar quien está mirando */
  editableParticipantIds?: string[];
  /** Cuántos primeros puestos se marcan como clasificados directos. */
  qualifiedSlots?: number;
  compact?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Jugador</th>
            <th className="text-right">Pts</th>
            <th className="text-right">💀</th>
            {compact ? null : (
              <>
                <th className="text-right">V-D</th>
                <th className="text-right">Dif.</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.participantId}
              className={cx(
                row.userId === highlightUserId && "bg-brand-500/10",
              )}
            >
              <td className="text-slate-400">
                {row.position <= qualifiedSlots ? (
                  <span title="Clasificado directo">
                    {MEDALS[row.position - 1] ?? row.position}
                  </span>
                ) : (
                  row.position
                )}
              </td>
              <td>
                <div className="flex items-center gap-2.5">
                  {/* El emoji del título va encima de la foto, no al lado: así
                      no le quita ni un píxel de ancho al nombre, que es lo que
                      no puede recortarse */}
                  <span className="relative shrink-0">
                    <Avatar
                      name={row.displayName}
                      color={row.color}
                      image={row.avatarImage}
                      size={28}
                      participantId={row.participantId}
                    />
                    {row.title ? (
                      <span
                        aria-hidden
                        title={row.title.name}
                        className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border text-[9px] leading-none"
                        style={{
                          borderColor: `${row.title.color}88`,
                          background: "var(--color-ink-900, #0b1020)",
                          color: row.title.color,
                        }}
                      >
                        {/* Sin emoji, una estrella: en el móvil esta chapita es
                            lo único que dice que lleva título */}
                        {row.title.icon ?? "★"}
                      </span>
                    ) : null}
                  </span>
                  <AceBadge
                    size={24}
                    ace={{
                      participantId: row.participantId,
                      playerName: row.displayName,
                      color: row.color,
                      species: row.ace.species,
                      nickname: row.ace.nickname,
                      reason: row.ace.reason,
                      image: row.ace.image,
                      detailImage: row.ace.detailImage,
                      editable: editableParticipantIds.includes(
                        row.participantId,
                      ),
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {row.displayName}
                    </p>
                    {compact ? null : row.title ? (
                      /* El nombre entero del título solo desde `sm`: en un
                         móvil estrecho saldría cortado a la mitad, y un título
                         a medias queda peor que no ponerlo. Ahí queda el emoji
                         de la foto, y el nombre completo está en su perfil. */
                      <span className="hidden max-w-[16rem] sm:inline-flex">
                        <TitleBadge titulo={row.title} size="sm" />
                      </span>
                    ) : row.gameVersion ? (
                      <p className="truncate text-xs text-slate-500">
                        {row.gameVersion}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="text-right font-bold text-white tabular-nums">
                {row.points}
              </td>
              <td className="text-right tabular-nums text-slate-400">
                {row.deaths}
              </td>
              {compact ? null : (
                <>
                  <td className="text-right tabular-nums text-slate-400">
                    {row.wins}-{row.losses}
                  </td>
                  <td className="text-right tabular-nums text-slate-400">
                    {row.pokemonDiff > 0 ? "+" : ""}
                    {row.pokemonDiff}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length ? null : (
        <p className="py-6 text-center text-sm text-slate-500">
          Aún no hay jugadores en esta competición.
        </p>
      )}
    </div>
  );
}
