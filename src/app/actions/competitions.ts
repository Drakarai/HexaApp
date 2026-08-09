"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  COMPETITION_COOKIE,
  requireCompetitionManager,
} from "@/lib/competition";
import { COMPETITION_STATUS, PALETTE } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/app/actions/auth";

async function uniqueSlug(base: string) {
  const root = slugify(base) || "competicion";
  let candidate = root;
  let suffix = 2;
  while (await prisma.competition.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}

/** Cambia la competición que se está viendo (se guarda en cookie). */
export async function selectCompetitionAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("competitionId") ?? "");
  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) return;

  const store = await cookies();
  store.set(COMPETITION_COOKIE, competition.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function createCompetitionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre a la competición." };

  const game = String(formData.get("game") ?? "").trim() || null;
  const modality = String(formData.get("modality") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const startingPoints = Number(formData.get("startingPoints") ?? 5);
  const maxPlayers = Number(formData.get("maxPlayers") ?? 6);
  const copyFromId = String(formData.get("copyFromId") ?? "");
  const archivePrevious = formData.get("archivePrevious") === "on";
  const copyRules = formData.get("copyRules") === "on";
  const copyLevelCaps = formData.get("copyLevelCaps") === "on";
  const copyRoulettes = formData.get("copyRoulettes") === "on";
  const copyParticipants = formData.get("copyParticipants") === "on";

  if (!Number.isFinite(startingPoints) || !Number.isFinite(maxPlayers)) {
    return { error: "Puntos iniciales y jugadores tienen que ser números." };
  }

  const created = await prisma.competition.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      game,
      modality,
      description,
      startingPoints: Math.trunc(startingPoints),
      maxPlayers: Math.max(2, Math.trunc(maxPlayers)),
      createdById: admin.id,
    },
  });

  // Las competiciones anteriores se conservan enteras: sólo se marcan como
  // archivadas para que la nueva sea la activa.
  if (archivePrevious) {
    await prisma.competition.updateMany({
      where: { id: { not: created.id }, status: COMPETITION_STATUS.ACTIVE },
      data: { status: COMPETITION_STATUS.ARCHIVED, endedAt: new Date() },
    });
  }

  if (copyFromId) {
    const source = await prisma.competition.findUnique({
      where: { id: copyFromId },
      include: {
        rules: { orderBy: { position: "asc" } },
        levelCaps: { orderBy: { position: "asc" } },
        participants: true,
        roulettes: { include: { options: { orderBy: { position: "asc" } } } },
      },
    });

    if (source) {
      if (copyRules && source.rules.length) {
        await prisma.ruleSection.createMany({
          data: source.rules.map((rule) => ({
            competitionId: created.id,
            title: rule.title,
            body: rule.body,
            category: rule.category,
            position: rule.position,
          })),
        });
      }

      if (copyLevelCaps && source.levelCaps.length) {
        await prisma.levelCap.createMany({
          data: source.levelCaps.map((cap) => ({
            competitionId: created.id,
            label: cap.label,
            cap: cap.cap,
            kind: cap.kind,
            badge: cap.badge,
            notes: cap.notes,
            position: cap.position,
          })),
        });
      }

      if (copyParticipants && source.participants.length) {
        await prisma.participant.createMany({
          data: source.participants
            .slice(0, created.maxPlayers)
            .map((participant) => ({
              competitionId: created.id,
              userId: participant.userId,
              displayName: participant.displayName,
              gameVersion: participant.gameVersion,
              color: participant.color,
              isAdmin: participant.isAdmin,
            })),
        });
      }

      if (copyRoulettes) {
        for (const roulette of source.roulettes) {
          await prisma.roulette.create({
            data: {
              competitionId: created.id,
              name: roulette.name,
              description: roulette.description,
              allowRepeats: roulette.allowRepeats,
              spinSeconds: roulette.spinSeconds,
              options: {
                create: roulette.options.map((option) => ({
                  label: option.label,
                  weight: option.weight,
                  color: option.color,
                  enabled: true,
                  position: option.position,
                })),
              },
            },
          });
        }
      }
    }
  }

  const store = await cookies();
  store.set(COMPETITION_COOKIE, created.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  redirect("/competiciones");
}

export async function updateCompetitionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre no puede estar vacío." };

  const startingPoints = Number(formData.get("startingPoints") ?? 5);

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      name,
      game: String(formData.get("game") ?? "").trim() || null,
      modality: String(formData.get("modality") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      ...(Number.isFinite(startingPoints)
        ? { startingPoints: Math.trunc(startingPoints) }
        : {}),
    },
  });

  revalidatePath("/", "layout");
  return { success: "Competición actualizada." };
}

export async function setCompetitionStatusAction(formData: FormData) {
  await requireAdmin();
  const competitionId = String(formData.get("competitionId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    status !== COMPETITION_STATUS.ACTIVE &&
    status !== COMPETITION_STATUS.ARCHIVED
  ) {
    return;
  }

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      status,
      endedAt: status === COMPETITION_STATUS.ARCHIVED ? new Date() : null,
    },
  });

  revalidatePath("/", "layout");
}

export async function deleteCompetitionAction(formData: FormData) {
  await requireAdmin();
  const competitionId = String(formData.get("competitionId") ?? "");
  await prisma.competition.delete({ where: { id: competitionId } });
  revalidatePath("/", "layout");
  redirect("/competiciones");
}

// ---------------------------------------------------------------------------
// Participantes
// ---------------------------------------------------------------------------

export async function addParticipantAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Ese usuario no existe." };

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { _count: { select: { participants: true } } },
  });
  if (!competition) return { error: "Competición no encontrada." };

  if (competition._count.participants >= competition.maxPlayers) {
    return {
      error: `Esta competición ya tiene sus ${competition.maxPlayers} jugadores.`,
    };
  }

  const existing = await prisma.participant.findUnique({
    where: { competitionId_userId: { competitionId, userId } },
  });
  if (existing) return { error: "Ese jugador ya está apuntado." };

  await prisma.participant.create({
    data: {
      competitionId,
      userId,
      displayName: String(formData.get("displayName") ?? "").trim() ||
        user.displayName,
      gameVersion: String(formData.get("gameVersion") ?? "").trim() || null,
      color:
        String(formData.get("color") ?? "").trim() ||
        PALETTE[competition._count.participants % PALETTE.length],
      isAdmin: formData.get("isAdmin") === "on",
    },
  });

  revalidatePath("/", "layout");
  return { success: `${user.displayName} añadido a la competición.` };
}

export async function updateParticipantAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant) return;
  await requireCompetitionManager(participant.competitionId);

  await prisma.participant.update({
    where: { id: participantId },
    data: {
      displayName:
        String(formData.get("displayName") ?? "").trim() ||
        participant.displayName,
      gameVersion: String(formData.get("gameVersion") ?? "").trim() || null,
      color: String(formData.get("color") ?? "").trim() || participant.color,
      isAdmin: formData.get("isAdmin") === "on",
    },
  });

  revalidatePath("/", "layout");
}

export async function removeParticipantAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant) return;
  await requireCompetitionManager(participant.competitionId);

  await prisma.participant.delete({ where: { id: participantId } });
  revalidatePath("/", "layout");
}
