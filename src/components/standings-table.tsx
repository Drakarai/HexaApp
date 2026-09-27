import type { StandingRow } from "@/lib/competition";
import type { MovimientosEnLaTabla } from "@/lib/grafico-clasificacion";
import { AceBadge } from "@/components/ace-badge";
import { Avatar, EnlaceDeJugador } from "@/components/ui";
import { TitleBadge } from "@/components/title-badge";
import { comoEstaFuera } from "@/lib/wipeos";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

const MEDALS = ["🥇", "🥈", "🥉"];

type Props = {
  rows: StandingRow[];
  highlightUserId?: string;
  /** Participantes cuyo as puede editar quien está mirando */
  editableParticipantIds?: string[];
  /** Cuántos primeros puestos se marcan como clasificados directos. */
  qualifiedSlots?: number;
  compact?: boolean;
  /** Lo que ha subido o bajado cada uno desde la jornada anterior */
  movimientos?: MovimientosEnLaTabla | null;
};

/**
 * La clasificación, en **dos formas según el sitio que haya**: fichas en el
 * móvil y tabla desde `sm`.
 *
 * La tabla en un móvil obligaba a arrastrar en horizontal para ver las últimas
 * columnas, y sobre todo no dejaba hueco para escribir el título de nadie: la
 * columna del nombre son unos 130 px. En ficha, el título tiene el ancho entero
 * de la pantalla para él solo.
 */
export function StandingsTable(props: Props) {
  const { rows } = props;

  if (!rows.length) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Aún no hay jugadores en esta competición.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <Ficha key={row.participantId} row={row} {...props} />
        ))}
      </ul>

      <div className="table-wrap hidden sm:block">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-14">#</th>
              <th>Jugador</th>
              <th className="text-right">Pts</th>
              <th className="text-right"><Icono emoji="💀" /></th>
              {props.compact ? null : (
                <>
                  <th className="text-right">V-D</th>
                  <th className="text-right">Dif.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fila key={row.participantId} row={row} {...props} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * El puesto: medalla para los clasificados directos, número para el resto.
 * Los retirados no llevan puesto: ya no están compitiendo por él.
 */
function Puesto({
  position,
  qualifiedSlots,
}: {
  position: number;
  qualifiedSlots: number;
}) {
  if (position === 0) return <span title="Está fuera del locke">—</span>;
  if (position > qualifiedSlots) return <>{position}</>;
  return (
    <span title="Clasificado directo">
      {MEDALS[position - 1] ? <Icono emoji={MEDALS[position - 1]} /> : position}
    </span>
  );
}

/**
 * La flecha de lo que ha subido o bajado desde la jornada anterior. Quien se
 * queda igual no lleva nada: una columna de "=" no dice nada y ensucia.
 */
function Movimiento({
  participantId,
  movimientos,
}: {
  participantId: string;
  movimientos?: MovimientosEnLaTabla | null;
}) {
  const cambio = movimientos?.cambios[participantId] ?? 0;
  if (!cambio) return null;
  const sube = cambio > 0;
  const puestos = Math.abs(cambio);
  return (
    <span
      className={cx(
        "text-[10px] font-semibold leading-none tabular-nums",
        sube ? "text-emerald-400" : "text-rose-400",
      )}
      title={`${sube ? "Ha subido" : "Ha bajado"} ${puestos} ${
        puestos === 1 ? "puesto" : "puestos"
      } desde ${movimientos!.desde}`}
    >
      {sube ? "▲" : "▼"}
      {puestos}
    </span>
  );
}

/**
 * La chapa de quien está fuera. Dice **por qué**: no es lo mismo dejarlo que
 * que te barran el equipo y perder el locke.
 */
function Fuera({ motivo }: { motivo: string | null }) {
  const salida = comoEstaFuera({ retiredAt: new Date(), motivoDeSalida: motivo })!;
  return (
    <span
      className={cx(
        "ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        salida.color,
      )}
      title={salida.largo}
    >
      {salida.etiqueta}
    </span>
  );
}

/** Cuántas veces le han barrido el equipo, si ha pasado alguna. */
function Wipeos({ cuantos }: { cuantos: number }) {
  if (!cuantos) return null;
  return (
    <span
      className="ml-2 text-[11px] font-semibold text-red-400/90"
      title={`${cuantos} ${cuantos === 1 ? "wipeo" : "wipeos"}`}
    >
      <Icono emoji="💥" />{cuantos}
    </span>
  );
}

/**
 * La foto con el emoji del título en la esquina. En la tabla es lo único que
 * cabe del título, y en la ficha acompaña al nombre escrito.
 */
function FotoConTitulo({
  row,
  size,
}: {
  row: StandingRow;
  size: number;
}) {
  return (
    <span className="relative shrink-0">
      <Avatar
        name={row.displayName}
        color={row.color}
        image={row.avatarImage}
        size={size}
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
          {/* Sin emoji, una estrella: que se note que lleva algo */}
          {row.title.icon ?? "★"}
        </span>
      ) : null}
    </span>
  );
}

function ElAs({
  row,
  editableParticipantIds = [],
  size,
}: {
  row: StandingRow;
  editableParticipantIds?: string[];
  size: number;
}) {
  return (
    <AceBadge
      size={size}
      ace={{
        participantId: row.participantId,
        playerName: row.displayName,
        color: row.color,
        species: row.ace.species,
        nickname: row.ace.nickname,
        reason: row.ace.reason,
        image: row.ace.image,
        detailImage: row.ace.detailImage,
        editable: editableParticipantIds.includes(row.participantId),
      }}
    />
  );
}

