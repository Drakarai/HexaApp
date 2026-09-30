"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreador } from "@/lib/auth";
import { requireCompetitionManager } from "@/lib/competition";
import {
  grupoDePlantillaDeJuego,
  grupoDePlantillaPorId,
  juegoPorId,
} from "@/lib/juegos";
import {
  asegurarPlantilla,
  deFabricaParaGrupo,
  getPlantillaConImagenes,
} from "@/lib/plantillas";
import { LEVEL_CAP_KINDS } from "@/lib/constants";
import { IMAGEN_SIN_CAMBIOS, sanitizeImageValue } from "@/lib/image";
import type { FormState } from "@/app/actions/auth";

/**
 * La plantilla de level caps de cada juego, que es de dónde salen los hitos al
 * empezar un locke. Se administra igual que los mapas: global, con un botón
 * para traer lo de fábrica y editable a mano después.
 */

/**
 * Las medallas que llegan del formulario, sin huecos ni basura.
 *
 * Las que ya estaban guardadas no vuelven a viajar enteras: llegan como
 * "__igual__:N", donde N es el sitio que ocupaban al abrir el formulario, y
 * aquí se cambian por la imagen de verdad. Es lo mismo que hace
 * `actions/level-caps.ts` con las del locke, y por el mismo motivo: si no, cada
 * guardado subiría y bajaría megas de base64.
 */
function leerImagenes(formData: FormData, anteriores: string[] = []) {
  return formData
    .getAll("images")
    .map((valor) => {
      const texto = String(valor ?? "").trim();
      if (texto.startsWith(`${IMAGEN_SIN_CAMBIOS}:`)) {
        return anteriores[Number(texto.split(":")[1])] ?? null;
      }
      return sanitizeImageValue(texto);
    })
    .filter((valor): valor is string => Boolean(valor))
    .slice(0, 8);
}

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
  await requireCreador();

  const grupo = grupoDePlantillaPorId(String(formData.get("grupoId") ?? ""));
  if (!grupo) return;

  const { items: deFabrica } = deFabricaParaGrupo(grupo);
  if (!deFabrica.length) return;

  const plantilla = await asegurarPlantilla(grupo.id);
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
        // De fábrica no vienen medallas: las sube quien prepara la plantilla
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
  await requireCreador();

  const grupo = grupoDePlantillaPorId(String(formData.get("grupoId") ?? ""));
  if (!grupo) return { error: "Ese grupo de juegos no está en la lista." };

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Ponle nombre al hito." };

  const cap = Number(formData.get("cap") ?? 0);
  if (!Number.isFinite(cap) || cap < 1 || cap > 100) {
    return { error: "El nivel tiene que ser un número del 1 al 100." };
  }

  const plantilla = await asegurarPlantilla(grupo.id);
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
      images: leerImagenes(formData),
      position: cuantos,
    },
  });

  refrescar();
  return { success: `${label} añadido.` };
}

export async function editarItemPlantillaAction(formData: FormData) {
  await requireCreador();

  const id = String(formData.get("itemId") ?? "");
  const item = await prisma.levelCapTemplateItem.findUnique({
    where: { id },
    // Aquí sí hacen falta los bytes: el formulario manda "__igual__:N" para
    // las que no se han tocado y hay que sustituirlas por la imagen de verdad
    omit: { images: false },
  });
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
      images: leerImagenes(formData, item.images),
    },
  });

  refrescar();
}

export async function borrarItemPlantillaAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("itemId") ?? "");
  await prisma.levelCapTemplateItem.deleteMany({ where: { id } });
  refrescar();
}

/** Sube o baja un hito de la plantilla, intercambiándolo con su vecino. */
export async function moverItemPlantillaAction(formData: FormData) {
  await requireCreador();

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
  const grupo = grupoDePlantillaDeJuego(competition?.gameId);
  if (!juego || !grupo) {
    return { error: "Esta edición no tiene juego elegido de la lista." };
  }

  const plantilla = await getPlantillaConImagenes(grupo.id);
  if (!plantilla.length) {
    return {
      error: `${grupo.nombre} todavía no tiene plantilla. Un administrador puede prepararla en Administración → Level caps.`,
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
      // Las medallas se copian con el hito: de eso va tener plantilla, de que
      // una edición nueva salga entera y no haya que subirlas otra vez
      images: item.images,
      position: existentes.length + indice,
    })),
  });

  revalidatePath("/level-caps");
  revalidatePath("/");
  return {
    success: `${nuevos.length} ${nuevos.length === 1 ? "hito traído" : "hitos traídos"} de ${grupo.nombre}. Ya son de este locke: cámbialos como quieras.`,
  };
}

/**
 * Copia los hitos de otra plantilla ya preparada.
 *
 * Es lo que hace llevadero preparar una tercera versión o un remake: Amarillo
 * se parece muchísimo a Rojo y Azul y Platino a Diamante y Perla, así que en
 * vez de escribir diez filas otra vez se traen las del hermano y se cambia solo
 * lo que de verdad es distinto.
 *
 * Como el resto de copias, **solo añade lo que falte** comparando por nombre,
 * así que se puede pulsar dos veces sin duplicar nada.
 */
export async function copiarDeOtraPlantillaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCreador();

  const destino = grupoDePlantillaPorId(String(formData.get("grupoId") ?? ""));
  const origen = grupoDePlantillaPorId(String(formData.get("origenId") ?? ""));
  if (!destino || !origen) return { error: "Elige de dónde copiar." };
  if (destino.id === origen.id) {
    return { error: "Esa es la misma plantilla." };
  }

  const aCopiar = await getPlantillaConImagenes(origen.id);
  if (!aCopiar.length) {
    return { error: `${origen.nombre} todavía no tiene nada que copiar.` };
  }

  const plantilla = await asegurarPlantilla(destino.id);
  const existentes = await prisma.levelCapTemplateItem.findMany({
    where: { templateId: plantilla.id },
    select: { label: true },
  });
  const yaEstan = new Set(existentes.map((item) => item.label.toLowerCase()));

  const nuevos = aCopiar.filter(
    (item) => !yaEstan.has(item.label.toLowerCase()),
  );
  if (!nuevos.length) {
    return { success: "Ya estaban todos: no había nada que copiar." };
  }

  await prisma.levelCapTemplateItem.createMany({
    data: nuevos.map((item, indice) => ({
      templateId: plantilla.id,
      label: item.label,
      cap: item.cap,
      kind: item.kind,
      notes: item.notes,
      images: item.images,
      position: existentes.length + indice,
    })),
  });

  refrescar();
  return {
    success: `${nuevos.length} hitos copiados de ${origen.nombre}. Ahora cambia lo que sea distinto en ${destino.nombre}.`,
  };
}
