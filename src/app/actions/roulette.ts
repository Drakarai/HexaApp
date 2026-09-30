"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canManageCompetition,
  edicionCerradaPara,
  requireCompetitionManager,
} from "@/lib/competition";
import { PALETTE } from "@/lib/constants";
import {
  describirPremio,
  entregarPremioDelGiro,
} from "@/lib/premios-de-ruleta";
import type { FormState } from "@/app/actions/auth";

export async function createRouletteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle nombre a la ruleta." };

  // Opciones iniciales: una por línea del textarea
  const rawOptions = String(formData.get("options") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await prisma.roulette.create({
    data: {
      competitionId,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      allowRepeats: formData.get("allowRepeats") !== "off",
      options: {
        create: rawOptions.map((label, index) => ({
          label,
          position: index,
          color: PALETTE[index % PALETTE.length],
        })),
      },
    },
  });

  revalidatePath("/ruleta");
  return { success: "Ruleta creada." };
}

export async function updateRouletteAction(formData: FormData) {
  const id = String(formData.get("rouletteId") ?? "");
  const roulette = await prisma.roulette.findUnique({ where: { id } });
  if (!roulette) return;
  await requireCompetitionManager(roulette.competitionId);

  const spinSeconds = Number(formData.get("spinSeconds") ?? roulette.spinSeconds);

  await prisma.roulette.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim() || roulette.name,
      description: String(formData.get("description") ?? "").trim() || null,
      allowRepeats: formData.get("allowRepeats") === "on",
      spinSeconds:
        Number.isFinite(spinSeconds) && spinSeconds >= 1 && spinSeconds <= 30
          ? Math.trunc(spinSeconds)
          : roulette.spinSeconds,
    },
  });

  revalidatePath("/ruleta");
}

export async function deleteRouletteAction(formData: FormData) {
  const id = String(formData.get("rouletteId") ?? "");
  const roulette = await prisma.roulette.findUnique({ where: { id } });
  if (!roulette) return;
  await requireCompetitionManager(roulette.competitionId);

  await prisma.roulette.delete({ where: { id } });
  revalidatePath("/ruleta");
}

/**
 * Añade una casilla. Puede ser de tres clases —texto, un objeto del catálogo o
 * tickets de una ruleta— y **el rótulo lo pone el servidor** en las dos con
 * premio: si lo escribiera cada uno a mano, la rueda acabaría diciendo una cosa
 * y repartiendo otra.
 */
