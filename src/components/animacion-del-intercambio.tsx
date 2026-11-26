"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { spriteQuietoDeQuinta } from "@/lib/sprites-de-quinta";

/**
 * **La animación del intercambio de la GTS**, como en los juegos: el que se va
 * entra en su ball y sube, las dos balls se cruzan, y baja la del otro, se
 * abre y se le da la bienvenida. Las balls son la del logo de la HexaApp
 * (`lib/logo.ts`).
 *
 * El lienzo pinta el fondo, las balls, la luz y **las siluetas** (cuando el
 * pokémon va teñido no se nota que es el quieto). El pokémon a color va
 * **encima, con su sprite animado** —el de la ficha—, movido a mano en cada
 * fotograma: un sprite animado no se puede pintar en un lienzo y seguir
 * moviéndose.
 *
 * Todo sale de `t` (segundos desde el principio), dibujado al ritmo de la
 * pantalla (60 o 120 por segundo). Con «reducir movimiento» se salta al final.
 */

export type PokemonDelIntercambio = {
  nombre: string;
  pokemonId: number | null;
  shiny: boolean;
  sexo?: "M" | "F" | null;
  /** Su entrenador: quien lo manda o de quien llega */
  dueno: string;
};

/** Desde aquí ya está la bienvenida: lo de después solo se repite (brillos, vaivén) */
const FINAL = 8.6;
const W = 720;
const H = 720;
const CX = 360;
const SPRITE_Y = 300;
const BOLA_Y = 540;
const ESCALA = 3;
const MARCA = "#6366f1";
const LOGO = { trazo: "#818cf8", arriba: "#a5b4fc", abajo: "#4f46e5", boton: "#e0e7ff", hueco: "#0b0b0e" };

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const tramo = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const entra = (x: number) => x * x * x;
const sale = (x: number) => 1 - Math.pow(1 - x, 3);
const mezcla = (a: number, b: number, x: number) => a + (b - a) * x;
// Un aleatorio fijo por número: los mismos destellos en cada fotograma
const azar = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function rebote(x: number) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

/** El sprite teñido de un color entero: la silueta al entrar en la ball y al salir */
function tenido(img: HTMLImageElement, color: string) {
  const o = document.createElement("canvas");
  o.width = img.naturalWidth;
  o.height = img.naturalHeight;
  const x = o.getContext("2d")!;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = color;
  x.fillRect(0, 0, o.width, o.height);
  return o;
}

