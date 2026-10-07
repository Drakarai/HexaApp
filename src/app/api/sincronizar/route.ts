import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apuntarCapturaAction } from "@/app/actions/mapas";
import { createDeathAction } from "@/app/actions/deaths";
import { createNoteAction } from "@/app/actions/notes";
import { toggleGymClearAction } from "@/app/actions/level-caps";
import {
  apuntarEnCajaAction,
  darPorMuertoAction,
  evolucionarAction,
  moverPokemonAction,
} from "@/app/actions/equipo-y-caja";

/**
 * La puerta por la que entra lo que se apuntó sin conexión.
 *
 * **Reutiliza las mismas acciones que los formularios de siempre**, con sus
 * comprobaciones de permisos y sus validaciones: aquí no hay una segunda forma
 * de escribir en la base de datos, que sería el sitio perfecto para que se
 * colara un agujero. Lo único que añade esta puerta es:
 *
 * - **Que no se duplique**: cada apunte trae un identificador que generó el
 *   móvil y se guarda al aplicarlo (`ApunteSincronizado`). Si llega dos veces,
 *   la segunda se descarta.
 * - **Que cada cosa vaya a su locke**: una captura apuntada en el Hexalocke 2
 *   se sube al Hexalocke 2 aunque entre medias se cambiara de edición.
 *
 * Y es una dirección propia y no una server action a propósito: el
 * identificador interno de una server action **cambia en cada despliegue**, y
 * un apunte que se quedó en la cola el martes tiene que poder subirse el
 * jueves aunque la aplicación se haya actualizado por el camino.
 */

/** Tope por envío, para que una cola enorme no tumbe la petición. */
const MAXIMO = 100;

type ApunteEntrante = {
  id?: unknown;
  tipo?: unknown;
  datos?: unknown;
};

type Resultado = {
  id: string;
  estado: "hecho" | "repetido" | "error";
  mensaje?: string;
};

export async function POST(request: Request) {
  const user = await requireUser();

  let cuerpo: { apuntes?: ApunteEntrante[] };
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "No he entendido el envío." }, { status: 400 });
  }

  const apuntes = Array.isArray(cuerpo.apuntes) ? cuerpo.apuntes.slice(0, MAXIMO) : [];
  if (!apuntes.length) return NextResponse.json({ resultados: [] });

  const resultados: Resultado[] = [];

  // En orden y de uno en uno: un apunte puede depender del anterior (una baja
  // de un pokémon que se capturó hace dos minutos sin línea)
  for (const bruto of apuntes) {
    const id = typeof bruto?.id === "string" ? bruto.id : "";
    const tipo = typeof bruto?.tipo === "string" ? bruto.tipo : "";
    const datos =
      bruto?.datos && typeof bruto.datos === "object"
        ? (bruto.datos as Record<string, unknown>)
        : {};
    if (!id || !tipo) continue;

    resultados.push(await aplicar({ id, tipo, datos, userId: user.id }));
  }

  return NextResponse.json({ resultados });
}

async function aplicar({
  id,
  tipo,
  datos,
  userId,
}: {
  id: string;
  tipo: string;
  datos: Record<string, unknown>;
  userId: string;
}): Promise<Resultado> {
  /**
   * Se apunta **antes** de aplicarlo: si dos envíos llegan a la vez, el
   * segundo choca contra la clave y se va por "repetido" en vez de escribir
   * dos veces. Si luego falla al aplicarlo, se borra la marca.
   */
  try {
    await prisma.apunteSincronizado.create({ data: { id, userId, tipo } });
  } catch {
    return { id, estado: "repetido" };
  }

  try {
    const formData = new FormData();
    for (const [campo, valor] of Object.entries(datos)) {
      if (typeof valor === "string") formData.set(campo, valor);
    }

    const mensaje = await ejecutar(tipo, formData);
    if (mensaje) {
      await prisma.apunteSincronizado.delete({ where: { id } }).catch(() => {});
      return { id, estado: "error", mensaje };
    }
    return { id, estado: "hecho" };
  } catch (error) {
    await prisma.apunteSincronizado.delete({ where: { id } }).catch(() => {});
    return { id, estado: "error", mensaje: (error as Error).message };
  }
}

/** Aplica el apunte. Devuelve el motivo si no se pudo, o null si fue bien. */
async function ejecutar(tipo: string, formData: FormData): Promise<string | null> {
  switch (tipo) {
    case "captura": {
      /**
       * La captura va al mapa de quien la apunta **en el locke en el que la
       * apuntó** (el `competitionId` del formulario), aunque entre medias se
       * haya cambiado de edición. Antes se paraba con un aviso y había que
       * cambiarse a mano para subirla.
       */
      const estado = await apuntarCapturaAction(null, formData);
      return estado?.error ?? null;
    }

    case "baja": {
      const estado = await createDeathAction(null, formData);
      return estado?.error ?? null;
    }

    case "nota": {
      const estado = await createNoteAction(null, formData);
      return estado?.error ?? null;
    }

    case "gimnasio": {
      /**
       * De la cola no viene "cámbialo", viene **cómo tiene que quedar**: si
       * entre medias ya se marcó desde otro sitio, esto no lo desmarca.
       */
      const levelCapId = String(formData.get("levelCapId") ?? "");
      const participantId = String(formData.get("participantId") ?? "");
      const superado = String(formData.get("estado") ?? "1") === "1";
      if (!levelCapId || !participantId) return "Falta el gimnasio o el jugador.";

      const yaEsta = await prisma.gymClear.findUnique({
        where: { participantId_levelCapId: { participantId, levelCapId } },
        select: { id: true },
      });
      if (Boolean(yaEsta) === superado) return null;

      // La acción vuelve a comprobar los permisos, que es lo que importa
      await toggleGymClearAction(formData);
      return null;
    }

    // Los del Equipo y PC: las mismas acciones, con sus mismos permisos
    case "caja": {
      const estado = await apuntarEnCajaAction(null, formData);
      return estado?.error ?? null;
    }

    case "movimiento": {
      const hueco = String(formData.get("hueco") ?? "");
      const lugar = String(formData.get("lugar") ?? "");
      // La caja solo viene del «Mover a la caja…» de la ficha
      const caja = String(formData.get("caja") ?? "");
      const estado = await moverPokemonAction({
        captureId: String(formData.get("captureId") ?? ""),
        lugar: lugar === "equipo" ? "equipo" : "caja",
        hueco: hueco === "" ? null : Number(hueco),
        caja: caja === "" ? null : Number(caja),
      });
      return estado.error ?? null;
    }

    case "evolucion": {
      const estado = await evolucionarAction({
        captureId: String(formData.get("captureId") ?? ""),
        pokemonId: Number(formData.get("pokemonId") ?? 0),
      });
      return estado.error ?? null;
    }

    case "caida": {
      const estado = await darPorMuertoAction({
        captureId: String(formData.get("captureId") ?? ""),
        causa: String(formData.get("causa") ?? ""),
        zoneId: String(formData.get("zoneId") ?? "") || null,
        location: String(formData.get("location") ?? "") || null,
      });
      return estado.error ?? null;
    }

    default:
      return "No sé qué es esto.";
  }
}
