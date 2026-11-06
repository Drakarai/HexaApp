"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { siYaFallo, useEstiloDeSprites } from "@/components/sprite-pokemon";
import { iconoDeCaja, iconoDelPaquete, REPINTAR, spriteQuietoDeQuinta, type EstiloDeSprites } from "@/lib/sprites-de-quinta";
import { esPokemonDeAnil, spritesDeAnil } from "@/lib/anil";
import { precargarGrito, sonarGrito } from "@/lib/gritos";
import type { Companero as DatosDelCompanero } from "@/lib/companero";
import { frasesDelCompaneroAction, type FrasesDelCompanero } from "@/app/actions/companero";
import { DORMIDO, esDeNoche, frasesDeLaHora, GENERICAS, rellenar } from "@/lib/frases-cortas";
import { cx } from "@/lib/utils";

/** Lo que pasó hace más de esto ya no es noticia: no se celebra ni se llora */
const RECIENTE = 3 * 24 * 60 * 60 * 1000;
/** Una evolución se enseña en la cabecera si es de esta última semana */
const EVOLUCION_RECIENTE = 7 * 24 * 60 * 60 * 1000;

type Animo = "contento" | "triste";

/** Lo que se guarda en el dispositivo; si no se puede (modo privado), se vive sin ello */
function leer<T>(clave: string, porDefecto: T): T {
  try {
    const valor = localStorage.getItem(clave);
    return valor === null ? porDefecto : (JSON.parse(valor) as T);
  } catch {
    return porDefecto;
  }
}
function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // tampoco es grave: volverá a reaccionar
  }
}

/**
 * Si se pasea por abajo. **Viene apagado**: se enciende en Mi perfil (ver
 * perfil/companero.tsx). Se probó encendido para todos y molestaba.
 */
export const CLAVE_DEL_PASEO = "hexaapp-companero-paseo";

/**
 * Qué toca al entrar: evolucionar, celebrar, entristecerse o nada. El
 * compañero está dos veces en la página (la cabecera del móvil y la del
 * ordenador, una de ellas escondida), así que se decide **una vez** y las dos
 * hacen lo mismo: si no, la primera se apuntaba lo visto y a la que se ve no
 * le tocaba nada.
 */
type Entrada = { animo: Animo | null; evolucionDe: number | null };
const decididas = new Map<string, { entrada: Entrada; cuando: number }>();
function entradaDe(datos: DatosDelCompanero): Entrada {
  const clave = `${datos.participantId}|${datos.victoria?.id}|${datos.baja?.id}|${datos.pokemonId}`;
  const ya = decididas.get(clave);
  // Lo decidido en esta misma pintada vale para la otra cabecera; lo de antes ya se vio
  if (ya) return Date.now() - ya.cuando < 2000 ? ya.entrada : { animo: null, evolucionDe: null };
  const ahora = Date.now();

  // ¿Ha evolucionado desde la última vez que se le vio aquí?
  const claveForma = `hexaapp-companero-forma:${datos.participantId}`;
  const forma = leer<{ c?: string | null; p?: number } | null>(claveForma, null);
  const evolucionDe =
    forma?.p &&
    forma.c === datos.capturaId &&
    forma.p !== datos.pokemonId &&
    datos.evolucionadoEl &&
    ahora - new Date(datos.evolucionadoEl).getTime() < EVOLUCION_RECIENTE
      ? forma.p
      : null;
  guardar(claveForma, { c: datos.capturaId, p: datos.pokemonId });

  const claveVisto = `hexaapp-companero:${datos.participantId}`;
  const visto = leer<{ v?: string; b?: string }>(claveVisto, {});
  const nueva = <T extends { id: string; fecha: string }>(cosa: T | null, vista?: string) =>
    cosa && cosa.id !== vista && ahora - new Date(cosa.fecha).getTime() < RECIENTE ? cosa : null;
  const victoria = nueva(datos.victoria, visto.v);
  const baja = nueva(datos.baja, visto.b);
  guardar(claveVisto, { v: datos.victoria?.id, b: datos.baja?.id });
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
  const entrada = { animo, evolucionDe };
  decididas.set(clave, { entrada, cuando: ahora });
  return entrada;
}

