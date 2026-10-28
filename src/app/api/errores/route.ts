import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { apuntarError } from "@/lib/errores";
import { prisma } from "@/lib/db";

const POR_HORA = 30;

/**
 * Donde el navegador de cada uno manda **lo que le falla a él** (ver
 * components/cazador-de-errores.tsx). Solo con sesión: sin ella esto sería una
 * puerta para llenar la base de datos de basura. Contesta siempre que bien,
 * que al navegador no le sirve de nada saber más.
 */
export async function POST(request: Request) {
  const sesion = await readSession();
  if (!sesion) return new NextResponse(null, { status: 204 });

  /**
   * Un tope por persona: el registro guarda como mucho unos miles y tira lo
   * viejo, así que alguien mandando basura sin parar acabaría tapando los
   * fallos de verdad de los demás. Un navegador roto de verdad no llega a esto.
   */
  const ultimaHora = await prisma.errorDeApp.count({
    where: { userId: sesion.userId, createdAt: { gt: new Date(Date.now() - 3_600_000) } },
  });
  if (ultimaHora >= POR_HORA) return new NextResponse(null, { status: 204 });

  const crudo = await request.text();
  if (crudo.length > 12_000) return new NextResponse(null, { status: 204 });
  try {
    const datos = JSON.parse(crudo) as { mensaje?: unknown; detalle?: unknown; ruta?: unknown };
    if (typeof datos.mensaje !== "string" || !datos.mensaje) {
      return new NextResponse(null, { status: 204 });
    }
    await apuntarError({
      origen: "navegador",
      mensaje: datos.mensaje,
      detalle: typeof datos.detalle === "string" ? datos.detalle : null,
      ruta: typeof datos.ruta === "string" ? datos.ruta : null,
      userId: sesion.userId,
      navegador: request.headers.get("user-agent"),
    });
  } catch {
    // Un cuerpo que no es JSON: se ignora
  }
  return new NextResponse(null, { status: 204 });
}
