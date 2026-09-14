"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireCreador, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  requireCompetitionManager,
} from "@/lib/competition";
import { imagenEditada, sanitizeImageValue } from "@/lib/image";
import { objetoPorSlug } from "@/lib/objetos";
import { descargarSpriteDeObjeto } from "@/lib/sprites-servidor";
import type { FormState } from "@/app/actions/auth";

/**
 * La bolsa.
 *
 * Dos permisos distintos y conviene no mezclarlos:
 * - **Añadir y quitar** es cosa de administradores. Ellos llevan el inventario.
 * - **Usar** es cosa del dueño (y de un administrador, que a veces gasta uno
 *   por alguien que no está delante del móvil).
 *
 * Ver la bolsa de otro no lo puede hacer nadie que no sea administrador, y eso
 * se comprueba en las páginas, no aquí: aquí lo que se protege es escribir.
 */

function refrescar() {
  revalidatePath("/bolsa");
  revalidatePath("/bolsa/todas");
  revalidatePath("/actividad");
}

/** El dibujo que toca guardar: el de PokéAPI si es de la lista, o el subido. */
async function imagenDelFormulario(formData: FormData, apiSlug: string | null) {
  if (apiSlug) return (await descargarSpriteDeObjeto(apiSlug)) ?? null;
  return sanitizeImageValue(formData.get("image"));
}

/**
 * Lo que venga en "apiSlug", pero solo si de verdad está en la lista y el
 * formulario venía en la pestaña de los juegos: si no, un grupo llamado igual
 * que una Poké Ball se quedaría con su dibujo.
 */
function slugDelFormulario(formData: FormData) {
  if (formData.get("tipo") && formData.get("tipo") !== "juegos") return null;
  const bruto = String(formData.get("apiSlug") ?? "").trim();
  return bruto && objetoPorSlug(bruto) ? bruto : null;
}

// ---------------------------------------------------------------------------
// El catálogo: los objetos que existen
// ---------------------------------------------------------------------------

export async function crearObjetoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCreador();

  const apiSlug = slugDelFormulario(formData);
  const esGrupo = formData.get("tipo") === "grupo";
  const name =
    String(formData.get("name") ?? "").trim() ||
    (apiSlug ? (objetoPorSlug(apiSlug)?.nombre ?? "") : "");

  if (!name) {
    return { error: esGrupo ? "El grupo necesita un nombre." : "El objeto necesita un nombre." };
  }
  if (name.length > 60) return { error: "Ese nombre es demasiado largo." };

  if (apiSlug) {
    const repetido = await prisma.item.findUnique({ where: { apiSlug } });
    if (repetido) return { error: `"${repetido.name}" ya está en el catálogo.` };
  }

  await prisma.item.create({
    data: {
      name,
      apiSlug,
      isGroup: esGrupo,
      description: String(formData.get("description") ?? "").trim() || null,
      image: await imagenDelFormulario(formData, apiSlug),
    },
  });

  refrescar();
  return {
    success: esGrupo
      ? `Grupo "${name}" creado. Ahora añádele los objetos que se pueden elegir.`
      : `"${name}" añadido al catálogo.`,
  };
}

export async function editarObjetoAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  await prisma.item.update({
    where: { id },
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      image: imagenEditada(formData.get("image")),
    },
  });
  refrescar();
}

/** Borra el objeto, sus opciones y lo saca de todas las bolsas. */
export async function borrarObjetoAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("itemId") ?? "");
  if (id) await prisma.item.delete({ where: { id } });
  refrescar();
}

// ---------------------------------------------------------------------------
// Las opciones de un objeto (el sub-apartado)
// ---------------------------------------------------------------------------

export async function anadirOpcionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCreador();

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { error: "No sé a qué grupo añadirlo." };

  const apiSlug = slugDelFormulario(formData);
  const name =
    String(formData.get("name") ?? "").trim() ||
    (apiSlug ? (objetoPorSlug(apiSlug)?.nombre ?? "") : "");
  if (!name) return { error: "El objeto necesita un nombre." };

  // Añadirle algo a un objeto suelto lo convierte en grupo: es lo que uno
  // espera al ponerle cosas dentro, y si no, se gastaría sin preguntar
  const ultima = await prisma.itemOption.findFirst({
    where: { itemId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  await prisma.item.update({ where: { id: itemId }, data: { isGroup: true } });

  await prisma.itemOption.create({
    data: {
      itemId,
      name,
      apiSlug,
      image: await imagenDelFormulario(formData, apiSlug),
      position: (ultima?.position ?? -1) + 1,
    },
  });

  refrescar();
  return { success: `"${name}" añadido al grupo.` };
}

export async function borrarOpcionAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("optionId") ?? "");
  if (id) await prisma.itemOption.delete({ where: { id } });
  refrescar();
}

// ---------------------------------------------------------------------------
// Las bolsas: quién tiene qué
// ---------------------------------------------------------------------------

/**
 * Dar un objeto es **cosa del locke**, no de la aplicación: lo hace quien
 * administra la edición en la que juega esa persona. El catálogo de objetos, en
 * cambio, es de toda la casa y lo lleva el Creador.
 */