/**
 * Sus frases, pedidas una vez por visita y compartidas por las dos cabeceras.
 * Sin línea, se apaña con las de cualquiera.
 */
let frasesPedidas: { de: string; frases: Promise<FrasesDelCompanero | null> } | null = null;
function frasesDe(participantId: string, pokemonId: number) {
  // Con la especie en la clave: si evoluciona, habla ya como lo que es ahora
  const de = `${participantId}|${pokemonId}`;
  if (frasesPedidas?.de !== de) {
    frasesPedidas = { de, frases: frasesDelCompaneroAction().catch(() => null) };
  }
  return frasesPedidas.frases;
}

/**
 * Qué dice ahora. Primero, lo que le está pasando a su entrenador que aún no
 * ha dicho en esta visita; luego se reparte entre lo de su especie (que es lo
 * más suyo, pero son dos o tres), su tipo, la hora y lo de cualquiera. No
 * repite ninguna de las últimas que ha dicho, para que tocarle seguido no sea
 * un disco rayado.
 */
function elegirFrase(frases: FrasesDelCompanero | null, dichas: Set<string>, recientes: string[]) {
  const delLocke = frases?.locke.find((f) => !dichas.has(f));
  if (delLocke && Math.random() < 0.6) return delLocke;
  const deLaHora = frasesDeLaHora(new Date().getHours());
  const montones: [string[], number][] = [
    [frases?.especie ?? [], 4],
    [frases?.tipo ?? [], 3],
    [deLaHora, 1],
    [frases?.locke ?? [], 1],
    [frases?.generica ?? GENERICAS, 1],
  ];
  // Cada frase, con el peso de su montón repartido entre las suyas
  const opciones = montones.flatMap(([lista, peso]) =>
    lista.filter((f) => !recientes.includes(f)).map((f) => ({ f, peso: peso / lista.length })),
  );
  if (!opciones.length) return azar(frases?.generica ?? GENERICAS);
  let tirada = Math.random() * opciones.reduce((suma, o) => suma + o.peso, 0);
  for (const o of opciones) {
    tirada -= o.peso;
    if (tirada <= 0) return o.f;
  }
  return opciones[opciones.length - 1].f;
}

const azar = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];

/**
 * Cómo reacciona al tocarle: un movimiento y su bocadillo pequeño, como los
 * de HeartGold. Va con lo que dice: si echa de menos a alguien se encoge, si
 * celebra algo salta con un corazón, si le toca combatir se pone en alerta.
 * Si no, uno al azar, para que no haga siempre lo mismo.
 */
type Movimiento = "brinco" | "salta" | "giro" | "sacude" | "triste";
type Reaccion = { mov: Movimiento; emote: string; id: number };
const AL_AZAR: Omit<Reaccion, "id">[] = [
  { mov: "brinco", emote: "♪" },
  { mov: "brinco", emote: "♪" },
  { mov: "salta", emote: "♥" },
  { mov: "giro", emote: "♪" },
  { mov: "sacude", emote: "!" },
  { mov: "brinco", emote: "?" },
];
function reaccionA(frase: string): Omit<Reaccion, "id"> {
  if (/echa de menos/.test(frase)) return { mov: "triste", emote: "…" };
  if (/celebrando|conociste|a tu lado/.test(frase)) return { mov: "salta", emote: "♥" };
  if (/impaciente|entrena para/.test(frase)) return { mov: "brinco", emote: "!" };
  if (/brilla/.test(frase)) return { mov: "giro", emote: "✨" };
  if (/despereza|legañas|siesta|bosteza/.test(frase)) return { mov: "sacude", emote: "z" };
  return azar(AL_AZAR);
}

