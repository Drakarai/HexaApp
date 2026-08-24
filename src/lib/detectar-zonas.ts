import "server-only";
import sharp from "sharp";

/**
 * Saca las zonas de la imagen de fondo de un mapa, mirando sus colores.
 *
 * Los mapas de tracker de nuzlocke que circulan por internet ya vienen con las
 * casillas dibujadas: las ciudades en rojo y los tramos de ruta en blanco sobre
 * el dibujo de la región. Esto los reconoce y crea una zona por cada mancha,
 * exactamente donde está, de modo que colocar cincuenta zonas a mano se
 * convierte en ponerles el nombre.
 *
 * Es una ayuda, no una ciencia: lo que salga se mueve, se cambia de forma y se
 * borra desde el editor como cualquier otra zona.
 */

/** Manchas más pequeñas que esto son adornos (los tejados, las sombras). */
const MINIMO_DE_PIXELES = 24;
/** Ni una imagen enorme ni una diminuta: se analiza a un tamaño manejable. */
const ANCHO_DE_ANALISIS = 600;

export type ZonaDetectada = {
  /** En coordenadas del lienzo del mapa, no de la imagen */
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "ciudad" | "ruta";
};

type Prueba = (r: number, g: number, b: number) => boolean;

/** Rojos y rosas fuertes: en estos mapas son las ciudades. */
const ES_CIUDAD: Prueba = (r, g, b) => r > 150 && g < 120 && b < 130;
/** Blancos y casi blancos: los caminos. */
const ES_RUTA: Prueba = (r, g, b) => r > 225 && g > 225 && b > 225;

/**
 * Manchas de un color, con su recuadro. Es un recorrido por anchura con una
 * pila propia y no recursivo: una mancha grande son miles de píxeles y la
 * recursión se comería la memoria de llamadas.
 */
function manchas(
  datos: Buffer,
  ancho: number,
  alto: number,
  canales: number,
  prueba: Prueba,
) {
  const visto = new Uint8Array(ancho * alto);
  const encaja = (x: number, y: number) => {
    const i = (y * ancho + x) * canales;
    return prueba(datos[i], datos[i + 1], datos[i + 2]);
  };

  const salida: { n: number; x: number; y: number; w: number; h: number }[] = [];

  for (let y0 = 0; y0 < alto; y0++) {
    for (let x0 = 0; x0 < ancho; x0++) {
      const inicio = y0 * ancho + x0;
      if (visto[inicio] || !encaja(x0, y0)) continue;

      visto[inicio] = 1;
      const pila: [number, number][] = [[x0, y0]];
      let n = 0;
      let minX = x0;
      let maxX = x0;
      let minY = y0;
      let maxY = y0;

      while (pila.length) {
        const [x, y] = pila.pop()!;
        n++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
          const i = ny * ancho + nx;
          if (visto[i] || !encaja(nx, ny)) continue;
          visto[i] = 1;
          pila.push([nx, ny]);
        }
      }

      if (n >= MINIMO_DE_PIXELES) {
        salida.push({
          n,
          x: minX,
          y: minY,
          w: maxX - minX + 1,
          h: maxY - minY + 1,
        });
      }
    }
  }

  return salida;
}

/**
 * Analiza la imagen de fondo de un mapa y devuelve las zonas que encuentra,
 * ya en coordenadas del lienzo.
 */
export async function detectarZonas(
  imagen: string,
  lienzo: { width: number; height: number },
): Promise<ZonaDetectada[]> {
  const coincide = /^data:[^;,]+;base64,(.*)$/s.exec(imagen);
  if (!coincide) return [];

  const original = Buffer.from(coincide[1], "base64");
  const { data, info } = await sharp(original)
    .resize(ANCHO_DE_ANALISIS, null, { fit: "inside", withoutEnlargement: false })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const escalaX = lienzo.width / info.width;
  const escalaY = lienzo.height / info.height;
  const aLienzo = (mancha: { x: number; y: number; w: number; h: number }) => ({
    x: Math.round(mancha.x * escalaX),
    y: Math.round(mancha.y * escalaY),
    w: Math.max(12, Math.round(mancha.w * escalaX)),
    h: Math.max(12, Math.round(mancha.h * escalaY)),
  });

  const ciudades = manchas(data, info.width, info.height, info.channels, ES_CIUDAD)
    .map((mancha) => ({ ...aLienzo(mancha), kind: "ciudad" as const }));
  const rutas = manchas(data, info.width, info.height, info.channels, ES_RUTA)
    .map((mancha) => ({ ...aLienzo(mancha), kind: "ruta" as const }));

  // De arriba abajo y de izquierda a derecha: así los nombres provisionales
  // ("Zona 1", "Zona 2"…) siguen el orden en el que se leen en el mapa
  return [...ciudades, ...rutas].sort(
    (a, b) => a.y - b.y || a.x - b.x,
  );
}
