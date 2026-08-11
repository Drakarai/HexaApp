import type { StandingRow } from "@/lib/competition";
import { AceBadge } from "@/components/ace-badge";
import { Avatar } from "@/components/ui";
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
                  <Avatar
                    name={row.displayName}
                    color={row.color}
                    image={row.avatarImage}
                    size={28}
                    participantId={row.participantId}
                  />
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
                    {row.gameVersion && !compact ? (
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