/** El icono de caja de un pokémon, y detrás el quieto de Blanco y Negro por si no hay */
function iconosDe(pokemonId: number, shiny: boolean, estilo: EstiloDeSprites) {
  if (esPokemonDeAnil(pokemonId)) {
    const suyos = spritesDeAnil(pokemonId, shiny);
    return [suyos.icono, suyos.quieto];
  }
  return [
    iconoDeCaja(pokemonId, shiny, estilo === "iconos-todos"),
    // Si el de PokéAPI no carga, el que va en la app: el compañero es un icono, no un dibujo
    iconoDelPaquete(pokemonId),
    spriteQuietoDeQuinta(pokemonId, shiny, true),
  ].filter((src): src is string => Boolean(src)).map(
    // Un icono shiny repintado necesita el lienzo de SpritePokemon: aquí, el normal
    (src) => (src.endsWith(REPINTAR) ? src.slice(0, -REPINTAR.length) : src),
  );
}

function Icono({ pokemonId, shiny, className }: { pokemonId: number; shiny: boolean; className?: string }) {
  const estilo = useEstiloDeSprites();
  const candidatas = iconosDe(pokemonId, shiny, estilo);
  const [fallidas, setFallidas] = useState(0);
  const src = candidatas[fallidas];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt=""
      draggable={false}
      onError={() => setFallidas((n) => n + 1)}
      ref={siYaFallo(() => setFallidas((n) => n + 1))}
      className={cx("h-full w-full object-contain [image-rendering:pixelated]", className)}
    />
  );
}

/**
 * El compañero de la cabecera (ver lib/companero.ts): el icono de caja del as,
 * que bota como en el PC de los juegos y tiene vida propia:
 *
 * - **Habla** al tocarlo, con frases de su especie, de su tipo y de lo que le
 *   pasa a su entrenador (ver lib/frases-del-companero.ts), y grita.
 * - **Duerme** de 0 a 8 (la hora de quien mira), con sus «zZz».
 * - De vez en cuando **mira a los lados o da un saltito** él solo.
 * - De vez en cuando **se baja a dar un paseo** por encima de la barra de
 *   abajo, y vuelve. Se puede quitar en Mi perfil.
 * - Al entrar, si **ha evolucionado** desde la última vez, evoluciona ahí
 *   mismo; si acabas de ganar, salta con un corazón; si ha caído otro de los
 *   tuyos, se encoge.
 * - Si cae él, se queda gris y con un lazo negro.
 *
 * Va siempre con el icono de caja, se hayan elegido los sprites que se hayan
 * elegido: es un muñequito que acompaña, no una ficha.
 */
