"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { COMPETITION_COOKIE } from "@/lib/competition";
import { juegoPorId } from "@/lib/juegos";
import { ESTADOS_DE_SOLICITUD } from "@/lib/solicitudes";
import { PALETTE } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/app/actions/auth";

/**
 * Pedir, aceptar y rechazar lockes en solitario.
 *
 * El locke que sale de aquí es **de una persona**: `maxPlayers` 1, y quien lo
 * pidió entra como su único jugador **y como administrador de esa edición**,
 * porque es su partida y tiene que poder apañarse con sus level caps y sus
 * reglas sin ir preguntando.
 */

function refrescar() {
  revalidatePath("/competiciones");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

async function slugLibre(base: string) {
  const raiz = slugify(base) || "locke";
  let candidato = raiz;
  let sufijo = 2;
  while (await prisma.competition.findUnique({ where: { slug: candidato } })) {
    candidato = `${raiz}-${sufijo++}`;
  }
  return candidato;
}

/** Cualquiera puede pedir el suyo; lo que no puede es crearlo por su cuenta. */
export async function pedirLockeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre a tu locke." };

  /**
   * Una petición a la vez. Si no, un despiste con el botón deja al
   * administrador con cinco peticiones iguales que resolver una a una.
   */
  const yaTiene = await prisma.lockeRequest.count({
    where: { userId: user.id, estado: ESTADOS_DE_SOLICITUD.PENDIENTE },
  });
  if (yaTiene) {
    return {
      error: "Ya tienes una petición esperando respuesta. Espera a que la vean.",
    };
  }

  const gameIdBruto = String(formData.get("gameId") ?? "").trim();

  await prisma.lockeRequest.create({
    data: {
      userId: user.id,
      name,
      gameId: juegoPorId(gameIdBruto) ? gameIdBruto : null,
      modality: String(formData.get("modality") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
    },
  });

  refrescar();
  return {
    success: "Pedido. Le saldrá un aviso a la organización; te avisamos aquí.",
  };
}

/** El que la pidió puede echarse atrás mientras nadie la haya mirado. */
export async function retirarSolicitudAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("solicitudId") ?? "");

  await prisma.lockeRequest.deleteMany({
    where: { id, userId: user.id, estado: ESTADOS_DE_SOLICITUD.PENDIENTE },
  });
  refrescar();
}

/**
 * Aceptarla: se crea la edición en solitario y se le mete dentro.
 *
 * **No archiva las demás**, al revés que crear una competición normal: un locke
 * de una persona no es la edición del grupo, es algo que corre en paralelo, y
 * archivar el Hexalocke que están jugando todos porque alguien empieza su
 * partida en solitario sería un destrozo.
 */
export async function aceptarSolicitudAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("solicitudId") ?? "");

  const solicitud = await prisma.lockeRequest.findUnique({
    where: { id },
    include: { user: { select: { displayName: true } } },
  });
  if (!solicitud || solicitud.estado !== ESTADOS_DE_SOLICITUD.PENDIENTE) return;

  const juego = juegoPorId(solicitud.gameId);
  const competicion = await prisma.competition.create({
    data: {
      name: solicitud.name,
      slug: await slugLibre(solicitud.name),
      gameId: juego?.id ?? null,
      game: juego?.name ?? null,
      modality: solicitud.modality,
      description: solicitud.description,
      // Un locke de una persona: de aquí sale su perfil (lib/perfiles-de-locke.ts)
      maxPlayers: 1,
      createdById: admin.id,
      participants: {
        create: {
          userId: solicitud.userId,
          displayName: solicitud.user.displayName,
          color: PALETTE[0],
          // Es su partida: se administra sus level caps y sus reglas él solo
          isAdmin: true,
        },
      },
    },
  });

  await prisma.lockeRequest.update({
    where: { id },
    data: {
      estado: ESTADOS_DE_SOLICITUD.ACEPTADA,
      resueltaAt: new Date(),
      resueltaById: admin.id,
      competitionId: competicion.id,
      respuesta: String(formData.get("respuesta") ?? "").trim() || null,
    },
  });

  refrescar();
}

/** Rechazarla, a poder ser diciendo por qué. */
export async function rechazarSolicitudAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("solicitudId") ?? "");

  await prisma.lockeRequest.updateMany({
    where: { id, estado: ESTADOS_DE_SOLICITUD.PENDIENTE },
    data: {
      estado: ESTADOS_DE_SOLICITUD.RECHAZADA,
      resueltaAt: new Date(),
      resueltaById: admin.id,
      respuesta: String(formData.get("respuesta") ?? "").trim() || null,
    },
  });

  refrescar();
}

/**
 * Un atajo para el administrador: crearse el suyo sin pasar por la petición.
 * Es el mismo camino que aceptar una solicitud, pero sin solicitud.
 */
export async function crearLockeEnSolitarioAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre a tu locke." };

  const gameIdBruto = String(formData.get("gameId") ?? "").trim();
  const juego = juegoPorId(gameIdBruto);

  const competicion = await prisma.competition.create({
    data: {
      name,
      slug: await slugLibre(name),
      gameId: juego?.id ?? null,
      game: juego?.name ?? null,
      modality: String(formData.get("modality") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      maxPlayers: 1,
      createdById: admin.id,
      participants: {
        create: {
          userId: admin.id,
          displayName: admin.displayName,
          color: PALETTE[0],
          isAdmin: true,
        },
      },
    },
  });

  // Se abre directamente, que es lo que uno espera al crearse su partida
  const store = await cookies();
  store.set(COMPETITION_COOKIE, competicion.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  refrescar();
  return { success: `"${name}" creado. Ya lo estás viendo.` };
}
