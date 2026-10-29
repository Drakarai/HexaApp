"use server";

import { revalidatePath } from "next/cache";
import { registrar } from "@/lib/registro";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";
import { lockeEmpezado, TITULO_POR_DEFECTO } from "@/lib/reglas";
import { conPermiso } from "@/lib/permiso";

export async function createRuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  const [manager, sinPermiso] = await conPermiso(requireCompetitionManager(competitionId));
  if (sinPermiso) return sinPermiso;

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) return { error: "El artículo necesita un nombre." };

  /**
   * Dónde va. Añadido desde un título, **justo detrás de su último artículo**:
   * al final de todo se iba detrás de los demás títulos, y aunque se agrupa
   * bien por el nombre, el orden de los artículos dentro del título quedaba
   * a merced de cuándo se escribió cada uno. Se hace hueco corriendo los de
   * detrás.
   */
  const despuesDe = String(formData.get("despuesDe") ?? "");
  const vecina = despuesDe
    ? await prisma.ruleSection.findFirst({
        where: { id: despuesDe, competitionId },
        select: { position: true },
      })
    : null;
  const last = vecina
    ? null
    : await prisma.ruleSection.findFirst({
        where: { competitionId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
  const position = vecina ? vecina.position + 1 : (last?.position ?? 0) + 1;

  const empezado = await lockeEmpezado(competitionId);
  await prisma.$transaction([
    ...(vecina
      ? [
          prisma.ruleSection.updateMany({
            where: { competitionId, position: { gte: position } },
            data: { position: { increment: 1 } },
          }),
        ]
      : []),
    prisma.ruleSection.create({
      data: {
        competitionId,
        title,
        body,
        category: String(formData.get("category") ?? "").trim() || null,
        position,
        // Una regla que aparece a mitad de locke es un cambio como otro cualquiera
        ...(empezado ? { cambiadaAt: new Date(), cambiadaPorId: manager.id } : {}),
      },
    }),
  ]);

  await registrar(competitionId, "reglas", `Añade la sección de reglas «${title}»`);
  revalidatePath("/reglas");
  return { success: "Artículo añadido." };
}

/**
 * Cambia el nombre de un **título** del reglamento («Título I · Modalidad»).
 * Un título no es una fila: es el nombre que comparten sus artículos (su
 * `category`), así que se cambia en todos a la vez. Antes había que editar
 * artículo por artículo y escribirlo igual en todos, o se partía en dos.
 *
 * Si se le pone el nombre de otro título que ya existe, se juntan: es lo que
 * se espera al escribir el mismo nombre. No se avisa a nadie como regla
 * cambiada: lo que dicen las reglas no cambia.
 */
export async function renombrarTituloAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  const [, sinPermiso] = await conPermiso(requireCompetitionManager(competitionId));
  if (sinPermiso) return sinPermiso;

  // "General" es como se enseñan los que no tienen título: en la base, null
  const antes = String(formData.get("antes") ?? "");
  const nuevo = String(formData.get("nuevo") ?? "").trim();
  if (!nuevo) return { error: "Ponle nombre al título." };
  if (nuevo.length > 80) return { error: "Ese nombre es demasiado largo para un título." };
  if (nuevo === antes) return { success: "Se queda como estaba." };

  const { count } = await prisma.ruleSection.updateMany({
    // Los sin título y los que se llaman igual que él salen juntos: se cambian juntos
    where:
      antes === TITULO_POR_DEFECTO
        ? { competitionId, OR: [{ category: null }, { category: antes }] }
        : { competitionId, category: antes },
    data: { category: nuevo },
  });
  if (!count) return { error: "Ese título ya no está: recarga la página." };

  await registrar(competitionId, "reglas", `Cambia el nombre del título «${antes}» a «${nuevo}»`);
  revalidatePath("/reglas");
  return { success: "Título cambiado." };
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
