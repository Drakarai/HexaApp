"use client";

import { useEffect, useRef, useState } from "react";
import { useEstiloDeSprites } from "@/components/sprite-pokemon";
import { iconoDeCaja, REPINTAR, spriteQuietoDeQuinta } from "@/lib/sprites-de-quinta";
import { esPokemonDeAnil, spritesDeAnil } from "@/lib/anil";
import { precargarGrito, sonarGrito } from "@/lib/gritos";
import type { Companero as DatosDelCompanero } from "@/lib/companero";
import { cx } from "@/lib/utils";

/** Lo que pasó hace más de esto ya no es noticia: no se celebra ni se llora */
const RECIENTE = 3 * 24 * 60 * 60 * 1000;

type Animo = "contento" | "triste" | "toque";

/** Qué ha visto ya en este dispositivo, por locke: para no saltar cada vez que se abre la app */
function claveDe(participantId: string) {
  return `hexaapp-companero:${participantId}`;
}
function leerVisto(participantId: string): { v?: string; b?: string } {
  try {
    return JSON.parse(localStorage.getItem(claveDe(participantId)) ?? "{}");
  } catch {
    return {};
  }
}
function guardarVisto(participantId: string, visto: { v?: string; b?: string }) {
  try {
    localStorage.setItem(claveDe(participantId), JSON.stringify(visto));
  } catch {
    // Sin almacenamiento (modo privado): volverá a reaccionar, que tampoco es grave
  }
}

/**
 * Qué toca al entrar: celebrar, entristecerse o nada. El compañero está dos
 * veces en la página (la cabecera del móvil y la del ordenador, una de ellas
 * escondida), así que se decide **una vez** y las dos hacen lo mismo: si no, la
 * primera se apuntaba lo visto y a la que se ve no le tocaba nada.
 */
const decididas = new Map<string, { animo: Animo | null; cuando: number }>();
function reaccionDe(datos: DatosDelCompanero): Animo | null {
  const clave = `${datos.participantId}|${datos.victoria?.id}|${datos.baja?.id}`;
  const ya = decididas.get(clave);
  // Lo decidido en esta misma pintada vale para la otra cabecera; lo de antes ya se vio
  if (ya) return Date.now() - ya.cuando < 2000 ? ya.animo : null;
  const visto = leerVisto(datos.participantId);
  const ahora = Date.now();
  const nueva = <T extends { id: string; fecha: string }>(cosa: T | null, vista?: string) =>
    cosa && cosa.id !== vista && ahora - new Date(cosa.fecha).getTime() < RECIENTE ? cosa : null;
  const victoria = nueva(datos.victoria, visto.v);
  const baja = nueva(datos.baja, visto.b);
  guardarVisto(datos.participantId, { v: datos.victoria?.id, b: datos.baja?.id });
  // Si han pasado las dos, manda la última
  const animo: Animo | null =
    victoria && baja
      ? new Date(victoria.fecha) >= new Date(baja.fecha)
        ? "contento"
        : "triste"
      : victoria
        ? "contento"
        : baja
          ? "triste"
          : null;
  decididas.set(clave, { animo, cuando: ahora });
  return animo;
}

/**
 * El compañero de la cabecera (ver lib/companero.ts): el icono de caja del as,
 * botando poco a poco como en el PC de los juegos.
 *
 * - Al entrar, si hay una victoria o una baja que este dispositivo no ha visto
 *   (y es de los últimos días), salta con un corazón o se encoge con unos
 *   puntos suspensivos, como los bocadillos del que te sigue en HeartGold.
 * - Al tocarlo, salta y grita, con su nota.
 * - Si ha caído, se queda quieto, gris y con un lazo negro.
 *
 * Va siempre con el icono de caja, se hayan elegido los sprites que se hayan
 * elegido: es un muñequito que acompaña, no una ficha. Con los iconos «Todos
 * iguales» elegidos, de esos (y con shiny); si no, los de Espada y Escudo.
 */