export async function addOptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const rouletteId = String(formData.get("rouletteId") ?? "");
  const roulette = await prisma.roulette.findUnique({
    where: { id: rouletteId },
    include: { _count: { select: { options: true } } },
  });
  if (!roulette) return { error: "No encuentro esa ruleta." };
  try {
    await requireCompetitionManager(roulette.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const clase = String(formData.get("clase") ?? "texto");
  const cantidadCruda = Number(formData.get("cantidad") ?? 1);
  const cantidad =
    Number.isFinite(cantidadCruda) && cantidadCruda > 0
      ? Math.min(99, Math.trunc(cantidadCruda))
      : 1;

  let label = String(formData.get("label") ?? "").trim();
  let itemId: string | null = null;
  let ticketsDeId: string | null = null;

  if (clase === "objeto") {
    itemId = String(formData.get("itemId") ?? "") || null;
    if (!itemId) return { error: "Elige el objeto." };
    const objeto = await prisma.item.findUnique({
      where: { id: itemId },
      select: { name: true },
    });
    if (!objeto) return { error: "Ese objeto ya no está en el catálogo." };
    label = cantidad > 1 ? `${cantidad} × ${objeto.name}` : objeto.name;
  } else if (clase === "tickets") {
    ticketsDeId = String(formData.get("ticketsDeId") ?? "") || null;
    if (!ticketsDeId) return { error: "Elige de qué ruleta son los tickets." };
    const destino = await prisma.roulette.findUnique({
      where: { id: ticketsDeId },
      select: { name: true, competitionId: true },
    });
    // De otra edición no: los tickets son de una competición concreta
    if (!destino || destino.competitionId !== roulette.competitionId) {
      return { error: "Esa ruleta no es de esta competición." };
    }
    label = `${cantidad} 🎟️ ${destino.name}`;
  } else if (!label) {
    return { error: "Escribe el texto de la opción." };
  }

  const weight = Number(formData.get("weight") ?? 1);
  const count = roulette._count.options;

  await prisma.rouletteOption.create({
    data: {
      rouletteId,
      label,
      weight: Number.isFinite(weight) && weight > 0 ? Math.trunc(weight) : 1,
      color:
        String(formData.get("color") ?? "").trim() ||
        PALETTE[count % PALETTE.length],
      position: count,
      itemId,
      ticketsDeId,
      cantidad,
    },
  });

  revalidatePath("/ruleta");
  return { success: `"${label}" añadido.` };
}

/**
 * A quién se le da el premio de un giro. Solo la organización: es meter cosas
 * en la bolsa de alguien, y eso nunca lo decide quien mira.
 */
export async function entregarPremioAction(formData: FormData) {
  const spinId = String(formData.get("spinId") ?? "");
  const giro = await prisma.rouletteSpin.findUnique({
    where: { id: spinId },
    select: { roulette: { select: { competitionId: true } } },
  });
  if (!giro) return;
  const me = await requireCompetitionManager(giro.roulette.competitionId);

  const participantId = String(formData.get("participantId") ?? "") || null;
  await entregarPremioDelGiro(spinId, participantId, me.id);

  revalidatePath("/ruleta");
  revalidatePath("/bolsa");
}

export async function toggleOptionAction(formData: FormData) {
  const id = String(formData.get("optionId") ?? "");
  const option = await prisma.rouletteOption.findUnique({
    where: { id },
    include: { roulette: true },
  });
  if (!option) return;
  await requireCompetitionManager(option.roulette.competitionId);

  await prisma.rouletteOption.update({
    where: { id },
    data: { enabled: !option.enabled },
  });

  revalidatePath("/ruleta");
}

export async function deleteOptionAction(formData: FormData) {
  const id = String(formData.get("optionId") ?? "");
  const option = await prisma.rouletteOption.findUnique({
    where: { id },
    include: { roulette: true },
  });
  if (!option) return;
  await requireCompetitionManager(option.roulette.competitionId);

  await prisma.rouletteOption.delete({ where: { id } });
  revalidatePath("/ruleta");
}

export type SpinResult =
  | {
      ok: true;
      optionId: string;
      label: string;
      index: number;
      /** Qué se ha repartido y a quién, si la casilla llevaba premio */
      premio: string | null;
      /** Si hay que bajar al historial a decir de quién es */
      pendiente: boolean;
    }
  | { ok: false; error: string };

/**
 * El sorteo se hace en el servidor (ponderado por `weight`) para que nadie
 * pueda manipularlo desde el navegador. La animación del cliente sólo se
 * encarga de aterrizar en el sector que devuelve esta acción.
 */
export async function spinRouletteAction(
  rouletteId: string,
): Promise<SpinResult> {
  const me = await requireUser();

  const roulette = await prisma.roulette.findUnique({
    where: { id: rouletteId },
    include: {
      options: {
        orderBy: { position: "asc" },
        // Para poder decir en el aviso qué ha tocado, no solo el rótulo
        include: {
          item: { select: { name: true } },
          ticketsDe: { select: { name: true } },
        },
      },
    },
  });
  if (!roulette) return { ok: false, error: "Ruleta no encontrada." };

  // Los administradores giran cuando quieren; el resto necesita un ticket,
  // que se gasta con la tirada.
  const isManager = await canManageCompetition(roulette.competitionId, me);
  let participant = null;
  if (!isManager) {
    participant = await prisma.participant.findUnique({
      where: {
        competitionId_userId: {
          competitionId: roulette.competitionId,
          userId: me.id,
        },
      },
    });
    if (!participant) {
      return { ok: false, error: "No eres jugador de esta competición." };
    }
    if (await edicionCerradaPara(roulette.competitionId, me)) {
      return { ok: false, error: "Esta edición está archivada: su ruleta ya no se gira." };
    }
    // Los tickets son de cada ruleta: el de otra no vale aquí
    const balance = await prisma.rouletteTicket.aggregate({
      where: { participantId: participant.id, rouletteId },
      _sum: { delta: true },
    });
    if ((balance._sum.delta ?? 0) < 1) {
      return {
        ok: false,
        error: `No te quedan tickets de "${roulette.name}". Pídele uno a un administrador.`,
      };
    }
  }

  const active = roulette.options.filter((option) => option.enabled);
  if (!active.length) {
    return { ok: false, error: "No quedan opciones activas en esta ruleta." };
  }

  const totalWeight = active.reduce(
    (sum, option) => sum + Math.max(1, option.weight),
    0,
  );
  let ticket = Math.random() * totalWeight;
  let winner = active[active.length - 1];
  for (const option of active) {
    ticket -= Math.max(1, option.weight);
    if (ticket <= 0) {
      winner = option;
      break;
    }
  }

  /**
   * El premio se **copia** al giro en vez de mirarse por el enlace a la
   * casilla: la casilla se puede borrar o cambiar de premio, y lo que se dio ya
   * está dado. Igual que el rótulo, que también va copiado desde el principio.
   */
  const premio = {
    premioItemId: winner.itemId,
    premioTicketsDeId: winner.ticketsDeId,
    premioCantidad: winner.itemId || winner.ticketsDeId ? winner.cantidad : 0,
  };

  let spinId: string | null = null;

  try {
    await prisma.$transaction(
      async (tx) => {
        if (participant) {
          await tx.rouletteTicket.create({
            data: {
              competitionId: roulette.competitionId,
              participantId: participant.id,
              delta: -1,
              reason: `Tirada en ${roulette.name}`,
              rouletteId,
              createdById: me.id,
            },
          });
          // Se vuelve a sumar dentro de la transacción: si dos tiradas a la
          // vez dejaran el saldo en negativo, esta se deshace entera.
          const balance = await tx.rouletteTicket.aggregate({
            where: { participantId: participant.id, rouletteId },
            _sum: { delta: true },
          });
          if ((balance._sum.delta ?? 0) < 0) {
            throw new Error("SIN_TICKETS");
          }
        }

        const giro = await tx.rouletteSpin.create({
          data: {
            rouletteId,
            optionId: winner.id,
            optionLabel: winner.label,
            spunById: me.id,
            ...premio,
          },
        });
        spinId = giro.id;

        // Si la ruleta no permite repetir, la opción se desactiva tras salir
        if (!roulette.allowRepeats) {
          await tx.rouletteOption.update({
            where: { id: winner.id },
            data: { enabled: false },
          });
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch {
    return {
      ok: false,
      error: "No se ha podido gastar el ticket. Vuelve a intentarlo.",
    };
  }

  /**
   * El premio se reparte **fuera** de la transacción a propósito: ahí dentro
   * está en juego el ticket, que es lo que no puede quedar a medias. Si algo
   * fallara al meterlo en la bolsa, el giro ya está apuntado y la organización
   * lo entrega desde el historial, que es justo para lo que está.
   */
  const queHaTocado = describirPremio({
    ...premio,
    objeto: winner.item?.name,
    ruleta: winner.ticketsDe?.name,
  });

  // Gira un jugador gastando su ticket: la tirada es suya y el premio también
  if (spinId && queHaTocado && participant) {
    await entregarPremioDelGiro(spinId, participant.id, me.id);
    revalidatePath("/bolsa");
  }

  revalidatePath("/ruleta");

  return {
    ok: true,
    optionId: winner.id,
    label: winner.label,
    index: active.findIndex((option) => option.id === winner.id),
    premio: queHaTocado,
    pendiente: Boolean(queHaTocado) && !participant,
  };
}

export async function resetRouletteOptionsAction(formData: FormData) {
  const rouletteId = String(formData.get("rouletteId") ?? "");
  const roulette = await prisma.roulette.findUnique({
    where: { id: rouletteId },
  });
  if (!roulette) return;
  await requireCompetitionManager(roulette.competitionId);

  await prisma.rouletteOption.updateMany({
    where: { rouletteId },
    data: { enabled: true },
  });

  revalidatePath("/ruleta");
}

export async function clearSpinHistoryAction(formData: FormData) {
  const rouletteId = String(formData.get("rouletteId") ?? "");
  const roulette = await prisma.roulette.findUnique({
    where: { id: rouletteId },
  });
  if (!roulette) return;
  await requireCompetitionManager(roulette.competitionId);

  await prisma.rouletteSpin.deleteMany({ where: { rouletteId } });
  revalidatePath("/ruleta");
}
