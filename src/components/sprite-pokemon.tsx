"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  iconoDeCaja,
  iconoDelPaquete,
  pokemonDeLaImagen,
  REPINTAR,
  spriteDeHome,
  spriteQuietoDeQuinta,
  spritesDeQuinta,
  type EstiloDeSprites,
} from "@/lib/sprites-de-quinta";
import { cx } from "@/lib/utils";
import tiras from "@/lib/sprites-animados.json";
import { esPokemonDeAnil, spritesDeAnil } from "@/lib/anil";

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

function tiraAnimada(pokemonId: number, shiny: boolean): string | null {
  if (!shiny) return CON_TIRA.normal.has(pokemonId) ? `/sprites-animados/${pokemonId}.png` : null;
  if (CON_TIRA.shiny.has(pokemonId)) return `/sprites-animados/shiny/${pokemonId}.png`;
  return CON_TIRA.colores.has(pokemonId) ? `/sprites-animados/${pokemonId}.png${REPINTAR}` : null;
}

/**
 * El shiny de una tira o de un icono que solo cambia de colores: se pinta el
 * normal en un lienzo, se cambia cada color por el suyo (`shiny/<id>.json` al
 * lado de la imagen, «rrggbb» → «rrggbb») y se usa el resultado. Así de nueve
 * de cada diez tiras shiny se guardan unos cientos de bytes en vez de la imagen
 * entera. Los iconos traen además algún píxel suelto que no sigue el cambio
 * (`{ c: colores, p: [[posición, «rrggbbaa»]] }`). Uno por visita.
 */
type CambioDeColores = Record<string, string> | { c: Record<string, string>; p: [number, string][] };
const repintadas = new Map<string, Promise<string | null>>();
const repintadasYa = new Map<string, string | null>();

function repintar(src: string): Promise<string | null> {
  let pedido = repintadas.get(src);
  if (!pedido) {
    const imagen = src.slice(0, -REPINTAR.length);
    const lista = imagen.replace(/\/(\d+)\.png$/, "/shiny/$1.json");
    pedido = Promise.all([
      new Promise<HTMLImageElement>((resolver, fallar) => {
        const img = new Image();
        img.onload = () => resolver(img);
        img.onerror = fallar;
        img.src = imagen;
      }),
      fetch(lista).then((r) => (r.ok ? (r.json() as Promise<CambioDeColores>) : null)),
    ])
      .then(([img, leido]) => {
        if (!leido) return null;
        const colores = (typeof leido.c === "object" ? leido.c : leido) as Record<string, string>;
        const sueltos = "p" in leido && Array.isArray(leido.p) ? leido.p : [];
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
        for (const [posicion, color] of sueltos) {
          const valor = parseInt(color, 16);
          px.set([valor >>> 24, (valor >> 16) & 255, (valor >> 8) & 255, valor & 255], posicion * 4);
        }
        ctx.putImageData(datos, 0, 0);
        return new Promise<string | null>((resolver) =>
          lienzo.toBlob((blob) => resolver(blob ? URL.createObjectURL(blob) : null), "image/png"),
        );
      })
      .catch(() => null)
      .then((hecha) => {
        repintadasYa.set(src, hecha);
        return hecha;
      });
    repintadas.set(src, pedido);
  }
  return pedido;
}

/**
 * El hueco donde va un sprite grande, en píxeles de CSS y con la densidad de
 * la pantalla, para ampliar el pixel art **un número entero de veces**.
 *
 * Si no, un sprite de 96 metido en un recuadro de 330 se amplía 3,4 veces (y
 * con el zoom de Windows, 6,3 píxeles de pantalla por píxel del dibujo): unos
 * píxeles salen de 6 y otros de 7, y los bordes se ven rotos. Con un entero,
 * todos miden lo mismo.
 */
function useHueco(elemento: HTMLElement | null, activo: boolean) {
  const [hueco, setHueco] = useState<{ ancho: number; alto: number; densidad: number } | null>(null);
  useEffect(() => {
    if (!activo || !elemento) return;
    // Con su margen interior: es aire, y el sprite ya trae el suyo
    const leer = () =>
      setHueco({
        ancho: elemento.clientWidth,
        alto: elemento.clientHeight,
        densidad: window.devicePixelRatio || 1,
      });
    leer();
    const observador = new ResizeObserver(leer);
    observador.observe(elemento);
    // El zoom del navegador cambia la densidad sin cambiar el tamaño en CSS
    const zoom = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    zoom?.addEventListener?.("change", leer);
    return () => {
      observador.disconnect();
      zoom?.removeEventListener?.("change", leer);
    };
  }, [elemento, activo]);
  return hueco;
}

/**
 * Cuántos píxeles de pantalla por píxel del dibujo, enteros, para un dibujo de
 * `ancho`×`alto` en el hueco: **el entero más cercano** a lo que lo llenaría,
 * para que no encoja ni crezca de más, y si ese no cabe, el de abajo.
 *
 * 0 (se deja como siempre, llenando el hueco) cuando se ve pequeño: por debajo
 * de 2,5 píxeles de pantalla por píxel la diferencia entre uno y otro apenas
 * se nota, y redondear hacia abajo lo dejaría a la mitad (Geodude en la ficha
 * de Equipo y PC del ordenador pasaba de 85 a 45 píxeles).
 */
