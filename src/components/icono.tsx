import {
  Backpack,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  CircleHelp,
  Crosshair,
  Crown,
  FerrisWheel,
  Flame,
  FolderKanban,
  Gift,
  House,
  Map,
  MapPinned,
  Medal,
  Newspaper,
  NotebookPen,
  ScrollText,
  Settings,
  Skull,
  Swords,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/utils";

/**
 * El icono de cada emoji del menú en el **aspecto nuevo** (ver
 * `lib/estilo.ts`). Un emoji por icono de línea, y lo que no esté aquí se
 * queda en emoji en los dos aspectos.
 */
const LINEA: Record<string, LucideIcon> = {
  "🏠": House,
  "💀": Skull,
  "📊": ChartNoAxesColumn,
  "🎡": FerrisWheel,
  "📅": CalendarDays,
  "🔥": Flame,
  "🎁": Gift,
  "🏆": Trophy,
  "🏅": Medal,
  "👑": Crown,
  "📰": Newspaper,
  "📜": ScrollText,
  "🎯": Crosshair,
  "🎒": Backpack,
  "🗺️": Map,
  "🗒️": NotebookPen,
  "👤": UserRound,
  "❓": CircleHelp,
  "🗂️": FolderKanban,
  "⚙️": Settings,
  "⚔️": Swords,
  "📚": BookOpen,
  "📍": MapPinned,
};

/**
 * Un icono del menú que **se pinta de las dos formas a la vez**: el emoji de
 * siempre y su icono de línea. El CSS del aspecto elegido esconde uno de los
 * dos (`.icono-emoji` / `.icono-linea` en `globals.css`), así que ningún
 * componente tiene que saber qué aspecto lleva quien mira, y el clásico se
 * queda exactamente como estaba.
 */
export function Icono({
  emoji,
  className,
  tamano = 18,
}: {
  emoji: string;
  className?: string;
  /** Tamaño del icono de línea, en píxeles */
  tamano?: number;
}) {
  const Linea = LINEA[emoji];
  if (!Linea) return <span className={className}>{emoji}</span>;
  return (
    <>
      <span className={cx("icono-emoji", className)}>{emoji}</span>
      <Linea
        className={cx("icono-linea", className)}
        size={tamano}
        strokeWidth={1.9}
        aria-hidden
      />
    </>
  );
}
