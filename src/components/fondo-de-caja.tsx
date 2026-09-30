import { useId } from "react";
import type { FondoDeCaja } from "@/lib/fondos-de-caja";
import { cx } from "@/lib/utils";

/**
 * Los paisajes de las cajas del PC (ver `lib/fondos-de-caja.ts`).
 *
 * Dibujados a mano en SVG, sin imágenes: pesan nada y se escalan a cualquier
 * caja. El lienzo es de 120×100, la forma de la caja (6 columnas por 5 filas
 * de casillas cuadradas). Van **apagados a propósito**, con un velo oscuro
 * encima: son el fondo, y lo que se tiene que leer son los pokémon.
 */
export function FondoDeCajaDibujo({
  fondo,
  className,
}: {
  fondo: FondoDeCaja;
  className?: string;
}) {
  // Un id por dibujo: con varios iguales en la página (dos tableros, las
  // miniaturas) y uno escondido, el degradado del escondido dejaba sin color
  const id = `cielo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (fondo === "liso") return null;
  const escena = ESCENAS[fondo];
  return (
    <svg
      viewBox="0 0 120 100"
      preserveAspectRatio="xMidYMid slice"
      className={cx("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={escena.cielo[0]} />
          <stop offset="1" stopColor={escena.cielo[1]} />
        </linearGradient>
      </defs>
      <rect width="120" height="100" fill={`url(#${id})`} />
      {escena.dibujo}
      {/* El velo, que los sprites se lean encima de cualquier paisaje */}
      <rect width="120" height="100" fill="#05060a" opacity={escena.velo ?? 0.3} />
    </svg>
  );
}

/** Un pino de dos pisos, con la base en `y` */
function pino(x: number, y: number, alto: number, color: string, clave: string) {
  const ancho = alto * 0.55;
  return (
    <g key={clave} fill={color}>
      <path d={`M${x - ancho / 2} ${y}L${x} ${y - alto * 0.62}L${x + ancho / 2} ${y}Z`} />
      <path
        d={`M${x - ancho * 0.38} ${y - alto * 0.38}L${x} ${y - alto}L${x + ancho * 0.38} ${y - alto * 0.38}Z`}
      />
    </g>
  );
}

/** Puntos repartidos «al azar», pero siempre igual (que no bailen al refrescar) */
const PUNTOS: [number, number, number][] = [
  [8, 12, 0.8], [22, 6, 0.6], [35, 18, 0.9], [48, 9, 0.5], [61, 15, 0.7], [74, 5, 0.9],
  [88, 13, 0.6], [101, 8, 0.8], [113, 19, 0.5], [15, 28, 0.5], [42, 31, 0.7], [67, 27, 0.5],
  [94, 30, 0.7], [110, 36, 0.6], [4, 40, 0.6], [30, 44, 0.5], [56, 40, 0.8], [81, 45, 0.5],
];

const ESCENAS: Record<
  Exclude<FondoDeCaja, "liso">,
  { cielo: [string, string]; dibujo: React.ReactNode; velo?: number }
