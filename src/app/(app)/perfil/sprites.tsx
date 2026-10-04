"use client";

import { useRouter } from "next/navigation";
import { SpritePokemon, useEstiloDeSprites } from "@/components/sprite-pokemon";
import { spriteQuietoDeQuinta, COOKIE_DE_SPRITES, type EstiloDeSprites } from "@/lib/sprites-de-quinta";
import { cx } from "@/lib/utils";

const OPCIONES: { valor: EstiloDeSprites; nombre: string; detalle: string }[] = [
  {
    valor: "quinta",
    nombre: "Blanco y Negro",
    detalle: "En 2D, como en la DS. Los de después, dibujados al mismo estilo.",
  },
  { valor: "home", nombre: "HOME", detalle: "Los modelos en 3D de ahora." },
];

/**
 * Cómo se ven los pokémon en cajas, equipos y listas. Va en una cookie y no
 * en localStorage porque el servidor la necesita para pintar la página ya con
 * los buenos: si no, cada carga saldría con unos y cambiaría a los otros.
 */
export function PreferenciaDeSpritesPicker({ muestra }: { muestra: number }) {
  const router = useRouter();
  const actual = useEstiloDeSprites();

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          aria-pressed={actual === opcion.valor}
          onClick={() => {
            document.cookie = `${COOKIE_DE_SPRITES}=${opcion.valor}; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
          className={cx(
            "flex items-center gap-3 rounded-xl border p-3 text-left transition",
            actual === opcion.valor
              ? "border-brand-400/60 bg-brand-600/15"
              : "border-white/10 bg-white/[0.02] hover:border-white/20",
          )}
        >
          {/* La muestra va fija con cada estilo, no con el elegido */}
          <SpritePokemon
            src={
              opcion.valor === "quinta"
                ? spriteQuietoDeQuinta(muestra, false)
                : // A mano y no con lib/pokedex, que arrastraría la Pokédex entera al navegador
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${muestra}.png`
            }
            alt=""
            className="h-14 w-14 shrink-0 object-contain"
          />
          <span>
            <span className="block text-sm font-semibold text-white">{opcion.nombre}</span>
            <span className="mt-0.5 block text-xs text-slate-400">{opcion.detalle}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
