/**
 * Temas de la aplicación: uno por cada juego principal de Pokémon.
 *
 * Criterio de la lista: un tema por cada juego con nombre propio. Quedan fuera
 * los que son una variante del mismo nombre (Rubí Omega, Ultrasol, Blanco 2,
 * HeartGold…), porque compartirían color con el original; las terceras
 * ediciones sí entran, ya que tienen nombre y color propios (Amarillo, Cristal,
 * Esmeralda, Platino).
 *
 * Todos son oscuros: la interfaz mantiene el fondo casi negro y lo que cambia
 * es el color de acento y el tinte de las superficies.
 */

export const DEFAULT_THEME = "hexa";

type ThemeSeed = {
  id: string;
  name: string;
  group: string;
  /** Color de acento, en tono medio-oscuro */
  accent: string;
  /** Tono con el que se tiñen los fondos (0-360) */
  hue: number;
  /** Saturación del tinte de fondo, en porcentaje */
  tint?: number;
  /** Valores escritos a mano que se imponen a los calculados */
  overrides?: Record<string, string>;
};

const SEEDS: ThemeSeed[] = [
  // El aspecto original de HexaApp, con sus colores exactos
  {
    id: "hexa",
    name: "HexaApp",
    group: "Por defecto",
    accent: "#4f46e5",
    hue: 232,
    tint: 34,
    overrides: {
      "--color-brand-400": "#818cf8",
      "--color-brand-500": "#6366f1",
      "--color-ink-950": "#070a13",
      "--color-ink-900": "#0b1020",
      "--color-ink-850": "#10162b",
      "--color-ink-800": "#161d34",
      "--color-ink-700": "#1f2942",
      "--color-ink-600": "#2c3855",
      "--glow-a": "rgba(99, 102, 241, 0.18)",
      "--glow-b": "rgba(16, 185, 129, 0.12)",
    },
  },

  { id: "rojo", name: "Rojo", group: "1ª generación", accent: "#b03535", hue: 0, tint: 22 },
  { id: "azul", name: "Azul", group: "1ª generación", accent: "#2f5fa8", hue: 217, tint: 26 },
  { id: "amarillo", name: "Amarillo", group: "1ª generación", accent: "#a8802a", hue: 43, tint: 20 },

  { id: "oro", name: "Oro", group: "2ª generación", accent: "#9c7a24", hue: 40, tint: 22 },
  { id: "plata", name: "Plata", group: "2ª generación", accent: "#6b7684", hue: 213, tint: 14 },
  { id: "cristal", name: "Cristal", group: "2ª generación", accent: "#2e8792", hue: 187, tint: 24 },

  { id: "rubi", name: "Rubí", group: "3ª generación", accent: "#9b2740", hue: 345, tint: 24 },
  { id: "zafiro", name: "Zafiro", group: "3ª generación", accent: "#27508f", hue: 222, tint: 30 },
  { id: "esmeralda", name: "Esmeralda", group: "3ª generación", accent: "#2b8055", hue: 155, tint: 24 },

  { id: "diamante", name: "Diamante", group: "4ª generación", accent: "#4f7fa6", hue: 205, tint: 20 },
  { id: "perla", name: "Perla", group: "4ª generación", accent: "#a1567e", hue: 325, tint: 20 },
  { id: "platino", name: "Platino", group: "4ª generación", accent: "#77778c", hue: 240, tint: 12 },

  { id: "negro", name: "Negro", group: "5ª generación", accent: "#4a4f5c", hue: 220, tint: 10 },
  { id: "blanco", name: "Blanco", group: "5ª generación", accent: "#8b93a3", hue: 220, tint: 8 },

  { id: "x", name: "X", group: "6ª generación", accent: "#2b6ea3", hue: 205, tint: 28 },
  { id: "y", name: "Y", group: "6ª generación", accent: "#a33b32", hue: 5, tint: 24 },

  { id: "sol", name: "Sol", group: "7ª generación", accent: "#b06326", hue: 28, tint: 24 },
  { id: "luna", name: "Luna", group: "7ª generación", accent: "#4b4a9c", hue: 245, tint: 28 },

  { id: "espada", name: "Espada", group: "8ª generación", accent: "#25748a", hue: 194, tint: 26 },
  { id: "escudo", name: "Escudo", group: "8ª generación", accent: "#9c3459", hue: 335, tint: 26 },

  { id: "escarlata", name: "Escarlata", group: "9ª generación", accent: "#b34a2a", hue: 14, tint: 26 },
  { id: "purpura", name: "Púrpura", group: "9ª generación", accent: "#6f3f9e", hue: 270, tint: 30 },
];

// --- utilidades de color -----------------------------------------------------

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function hslToHex(h: number, s: number, l: number) {
  const saturation = s / 100;
  const lightness = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n: number) =>
    lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (value: number) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function rgbToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
  }

  return { h: hue, s: saturation * 100, l: lightness * 100 };
}

function lighten(hex: string, amount: number) {
  const { h, s, l } = rgbToHsl(hex);
  return hslToHex(h, s, Math.min(96, l + amount));
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- generación de la paleta -------------------------------------------------

export type Theme = {
  id: string;
  name: string;
  group: string;
  /** Color con el que se pinta la muestra en el selector */
  swatch: string;
  /** Variables CSS que se aplican al <html> */
  vars: Record<string, string>;
};

function buildTheme(seed: ThemeSeed): Theme {
  const tint = seed.tint ?? 20;
  // Los fondos son casi negros, apenas teñidos del color del juego
  const surface = (lightness: number, saturation = tint) =>
    hslToHex(seed.hue, saturation, lightness);

  return {
    id: seed.id,
    name: seed.name,
    group: seed.group,
    swatch: seed.accent,
    vars: {
      "--color-brand-600": seed.accent,
      "--color-brand-500": lighten(seed.accent, 8),
      "--color-brand-400": lighten(seed.accent, 20),
      "--color-ink-950": surface(4.5),
      "--color-ink-900": surface(7),
      "--color-ink-850": surface(9.5),
      "--color-ink-800": surface(12),
      "--color-ink-700": surface(17, Math.max(10, tint - 6)),
      "--color-ink-600": surface(24, Math.max(8, tint - 10)),
      // Los dos halos de color del fondo de la página
      "--glow-a": rgba(seed.accent, 0.22),
      "--glow-b": rgba(lighten(seed.accent, 22), 0.12),
      ...seed.overrides,
    },
  };
}

export const THEMES: Theme[] = SEEDS.map(buildTheme);

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(id: string | null | undefined): Theme {
  return BY_ID.get(id ?? "") ?? BY_ID.get(DEFAULT_THEME)!;
}

export function isThemeId(id: string) {
  return BY_ID.has(id);
}

/** Temas agrupados por generación, para pintarlos ordenados en el perfil. */
export function themesByGroup() {
  const groups = new Map<string, Theme[]>();
  for (const theme of THEMES) {
    const list = groups.get(theme.group) ?? [];
    list.push(theme);
    groups.set(theme.group, list);
  }
  return [...groups.entries()];
}
