"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { spinRouletteAction } from "@/app/actions/roulette";
import { readableTextColor } from "@/lib/utils";

export type WheelOption = {
  id: string;
  label: string;
  color: string;
  weight: number;
};

const RADIUS = 100;

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  // 0º = arriba, sentido horario
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

export function RouletteWheel({
  rouletteId,
  options,
  spinSeconds,
  canSpin,
}: {
  rouletteId: string;
  options: WheelOption[];
  spinSeconds: number;
  canSpin: boolean;
}) {
  const router = useRouter();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalWeight = options.reduce(
    (sum, option) => sum + Math.max(1, option.weight),
    0,
  );

  // Ángulos acumulados de cada sector (en grados, desde arriba y en horario)
  const sectors: Array<{ option: WheelOption; start: number; end: number }> = [];
  let cursor = 0;
  for (const option of options) {
    const sweep = (Math.max(1, option.weight) / totalWeight) * 360;
    sectors.push({ option, start: cursor, end: cursor + sweep });
    cursor += sweep;
  }

  async function handleSpin() {
    if (spinning || !options.length) return;
    setSpinning(true);
    setResult(null);
    setError(null);

    const outcome = await spinRouletteAction(rouletteId);

    if (!outcome.ok) {
      setError(outcome.error);
      setSpinning(false);
      return;
    }

    const sector = sectors[outcome.index] ?? sectors[0];
    const center = (sector.start + sector.end) / 2;
    // Giramos varias vueltas y aterrizamos con el centro del sector arriba
    const currentOffset = ((rotation % 360) + 360) % 360;
    const target = ((360 - center - currentOffset) % 360 + 360) % 360;
    const next = rotation + 360 * 5 + target;

    setRotation(next);

    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      setResult(outcome.label);
      setSpinning(false);
      router.refresh();
    }, spinSeconds * 1000);
  }

  if (!options.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
        Esta ruleta no tiene opciones activas.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[320px]">
        <div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 text-2xl drop-shadow"
          aria-hidden
        >
          ▼
        </div>
        <svg
          viewBox="-110 -110 220 220"
          className="roulette-wheel w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: `${spinSeconds}s`,
          }}
          role="img"
          aria-label="Ruleta"
        >
          <circle r={RADIUS + 6} fill="#0b1020" stroke="#2c3855" strokeWidth={3} />
          {sectors.length === 1 ? (
            <circle r={RADIUS} fill={sectors[0].option.color} />
          ) : (
            sectors.map(({ option, start, end }) => {
              const from = polar(start, RADIUS);
              const to = polar(end, RADIUS);
              const largeArc = end - start > 180 ? 1 : 0;
              return (
                <path
                  key={option.id}
                  d={`M 0 0 L ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y} Z`}
                  fill={option.color}
                  stroke="#0b1020"
                  strokeWidth={0.8}
                />
              );
            })
          )}
          {sectors.map(({ option, start, end }) => {
            const mid = (start + end) / 2;
            const sweep = end - start;
            if (sweep < 8) return null;
            // El texto se escribe a lo largo del radio; en la mitad izquierda
            // se voltea para que no quede del revés.
            const flipped = mid > 180;
            return (
              <g
                key={`label-${option.id}`}
                transform={`rotate(${mid}) translate(0 ${-RADIUS * 0.58}) rotate(${
                  flipped ? 90 : -90
                })`}
              >
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={sweep < 22 ? 6 : 7.5}
                  fontWeight={700}
                  fill={readableTextColor(option.color)}
                >
                  {option.label.length > 18
                    ? `${option.label.slice(0, 17)}…`
                    : option.label}
                </text>
              </g>
            );
          })}
          <circle r={12} fill="#10162b" stroke="#2c3855" strokeWidth={2} />
        </svg>
      </div>

      <div className="mt-5 w-full text-center">
        {canSpin ? (
          <button
            type="button"
            className="btn-primary w-full max-w-xs"
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? "Girando…" : "🎡 Girar la ruleta"}
          </button>
        ) : (
          <p className="muted">Solo los administradores pueden girar.</p>
        )}

        {result ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-lg font-bold text-emerald-200">
            {result}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
