import { NextResponse } from "next/server";
import { esPeticionValida, spriteGuardado } from "@/lib/sprites-guardados";

/**
 * Un sprite de PokéAPI servido desde aquí: `/api/sprite/v1/<clase>/[shiny/]<número o objeto>`.
 * La primera vez se baja de GitHub, se prepara y se guarda; después sale del
 * almacén (ver lib/sprites-guardados.ts).
 *
 * Sin sesión, como los gritos: son los sprites de los juegos, iguales para
 * todo el mundo, y así la red de Vercel los guarda para todos. La dirección
 * lleva una versión (`v1`): si un día se preparan de otra forma, se cambia y
 * nadie se queda con los de antes en caché.
 */

// No cambian nunca para la misma dirección: un año, en el navegador y en la red de Vercel
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

function noHay(status: number) {
  return new NextResponse("No existe", {
    status,
    // Que no lo pida otra vez enseguida, pero que no se quede para siempre: puede llegar a haberlo
    headers: { "Cache-Control": status === 404 ? "public, max-age=86400, s-maxage=86400" : "no-store" },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ partes: string[] }> }) {
  const { partes } = await params;
  const [version, clase, ...resto] = partes;
  const shiny = resto[0] === "shiny";
  const id = (shiny ? resto[1] : resto[0])?.replace(/\.(png|gif)$/, "") ?? "";
  if (version !== "v1" || resto.length !== (shiny ? 2 : 1) || !esPeticionValida(clase, id)) return noHay(404);

  const dataUrl = await spriteGuardado(clase, id, shiny);
  const partido = dataUrl && /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!partido) return noHay(404);
  const bytes = Buffer.from(partido[2], "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": partido[1], "Content-Length": String(bytes.length), "Cache-Control": CACHE },
  });
}
