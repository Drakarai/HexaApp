"use server";

import { revalidatePath } from "next/cache";
import { registrar } from "@/lib/registro";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";
import { lockeEmpezado } from "@/lib/reglas";

export async function createRuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  const manager = await requireCompetitionManager(competitionId);

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
      // Una regla que aparece a mitad de locke es un cambio como otro cualquiera
      ...((await lockeEmpezado(competitionId))
        ? { cambiadaAt: new Date(), cambiadaPorId: manager.id }
        : {}),
    },
  });

  await registrar(competitionId, "reglas", `Añade la sección de reglas «${title}»`);
  revalidatePath("/reglas");
  return { success: "Sección añadida." };
}

export async function updateRuleAction(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const rule = await prisma.ruleSection.findUnique({ where: { id } });
  if (!rule) return;
  const manager = await requireCompetitionManager(rule.competitionId);

  const title = String(formData.get("title") ?? "").trim() || rule.title;
  const body = String(formData.get("body") ?? "");
  /**
   * Se avisa si ha cambiado lo que dice —el título o el texto, no la categoría
   * ni el orden—, el locke ya ha empezado y quien lo edita no ha quitado la
   * casilla, que está para corregir una errata sin que salte a todo el mundo.
   */
  const cambiaLoQueDice = title !== rule.title || body.trim() !== rule.body.trim();
  const avisar =
    cambiaLoQueDice &&
    formData.get("avisar") === "on" &&
    (await lockeEmpezado(rule.competitionId));

  await prisma.ruleSection.update({
    where: { id },
    data: {
      title,
      body,
      category: String(formData.get("category") ?? "").trim() || null,
      ...(avisar
        ? {
            cambiadaAt: new Date(),
            cambiadaPorId: manager.id,
            tituloAnterior: title !== rule.title ? rule.title : null,
            textoAnterior: rule.body,
          }
        : {}),
    },
  });
  if (cambiaLoQueDice) {
    await registrar(
      rule.competitionId,
      "reglas",
      `Cambia la sección «${title}»${title !== rule.title ? ` (antes «${rule.title}»)` : ""}${avisar ? "" : ", sin avisar"}`,
    );
  }

  revalidatePath("/reglas");
}

export async function deleteRuleAction(formData: FormData) {
  const id = String(formData.get("ruleId") ?? "");
  const rule = await prisma.ruleSection.findUnique({ where: { id } });
  if (!rule) return;
  await requireCompetitionManager(rule.competitionId);

  await prisma.ruleSection.delete({ where: { id } });
  await registrar(rule.competitionId, "reglas", `Borra la sección de reglas «${rule.title}»`);
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
