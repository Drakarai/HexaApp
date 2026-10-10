import {
  Archive,
  Bug,
  Lightbulb,
  MessageSquareText,
  RefreshCw,
  Backpack,
  Bomb,
  BookOpen,
  BookOpenText,
  Brush,
  CalendarDays,
  ChartNoAxesColumn,
  Circle,
  CircleCheck,
  CircleHelp,
  CircleMinus,
  CirclePlus,
  ClipboardList,
  Clapperboard,
  CloudUpload,
  Compass,
  Crosshair,
  Crown,
  Dices,
  Download,
  DoorOpen,
  Eye,
  EyeOff,
  Feather,
  FerrisWheel,
  Flame,
  Flag,
  FolderKanban,
  Gamepad2,
  Ghost,
  Gift,
  Handshake,
  HeartPulse,
  Hourglass,
  House,
  ImagePlus,
  KeyRound,
  Lock,
  Map,
  MapPinned,
  Medal,
  Newspaper,
  NotebookPen,
  Package,
  Palette,
  PenLine,
  Pencil,
  Pin,
  Play,
  Trash2,
  ScrollText,
  Search,
  Settings,
  Shield,
  Skull,
  Sparkles,
  Star,
  Stethoscope,
  StickyNote,
  Swords,
  Tent,
  Ticket,
  Trophy,
  UserRound,
  Users,
  WifiOff,
  Wrench,
  Zap,
  Undo2,
  Share2,
  Link2,
  Link2Off,
  Dna,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/utils";

type Linea = {
  icono: LucideIcon;
  /**
   * Color propio, para los emojis que **dicen algo con el suyo**: la medalla
   * de oro no es la de bronce, y la corona y el trofeo son dorados. Los demás
   * toman el color del texto que los rodea.
   */
  color?: string;
  /** Relleno en vez de solo trazo (la chincheta puesta, el punto de "en curso") */
  relleno?: boolean;
};

const ORO = "text-amber-400";

/**
 * El icono de línea de cada emoji en el **aspecto de ahora** (ver
 * `lib/estilo.ts`). Lo que no esté aquí se queda en emoji en los dos aspectos:
 * por ejemplo, el icono que cada uno elige para sus títulos, que es suyo.
 */
const LINEA: Record<string, Linea> = {
  // El menú
  "🏠": { icono: House },
  "💀": { icono: Skull },
  "📊": { icono: ChartNoAxesColumn },
  "🎡": { icono: FerrisWheel },
  "📅": { icono: CalendarDays },
  "🔥": { icono: Flame },
  "🎁": { icono: Gift },
  "🏆": { icono: Trophy, color: ORO },
  "🏅": { icono: Medal, color: ORO },
  "👑": { icono: Crown, color: ORO },
  "📰": { icono: Newspaper },
  "📜": { icono: ScrollText },
  "🎯": { icono: Crosshair },
  "🎒": { icono: Backpack },
  "🗺️": { icono: Map },
  "🗒️": { icono: NotebookPen },
  "👤": { icono: UserRound },
  "❓": { icono: CircleHelp },
  "🗂️": { icono: FolderKanban },
  "⚙️": { icono: Settings },
  "⚙": { icono: Settings },
  "⚔️": { icono: Swords },
  "📚": { icono: BookOpen },
  "📍": { icono: MapPinned },
  // El Soul Link: el vínculo, romperlo, evolucionar y cambiar de sitio
  "🔗": { icono: Link2 },
  "⛓️‍💥": { icono: Link2Off },
  "🧬": { icono: Dna },
  "🔁": { icono: ArrowRightLeft },
  // Medallas del podio y de la tabla
  "🥇": { icono: Medal, color: "text-amber-400" },
  "🥈": { icono: Medal, color: "text-slate-300" },
  "🥉": { icono: Medal, color: "text-orange-400" },
  "⭐": { icono: Star, color: ORO, relleno: true },
  // Estados
  "🟢": { icono: Circle, color: "text-emerald-400", relleno: true },
  "🗄️": { icono: Archive },
  "⏳": { icono: Hourglass },
  "🔒": { icono: Lock },
  "✅": { icono: CircleCheck, color: "text-emerald-400" },
  "📴": { icono: WifiOff },
  "⏫": { icono: CloudUpload },
  // Salidas del locke
  "💥": { icono: Bomb, color: "text-red-400" },
  "🚪": { icono: DoorOpen },
  "🪦": { icono: Ghost },
  "🛡️": { icono: Shield },
  "☠️": { icono: Skull, color: "text-red-400" },
  // Combates
  "🏳️": { icono: Flag },
  "🏁": { icono: Flag },
  "🤝": { icono: Handshake },
  // Revivir: un pokémon que vuelve del cementerio
  "💊": { icono: HeartPulse },
  "🤼": { icono: Users },
  "🎨": { icono: Palette },
  "🗳️": { icono: ClipboardList },
  "📋": { icono: ClipboardList },
  "⚡": { icono: Zap, color: ORO },
  "🎬": { icono: Clapperboard },
  "🎲": { icono: Dices },
  "🎟️": { icono: Ticket },
  "➕": { icono: CirclePlus, color: "text-emerald-400" },
  "➖": { icono: CircleMinus, color: "text-rose-400" },
  // Escribir y apuntar
  "✍️": { icono: PenLine },
  "✏️": { icono: Pencil },
  "🆕": { icono: Sparkles },
  "📝": { icono: StickyNote },
  "📌": { icono: Pin, color: ORO, relleno: true },
  "📦": { icono: Package },
  "✨": { icono: Sparkles },
  "🖼️": { icono: ImagePlus },
  "⬇️": { icono: Download },
  "↩️": { icono: Undo2 },
  "📤": { icono: Share2 },
  "👁": { icono: Eye },
  "🚫": { icono: EyeOff },
  // Gestión
  "🔍": { icono: Search },
  "🩺": { icono: Stethoscope },
  "🎪": { icono: Tent },
  "🔑": { icono: KeyRound },
  "🎮": { icono: Gamepad2 },
  "🧹": { icono: Brush },
  "🪶": { icono: Feather },
  "📖": { icono: BookOpenText },
  "🛠️": { icono: Wrench },
  "🧭": { icono: Compass },
  "▶️": { icono: Play },
  "🗑️": { icono: Trash2 },
  "❔": { icono: CircleHelp },
  // HexaPost y lo que se manda en él
  "💬": { icono: MessageSquareText },
  "🐞": { icono: Bug },
  "💡": { icono: Lightbulb, color: ORO },
  "🔄": { icono: RefreshCw },
};

/**
 * Un icono que **se pinta de las dos formas a la vez**: el emoji de siempre y
 * su icono de línea. El CSS del aspecto elegido esconde uno de los dos
 * (`.icono-emoji` / `.icono-linea` en `globals.css`), así que ningún
 * componente tiene que saber qué aspecto lleva quien mira, y el clásico se
 * queda exactamente como estaba.
 *
 * Por defecto mide como la letra que lo rodea, para ir dentro de un texto
 * ("🏆 Terminado"); en los menús se le pasa un tamaño fijo.
 */
export function Icono({
  emoji,
  className,
  tamano = "1.15em",
  sinColor = false,
}: {
  emoji: string;
  className?: string;
  /** Tamaño del icono de línea: píxeles, o `em` para seguir al texto */
  tamano?: number | string;
  /** Sin el color propio del emoji: cuando lo que lo rodea ya lleva el suyo */
  sinColor?: boolean;
}) {
  const linea = LINEA[emoji] ?? LINEA[emoji.replace(/️/g, "")] ?? LINEA[`${emoji}️`];
  if (!linea) return <span className={className}>{emoji}</span>;
  const Dibujo = linea.icono;
  return (
    <>
      <span className={cx("icono-emoji", className)} aria-hidden>
        {emoji}
      </span>
      <Dibujo
        className={cx("icono-linea", !sinColor && linea.color, className)}
        size={tamano}
        strokeWidth={1.9}
        fill={linea.relleno ? "currentColor" : "none"}
        aria-hidden
      />
    </>
  );
}