export function Companero({ datos, tamano = 32 }: { datos: DatosDelCompanero; tamano?: number }) {
  const { pokemonId, shiny, caido, nombre } = datos;
  const boton = useRef<HTMLButtonElement>(null);

  // Lo que se le ve hacer
  const [animo, setAnimo] = useState<Animo | null>(null);
  const [gesto, setGesto] = useState<"mira" | "salta" | null>(null);
  const [noche, setNoche] = useState(false);
  const [paseo, setPaseo] = useState<{ desde: "derecha" } | null>(null);
  const [evolucion, setEvolucion] = useState<{ de: number; fase: "brilla" | "hecho" } | null>(null);
  const relojes = useRef<number[]>([]);
  const despues = (ms: number, hacer: () => void) => {
    relojes.current.push(window.setTimeout(hacer, ms));
  };
  useEffect(() => () => relojes.current.forEach((r) => window.clearTimeout(r)), []);

  // Lo que dice: el bocadillo, que se escribe letra a letra como en los juegos
  const [frase, setFrase] = useState<string | null>(null);
  const [letras, setLetras] = useState(0);
  const dichas = useRef(new Set<string>());
  const recientes = useRef<string[]>([]);
  const cierre = useRef<number | undefined>(undefined);
  function decir(texto: string) {
    window.clearTimeout(cierre.current);
    setFrase(texto);
    setLetras(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? texto.length : 0);
    cierre.current = window.setTimeout(() => setFrase(null), Math.max(3500, texto.length * 70));
  }
  useEffect(() => {
    if (frase === null || letras >= frase.length) return;
    const siguiente = window.setTimeout(() => setLetras((n) => n + 1), 22);
    return () => window.clearTimeout(siguiente);
  }, [frase, letras]);
  useEffect(() => () => window.clearTimeout(cierre.current), []);

  const animar = (nuevo: Animo, ms: number) => {
    setAnimo(null);
    // Un fotograma después, para que la animación vuelva a empezar si se repite
    requestAnimationFrame(() => setAnimo(nuevo));
    despues(ms, () => setAnimo(null));
  };

  // La reacción al tocarle (ver `reaccionA`)
  const [reaccion, setReaccion] = useState<Reaccion | null>(null);
  const reaccionar = (r: Omit<Reaccion, "id">) => {
    setReaccion({ ...r, id: Date.now() });
    despues(r.mov === "triste" ? 2400 : 1500, () => setReaccion((ahora) => (ahora && Date.now() - ahora.id >= 1400 ? null : ahora)));
  };

  const ultimoGrito = useRef(0);
  async function tocar() {
    if (caido) return decir(`${nombre} descansa en paz`);
    if (noche) {
      reaccionar({ mov: "sacude", emote: "z" });
      return decir(rellenar(azar(DORMIDO), nombre));
    }
    // Que grite al tocarle; si se le toca muy seguido, no a cada toque, que satura
    if (Date.now() - ultimoGrito.current > 1500) {
      ultimoGrito.current = Date.now();
      sonarGrito(pokemonId, { volumen: 0.5 });
    }
    // La primera vez sus frases tardan un momento en llegar: mientras, ya reacciona
    const pedidas = frasesDe(datos.participantId, pokemonId);
    const espera = window.setTimeout(() => reaccionar({ mov: "brinco", emote: "♪" }), 150);
    const frases = await pedidas;
    window.clearTimeout(espera);
    const elegida = elegirFrase(frases, dichas.current, recientes.current);
    dichas.current.add(elegida);
    recientes.current = [elegida, ...recientes.current].slice(0, 4);
    reaccionar(reaccionA(elegida));
    decir(rellenar(elegida, nombre));
  }

  // La hora de quien mira, que solo la sabe su navegador: de noche duerme
  useEffect(() => {
    const mirar = () => setNoche(esDeNoche(new Date().getHours()));
    mirar();
    const reloj = window.setInterval(mirar, 60_000);
    return () => window.clearInterval(reloj);
  }, []);

  const seVe = () => Boolean(boton.current && boton.current.offsetParent !== null);
  const sinMovimiento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Al entrar: lo que haya pasado desde la última vez, una sola vez
  const victoriaId = datos.victoria?.id;
  const bajaId = datos.baja?.id;
  useEffect(() => {
    if (caido) {
      entradaDe(datos);
      return;
    }
    const { animo: reaccion, evolucionDe } = entradaDe(datos);
    if (evolucionDe) {
      despues(700, () => {
        setEvolucion({ de: evolucionDe, fase: "brilla" });
        sonarGrito(evolucionDe, { volumen: 0.45 });
      });
      despues(700 + 3200, () => {
        setEvolucion({ de: evolucionDe, fase: "hecho" });
        sonarGrito(pokemonId, { volumen: 0.5 });
        decir(`¡${nombre} ha evolucionado en ${datos.especie}!`);
      });
      despues(700 + 3200 + 1600, () => setEvolucion(null));
      return;
    }
    if (reaccion) despues(600, () => animar(reaccion, reaccion === "contento" ? 2600 : 3200));
    // Solo cuando cambia lo que ha pasado, no cada vez que se navega
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.participantId, victoriaId, bajaId, pokemonId, caido]);

  useEffect(() => {
    if (!caido) precargarGrito(pokemonId);
  }, [pokemonId, caido]);

  // Gestos sueltos: de vez en cuando mira a los lados o da un saltito
  useEffect(() => {
    if (caido || noche) return;
    let reloj: number;
    const programar = () => {
      reloj = window.setTimeout(() => {
        if (seVe() && !sinMovimiento() && document.visibilityState === "visible") {
          const cual = Math.random() < 0.6 ? "mira" : "salta";
          setGesto(cual);
          window.setTimeout(() => setGesto(null), cual === "mira" ? 1600 : 500);
        }
        programar();
      }, 15_000 + Math.random() * 25_000);
    };
    programar();
    return () => window.clearTimeout(reloj);
  }, [caido, noche]);

  // El paseo: de vez en cuando baja y da una vuelta por encima de la barra de abajo
  useEffect(() => {
    if (caido || noche) return;
    let reloj: number;
    const programar = (primera: boolean) => {
      const espera = primera ? 45_000 + Math.random() * 30_000 : 240_000 + Math.random() * 180_000;
      reloj = window.setTimeout(() => {
        const puesto = leer<string | null>(CLAVE_DEL_PASEO, null) === "si";
        if (puesto && seVe() && !sinMovimiento() && document.visibilityState === "visible") {
          setPaseo({ desde: "derecha" });
        }
        programar(false);
      }, espera);
    };
    programar(true);
    return () => window.clearTimeout(reloj);
  }, [caido, noche]);

  const titulo = caido
    ? `${nombre}, tu as. Descansa en el cementerio.`
    : noche
      ? `${nombre} está durmiendo`
      : `${nombre}, tu as. Tócale para que te diga algo.`;

  const bocadillo = frase ? (
    <span className="companero-texto" role="status">
      {frase.slice(0, letras)}
      <span className="invisible">{frase.slice(letras)}</span>
    </span>
  ) : null;

  return (
    <>
      <button
        ref={boton}
        type="button"
        title={titulo}
        aria-label={titulo}
        onClick={tocar}
        className={cx(
          "companero relative shrink-0",
          caido && "companero-caido",
          noche && !caido && "companero-dormido",
          // Mientras se pasea, su sitio se queda vacío
          paseo && "companero-fuera",
        )}
        style={{ width: tamano, height: tamano }}
      >
        {evolucion?.fase === "brilla" ? (
          <span className="companero-evoluciona block h-full w-full">
            <Icono pokemonId={evolucion.de} shiny={shiny} className="companero-evo-antes" />
            <Icono pokemonId={pokemonId} shiny={shiny} className="companero-evo-despues" />
          </span>
        ) : (
          <span
            className={cx(
              "companero-cuerpo block h-full w-full",
              animo === "contento" && "companero-salta",
              gesto === "salta" && "companero-brinco",
              animo === "triste" && "companero-triste",
              gesto === "mira" && "companero-mira",
              evolucion?.fase === "hecho" && "companero-recien-evolucionado",
            )}
          >
            {/* Con la clave de la reacción: tocarle dos veces repite el movimiento */}
            <span
              key={reaccion?.id ?? 0}
              className={cx(
                "block h-full w-full",
                reaccion?.mov === "salta" && "companero-salta",
                reaccion?.mov === "brinco" && "companero-brinco",
                reaccion?.mov === "triste" && "companero-triste",
                reaccion?.mov === "giro" && "companero-giro",
                reaccion?.mov === "sacude" && "companero-sacude",
              )}
            >
              <Icono pokemonId={pokemonId} shiny={shiny} />
            </span>
          </span>
        )}
        {caido ? <Lazo /> : null}
        {noche && !caido ? (
          <span className="companero-zzz" aria-hidden>
            <span>z</span>
            <span>z</span>
            <span>Z</span>
          </span>
        ) : null}
        {animo && !reaccion ? (
          <span key={animo} className="companero-bocadillo" aria-hidden>
            {animo === "contento" ? <Corazon /> : "…"}
          </span>
        ) : null}
        {reaccion ? (
          <span key={reaccion.id} className="companero-bocadillo" aria-hidden>
            {reaccion.emote === "♥" ? <Corazon /> : reaccion.emote}
          </span>
        ) : null}
        {evolucion?.fase === "hecho" ? (
          <span className="companero-bocadillo" aria-hidden>
            ✨
          </span>
        ) : null}
        {!paseo ? bocadillo : null}
      </button>
      {paseo ? (
        <Paseo
          pokemonId={pokemonId}
          shiny={shiny}
          bocadillo={bocadillo}
          hablando={frase !== null}
          onTocar={tocar}
          onFin={() => setPaseo(null)}
        />
      ) : null}
    </>
  );
}

