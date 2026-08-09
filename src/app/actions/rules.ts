"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";

export async function createRuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) return { error: "La sección necesita un título." };

  const last = await prisma.ruleSection.findFirst({
    where: { competitionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.ruleSection.create({
    data: {
      competitionId,
      title,
      body,
      category: String(formData.get("category") ?? "").trim() || null,
      position: (last?.position ?? 0) + 1,
    },
  });

  revalidatePath("/reglas");
  return { success: "Sección añadida." };
}

export async function updateRuleAction(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const rule = await prisma.ruleSection.findUnique({ where: { id } });
  if (!rule) return;
  await requireCompetitionManager(rule.competitionId);

  await prisma.ruleSection.update({
    where: { id },
    data: {
      title: String(formData.get("title") ?? "").trim() || rule.title,
      body: String(formData.get("body") ?? ""),
      category: String(formData.get("category") ?? "").trim() || null,
    },
  });

  revalidatePath("/reglas");
}

export async function deleteRuleAction(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const rule = await prisma.ruleSection.findUnique({ where: { id } });
  if (!rule) return;
  await requireCompetitionManager(rule.competitionId);

  await prisma.ruleSection.delete({ where: { id } });
  revalidatePath("/reglas");
}

/** Sube o baja una sección intercambiando su posición con la vecina. */
export async function moveRuleAction(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const direction = String(formData.get("direction") ?? "up");
  const rule = await prisma.ruleSection.findUnique({ where: { id } });
  if (!rule) return;
  await requireCompetitionManager(rule.competitionId);

  const neighbour = await prisma.ruleSection.findFirst({
    where: {
      competitionId: rule.competitionId,
      position:
        direction === "up" ? { lt: rule.position } : { gt: rule.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.ruleSection.update({
      where: { id: rule.id },
      data: { position: neighbour.position },
    }),
    prisma.ruleSection.update({
      where: { id: neighbour.id },
      data: { position: rule.position },
    }),
  ]);

  revalidatePath("/reglas");
}
