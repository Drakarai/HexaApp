"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  iconoDeCaja,
  pokemonDeLaImagen,
  spriteQuietoDeQuinta,
  spritesDeQuinta,
  type EstiloDeSprites,
} from "@/lib/sprites-de-quinta";
import { cx } from "@/lib/utils";

/** El estilo de sprites de quien mira: lo pone el layout, leído de su cookie */
const Estilo = createContext<EstiloDeSprites>("quinta");

export function ProveedorDeSprites({ estilo, children }: { estilo: EstiloDeSprites; children: React.ReactNode }) {
  return <Estilo.Provider value={estilo}>{children}</Estilo.Provider>;
}

export function useEstiloDeSprites() {
  return useContext(Estilo);
}

/**
 * Los sprites de Blanco y Negro van en un lienzo de 96×96 en el que el
 * pokémon ocupa a veces un tercio: en una casilla salían diminutos al lado de
 * los de HOME, que llenan la suya. Así que se **recortan** al pokémon (con un
 * margen de 2 píxeles) en un lienzo y se pinta el recorte. Cada uno se recorta
 * una vez por visita y se reusa. Se puede porque GitHub los sirve con CORS
 * abierto; si algo falla, se queda el sprite tal cual.
 */
const recortes = new Map<string, string | null>();
const recortando = new Map<string, Promise<string | null>>();

/**
 * Los iconos de caja se recortan con un lado mínimo: en los juegos un Pikachu
 * es la mitad que un Charizard, y recortados al justo salían los dos igual de
 * grandes (y el pequeño, con los píxeles como puños).
 */
const LADO_MINIMO_DE_ICONO = 26;

function recortar(url: string): Promise<string | null> {
  const minimo = url.includes("/icons/") ? LADO_MINIMO_DE_ICONO : 0;
  if (recortes.has(url)) return Promise.resolve(recortes.get(url) ?? null);
  let pedido = recortando.get(url);
  if (!pedido) {
    pedido = new Promise<string | null>((resolver) => {
      const imagen = new Image();
      imagen.crossOrigin = "anonymous";
      imagen.onload = () => {
        try {
          const { naturalWidth: ancho, naturalHeight: alto } = imagen;
          const lienzo = document.createElement("canvas");
          lienzo.width = ancho;
          lienzo.height = alto;
          const ctx = lienzo.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolver(null);
          ctx.drawImage(imagen, 0, 0);
          const { data } = ctx.getImageData(0, 0, ancho, alto);
          let x0 = ancho, y0 = alto, x1 = -1, y1 = -1;
          for (let y = 0; y < alto; y++) {
            for (let x = 0; x < ancho; x++) {
              if (data[(y * ancho + x) * 4 + 3] > 0) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
              }
            }
          }
          if (x1 < 0) return resolver(null);
          // Cuadrado, para que object-contain lo deje centrado y sin deformar
          const lado = Math.max(x1 - x0 + 1 + 4, y1 - y0 + 1 + 4, minimo);
          const recorte = document.createElement("canvas");
          recorte.width = lado;
          recorte.height = lado;
          const rctx = recorte.getContext("2d");
          if (!rctx) return resolver(null);
          rctx.imageSmoothingEnabled = false;
          rctx.drawImage(
            imagen,
            Math.round((lado - (x1 - x0 + 1)) / 2) - x0,
            Math.round((lado - (y1 - y0 + 1)) / 2) - y0,
          );
          resolver(recorte.toDataURL("image/png"));
        } catch {
          resolver(null);
        }
      };
      imagen.onerror = () => resolver(null);
      imagen.src = url;
    }).then((hecho) => {
      recortes.set(url, hecho);
      recortando.delete(url);
      return hecho;
    });
    recortando.set(url, pedido);
  }
  return pedido;
}

/**
 * El sprite de un pokémon, en el estilo que toca:
 *
 * - En la **ficha** de un pokémon (`ficha`), siempre al estilo de Blanco y
 *   Negro, animado si lo hay: es donde se mira de cerca.
 * - En el resto (casillas, equipos, listas), el **quieto** de Blanco y Negro,
 *   o lo que se haya elegido en Mi perfil: el icono de caja o el de HOME.
 *
 * Se le pasa la imagen guardada de siempre y de su dirección saca qué pokémon
 * es (ver `pokemonDeLaImagen`), así que vale en cualquier sitio sin tocar lo
 * que se guarda. Si la de Blanco y Negro no carga, o la imagen no dice qué
 * pokémon es, se queda con la guardada. Como el estilo llega del servidor en
 * la primera pintada, no se ve el cambio de una a otra.
 */
export function SpritePokemon({
  src,
  alt,
  className,
  ficha = false,
  quieto = false,
  sinIconos = false,
  pokemonId,
  shiny,
  ...resto
}: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  alt: string;
  ficha?: boolean;
  /** En la ficha, el quieto aunque haya animado (mientras evoluciona) */
  quieto?: boolean;
  /**
   * Nunca el icono de caja aunque se haya elegido: en el cementerio queda más
   * bonito el sprite de Blanco y Negro, que es un recuerdo y no un PC
   */
  sinIconos?: boolean;
  /** Si se sabe por otro lado (una captura), manda sobre lo que diga la imagen */
  pokemonId?: number | null;
  shiny?: boolean;
}) {
  const estilo = useEstiloDeSprites();
  const deLaImagen = pokemonDeLaImagen(src);
  const id = pokemonId ?? deLaImagen?.pokemonId ?? null;
  const variocolor = shiny ?? deLaImagen?.shiny ?? false;

  const candidatas = [
    ...(id && ficha ? (quieto ? [spriteQuietoDeQuinta(id, variocolor)] : spritesDeQuinta(id, variocolor)) : []),
    ...(id && !ficha && !sinIconos && estilo === "iconos" ? [iconoDeCaja(id)].filter((c) => c !== null) : []),
    // También detrás del icono, para los que no lo tienen (Hisui y Paldea)
    ...(id && !ficha && estilo !== "home" ? [spriteQuietoDeQuinta(id, variocolor)] : []),
    ...(src ? [src] : []),
  ];
  // Las que no han cargado, por dirección: si cambia de pokémon, las suyas empiezan de cero
  const [fallidas, setFallidas] = useState<string[]>([]);
  const actual = candidatas.find((c) => !fallidas.includes(c));
  const pixelado = Boolean(actual?.includes("black-white") || actual?.includes("/icons/"));
  // Los quietos de Blanco y Negro y los iconos, recortados; en la ficha no, que el animado
  // no se puede recortar y el quieto de respaldo tiene que verse igual que él
  const aRecortar = pixelado && !ficha && actual?.endsWith(".png") ? actual : null;
  const [recorte, setRecorte] = useState<{ de: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!aRecortar) return;
    let sigue = true;
    void recortar(aRecortar).then((url) => {
      if (sigue) setRecorte({ de: aRecortar, url });
    });
    return () => {
      sigue = false;
    };
  }, [aRecortar]);

  if (!actual) return null;
  const listo = aRecortar
    ? recorte?.de === aRecortar
      ? recorte
      : recortes.has(aRecortar)
        ? { de: aRecortar, url: recortes.get(aRecortar) ?? null }
        : null
    : null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={actual}
      {...resto}
      src={listo?.url ?? actual}
      alt={alt}
      onError={() => setFallidas((antes) => [...antes, actual])}
      className={cx(
        className,
        pixelado && "[image-rendering:pixelated]",
        // Hasta tener el recorte, invisible: si no, se ve en pequeño y luego crece
        aRecortar && !listo && "opacity-0",
      )}
    />
  );
}