function vecesEnteras(
  hueco: { ancho: number; alto: number; densidad: number } | null,
  ancho: number,
  alto: number,
) {
  if (!hueco || ancho <= 0 || alto <= 0) return 0;
  const llenaria = Math.min(hueco.ancho / ancho, hueco.alto / alto) * hueco.densidad;
  if (llenaria < 2.5) return 0;
  const cerca = Math.round(llenaria);
  // Un pelo más que el hueco (un 4 %) vale: es aire y no se nota
  const cabe = (veces: number) =>
    (ancho * veces) / hueco.densidad <= hueco.ancho * 1.04 && (alto * veces) / hueco.densidad <= hueco.alto * 1.04;
  const veces = cerca >= 1 && cabe(cerca) ? cerca : Math.floor(llenaria);
  return veces >= 1 ? veces : 0;
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
 *
 * Los de PokéAPI llegan **por el servidor** (`/api/sprite`), que los baja una
 * vez, los guarda y los deja ya recortados a su casilla: en una casilla, el
 * pokémon a todo lo que da (el lienzo de 96 de Blanco y Negro lo dejaba
 * diminuto), y los iconos con un lado mínimo para que un Pikachu no salga tan
 * grande como un Charizard. Antes se recortaba aquí, en cada visita.
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

  /**
   * Si la forma que hay que enseñar no es la de la imagen guardada (una mega,
   * por llevar su megapiedra), con HOME se pide el de esa forma: lo guardado es
   * el de la normal.
   */
  const otraForma = Boolean(id && deLaImagen && deLaImagen.pokemonId !== id);
  const candidatas = esPokemonDeAnil(id) ? deAnil(id!) : [
    // En la ficha, animado: el de los juegos hasta el #649 y, de ahí en adelante
    // y en las formas, la tira de la comunidad; si no hay, el de PokéAPI o el quieto
    ...(id && ficha && !quieto && id > DE_LOS_JUEGOS ? [tiraAnimada(id, variocolor)].filter((c) => c !== null) : []),
    ...(id && ficha ? (quieto ? [spriteQuietoDeQuinta(id, variocolor)] : spritesDeQuinta(id, variocolor)) : []),
    ...(id && !ficha && !sinIconos && (estilo === "iconos" || estilo === "iconos-todos")
      ? [iconoDeCaja(id, variocolor, estilo === "iconos-todos"), iconoDelPaquete(id)].filter((c): c is string => Boolean(c))
      : []),
    // También detrás del icono, por si no carga
    ...(id && !ficha && estilo !== "home" ? [spriteQuietoDeQuinta(id, variocolor, true)] : []),
    ...(id && !ficha && estilo === "home" && otraForma ? [spriteDeHome(id, variocolor)] : []),
    ...(src ? [src] : []),
  ];

  /**
   * Lo de Añil (Royaleon, sus megas…) no está en PokéAPI ni en los paquetes:
   * sus dibujos van en `public/anil`, y el quieto sirve para todo lo que no es
   * la ficha salvo con iconos (ver lib/anil.ts).
   */
  function deAnil(n: number) {
    const suyos = spritesDeAnil(n, variocolor);
    return [
      ...(ficha ? (quieto ? [suyos.quieto] : [suyos.tira, suyos.quieto]) : []),
      ...(!ficha && !sinIconos && (estilo === "iconos" || estilo === "iconos-todos") ? [suyos.icono] : []),
      ...(!ficha ? [suyos.quieto] : []),
      ...(src ? [src] : []),
    ];
  }
  // Las que no han cargado, por dirección: si cambia de pokémon, las suyas empiezan de cero
  const [fallidas, setFallidas] = useState<string[]>([]);
  const actual = candidatas.find((c) => !fallidas.includes(c));
  // Pixel art: todo lo de Blanco y Negro, los iconos y lo de Añil; HOME y lo guardado, no
  const pixelado = Boolean(
    (actual?.startsWith("/api/sprite/") && !actual.includes("/home/")) ||
      actual?.startsWith("/iconos-de-caja/") ||
      actual?.startsWith("/anil/"),
  );
  // En grande, el pixel art se amplía un número entero de veces (ver `useHueco`)
  const entero = ficha && pixelado;
  const [contenedor, setContenedor] = useState<HTMLSpanElement | null>(null);
  const hueco = useHueco(contenedor, entero);
  const [natural, setNatural] = useState<{ de: string; ancho: number; alto: number } | null>(null);
  // Un icono shiny que es el normal repintado: hasta tenerlo, no se enseña el normal
  const aRepintar = actual?.endsWith(REPINTAR) ? actual : null;
  const [repintado, setRepintado] = useState<{ de: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!aRepintar) return;
    let sigue = true;
    void repintar(aRepintar).then((url) => {
      if (sigue) setRepintado({ de: aRepintar, url });
    });
    return () => {
      sigue = false;
    };
  }, [aRepintar]);

  if (!actual) {
    // Uno de Añil cuyos dibujos no cargan: una silueta con interrogación, no un hueco vacío
    return esPokemonDeAnil(id) ? (
      <span
        role="img"
        aria-label={alt}
        className={cx(className, "inline-flex items-center justify-center font-black text-slate-500")}
      >
        <span className="flex aspect-square w-3/5 max-w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-600 text-[clamp(0.75rem,40%,1.75rem)]">
          ?
        </span>
      </span>
    ) : null;
  }
  if (actual.startsWith("/sprites-animados/") || actual.startsWith("/anil/frente/")) {
    return (
      <TiraAnimada
        key={actual}
        src={actual}
        // Las tiras del juego de Añil llevan cada fotograma repetido: van al doble
        porFotograma={actual.startsWith("/anil/") ? POR_FOTOGRAMA / 2 : POR_FOTOGRAMA}
        alt={alt}
        className={className}
        onError={() => setFallidas((antes) => [...antes, actual])}
      />
    );
  }
  const listo = aRepintar
    ? repintado?.de === aRepintar
      ? repintado
      : repintadasYa.has(aRepintar)
        ? { de: aRepintar, url: repintadasYa.get(aRepintar) ?? null }
        : null
    : null;
  if (entero) {
    // El dibujo entero cabe en el hueco: se mira el lado que más aprieta
    const medido = natural?.de === actual ? natural : null;
    const veces = medido ? vecesEnteras(hueco, medido.ancho, medido.alto) : 0;
    const tamano =
      medido && hueco && veces >= 1
        ? { width: (medido.ancho * veces) / hueco.densidad, height: (medido.alto * veces) / hueco.densidad }
        : null;
    return (
      <span ref={setContenedor} className={cx("inline-flex items-center justify-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={actual}
          {...resto}
          src={listo?.url ?? actual}
          alt={alt}
          onLoad={(evento) =>
            setNatural({ de: actual, ancho: evento.currentTarget.naturalWidth, alto: evento.currentTarget.naturalHeight })
          }
          onError={() => setFallidas((antes) => [...antes, actual])}
          ref={siYaFallo(() => setFallidas((antes) => [...antes, actual]))}
          style={tamano ?? undefined}
          className={cx(
            // Hasta medirlo, como antes: llenando el hueco
            tamano ? "max-w-none" : "h-full w-full object-contain",
            "[image-rendering:pixelated]",
            aRepintar && !listo && "opacity-0",
          )}
        />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={actual}
      {...resto}
      src={listo?.url ?? actual}
      alt={alt}
      onError={() => setFallidas((antes) => [...antes, actual])}
      ref={siYaFallo(() => setFallidas((antes) => [...antes, actual]))}
      className={cx(
        className,
        pixelado && "[image-rendering:pixelated]",
        // Hasta tener el repintado, invisible: que no se vea el normal y cambie de color
        aRepintar && !listo && "opacity-0",
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
  porFotograma,
}: {
  src: string;
  alt: string;
  className?: string;
  onError: () => void;
  porFotograma: number;
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
  // Sobre el lienzo de 96 de Blanco y Negro, ampliado un número entero de veces
  const [contenedor, setContenedor] = useState<HTMLSpanElement | null>(null);
  const hueco = useHueco(contenedor, true);
  // La escala la marca el lienzo de 96 (o el fotograma, si es más grande)
  const lienzo = medida ? Math.max(96, medida.lado) : 0;
  const veces = medida ? vecesEnteras(hueco, lienzo, lienzo) : 0;
  const ancho = medida && hueco && veces ? (medida.lado * veces) / hueco.densidad : null;
  useEffect(() => {
    setFotograma(0);
    if (fotogramas < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const reloj = window.setInterval(() => setFotograma((f) => (f + 1) % fotogramas), porFotograma);
    return () => window.clearInterval(reloj);
  }, [fotogramas, pintada, porFotograma]);

  return (
    <span
      ref={setContenedor}
      role="img"
      aria-label={alt}
      className={cx("inline-flex items-center justify-center", className)}
    >
      {medida && pintada ? (
        <span
          className="block aspect-square shrink-0 [image-rendering:pixelated]"
          style={{
            // En píxeles enteros si cabe; si no (una casilla pequeña), encogido como siempre
            width: ancho !== null ? `${ancho}px` : `${Math.min(100, (medida.lado / 96) * 100)}%`,
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

/**
 * Para el `ref` de una imagen: si ya ha fallado al montarse, avisa. Una imagen
 * que viene pintada del servidor puede fallar **antes de que React esté
 * escuchando**, y entonces su `onError` no llega nunca: al recargar la página
 * se quedaba el icono roto (lo vio el usuario con el compañero de arriba).
 */
export function siYaFallo(alFallar: () => void) {
  return (imagen: HTMLImageElement | null) => {
    if (imagen?.complete && imagen.naturalWidth === 0 && imagen.getAttribute("src")) alFallar();
  };
}
