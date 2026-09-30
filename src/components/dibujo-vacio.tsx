/**
 * Los dibujos de las pantallas vacías: línea fina gris, con un toque del color
 * del tema, para que «todavía no hay nada» no sea una caja con el borde a
 * rayas. Todos en el mismo lienzo y con el mismo trazo, así parecen de la
 * misma mano.
 *
 * Son SVG a mano, sin librería ni imágenes: pesan nada y cogen el color del
 * tema de cada edición (`--color-brand-400`).
 */

export type Dibujo =
  | "pokeball"
  | "lapida"
  | "caja"
  | "mochila"
  | "mapa"
  | "libreta"
  | "trofeo"
  | "espadas"
  | "ruleta";

const ACENTO = "var(--color-brand-400)";

export function DibujoVacio({ dibujo = "pokeball" }: { dibujo?: Dibujo }) {
  return (
    <svg
      viewBox="0 0 120 90"
      className="mx-auto h-20 w-auto text-slate-500/80"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Un halo suave detrás, que no flote en el vacío */}
      <circle cx="60" cy="47" r="34" fill={ACENTO} opacity={0.06} stroke="none" />
      {TRAZOS[dibujo]}
      {/* Dos destellos del color del tema */}
      <g stroke={ACENTO} strokeWidth={1.8}>
        <path d="M98 16v8M94 20h8" />
        <path d="M22 30v6M19 33h6" />
      </g>
    </svg>
  );
}

/** La línea del suelo, para lo que se tiene en pie */
const suelo = <path d="M26 80h30M62 80h6M74 80h20" opacity={0.6} />;

const TRAZOS: Record<Dibujo, React.ReactNode> = {
  pokeball: (
    <>
      <path d="M36 46a24 24 0 0 1 48 0z" fill={ACENTO} opacity={0.18} stroke="none" />
      <circle cx="60" cy="46" r="24" />
      <path d="M36 46h17M67 46h17" />
      <circle cx="60" cy="46" r="7" />
      <circle cx="60" cy="46" r="2.2" fill={ACENTO} stroke="none" />
    </>
  ),
  lapida: (
    <>
      <path d="M42 80V46a18 18 0 0 1 36 0v34" />
      <circle cx="60" cy="50" r="7.5" stroke={ACENTO} />
      <path d="M52.5 50h15" stroke={ACENTO} />
      <path d="M50 66h20" opacity={0.6} />
      <path d="M32 80l3-7 3 7M82 80l3-7 3 7" />
      {suelo}
    </>
  ),
  caja: (
    <>
      <rect x="28" y="24" width="64" height="50" rx="6" />
      <path d="M28 36h64" />
      <path d="M50 30h20" opacity={0.6} />
      {[0, 1, 2, 3].map((columna) =>
        [0, 1].map((fila) => (
          <rect
            key={`${columna}-${fila}`}
            x={35 + columna * 13}
            y={43 + fila * 13}
            width="11"
            height="10"
            rx="2"
            // Uno ocupado, del color del tema: una caja con algo dentro
            {...(columna === 1 && fila === 0
              ? { fill: ACENTO, stroke: ACENTO, opacity: 0.5 }
              : { opacity: 0.55 })}
          />
        )),
      )}
    </>
  ),
  mochila: (
    <>
      <path d="M53 26v-4a7 7 0 0 1 14 0v4" />
      <path d="M40 46a20 20 0 0 1 40 0v28a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6z" />
      <rect x="48" y="56" width="24" height="16" rx="4" />
      <path d="M48 62h24" stroke={ACENTO} />
      <path d="M40 54h-4v14h4M80 54h4v14h-4" opacity={0.6} />
      {suelo}
    </>
  ),
  mapa: (
    <>
      <path d="M28 30l21-7 22 7 21-7v48l-21 7-22-7-21 7z" />
      <path d="M49 23v48M71 30v48" opacity={0.6} />
      <path d="M36 62c6-2 9-12 17-10s10 8 17 2" strokeDasharray="3 4" />
      <path
        d="M76 36c0-5 3.6-8 8-8s8 3 8 8c0 6-8 13-8 13s-8-7-8-13z"
        stroke={ACENTO}
      />
      <circle cx="84" cy="36" r="2.4" fill={ACENTO} stroke="none" />
    </>
  ),
  libreta: (
    <>
      <rect x="38" y="18" width="44" height="60" rx="5" />
      {[28, 40, 52, 64].map((y) => (
        <circle key={y} cx="38" cy={y} r="2.6" fill="var(--color-ink-900, #0b0b0e)" />
      ))}
      <path d="M48 32h24M48 42h24M48 52h14" opacity={0.6} />
      <path d="M72 74l16-16 5 5-16 16h-5z" stroke={ACENTO} />
      <path d="M84 62l5 5" stroke={ACENTO} />
    </>
  ),
  trofeo: (
    <>
      <path d="M44 22h32v16a16 16 0 0 1-32 0z" />
      <path d="M44 27h-7v5a10 10 0 0 0 10 10M76 27h7v5a10 10 0 0 1-10 10" />
      <path d="M60 54v9" />
      <path d="M50 63h20v9H50z" />
      <path
        d="M60 29l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z"
        stroke={ACENTO}
        fill={ACENTO}
        fillOpacity={0.2}
        strokeWidth={1.5}
      />
      {suelo}
    </>
  ),
  espadas: (
    <>
      {/* Dos espadas cruzadas, como un combate por empezar */}
      <path d="M40 66l40-40 4-2-2 4-40 40" />
      <path d="M40 58l10 10M37 69l-5 5" />
      <path d="M80 66L40 26l-4-2 2 4 40 40" />
      <path d="M80 58L70 68M83 69l5 5" />
      <path d="M60 14v6M53 17l3 3M67 17l-3 3" stroke={ACENTO} />
    </>
  ),
  ruleta: (
    <>
      <circle cx="60" cy="50" r="26" />
      <path d="M34 50h52M47 27.5l26 45M73 27.5l-26 45" opacity={0.55} />
      <path d="M60 50L73 27.5A26 26 0 0 1 86 50z" fill={ACENTO} opacity={0.18} stroke="none" />
      <circle cx="60" cy="50" r="4.5" fill={ACENTO} stroke="none" />
      <path d="M55 17h10l-5 8z" fill={ACENTO} stroke={ACENTO} />
    </>
  ),
};