function Ficha({
  row,
  highlightUserId,
  editableParticipantIds,
  qualifiedSlots = 2,
  compact = false,
  movimientos,
}: Props & { row: StandingRow }) {
  return (
    <li
      className={cx(
        "rounded-xl border p-2.5",
        row.userId === highlightUserId
          ? "border-brand-500/40 bg-brand-500/10"
          : "border-white/5 bg-white/[0.03]",
        row.retirado && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* La flecha va debajo del puesto y no al lado: en la ficha el ancho
            es para el nombre */}
        <span className="flex w-6 shrink-0 flex-col items-center gap-0.5 text-sm text-slate-400">
          <Puesto position={row.position} qualifiedSlots={qualifiedSlots} />
          <Movimiento participantId={row.participantId} movimientos={movimientos} />
        </span>
        <FotoConTitulo row={row} size={32} />
        <ElAs
          row={row}
          editableParticipantIds={editableParticipantIds}
          size={26}
        />
        {/* El nombre también lleva a su ficha: en la foto, de 32 píxeles, hay
            que acertar con el dedo, y el nombre es lo que se mira */}
        <EnlaceDeJugador
          participantId={row.participantId}
          name={row.displayName}
          className="min-w-0 flex-1"
        >
          <span
            className={cx(
              "min-w-0 truncate font-semibold text-white",
              row.retirado && "text-slate-400 line-through",
            )}
          >
            {row.displayName}
          </span>
        </EnlaceDeJugador>
        {row.retirado ? <Fuera motivo={row.motivoDeSalida} /> : null}
        <Wipeos cuantos={row.wipeos} />
      </div>

      {/* El título, en su propia línea y a todo el ancho de la ficha: aquí sí
          cabe escrito, que era el problema de la tabla */}
      {row.title ? (
        <div className="mt-2">
          <TitleBadge titulo={row.title} size="sm" wrap />
        </div>
      ) : null}

      {/*
        Las cifras, en una rejilla de columnas iguales. Todas las fichas usan la
        misma, así que **quedan alineadas de una a otra** como en la tabla, y
        cada una lleva su rótulo debajo: sueltas en una línea corrida se leían
        como una nota al pie y perdían el rango que tienen.
      */}
      <dl
        className={cx(
          "mt-2.5 grid divide-x divide-white/5 rounded-lg border border-white/5 bg-white/[0.03]",
          compact ? "grid-cols-2" : "grid-cols-4",
        )}
      >
        <Cifra valor={row.points} etiqueta="Pts" fuerte />
        <Cifra valor={row.deaths} etiqueta={<Icono emoji="💀" />} />
        {compact ? null : (
          <>
            <Cifra valor={`${row.wins}-${row.losses}`} etiqueta="V-D" />
            <Cifra
              valor={`${row.pokemonDiff > 0 ? "+" : ""}${row.pokemonDiff}`}
              etiqueta="Dif."
            />
          </>
        )}
      </dl>
    </li>
  );
}

/** Una cifra de la ficha, con su rótulo debajo. */
function Cifra({
  valor,
  etiqueta,
  fuerte = false,
}: {
  valor: string | number;
  etiqueta: React.ReactNode;
  /** Los puntos, que son lo que de verdad ordena la tabla */
  fuerte?: boolean;
}) {
  return (
    <div className="px-1 py-1.5 text-center">
      <dd
        className={cx(
          "tabular-nums leading-tight",
          fuerte ? "text-lg font-bold text-white" : "text-sm font-semibold text-slate-200",
        )}
      >
        {valor}
      </dd>
      <dt className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-500">
        {etiqueta}
      </dt>
    </div>
  );
}

function Fila({
  row,
  highlightUserId,
  editableParticipantIds,
  qualifiedSlots = 2,
  compact = false,
  movimientos,
}: Props & { row: StandingRow }) {
  return (
    <tr
      className={cx(
        row.userId === highlightUserId && "bg-brand-500/10",
        row.retirado && "opacity-60",
      )}
    >
      <td className="whitespace-nowrap text-slate-400">
        <Puesto position={row.position} qualifiedSlots={qualifiedSlots} />{" "}
        <Movimiento participantId={row.participantId} movimientos={movimientos} />
      </td>
      <td>
        <div className="flex items-center gap-2.5">
          <FotoConTitulo row={row} size={28} />
          <ElAs
            row={row}
            editableParticipantIds={editableParticipantIds}
            size={24}
          />
          <div className="min-w-0">
            <EnlaceDeJugador
              participantId={row.participantId}
              name={row.displayName}
            >
              <span
                className={cx(
                  "truncate font-medium text-white",
                  row.retirado && "text-slate-400 line-through",
                )}
              >
                {row.displayName}
              </span>
            </EnlaceDeJugador>
            {row.retirado ? <Fuera motivo={row.motivoDeSalida} /> : null}
        <Wipeos cuantos={row.wipeos} />
            {compact ? null : row.title ? (
              // Con tope de ancho y hasta dos líneas: un título largo se lee
              // entero sin estirar la columna del nombre
              <span className="inline-flex max-w-[20rem]">
                <TitleBadge titulo={row.title} size="sm" wrap />
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
      <td className="text-right tabular-nums text-slate-400">{row.deaths}</td>
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
  );
}
