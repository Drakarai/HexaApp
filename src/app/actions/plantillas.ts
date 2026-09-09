"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { requireCompetitionManager } from "@/lib/competition";
import { juegoPorId } from "@/lib/juegos";
import {
  asegurarPlantilla,
  deFabricaParaJuego,
  getPlantilla,
} from "@/lib/plantillas";
import { LEVEL_CAP_KINDS } from "@/lib/constants";
import type { FormState } from "@/app/actions/auth";

/**
 * La plantilla de level caps de cada juego, que es de dónde salen los hitos al
 * empezar un locke. Se administra igual que los mapas: global, con un botón
 * para traer lo de fábrica y editable a mano después.
 */

const TIPOS = new Set<string>(Object.values(LEVEL_CAP_KINDS));
const tipoValido = (valor: string) =>
  TIPOS.has(valor) ? valor : LEVEL_CAP_KINDS.GYM;

function refrescar() {
  revalidatePath("/admin/level-caps");
  revalidatePath("/level-caps");
}

/**
 * Copia lo de fábrica a la plantilla del juego. **Solo añade lo que falte**,
 * comparando por nombre: si ya renombraste o ajustaste un hito no se toca, y si
 * borraste uno a propósito vuelve a salir y lo borras otra vez. Es un botón, no
 * algo que pase solo.
 */
export async function rellenarPlantillaAction(formData: FormData) {
  await requireAdmin();

  const gameId = String(formData.get("gameId") ?? "");
  if (!juegoPorId(gameId)) return;

  const deFabrica = deFabricaParaJuego(gameId);
  if (!deFabrica.length) return;

  const plantilla = await asegurarPlantilla(gameId);
  const existentes = await prisma.levelCapTemplateItem.findMany({
    where: { templateId: plantilla.id },
    select: { label: true },
  });
  const yaEstan = new Set(existentes.map((item) => item.label.toLowerCase()));

  const nuevos = deFabrica.filter(
    (item) => !yaEstan.has(item.label.toLowerCase()),
  );
  if (nuevos.length) {
    await prisma.levelCapTemplateItem.createMany({
      data: nuevos.map((item, indice) => ({
        templateId: plantilla.id,
        label: item.label,
        cap: item.cap,
        kind: item.kind,
        notes: item.notes ?? null,
        position: existentes.length + indice,
      })),
    });
  }

  refrescar();
}

export async function anadirItemPlantillaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const gameId = String(formData.get("gameId") ?? "");
  if (!juegoPorId(gameId)) return { error: "Ese juego no está en la lista." };

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Ponle nombre al hito." };

  const cap = Number(formData.get("cap") ?? 0);
  if (!Number.isFinite(cap) || cap < 1 || cap > 100) {
    return { error: "El nivel tiene que ser un número del 1 al 100." };
  }

  const plantilla = await asegurarPlantilla(gameId);
  const cuantos = await prisma.levelCapTemplateItem.count({
    where: { templateId: plantilla.id },
  });

  await prisma.levelCapTemplateItem.create({
    data: {
      templateId: plantilla.id,
      label,
      cap: Math.trunc(cap),
      kind: tipoValido(String(formData.get("kind") ?? "")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      position: cuantos,
    },
  });

  refrescar();
  return { success: `${label} añadido.` };
}

export async function editarItemPlantillaAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("itemId") ?? "");
  const item = await prisma.levelCapTemplateItem.findUnique({ where: { id } });
  if (!item) return;

  const label = String(formData.get("label") ?? "").trim();
  const cap = Number(formData.get("cap") ?? 0);

  await prisma.levelCapTemplateItem.update({
    where: { id },
    data: {
      label: label || item.label,
      cap: Number.isFinite(cap) && cap >= 1 && cap <= 100 ? Math.trunc(cap) : item.cap,
      kind: tipoValido(String(formData.get("kind") ?? "")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  refrescar();
}

export async function borrarItemPlantillaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("itemId") ?? "");
  await prisma.levelCapTemplateItem.deleteMany({ where: { id } });
  refrescar();
}

/** Sube o baja un hito de la plantilla, intercambiándolo con su vecino. */
export async function moverItemPlantillaAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("itemId") ?? "");
  const haciaArriba = String(formData.get("hacia") ?? "") === "arriba";

  const item = await prisma.levelCapTemplateItem.findUnique({ where: { id } });
  if (!item) return;

  const vecino = await prisma.levelCapTemplateItem.findFirst({
    where: {
      templateId: item.templateId,
      position: haciaArriba ? { lt: item.position } : { gt: item.position },
    },
    orderBy: { position: haciaArriba ? "desc" : "asc" },
  });
  if (!vecino) return;

  // Se intercambian los sitios, que es lo que hace un botón de subir o bajar
  await prisma.$transaction([
    prisma.levelCapTemplateItem.update({
      where: { id: item.id },
      data: { position: vecino.position },
    }),
    prisma.levelCapTemplateItem.update({
      where: { id: vecino.id },
      data: { position: item.position },
    }),
  ]);

  refrescar();
}

/**
 * Trae la plantilla del juego de la edición a sus level caps.
 *
 * A partir de aquí son **suyos**: se editan, se borran y se añaden dentro del
 * locke sin tocar la plantilla, que es lo que se pidió. Como en el resto de
 * copias de fábrica, solo se añade lo que falte por nombre, así que se puede
 * volver a pulsar sin duplicar nada.
 */
export async function traerPlantillaAlLockeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { gameId: true },
  });
  const juego = juegoPorId(competition?.gameId);
  if (!juego) {
    return { error: "Esta edición no tiene juego elegido de la lista." };
  }

  const plantilla = await getPlantilla(juego.id);
  if (!plantilla.length) {
    return {
      error: `${juego.name} todavía no tiene plantilla. Un administrador puede prepararla en Administración → Level caps.`,
    };
  }

  const existentes = await prisma.levelCap.findMany({
    where: { competitionId },
    select: { label: true },
  });
  const yaEstan = new Set(existentes.map((cap) => cap.label.toLowerCase()));

  const nuevos = plantilla.filter(
    (item) => !yaEstan.has(item.label.toLowerCase()),
  );
  if (!nuevos.length) {
    return { success: "Ya estaban todos: no había nada que traer." };
  }

  await prisma.levelCap.createMany({
    data: nuevos.map((item, indice) => ({
      competitionId,
      label: item.label,
      cap: item.cap,
      kind: item.kind,
      notes: item.notes,
      position: existentes.length + indice,
    })),
  });

  revalidatePath("/level-caps");
  revalidatePath("/");
  return {
    success: `${nuevos.length} ${nuevos.length === 1 ? "hito traído" : "hitos traídos"} de ${juego.name}. Ya son de este locke: cámbialos como quieras.`,
  };
}
