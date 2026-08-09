"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canManageCompetition,
  requireCompetitionManager,
} from "@/lib/competition";
import { PALETTE } from "@/lib/constants";
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

export async function addOptionAction(formData: FormData) {
  const rouletteId = String(formData.get("rouletteId") ?? "");
  const roulette = await prisma.roulette.findUnique({
    where: { id: rouletteId },
    include: { _count: { select: { options: true } } },
  });
  if (!roulette) return;
  await requireCompetitionManager(roulette.competitionId);

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

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
    },
  });

  revalidatePath("/ruleta");
}

export async function updateOptionAction(formData: FormData) {
  const id = String(formData.get("optionId") ?? "");
  const option = await prisma.rouletteOption.findUnique({
    where: { id },
    include: { roulette: true },
  });
  if (!option) return;
  await requireCompetitionManager(option.roulette.competitionId);

  const weight = Number(formData.get("weight") ?? option.weight);

  await prisma.rouletteOption.update({
    where: { id },
    data: {
      label: String(formData.get("label") ?? "").trim() || option.label,
      weight:
        Number.isFinite(weight) && weight > 0 ? Math.trunc(weight) : option.weight,
      color: String(formData.get("color") ?? "").trim() || option.color,
      enabled: formData.get("enabled") === "on",
    },
  });

  revalidatePath("/ruleta");
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
  | { ok: true; optionId: string; label: string; index: number }
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
    include: { options: { orderBy: { position: "asc" } } },
  });
  if (!roulette) return { ok: false, error: "Ruleta no encontrada." };

  const allowed = await canManageCompetition(roulette.competitionId, me);
  if (!allowed) {
    return { ok: false, error: "Solo los administradores pueden girar." };
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

  await prisma.rouletteSpin.create({
    data: {
      rouletteId,
      optionId: winner.id,
      optionLabel: winner.label,
      spunById: me.id,
    },
  });

  // Si la ruleta no permite repetir, la opción se desactiva tras salir
  if (!roulette.allowRepeats) {
    await prisma.rouletteOption.update({
      where: { id: winner.id },
      data: { enabled: false },
    });
  }

  revalidatePath("/ruleta");

  return {
    ok: true,
    optionId: winner.id,
    label: winner.label,
    index: active.findIndex((option) => option.id === winner.id),
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
