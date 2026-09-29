"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireCreador, requireUser } from "@/lib/auth";
import { COMPETITION_COOKIE } from "@/lib/competition";
import { juegoPorId, leerJuego } from "@/lib/juegos";
import { ESTADOS_DE_SOLICITUD } from "@/lib/solicitudes";
import { PALETTE } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import { JUGADORES_DEL_SOUL_LINK, JUGADORES_MAXIMOS, leerEstilo } from "@/lib/perfiles-de-locke";
import type { FormState } from "@/app/actions/auth";

/**
 * Pedir, aceptar y rechazar lockes.
 *
 * Quien lo pide entra siempre **como administrador de esa edición**, porque es
 * su locke y tiene que poder apañarse con sus level caps y sus reglas sin ir
 * preguntando.
 *
 * Dos tamaños y una diferencia que importa:
 * - **Para uno** (`maxPlayers` 1): su partida en solitario, y de ahí sale su
 *   perfil de locke (`lib/perfiles-de-locke.ts`).
 * - **Para varios**: además se lleva el **permiso de organizador**, porque un
 *   locke de grupo no sirve de nada si no puede dar de alta a sus amigos.
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

  // El juego, oficial o no (un fangame): ver `leerJuego`
  const juego = leerJuego({
    gameId: String(formData.get("gameId") ?? ""),
    game: String(formData.get("game") ?? ""),
    noOficial: String(formData.get("noOficial") ?? ""),
  });
  if ("error" in juego) return juego;
  // Sin el campo, uno: es como funcionaba esto cuando solo había lockes de uno
  const pedidos = Number(formData.get("maxPlayers") ?? 1);
  const maxPlayers = Number.isFinite(pedidos)
    ? Math.min(JUGADORES_MAXIMOS, Math.max(1, Math.trunc(pedidos)))
    : 1;
  // El estilo solo tiene sentido con compañía: uno solo es en solitario
  const estilo = maxPlayers > 1 ? leerEstilo(String(formData.get("estilo") ?? "")) : "competitivo";
  if (estilo === "soullink" && maxPlayers > JUGADORES_DEL_SOUL_LINK.maximo) {
    return {
      error: `Un Soul Link es de ${JUGADORES_DEL_SOUL_LINK.minimo} a ${JUGADORES_DEL_SOUL_LINK.maximo} jugadores.`,
    };
  }

  await prisma.lockeRequest.create({
    data: {
      userId: user.id,
      name,
      maxPlayers,
      estilo,
      gameId: juego.gameId,
      game: juego.game,
      juegoNoOficial: juego.juegoNoOficial,
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
  const admin = await requireCreador();
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
      // Un fangame lleva su nombre; uno oficial, el de la lista si no se escribió otro
      game: solicitud.juegoNoOficial ? solicitud.game : (solicitud.game ?? juego?.name ?? null),
      juegoNoOficial: solicitud.juegoNoOficial,
      modality: solicitud.modality,
      description: solicitud.description,
      maxPlayers: solicitud.maxPlayers,
      estilo: solicitud.estilo,
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

  /**
   * Un locke de grupo no sirve de nada si no puede meter a nadie, así que al
   * aceptarlo se lleva el permiso de organizador: da de alta a sus amigos y
   * puede montar más lockes suyos. Uno en solitario no lo necesita.
   */
  if (solicitud.maxPlayers > 1) {
    await prisma.user.update({
      where: { id: solicitud.userId },
      data: { puedeCrearLockes: true },
    });
  }

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
  const admin = await requireCreador();
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
  const admin = await requireCreador();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre a tu locke." };

  const juego = leerJuego({
    gameId: String(formData.get("gameId") ?? ""),
    game: String(formData.get("game") ?? ""),
    noOficial: String(formData.get("noOficial") ?? ""),
  });
  if ("error" in juego) return juego;

  const competicion = await prisma.competition.create({
    data: {
      name,
      slug: await slugLibre(name),
      gameId: juego.gameId,
      game: juego.juegoNoOficial
        ? juego.game
        : (juego.game ?? juegoPorId(juego.gameId)?.name ?? null),
      juegoNoOficial: juego.juegoNoOficial,
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
