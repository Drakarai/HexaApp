"use client";

import { useRouter } from "next/navigation";
import { SpritePokemon, useEstiloDeSprites } from "@/components/sprite-pokemon";
import {
  COOKIE_DE_SPRITES,
  iconoDeCaja,
  spriteQuietoDeQuinta,
  type EstiloDeSprites,
} from "@/lib/sprites-de-quinta";
import { cx } from "@/lib/utils";

const OPCIONES: { valor: EstiloDeSprites; nombre: string; detalle: string }[] = [
  {
    valor: "quinta",
    nombre: "Blanco y Negro",
    detalle: "En 2D, como en la DS. Los de después, dibujados al mismo estilo.",
  },
  {
    valor: "iconos",
    nombre: "Iconos de caja",
    detalle: "Los muñequitos del PC. Debajo eliges cuáles.",
  },
  { valor: "home", nombre: "HOME", detalle: "Los modelos en 3D de ahora." },
];

/** Los dos estilos de iconos de caja (ver `iconoDeCaja`) */
const ICONOS: { valor: EstiloDeSprites; nombre: string; detalle: string }[] = [
  {
    valor: "iconos",
    nombre: "Espada y Escudo",
    detalle: "Los de la 8ª, con más detalle; los que no tiene, de la comunidad. Sin shiny.",
  },
  {
    valor: "iconos-todos",
    nombre: "Todos iguales",
    detalle: "Todos al estilo de la 7ª, de la comunidad de Pokémon Essentials. Con shiny.",
  },
];

function elegir(valor: EstiloDeSprites) {
  document.cookie = `${COOKIE_DE_SPRITES}=${valor}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Cómo se ven los pokémon en cajas, equipos y listas. Va en una cookie y no
 * en localStorage porque el servidor la necesita para pintar la página ya con
 * los buenos: si no, cada carga saldría con unos y cambiaría a los otros.
 */
export function PreferenciaDeSpritesPicker({ muestra }: { muestra: number }) {
  const router = useRouter();
  const actual = useEstiloDeSprites();
  // Los dos de iconos cuentan como «Iconos de caja»: lo de cuáles va debajo
  const conIconos = actual === "iconos" || actual === "iconos-todos";
  const marcada = (valor: EstiloDeSprites) => (valor === "iconos" ? conIconos : actual === valor);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={marcada(opcion.valor)}
            onClick={() => {
              // Volver a tocar «Iconos de caja» no cambia cuáles se eligieron
              if (opcion.valor === "iconos" && conIconos) return;
              elegir(opcion.valor);
              router.refresh();
            }}
            className={cx(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition sm:flex-col sm:items-start",
              marcada(opcion.valor)
                ? "border-brand-400/60 bg-brand-600/15"
                : "border-white/10 bg-white/[0.02] hover:border-white/20",
            )}
          >
            {/* La muestra va fija con cada estilo, no con el elegido */}
            <SpritePokemon
              src={
                opcion.valor === "quinta"
                  ? spriteQuietoDeQuinta(muestra, false)
                  : opcion.valor === "iconos"
                    ? iconoDeCaja(muestra, false, actual === "iconos-todos")
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
      {conIconos ? (
        <div role="radiogroup" aria-label="Qué iconos de caja" className="grid grid-cols-2 gap-2">
          {ICONOS.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={actual === opcion.valor}
              onClick={() => {
                elegir(opcion.valor);
                router.refresh();
              }}
              className={cx(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                actual === opcion.valor
                  ? "border-brand-400/60 bg-brand-600/15"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20",
              )}
            >
              {/* La muestra, normal y shiny: en Espada y Escudo los dos salen igual */}
              <span className="flex gap-1">
                {[false, true].map((shiny) => (
                  <SpritePokemon
                    key={String(shiny)}
                    src={iconoDeCaja(muestra, shiny, opcion.valor === "iconos-todos")}
                    alt=""
                    className="h-10 w-10 object-contain"
                  />
                ))}
              </span>
              <span className="block text-sm font-semibold text-white">{opcion.nombre}</span>
              <span className="block text-xs text-slate-400">{opcion.detalle}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
