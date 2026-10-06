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
import tiras from "@/lib/sprites-animados.json";

/**
 * Los animados **en tira** del paquete de la comunidad de Pokémon Essentials
 * («Animated Pokemon System»): del #650 en adelante y las formas, que en el
 * estilo de Blanco y Negro de PokéAPI estaban a medias (Paldea, casi sin
 * ninguno). Van en `public/sprites-animados` y los genera
 * `scripts/sprites-animados.py`. Del #1 al #649 se usan los oficiales.
 */
const CON_TIRA = {
  normal: new Set<number>(tiras.normal),
  shiny: new Set<number>(tiras.shiny),
  // El shiny es el normal con otros colores: se repinta (ver `TiraAnimada`)
  colores: new Set<number>(tiras.colores),
};

/** Lo que va detrás de `#` en una tira que hay que repintar de shiny */
const REPINTAR = "#colores";

function tiraAnimada(pokemonId: number, shiny: boolean): string | null {
  if (!shiny) return CON_TIRA.normal.has(pokemonId) ? `/sprites-animados/${pokemonId}.png` : null;
  if (CON_TIRA.shiny.has(pokemonId)) return `/sprites-animados/shiny/${pokemonId}.png`;
  return CON_TIRA.colores.has(pokemonId) ? `/sprites-animados/${pokemonId}.png${REPINTAR}` : null;
}

/**
 * El shiny de una tira que solo cambia de colores: se pinta el normal en un
 * lienzo, se cambia cada color por el suyo (`shiny/<id>.json`, «rrggbb» →
 * «rrggbb») y se usa el resultado. Así de nueve de cada diez shiny se guardan
 * unos cientos de bytes en vez de la imagen entera. Uno por visita.
 */
const repintadas = new Map<string, Promise<string | null>>();

function repintar(src: string): Promise<string | null> {
  let pedido = repintadas.get(src);
  if (!pedido) {
    const imagen = src.slice(0, -REPINTAR.length);
    const id = /\/(\d+)\.png$/.exec(imagen)?.[1];
    pedido = Promise.all([
      new Promise<HTMLImageElement>((resolver, fallar) => {
        const img = new Image();
        img.onload = () => resolver(img);
        img.onerror = fallar;
        img.src = imagen;
      }),
      fetch(`/sprites-animados/shiny/${id}.json`).then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : null)),
    ])
      .then(([img, colores]) => {
        if (!colores) return null;
        const lienzo = document.createElement("canvas");
        lienzo.width = img.naturalWidth;
        lienzo.height = img.naturalHeight;
        const ctx = lienzo.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0);
        const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
        const px = datos.data;
        const cambio = new Map(
          Object.entries(colores).map(([de, a]) => [parseInt(de, 16), parseInt(a, 16)]),
        );
        for (let i = 0; i < px.length; i += 4) {
          if (!px[i + 3]) continue;
          const nuevo = cambio.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
          if (nuevo === undefined) continue;
          px[i] = nuevo >> 16;
          px[i + 1] = (nuevo >> 8) & 255;
          px[i + 2] = nuevo & 255;
        }
        ctx.putImageData(datos, 0, 0);
        return new Promise<string | null>((resolver) =>
          lienzo.toBlob((blob) => resolver(blob ? URL.createObjectURL(blob) : null), "image/png"),
        );
      })
      .catch(() => null);
    repintadas.set(src, pedido);
  }
  return pedido;
}

/** Del #1 al #649, los animados de los juegos; ahí la tira no hace falta */
const DE_LOS_JUEGOS = 649;

/** Cuántos milisegundos dura cada fotograma: los oficiales van a unos 100 */
const POR_FOTOGRAMA = 100;

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
    // En la ficha, animado: el de los juegos hasta el #649 y, de ahí en adelante
    // y en las formas, la tira de la comunidad; si no hay, el de PokéAPI o el quieto
    ...(id && ficha && !quieto && id > DE_LOS_JUEGOS ? [tiraAnimada(id, variocolor)].filter((c) => c !== null) : []),
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
  if (actual.startsWith("/sprites-animados/")) {
    return (
      <TiraAnimada
        key={actual}
        src={actual}
        alt={alt}
        className={className}
        onError={() => setFallidas((antes) => [...antes, actual])}
      />
    );
  }
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

/**
 * Un sprite animado que viene en tira (todos los fotogramas en fila, cuadrados,
 * como los guarda Essentials): se pinta de fondo y se corre de un fotograma al
 * siguiente a saltos, cada 100 ms. Cuántos fotogramas tiene sale de la propia
 * imagen (ancho entre alto), así que no hay que apuntarlo en ningún sitio.
 *
 * Se dibuja a la escala de un sprite de Blanco y Negro: sobre un lienzo de 96,
 * como los de los juegos, para que un Joltik no salga del tamaño de un
 * Wailord. Si es más grande que eso, se encoge hasta caber.
 */
function TiraAnimada({
  src,
  alt,
  className,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  onError: () => void;
}) {
  const [medida, setMedida] = useState<{ fotogramas: number; lado: number } | null>(null);
  const [pintada, setPintada] = useState<string | null>(null);
  useEffect(() => {
    let sigue = true;
    // Un shiny repintado: primero se repinta, y luego es una tira como otra
    const lista = src.endsWith(REPINTAR) ? repintar(src) : Promise.resolve(src);
    void lista.then((url) => {
      if (!sigue) return;
      if (!url) return onError();
      const imagen = new Image();
      imagen.onload = () => {
        if (!sigue) return;
        setPintada(url);
        setMedida({
          fotogramas: Math.max(1, Math.round(imagen.naturalWidth / imagen.naturalHeight)),
          lado: imagen.naturalHeight,
        });
      };
      imagen.onerror = onError;
      imagen.src = url;
    });
    return () => {
      sigue = false;
    };
    // Solo al cambiar de imagen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  /**
   * El fotograma que toca, con un temporizador y no con una animación CSS:
   * con `steps()` el navegador se quedaba a veces entre dos fotogramas y se
   * veía medio pokémon del siguiente. Con «reducir movimiento», el primero.
   */
  const [fotograma, setFotograma] = useState(0);
  const fotogramas = medida?.fotogramas ?? 1;
  useEffect(() => {
    setFotograma(0);
    if (fotogramas < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const reloj = window.setInterval(() => setFotograma((f) => (f + 1) % fotogramas), POR_FOTOGRAMA);
    return () => window.clearInterval(reloj);
  }, [fotogramas, pintada]);

  return (
    <span role="img" aria-label={alt} className={cx("inline-flex items-center justify-center", className)}>
      {medida && pintada ? (
        <span
          className="block aspect-square [image-rendering:pixelated]"
          style={{
            width: `${Math.min(100, (medida.lado / 96) * 100)}%`,
            backgroundImage: `url(${pintada})`,
            backgroundSize: `${fotogramas * 100}% 100%`,
            backgroundRepeat: "no-repeat",
            // Con fondo de N veces el ancho, el fotograma k está en k/(N-1) del recorrido
            backgroundPositionX: fotogramas > 1 ? `${(fotograma / (fotogramas - 1)) * 100}%` : "0%",
          }}
        />
      ) : null}
    </span>
  );
}