function cargar(src: string | null) {
  return new Promise<HTMLImageElement | null>((ok) => {
    if (!src) return ok(null);
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

/** Dónde va cada sprite a color en este fotograma (en el lienzo de 720) */
type Puesto = { x: number; y: number; escala: number; alfa: number };

type Siluetas = { sale: HTMLCanvasElement | null; llega: HTMLCanvasElement | null };

function pintar(g: CanvasRenderingContext2D, t: number, siluetas: Siluetas, textos: { sale: [string, string]; llega: [string, string] }) {
  const puestos: { sale: Puesto; llega: Puesto } = {
    sale: { x: CX, y: SPRITE_Y, escala: 0, alfa: 0 },
    llega: { x: CX, y: SPRITE_Y, escala: 0, alfa: 0 },
  };

  // ---------- piezas ----------
  const estrella = (x: number, y: number, r: number) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.35 : r * 1.6;
      const a = (i / 8) * Math.PI * 2;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  const destellos = (x: number, y: number, t0: number, cuantos = 14, radio = 120, color = "#fde68a") => {
    const p = tramo(t, t0, t0 + 0.8);
    if (p <= 0 || p >= 1) return;
    g.save();
    for (let i = 0; i < cuantos; i++) {
      const a = (i / cuantos) * Math.PI * 2 + azar(i) * 0.4;
      const d = sale(p) * radio * (0.6 + azar(i + 20) * 0.6);
      g.globalAlpha = 1 - p;
      g.fillStyle = i % 2 ? color : "#ffffff";
      estrella(x + Math.cos(a) * d, y + Math.sin(a) * d, (1 - p) * (3 + azar(i + 40) * 4));
    }
    g.restore();
  };
  const fogonazo = (x: number, y: number, alfa: number, radio: number) => {
    if (alfa <= 0) return;
    g.save();
    g.globalAlpha = alfa;
    const f = g.createRadialGradient(x, y, 0, x, y, radio);
    f.addColorStop(0, "rgba(255,255,255,1)");
    f.addColorStop(0.35, "rgba(199,210,254,0.8)");
    f.addColorStop(1, "rgba(99,102,241,0)");
    g.fillStyle = f;
    g.fillRect(0, 0, W, H);
    g.restore();
  };
  const rayos = (x: number, y: number, alfa: number, giro: number) => {
    if (alfa <= 0) return;
    g.save();
    g.translate(x, y);
    g.rotate(giro);
    g.globalAlpha = alfa;
    for (let i = 0; i < 12; i++) {
      g.rotate((Math.PI * 2) / 12);
      const r = g.createLinearGradient(0, 0, 0, -420);
      r.addColorStop(0, "rgba(255,255,255,0.7)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.beginPath();
      g.moveTo(-10, 0);
      g.lineTo(-40, -420);
      g.lineTo(40, -420);
      g.lineTo(10, 0);
      g.closePath();
      g.fill();
    }
    g.restore();
  };
  const estela = (puntos: [number, number][], color: string) => {
    g.save();
    puntos.forEach(([x, y], i) => {
      const k = 1 - i / puntos.length;
      g.globalAlpha = k * 0.35;
      g.fillStyle = color;
      g.beginPath();
      g.arc(x, y, 26 * k, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
  };
  const sombraDelSuelo = (x: number, y: number, ancho: number, alfa: number) => {
    if (ancho <= 0 || alfa <= 0) return;
    g.save();
    g.globalAlpha = alfa;
    const s = g.createRadialGradient(x, y, 0, x, y, ancho);
    s.addColorStop(0, "rgba(99,102,241,0.55)");
    s.addColorStop(1, "rgba(99,102,241,0)");
    g.fillStyle = s;
    g.beginPath();
    g.ellipse(x, y, ancho, ancho * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  const silueta = (img: HTMLCanvasElement | null, x: number, y: number, escala: number, alfa: number) => {
    if (!img || escala <= 0 || alfa <= 0) return;
    g.save();
    g.globalAlpha = alfa;
    g.imageSmoothingEnabled = false;
    const w = img.width * escala;
    const h = img.height * escala;
    g.drawImage(img, x - w / 2, y - h / 2, w, h);
    g.restore();
  };
  const texto = ([arriba, abajo]: [string, string], alfa: number, y = 640) => {
    if (alfa <= 0) return;
    g.save();
    g.globalAlpha = alfa;
    g.textAlign = "center";
    g.fillStyle = "#94a3b8";
    g.font = "600 22px Barlow, sans-serif";
    g.fillText(arriba, CX, y - 34);
    g.fillStyle = "#ffffff";
    g.font = "700 46px 'Barlow Condensed', sans-serif";
    g.fillText(abajo.toUpperCase(), CX, y + 14);
    g.restore();
  };
  /** La ball del logo: `abre` (0 a 1) levanta la mitad de arriba como una tapa */
  const bola = (x: number, y: number, r: number, giro = 0, abre = 0, brillo = 0) => {
    const k = r / 42;
    const rc = r * Math.cos(Math.PI / 6);
    const grosor = 6 * k;
    g.save();
    g.translate(x, y);
    g.rotate(giro);
    g.lineJoin = "round";
    g.shadowColor = "rgba(0,0,0,0.5)";
    g.shadowBlur = r * 0.45;
    g.shadowOffsetY = r * 0.12;
    g.beginPath();
    g.moveTo(-rc, 0);
    g.lineTo(-rc, r / 2);
    g.lineTo(0, r);
    g.lineTo(rc, r / 2);
    g.lineTo(rc, 0);
    g.closePath();
    g.fillStyle = "rgba(11,11,14,0.92)";
    g.fill();
    g.shadowColor = "transparent";
    g.lineWidth = grosor;
    g.strokeStyle = LOGO.trazo;
    g.stroke();
    if (abre >= 0.05) {
      const dentro = g.createRadialGradient(0, 0, 0, 0, 0, rc);
      dentro.addColorStop(0, `rgba(199,210,254,${0.9 * abre})`);
      dentro.addColorStop(1, "rgba(99,102,241,0)");
      g.fillStyle = dentro;
      g.beginPath();
      g.ellipse(0, 0, rc * 0.95, r * 0.25, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.save();
    g.translate(-r * 0.12 * abre, -r * 1.05 * abre);
    g.rotate(-0.45 * abre);
    g.beginPath();
    g.moveTo(-rc, 0);
    g.lineTo(-rc, -r / 2);
    g.lineTo(0, -r);
    g.lineTo(rc, -r / 2);
    g.lineTo(rc, 0);
    g.closePath();
    const grad = g.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, LOGO.arriba);
    grad.addColorStop(1, LOGO.abajo);
    g.fillStyle = grad;
    g.fill();
    g.lineWidth = grosor;
    g.strokeStyle = LOGO.trazo;
    g.stroke();
    g.restore();
    if (abre < 0.05) {
      g.beginPath();
      g.moveTo(-rc, 0);
      g.lineTo(rc, 0);
      g.lineWidth = grosor;
      g.strokeStyle = LOGO.trazo;
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 14 * k, 0, Math.PI * 2);
      g.fillStyle = LOGO.hueco;
      g.fill();
      g.lineWidth = grosor;
      g.strokeStyle = LOGO.trazo;
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 5.5 * k, 0, Math.PI * 2);
      g.fillStyle = brillo > 0 ? `rgba(250,204,21,${0.5 + brillo * 0.5})` : LOGO.boton;
      g.fill();
    }
    g.restore();
  };

  // ---------- el fondo ----------
  const velocidad = tramo(t, 3.2, 3.6) * (1 - tramo(t, 5.5, 6.0));
  const grad = g.createRadialGradient(CX, 330, 40, CX, 360, 520);
  grad.addColorStop(0, "#1d1f3f");
  grad.addColorStop(0.55, "#10122a");
  grad.addColorStop(1, "#07080f");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalAlpha = 0.07;
  g.strokeStyle = "#a5b4fc";
  g.lineWidth = 1;
  const desp = (t * 18) % 40;
  for (let y = -40 + desp; y < H; y += 40) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  for (let x = 0; x < W; x += 40) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  g.restore();
  if (velocidad > 0) {
    g.save();
    for (let i = 0; i < 46; i++) {
      const x = azar(i) * W;
      const largo = 60 + azar(i + 50) * 160;
      const v = 900 + azar(i + 99) * 900;
      const y = ((azar(i + 7) * (H + 400) + t * v) % (H + 400)) - 200;
      g.globalAlpha = velocidad * (0.12 + azar(i + 3) * 0.35);
      g.strokeStyle = i % 3 === 0 ? "#c7d2fe" : MARCA;
      g.lineWidth = 1 + azar(i + 13) * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + largo);
      g.stroke();
    }
    g.restore();
  }

  // ---------- 1. El que se va entra en su ball ----------
  const bob = Math.sin(t * 3) * 4;
  const aparece = sale(tramo(t, 0, 0.5));
  const tinte = tramo(t, 1.25, 1.5);
  const absorbe = entra(tramo(t, 1.5, 2.0));
  if (t < 2.0) {
    sombraDelSuelo(CX, SPRITE_Y + 150, 120 * (1 - absorbe), aparece * 0.8);
    const y = mezcla(SPRITE_Y + bob, BOLA_Y, absorbe);
    const escala = ESCALA * aparece * (1 - absorbe);
    puestos.sale = { x: CX, y, escala, alfa: 1 - tinte };
    silueta(siluetas.sale, CX, y, escala, tinte);
  }
  const rayo = tramo(t, 1.05, 1.25) * (1 - tramo(t, 1.85, 2.0));
  if (rayo > 0) {
    g.save();
    g.globalAlpha = rayo * 0.8;
    const yPok = mezcla(SPRITE_Y, BOLA_Y, absorbe);
    const r = g.createLinearGradient(CX, BOLA_Y, CX, yPok);
    r.addColorStop(0, "rgba(199,210,254,0.95)");
    r.addColorStop(1, "rgba(129,140,248,0.15)");
    g.fillStyle = r;
    g.beginPath();
    g.moveTo(CX - 8, BOLA_Y);
    g.lineTo(CX - 90 * (1 - absorbe), yPok);
    g.lineTo(CX + 90 * (1 - absorbe), yPok);
    g.lineTo(CX + 8, BOLA_Y);
    g.fill();
    g.restore();
  }
  if (t >= 0.7 && t < 3.3) {
    const bolaA = tramo(t, 0.7, 1.0);
    const abre = t < 2.0 ? sale(bolaA) : 1 - sale(tramo(t, 2.0, 2.15));
    const tiembla = tramo(t, 2.2, 2.75);
    const giro = tiembla > 0 && tiembla < 1 ? Math.sin(tiembla * Math.PI * 3) * 0.35 * (1 - tiembla) : 0;
    const sube = entra(tramo(t, 2.85, 3.3));
    const y = mezcla(BOLA_Y, -90, sube) - Math.sin(Math.PI * tramo(t, 2.75, 2.85)) * 10;
    if (sube > 0) {
      estela(
        [0.03, 0.06, 0.09, 0.12].map((d) => [CX, mezcla(BOLA_Y, -90, entra(tramo(t - d, 2.85, 3.3)))]),
        "#c7d2fe",
      );
    }
    bola(CX, y, 40 * sale(bolaA), giro, abre, tramo(t, 2.75, 2.85) * (1 - sube));
    destellos(CX, BOLA_Y, 2.75, 10, 70);
  }
  texto(textos.sale, aparece * (1 - tramo(t, 2.6, 2.9)));

  // ---------- 2. Se cruzan ----------
  const p = tramo(t, 3.4, 5.6);
  if (p > 0 && p < 1) {
    const yA = mezcla(H + 80, -80, p);
    const yB = mezcla(-80, H + 80, p);
    const ola = Math.sin(p * Math.PI * 2) * 70;
    const atras = (q: number, sube: boolean): [number, number][] =>
      [0.025, 0.05, 0.075, 0.1, 0.125].map((d) => {
        const pp = clamp(q - d / 2.2);
        const o = Math.sin(pp * Math.PI * 2) * 70;
        return sube ? [CX - 60 + o, mezcla(H + 80, -80, pp)] : [CX + 60 - o, mezcla(-80, H + 80, pp)];
      });
    estela(atras(p, true), "#c7d2fe");
    estela(atras(p, false), "#a5b4fc");
    bola(CX - 60 + ola, yA, 36, t * 9, 0, 0.4);
    bola(CX + 60 - ola, yB, 36, -t * 9, 0, 0.4);
    fogonazo(CX, 360, clamp(1 - Math.abs(p - 0.5) * 8) * 0.45, 260);
    destellos(CX, 360, 4.42, 18, 160, "#c7d2fe");
  }

  // ---------- 3. Baja la del otro, bota y se abre ----------
  const baja = tramo(t, 5.9, 6.9);
  if (t >= 5.9) {
    const abre = sale(tramo(t, 7.0, 7.25));
    const se = 1 - tramo(t, 7.7, 8.0);
    const y = mezcla(-90, BOLA_Y, rebote(baja));
    if (baja < 0.4) {
      estela([0.03, 0.06, 0.09].map((d) => [CX, mezcla(-90, BOLA_Y, rebote(tramo(t - d, 5.9, 6.9)))]), "#a5b4fc");
    }
    sombraDelSuelo(CX, BOLA_Y + 34, 60 * baja, baja * se);
    if (se > 0) bola(CX, y, 40 * (0.6 + 0.4 * se), 0, abre, 0);
  }
  rayos(CX, SPRITE_Y + 20, Math.sin(Math.PI * tramo(t, 7.0, 7.9)) * 0.5, t * 0.6);

  // ---------- 4. Sale el que llega: blanco y luego con su color ----------
  const nace = sale(tramo(t, 7.15, 7.75));
  if (nace > 0) {
    const color = tramo(t, 7.7, 8.1);
    const y = mezcla(BOLA_Y - 20, SPRITE_Y + Math.sin(t * 3) * 4, nace);
    sombraDelSuelo(CX, SPRITE_Y + 150, 120 * nace, nace * 0.8);
    silueta(siluetas.llega, CX, y, ESCALA * nace, 1 - color);
    puestos.llega = { x: CX, y, escala: ESCALA * nace, alfa: color };
    destellos(CX, SPRITE_Y, 7.75, 16, 190);
  }
  texto(textos.llega, sale(tramo(t, 8.0, 8.5)));

  // El fogonazo, por encima de todo menos de los sprites a color
  fogonazo(CX, BOLA_Y - 40, Math.sin(Math.PI * tramo(t, 7.0, 7.6)) * 0.9, 360);
  if (nace > 0 && t > 8.0) {
    g.save();
    for (let i = 0; i < 10; i++) {
      const ciclo = ((t - 8.0) * 0.6 + azar(i)) % 1;
      g.globalAlpha = Math.sin(Math.PI * ciclo) * 0.8;
      g.fillStyle = i % 2 ? "#fde68a" : "#c7d2fe";
      estrella(CX + (azar(i + 5) - 0.5) * 360, SPRITE_Y + 140 - ciclo * 220, 3 + azar(i + 9) * 2);
    }
    g.restore();
  }
  const negro = 1 - tramo(t, 0, 0.35);
  if (negro > 0) {
    g.fillStyle = `rgba(7,8,15,${negro})`;
    g.fillRect(0, 0, W, H);
  }
  return puestos;
}

export function AnimacionDelIntercambio({
  sale: seVa,
  llega,
  alCerrar,
}: {
  sale: PokemonDelIntercambio;
  llega: PokemonDelIntercambio;
  alCerrar: () => void;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const spriteSale = useRef<HTMLDivElement>(null);
  const spriteLlega = useRef<HTMLDivElement>(null);
  const [acabada, setAcabada] = useState(false);

  useEffect(() => {
    const canvas = lienzo.current;
    const caja = escenario.current;
    if (!canvas || !caja) return;
    let vivo = true;
    let marco = 0;
    const bienvenido = llega.sexo === "F" ? "¡Bienvenida" : "¡Bienvenido";
    const textos = {
      sale: [`${seVa.dueno} manda a`, seVa.nombre] as [string, string],
      llega: [`Llega de ${llega.dueno} por la GTS`, `${bienvenido}, ${llega.nombre}!`] as [string, string],
    };
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void (async () => {
      const [a, b] = await Promise.all([
        cargar(seVa.pokemonId ? spriteQuietoDeQuinta(seVa.pokemonId, seVa.shiny) : null),
        cargar(llega.pokemonId ? spriteQuietoDeQuinta(llega.pokemonId, llega.shiny) : null),
        // El lienzo no pide las fuentes solo
        ...["600 22px Barlow", "700 46px 'Barlow Condensed'"].map((f) => document.fonts.load(f).catch(() => null)),
      ]);
      if (!vivo) return;
      const siluetas = { sale: a ? tenido(a, "#a5b4fc") : null, llega: b ? tenido(b, "#ffffff") : null };
      const g = canvas.getContext("2d")!;
      const inicio = performance.now() - (reducir ? FINAL * 1000 : 0);
      const fotograma = (ahora: number) => {
        if (!vivo) return;
        // El lienzo, a la medida de su caja y de la pantalla, para que no se vea borroso
        const lado = caja.clientWidth;
        const densidad = window.devicePixelRatio || 1;
        if (canvas.width !== Math.round(lado * densidad)) {
          canvas.width = canvas.height = Math.round(lado * densidad);
        }
        const k = lado / W;
        g.setTransform(k * densidad, 0, 0, k * densidad, 0, 0);
        const t = (ahora - inicio) / 1000;
        const puestos = pintar(g, t, siluetas, textos);
        for (const [ref, puesto] of [
          [spriteSale, puestos.sale],
          [spriteLlega, puestos.llega],
        ] as const) {
          const el = ref.current;
          if (!el) continue;
          el.style.opacity = String(puesto.alfa);
          // Mide 288 (un sprite de 96 al triple) y se encoge con el escenario: así va igual que su silueta
          el.style.transform = `translate(${puesto.x * k}px, ${puesto.y * k}px) translate(-50%, -50%) scale(${(k * puesto.escala) / ESCALA})`;
        }
        if (t >= FINAL) setAcabada(true);
        marco = requestAnimationFrame(fotograma);
      };
      marco = requestAnimationFrame(fotograma);
    })();
    return () => {
      vivo = false;
      cancelAnimationFrame(marco);
    };
  }, [seVa, llega]);

  // Escape también cierra
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [alCerrar]);

  // En el body: dentro de la página, lo que la anima al entrar la encerraría (y el menú del móvil quedaba encima)
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#07080f] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Intercambio: llega ${llega.nombre}`}
      data-animacion-intercambio
    >
      <div ref={escenario} className="relative aspect-square w-full max-w-[min(720px,calc(100dvh-7rem))] overflow-hidden rounded-2xl">
        <canvas ref={lienzo} className="absolute inset-0 h-full w-full" />
        {/* Los sprites a color, animados, encima del lienzo: a ×3, como sus siluetas */}
        {[
          { ref: spriteSale, p: seVa },
          { ref: spriteLlega, p: llega },
        ].map(({ ref, p }, i) => (
          <div
            key={i}
            ref={ref}
            className="pointer-events-none absolute left-0 top-0 h-[288px] w-[288px] opacity-0 will-change-transform"
          >
            <SpritePokemon src={null} alt="" pokemonId={p.pokemonId} shiny={p.shiny} ficha className="h-full w-full" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" className={acabada ? "btn-primary" : "btn-ghost"} onClick={alCerrar}>
          {acabada ? "Seguir" : "Saltar"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