/**
 * El paseo: baja a la parte de abajo de la pantalla (encima de la barra de
 * pestañas en el móvil), la cruza de un lado a otro botando, se para a mirar y
 * vuelve. Va fuera de la cabecera, en el `body`, porque se mueve por toda la
 * pantalla. Si se le toca por el camino, **se para mientras habla**: andando,
 * el bocadillo se iba con él y no había forma de leerlo. Y el bocadillo se
 * abre hacia donde haya sitio, según en qué mitad de la pantalla esté.
 */
function Paseo({
  pokemonId,
  shiny,
  bocadillo,
  hablando,
  onTocar,
  onFin,
}: {
  pokemonId: number;
  shiny: boolean;
  bocadillo: React.ReactNode;
  hablando: boolean;
  onTocar: () => void;
  onFin: () => void;
}) {
  const caja = useRef<HTMLButtonElement>(null);
  const [haciaLaDerecha, setHaciaLaDerecha] = useState(false);
  const [parado, setParado] = useState(false);
  const [bocadilloALaIzquierda, setBocadilloALaIzquierda] = useState(false);
  const quieto = useRef(false);
  useEffect(() => {
    quieto.current = hablando;
    caja.current?.getAnimations().forEach((a) => (hablando ? a.pause() : a.play()));
  }, [hablando]);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const lado = 36;
    const derecha = window.innerWidth - lado - 16;
    const izquierda = 16;
    // A paso de pokémon: unos 55 píxeles por segundo
    const ida = ((derecha - izquierda) / 55) * 1000;
    let cancelado = false;
    const andar = (de: number, a: number, ms: number) => {
      const paso = el.animate([{ transform: `translateX(${de}px)` }, { transform: `translateX(${a}px)` }], {
        duration: ms,
        easing: "linear",
        fill: "forwards",
      });
      // Si está hablando cuando le toca echar a andar, espera a terminar
      if (quieto.current) paso.pause();
      return paso.finished;
    };
    (async () => {
      try {
        // Entra por la derecha, cruza, se para a mirar y vuelve
        setHaciaLaDerecha(false);
        await andar(window.innerWidth + 10, derecha, 900);
        await andar(derecha, izquierda, ida);
        if (cancelado) return;
        setParado(true);
        await new Promise((r) => setTimeout(r, 1800));
        if (cancelado) return;
        setParado(false);
        setHaciaLaDerecha(true);
        await andar(izquierda, derecha, ida);
        await andar(derecha, window.innerWidth + 10, 900);
      } catch {
        // Cancelada al salir: nada
      }
      if (!cancelado) onFin();
    })();
    return () => {
      cancelado = true;
      el.getAnimations().forEach((a) => a.cancel());
    };
    // Una vez por paseo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <button
      ref={caja}
      type="button"
      aria-label="Tu compañero, de paseo"
      onClick={() => {
        const donde = caja.current?.getBoundingClientRect().left ?? 0;
        setBocadilloALaIzquierda(donde < window.innerWidth / 2);
        onTocar();
      }}
      className={cx("companero-paseo", bocadilloALaIzquierda && "companero-paseo-izquierda")}
    >
      <span
        className={cx(
          "block h-full w-full",
          parado ? "companero-mira" : !hablando && "companero-anda",
          haciaLaDerecha && !parado && "companero-de-espaldas",
        )}
      >
        <Icono pokemonId={pokemonId} shiny={shiny} />
      </span>
      {bocadillo}
    </button>,
    document.body,
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
