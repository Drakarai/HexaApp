"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { juegoPorId } from "@/lib/juegos";
import {
  esCreador,
  requireOrganizador,
  requireUser,
} from "@/lib/auth";
import {
  COMPETITION_COOKIE,
  requireCompetitionManager,
} from "@/lib/competition";
import { filtroDeLockesVisibles, puedeVerLocke } from "@/lib/acceso";
import { COMPETITION_STATUS, PALETTE } from "@/lib/constants";
import { resolverRetiradas } from "@/lib/retiradas";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/app/actions/auth";

/** Un número entero de un formulario, o null si viene vacío o mal. */
function numeroOpcional(valor: FormDataEntryValue | null, tope: number) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  if (!Number.isFinite(numero) || numero < 1) return null;
  return Math.min(tope, Math.trunc(numero));
}

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
  // La cookie la manda el navegador, así que aquí se vuelve a comprobar quién
  // puede abrir ese locke: si no, bastaría con escribir el identificador
  if (!(await puedeVerLocke(competition.id))) return;

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
  /**
   * Lo monta un administrador global **o un organizador**: alguien a quien se
   * le ha dado permiso para llevar sus propios lockes.
   */
  const admin = await requireOrganizador();
  const esAdminGlobal = esCreador(admin);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre a la competición." };

  const game = String(formData.get("game") ?? "").trim() || null;
  // Solo se guarda si de verdad está en la lista: de ahí sale la región
  const gameIdBruto = String(formData.get("gameId") ?? "").trim();
  const gameId = juegoPorId(gameIdBruto) ? gameIdBruto : null;
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
      gameId,
      modality,
      description,
      startingPoints: Math.trunc(startingPoints),
      maxPlayers: Math.max(2, Math.trunc(maxPlayers)),
      jornadasPrevistas: numeroOpcional(formData.get("jornadasPrevistas"), 50),
      createdById: admin.id,
    },
  });

  /**
   * Quien lo crea entra dentro como administrador de ese locke. Si no, un
   * organizador acabaría de montar el suyo y no podría ni abrirlo: no es
   * administrador global, así que solo ve los lockes en los que tiene ficha.
   */
  if (!esAdminGlobal) {
    await prisma.participant.create({
      data: {
        competitionId: created.id,
        userId: admin.id,
        displayName: admin.displayName,
        isAdmin: true,
      },
    });
  }

  // Las competiciones anteriores se conservan enteras: sólo se marcan como
  // archivadas para que la nueva sea la activa.
  if (archivePrevious) {
    await prisma.competition.updateMany({
      where: {
        id: { not: created.id },
        status: COMPETITION_STATUS.ACTIVE,
        /**
         * Un organizador archiva **los que lleva él**, no los que juega.
         * Ojo con la diferencia: si valiera con verlos, montar su primer locke
         * archivaría de paso el de la casa en el que juega, que no es suyo.
         */
        ...(esAdminGlobal
          ? {}
          : {
              OR: [
                { createdById: admin.id },
                {
                  participants: {
                    some: { userId: admin.id, isAdmin: true },
                  },
                },
              ],
            }),
      },
      data: { status: COMPETITION_STATUS.ARCHIVED, endedAt: new Date() },
    });
  }

  if (copyFromId) {
    const source = await prisma.competition.findFirst({
      // Copiar de un locke es leerlo entero: solo de los que pueda abrir
      where: { id: copyFromId, ...filtroDeLockesVisibles(admin) },
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
            // El organizador ya tiene su ficha de arriba: copiarla la duplicaría
            .filter(
              (participant) =>
                esAdminGlobal || participant.userId !== admin.id,
            )
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
      gameId: juegoPorId(String(formData.get("gameId") ?? "").trim())?.id ?? null,
      modality: String(formData.get("modality") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      jornadasPrevistas: numeroOpcional(formData.get("jornadasPrevistas"), 50),
      ...(Number.isFinite(startingPoints)
        ? { startingPoints: Math.trunc(startingPoints) }
        : {}),
    },
  });

  revalidatePath("/", "layout");
  return { success: "Competición actualizada." };
}

/**
 * Archivar o reabrir un locke lo hace **quien lo administra**, no quien lleva
 * la aplicación: es su edición y decide él cuándo se acaba.
 */
export async function setCompetitionStatusAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);
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

/** Y borrarlo, igual: es suyo. Se lleva por delante todo lo que tenga dentro. */
export async function deleteCompetitionAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);
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

/**
 * Retirar a alguien del locke, o readmitirlo.
 *
 * Es lo que hay que hacer cuando alguien se raja a mitad de partida, y es
 * **distinto de sacarlo de la competición**: sacarlo le borra el cementerio y
 * los puntos, como si nunca hubiera jugado, y eso falsea lo que pasó. Aquí no
 * se borra nada; solo deja de contar para lo que hace avanzar al grupo.
 *
 * Sus **combates de jornada sin resultado los gana el rival por retirada**,
 * pero **no todos de golpe**: cada uno espera a que el resto de su jornada esté
 * jugada. Ver `lib/retiradas.ts` para el porqué.
 */
export async function retirarParticipanteAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { competition: { select: { id: true } } },
  });
  if (!participant) return;
  const manager = await requireCompetitionManager(participant.competitionId);

  // Readmitir: solo se le quita la marca. Los combates ya dados por retirada
  // no se deshacen solos, porque el punto ya se repartió y puede haber
  // clasificación construida encima.
  if (participant.retiredAt) {
    await prisma.participant.update({
      where: { id: participantId },
      data: { retiredAt: null },
    });
    revalidatePath("/", "layout");
    return;
  }

  await prisma.participant.update({
    where: { id: participantId },
    data: { retiredAt: new Date() },
  });

  /**
   * Las jornadas que ya estén enteras jugadas se resuelven en el momento; las
   * que no, esperan a su último combate. Así los puntos entran en el mismo
   * orden en que pasaron las cosas.
   */
  await resolverRetiradas(participant.competitionId, manager.id);

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

/**
 * Da acceso de **solo mirar** a una edición.
 *
 * Es lo que hace de "rol de espectador", y va por locke y no como marca de la
 * cuenta: el administrador decide qué edición enseña y a quién. Quien ya juega
 * ese locke no necesita esto, así que se rechaza en vez de crear una fila que
 * no significa nada.
 */
export async function darEspectadorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Ese usuario no existe." };

  const juega = await prisma.participant.count({
    where: { competitionId, userId },
  });
  if (juega) {
    return { error: `${user.displayName} ya juega este locke: lo ve entero.` };
  }

  await prisma.spectator.upsert({
    where: { userId_competitionId: { userId, competitionId } },
    update: {},
    create: { userId, competitionId },
  });

  revalidatePath("/", "layout");
  return { success: `${user.displayName} ya puede mirar este locke.` };
}

/** Le quita el acceso de espectador: deja de ver esa edición. */
export async function quitarEspectadorAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  await requireCompetitionManager(competitionId);

  await prisma.spectator.deleteMany({ where: { competitionId, userId } });
  revalidatePath("/", "layout");
}
