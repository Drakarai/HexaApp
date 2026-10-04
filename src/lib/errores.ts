import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * El registro de errores (ver `ErrorDeApp`). Lo apuntan `instrumentation.ts`
 * (lo que falla en el servidor) y `/api/errores` (lo que falla en el navegador
 * de alguien), y se ve en Diagnóstico.
 */

const DIAS = 30;
const MAXIMO = 500;

export type ErrorParaApuntar = {
  origen: "navegador" | "servidor";
  mensaje: string;
  detalle?: string | null;
  codigo?: string | null;
  ruta?: string | null;
  userId?: string | null;
  navegador?: string | null;
};

/**
 * Lo que no es un fallo de la aplicación y solo haría ruido: cosas de
 * extensiones del navegador, avisos de medidas del propio navegador, y lo que
 * pasa al quedarse sin cobertura (la aplicación ya sabe vivir sin línea).
 */
const RUIDO = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /Failed to fetch|Load failed|NetworkError|network error|Network request failed/i,
  /NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR|DYNAMIC_SERVER_USAGE/,
  /AbortError|The operation was aborted/i,
  // Quien pedía la pantalla se fue antes de que llegara (cambió de pantalla deprisa)
  /destination stream closed early/i,
];

export function esRuido(mensaje: string, detalle?: string | null) {
  return RUIDO.some((patron) => patron.test(mensaje) || (detalle ? patron.test(detalle) : false));
}

/** Para agrupar los iguales: el mensaje sin números ni ids, y de dónde salió */
function huellaDe(e: ErrorParaApuntar) {
  const limpio = e.mensaje.replace(/[0-9a-f]{8,}/gi, "#").replace(/\d+/g, "#");
  const primeraLinea = (e.detalle ?? "").split("\n").find((l) => l.trim().startsWith("at ")) ?? "";
  return createHash("sha1")
    .update(`${e.origen}|${limpio}|${primeraLinea.replace(/:\d+:\d+/g, "")}`)
    .digest("hex")
    .slice(0, 16);
}

export async function apuntarError(e: ErrorParaApuntar) {
  if (esRuido(e.mensaje, e.detalle)) return;
  try {
    const quien = e.userId
      ? (await prisma.user.findUnique({ where: { id: e.userId }, select: { displayName: true } }))
          ?.displayName ?? null
      : null;
    await prisma.errorDeApp.create({
      data: {
        origen: e.origen,
        mensaje: e.mensaje.slice(0, 500),
        detalle: e.detalle?.slice(0, 4000) ?? null,
        codigo: e.codigo?.slice(0, 64) ?? null,
        ruta: e.ruta?.slice(0, 300) ?? null,
        userId: e.userId ?? null,
        quien,
        navegador: e.navegador?.slice(0, 200) ?? null,
        huella: huellaDe(e),
      },
    });
    // De vez en cuando, la limpieza: lo viejo fuera y como mucho MAXIMO filas
    if (Math.random() < 0.1) await recortar();
  } catch {
    // Apuntar un fallo no puede provocar otro: si la base de datos no está, se pierde
  }
}

async function recortar() {
  await prisma.errorDeApp.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - DIAS * 86_400_000) } },
  });
  const sobran = await prisma.errorDeApp.findMany({
    orderBy: { createdAt: "desc" },
    skip: MAXIMO,
    select: { id: true },
  });
  if (sobran.length) {
    await prisma.errorDeApp.deleteMany({ where: { id: { in: sobran.map((s) => s.id) } } });
  }
}

export type GrupoDeErrores = {
  huella: string;
  origen: string;
  mensaje: string;
  detalle: string | null;
  codigos: string[];
  veces: number;
  primera: Date;
  ultima: Date;
  rutas: string[];
  quienes: string[];
};

/** Los de los últimos días, agrupados: los que más se repiten y más recientes, arriba */
export async function getErroresAgrupados(): Promise<GrupoDeErrores[]> {
  const filas = await prisma.errorDeApp.findMany({ orderBy: { createdAt: "desc" }, take: MAXIMO });
  const grupos = new Map<string, GrupoDeErrores>();
  for (const f of filas) {
    const g = grupos.get(f.huella);
    if (!g) {
      grupos.set(f.huella, {
        huella: f.huella,
        origen: f.origen,
        mensaje: f.mensaje,
        detalle: f.detalle,
        codigos: f.codigo ? [f.codigo] : [],
        veces: 1,
        primera: f.createdAt,
        ultima: f.createdAt,
        rutas: f.ruta ? [f.ruta] : [],
        quienes: f.quien ? [f.quien] : [],
      });
      continue;
    }
    g.veces++;
    g.primera = f.createdAt;
    if (f.ruta && !g.rutas.includes(f.ruta)) g.rutas.push(f.ruta);
    if (f.quien && !g.quienes.includes(f.quien)) g.quienes.push(f.quien);
    if (f.codigo && !g.codigos.includes(f.codigo)) g.codigos.push(f.codigo);
  }
  return [...grupos.values()].sort((a, b) => b.ultima.getTime() - a.ultima.getTime());
}