> = {
  bosque: {
    cielo: ["#3d6b58", "#1c3b30"],
    dibujo: (
      <>
        <path d="M0 62Q15 52 30 60T60 58T90 56T120 60V100H0Z" fill="#26493c" />
        {[6, 20, 37, 52, 70, 86, 103, 117].map((x, i) =>
          pino(x, 72 + (i % 2) * 3, 30 + (i % 3) * 6, "#1d3d31", `lejos-${i}`),
        )}
        <rect y="80" width="120" height="20" fill="#16301f" />
        {[0, 28, 62, 96].map((x, i) => pino(x + 8, 96, 44, "#12281c", `cerca-${i}`))}
        {PUNTOS.slice(0, 7).map(([x, y], i) => (
          <circle key={i} cx={x} cy={50 + (y % 30)} r="0.7" fill="#d9f99d" opacity={0.5} />
        ))}
      </>
    ),
  },
  pradera: {
    cielo: ["#5d84ab", "#9cc0c9"],
    dibujo: (
      <>
        <ellipse cx="30" cy="20" rx="14" ry="4" fill="#fff" opacity={0.25} />
        <ellipse cx="38" cy="17" rx="8" ry="4" fill="#fff" opacity={0.25} />
        <ellipse cx="92" cy="28" rx="12" ry="3.5" fill="#fff" opacity={0.2} />
        <ellipse cx="25" cy="78" rx="70" ry="28" fill="#5b8a4f" />
        <ellipse cx="100" cy="82" rx="60" ry="26" fill="#4d7a44" />
        <rect y="86" width="120" height="14" fill="#426b3a" />
        {PUNTOS.map(([x, y], i) => (
          <circle
            key={i}
            cx={x + 3}
            cy={72 + (y % 24)}
            r="1"
            fill={i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#fbcfe8" : "#fff"}
            opacity={0.7}
          />
        ))}
      </>
    ),
    velo: 0.4,
  },
  playa: {
    cielo: ["#4f86b8", "#a9cbe0"],
    dibujo: (
      <>
        <circle cx="96" cy="22" r="9" fill="#fde68a" opacity={0.7} />
        <rect y="52" width="120" height="22" fill="#2f79a6" />
        <path d="M0 58h14M24 62h20M56 57h16M84 63h24M10 68h18M66 69h14" stroke="#bfe3f5" strokeWidth="0.8" opacity={0.6} />
        <path d="M0 74Q30 66 60 72T120 70V100H0Z" fill="#c9ad79" />
        <path d="M0 82Q40 76 80 82T120 80V100H0Z" fill="#b89a66" />
        <path d="M18 90l2-2 2 2-2 2zM90 88l1.5-1.5 1.5 1.5-1.5 1.5z" fill="#f4a3a3" opacity={0.8} />
      </>
    ),
    velo: 0.42,
  },
  cueva: {
    cielo: ["#322c3c", "#1b1822"],
    dibujo: (
      <>
        <path
          d="M0 0H120V8L112 22L104 9L96 16L88 6L80 26L72 10L62 18L54 7L46 24L38 9L30 15L22 6L12 20L4 8L0 12Z"
          fill="#15121b"
        />
        <path d="M0 100V86L10 74L18 88L28 70L38 90L50 82L60 92L72 76L82 90L94 72L104 88L114 78L120 84V100Z" fill="#15121b" />
        {[
          [24, 50],
          [70, 40],
          [96, 58],
          [46, 64],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 4}L${x + 2.5} ${y}L${x} ${y + 4}L${x - 2.5} ${y}Z`} fill="#7dd3fc" opacity={0.55} />
        ))}
      </>
    ),
    velo: 0.2,
  },
  volcan: {
    cielo: ["#4c2323", "#26120f"],
    dibujo: (
      <>
        <ellipse cx="60" cy="30" rx="30" ry="16" fill="#f97316" opacity={0.12} />
        <path d="M14 100L48 36H72L106 100Z" fill="#1d100e" />
        <path d="M48 36Q60 30 72 36" stroke="#fb923c" strokeWidth="1.5" fill="none" opacity={0.8} />
        <path d="M58 37Q55 55 60 70T56 96M66 38Q70 52 67 64" stroke="#f97316" strokeWidth="1.4" fill="none" opacity={0.55} />
        <rect y="90" width="120" height="10" fill="#140b0a" />
        {PUNTOS.slice(0, 10).map(([x, y], i) => (
          <circle key={i} cx={40 + ((x * 0.4) % 40)} cy={8 + (y % 26)} r="0.8" fill="#fdba74" opacity={0.7} />
        ))}
      </>
    ),
    velo: 0.2,
  },
  nieve: {
    cielo: ["#5d7196", "#9fb2cf"],
    dibujo: (
      <>
        <path d="M0 70L22 38L38 58L58 30L82 62L98 42L120 66V100H0Z" fill="#c5d2e5" />
        <path d="M22 38L30 50L26 49L22 54L18 48ZM58 30L68 44L62 42L58 48L53 41ZM98 42L106 52L101 51L98 55L94 50Z" fill="#eef3fa" />
        <path d="M0 80Q30 72 60 80T120 78V100H0Z" fill="#e2e9f4" />
        {PUNTOS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y + 4} r={r} fill="#fff" opacity={0.75} />
        ))}
      </>
    ),
    velo: 0.5,
  },
  mar: {
    cielo: ["#1f6a93", "#0b2a45"],
    dibujo: (
      <>
        <path d="M20 0L30 0L10 100L-5 100ZM62 0L70 0L58 100L44 100ZM98 0L104 0L112 100L96 100Z" fill="#fff" opacity={0.05} />
        <path d="M0 88Q30 82 60 88T120 86V100H0Z" fill="#3a4b52" />
        {[12, 36, 84, 104].map((x, i) => (
          <path
            key={i}
            d={`M${x} 92Q${x - 4} ${80 - i * 2} ${x} ${70 - i * 3}T${x} ${48 + (i % 2) * 8}`}
            stroke="#2f8a63"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
        {PUNTOS.slice(0, 9).map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y + 20} r={r + 0.6} fill="none" stroke="#cdeefe" strokeWidth="0.5" opacity={0.45} />
        ))}
      </>
    ),
    velo: 0.2,
  },
  noche: {
    cielo: ["#0f1736", "#2a3570"],
    dibujo: (
      <>
        {PUNTOS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r * 0.7} fill="#fff" opacity={0.4 + (i % 3) * 0.2} />
        ))}
        {/* La luna en creciente: el trozo de un círculo que no tapa el otro */}
        <path d="M93.04 14.06A8 8 0 1 0 101.36 25.14A7 7 0 0 1 93.04 14.06Z" fill="#f1f5f9" opacity={0.85} />
        <path d="M0 78Q20 64 40 74T80 70T120 72V100H0Z" fill="#131b3c" />
        <path d="M0 88Q30 80 60 88T120 86V100H0Z" fill="#0c1230" />
      </>
    ),
    velo: 0.15,
  },
};