export async function darObjetoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!participantId || !itemId) return { error: "Elige el objeto." };

  const deQuien = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { competitionId: true },
  });
  if (!deQuien) return { error: "Ese jugador ya no está." };
  try {
    await requireCompetitionManager(deQuien.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const cantidad = Number(String(formData.get("quantity") ?? "1"));
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
    return { error: "La cantidad tiene que ser un número del 1 al 99." };
  }

  const [objeto, jugador] = await Promise.all([
    prisma.item.findUnique({ where: { id: itemId }, select: { name: true } }),
    prisma.participant.findUnique({
      where: { id: participantId },
      select: { displayName: true },
    }),
  ]);
  if (!objeto || !jugador) return { error: "Ese objeto o ese jugador ya no está." };

  const note = String(formData.get("note") ?? "").trim() || null;

  // Si ya lo tiene se le suma a lo que tenga, que es lo que uno espera al darle
  // dos pociones a alguien que ya tenía una
  await prisma.bagEntry.upsert({
    where: { participantId_itemId: { participantId, itemId } },
    create: { participantId, itemId, quantity: cantidad, note },
    update: { quantity: { increment: cantidad }, ...(note ? { note } : {}) },
  });

  refrescar();
  return {
    success: `${cantidad} × ${objeto.name} para ${jugador.displayName}.`,
  };
}

/** Quita una unidad, o la fila entera si se pide. No cuenta como usarlo. */
export async function quitarObjetoAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) return;
  const todo = formData.get("todo") === "1";

  const entrada = await prisma.bagEntry.findUnique({
    where: { id: entryId },
    include: { participant: { select: { competitionId: true } } },
  });
  if (!entrada) return;
  // Igual que al darlo: manda quien administra ese locke
  await requireCompetitionManager(entrada.participant.competitionId);

  if (todo || entrada.quantity <= 1) {
    await prisma.bagEntry.delete({ where: { id: entryId } });
  } else {
    await prisma.bagEntry.update({
      where: { id: entryId },
      data: { quantity: { decrement: 1 } },
    });
  }

  refrescar();
}

/**
 * Gastar un objeto: baja uno la cantidad y, si era el último, desaparece de la
 * bolsa. Queda apuntado en `BagUse`, que es lo que sale en el muro: **la bolsa
 * es privada, pero usar algo se anuncia**.
 *
 * Si el objeto tiene opciones hay que decir cuál se elige; el menú lo enseña la
 * página, pero que la opción sea de ese objeto se comprueba aquí.
 */
export async function usarObjetoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const usuario = await getCurrentUser();
  if (!usuario) return { error: "Tienes que iniciar sesión." };

  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) return { error: "No sé qué objeto quieres usar." };

  const entrada = await prisma.bagEntry.findUnique({
    where: { id: entryId },
    include: {
      participant: {
        select: { userId: true, displayName: true, competitionId: true },
      },
      item: {
        select: {
          id: true,
          name: true,
          isGroup: true,
          options: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!entrada) return { error: "Ese objeto ya no está en la bolsa." };

  // El dueño, o quien administra ese locke gastándolo por él
  const suyo = entrada.participant.userId === usuario.id;
  if (
    !suyo &&
    !(await canManageCompetition(entrada.participant.competitionId, usuario))
  ) {
    return { error: "Esa bolsa no es tuya." };
  }

  const opcionId = String(formData.get("optionId") ?? "").trim() || null;
  const opciones = entrada.item.options;

  // Un grupo sin nada dentro no se puede gastar: no habría qué elegir, y
  // gastarlo en silencio sería perderlo por la cara
  if (entrada.item.isGroup && !opciones.length) {
    return {
      error: `"${entrada.item.name}" es un grupo y todavía no tiene objetos dentro. Que un administrador se los ponga.`,
    };
  }
  if (opciones.length && !opcionId) {
    return { error: "Elige qué te quedas antes de gastarlo." };
  }
  const opcion = opcionId
    ? opciones.find((candidata) => candidata.id === opcionId)
    : null;
  if (opcionId && !opcion) {
    return { error: "Esa opción no es de este objeto." };
  }

  /**
   * Bajar la cantidad y apuntar el gasto van juntos: si se apuntara el uso y
   * fallara el descuento, el objeto se podría gastar dos veces.
   */
  await prisma.$transaction([
    entrada.quantity <= 1
      ? prisma.bagEntry.delete({ where: { id: entryId } })
      : prisma.bagEntry.update({
          where: { id: entryId },
          data: { quantity: { decrement: 1 } },
        }),
    prisma.bagUse.create({
      data: {
        participantId: entrada.participantId,
        itemId: entrada.item.id,
        itemName: entrada.item.name,
        optionId: opcion?.id ?? null,
        optionName: opcion?.name ?? null,
      },
    }),
  ]);

  refrescar();
  return {
    success: opcion
      ? `Has usado ${entrada.item.name} y te quedas con ${opcion.name}.`
      : `Has usado ${entrada.item.name}.`,
  };
}
