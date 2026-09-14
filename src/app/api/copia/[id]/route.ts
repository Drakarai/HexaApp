import { NextResponse } from "next/server";
import { esCreador, getCurrentUser } from "@/lib/auth";
import { leerCopia } from "@/lib/copias";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Descarga una copia como fichero `.json`.
 *
 * Esta es la copia que de verdad salva el día: la que está dentro de la base de
 * datos se va con ella si se cae. Solo administradores globales, y sin guardar
 * en ninguna caché: lleva dentro toda la aplicación.
 */
export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await getCurrentUser();
  if (!esCreador(usuario)) {
    return new NextResponse("No autorizado", {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const { id } = await params;
  const volcado = await leerCopia(id);
  if (!volcado) {
    return new NextResponse("No encontrada", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const dia = volcado.fecha.slice(0, 10);
  return new NextResponse(JSON.stringify(volcado), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hexaapp-${dia}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