export function Companero({ datos, tamano = 32 }: { datos: DatosDelCompanero; tamano?: number }) {
  const estilo = useEstiloDeSprites();
  const { pokemonId, shiny, caido } = datos;
  const candidatas = esPokemonDeAnil(pokemonId)
    ? [spritesDeAnil(pokemonId, shiny).icono, spritesDeAnil(pokemonId, shiny).quieto]
    : [
        iconoDeCaja(pokemonId, shiny, estilo === "iconos-todos"),
        // Por si no hay icono (o no carga): el quieto de Blanco y Negro, recortado
        spriteQuietoDeQuinta(pokemonId, shiny, true),
      ].map((src) =>
        // Un icono shiny repintado necesita el lienzo de SpritePokemon: aquí, el normal
        src.endsWith(REPINTAR) ? src.slice(0, -REPINTAR.length) : src,
      );
  const [fallidas, setFallidas] = useState(0);
  const src = candidatas[fallidas];

  const [animo, setAnimo] = useState<Animo | null>(null);
  const reloj = useRef<number | undefined>(undefined);
  function mostrar(nuevo: Animo, duracion: number) {
    window.clearTimeout(reloj.current);
    setAnimo(null);
    // Un fotograma después, para que la animación vuelva a empezar si se repite
    requestAnimationFrame(() => setAnimo(nuevo));
    reloj.current = window.setTimeout(() => setAnimo(null), duracion);
  }
  useEffect(() => () => window.clearTimeout(reloj.current), []);

  // Al entrar: lo que haya pasado desde la última vez, una sola vez
  const victoriaId = datos.victoria?.id;
  const bajaId = datos.baja?.id;
  useEffect(() => {
    if (caido) {
      guardarVisto(datos.participantId, { v: victoriaId, b: bajaId });
      return;
    }
    const ultima = reaccionDe(datos);
    if (!ultima) return;
    // Un momento después de pintar, para que se vea entrar
    const espera = window.setTimeout(() => mostrar(ultima, ultima === "contento" ? 2600 : 3200), 600);
    return () => window.clearTimeout(espera);
    // Solo cuando cambia lo que ha pasado, no cada vez que se navega
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.participantId, victoriaId, bajaId, caido]);

  useEffect(() => {
    if (!caido) precargarGrito(pokemonId);
  }, [pokemonId, caido]);

  const titulo = caido
    ? `${datos.nombre}, tu as. Descansa en el cementerio.`
    : animo === "triste" && datos.baja
      ? `${datos.nombre} echa de menos a ${datos.baja.nombre}`
      : animo === "contento"
        ? `¡${datos.nombre} celebra tu victoria!`
        : `${datos.nombre}, tu as`;

  if (!src) return null;
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={() => {
        if (caido) return;
        sonarGrito(pokemonId, { volumen: 0.5 });
        mostrar("toque", 1200);
      }}
      className={cx("companero relative shrink-0", caido && "companero-caido")}
      style={{ width: tamano, height: tamano }}
    >
      <span
        className={cx(
          "companero-cuerpo block h-full w-full",
          animo === "contento" && "companero-salta",
          animo === "toque" && "companero-brinco",
          animo === "triste" && "companero-triste",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          onError={() => setFallidas((n) => n + 1)}
          className="h-full w-full object-contain [image-rendering:pixelated]"
        />
      </span>
      {caido ? <Lazo /> : null}
      {animo ? (
        <span key={animo} className="companero-bocadillo" aria-hidden>
          {animo === "contento" ? <Corazon /> : animo === "triste" ? "…" : "♪"}
        </span>
      ) : null}
    </button>
  );
}

/** El bocadillo del corazón, en píxeles, como el de los juegos */
function Corazon() {
  return (
    <svg viewBox="0 0 7 6" className="h-2.5 w-2.5" shapeRendering="crispEdges" fill="#f43f5e">
      <path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z" />
    </svg>
  );
}

/** El lazo negro del que ha caído, en la esquina: una cinta que se cruza, de luto */
function Lazo() {
  const cinta = "M3.6 15.2 7.3 7.6C8.7 4.9 8.4 1.2 6 1.2S3.3 4.9 4.7 7.6l3.7 7.6";
  return (
    <svg viewBox="0 0 12 16.5" className="absolute -bottom-1 -right-1.5 h-[18px] w-[13px]" aria-hidden>
      <path d={cinta} fill="none" stroke="#e2e8f0" strokeWidth="3.6" strokeLinejoin="round" />
      <path d={cinta} fill="none" stroke="#0b0b0f" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
