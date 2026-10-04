"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { registrar } from "@/lib/registro";
import { prisma } from "@/lib/db";
import { leerJuego, leerTipos, repartirVersiones, versionesDeLaEdicion } from "@/lib/juegos";
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
import { borrarPuntosHuerfanos } from "@/lib/puntos-huerfanos";
import { MOTIVOS_DE_SALIDA } from "@/lib/wipeos";
import {
  JORNADAS_DEL_DUALOCKE,
  JUGADORES_DEL_SOUL_LINK,
  JUGADORES_MAXIMOS,
  leerEstilo,
} from "@/lib/perfiles-de-locke";
import { slugify } from "@/lib/utils";
import { imagenEditada } from "@/lib/image";
import { guardarPorContenido } from "@/lib/almacen-de-imagenes";
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

/**
 * Lo mismo, pero **llevando a la portada de esa edición**.
 *
 * El selector de arriba cambia de locke sin moverte de donde estás, que es lo
 * que se quiere allí. Desde el palmarés no: si tocas una edición es para
 * abrirla. Reutiliza la de arriba para no repetir la comprobación de quién
 * puede abrir qué.
 */
export async function abrirCompeticionAction(formData: FormData) {
  await selectCompetitionAction(formData);
  redirect("/");
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

  // Oficial o no (un fangame): ver `leerJuego`. De `gameId` sale la región
  const juego = leerJuego({
    gameId: String(formData.get("gameId") ?? ""),
    game: String(formData.get("game") ?? ""),
    noOficial: String(formData.get("noOficial") ?? ""),
  });
  if ("error" in juego) return juego;
  const { game, gameId, juegoNoOficial } = juego;
  const modality = String(formData.get("modality") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const startingPoints = Number(formData.get("startingPoints") ?? 5);
  const maxPlayers = Number(formData.get("maxPlayers") ?? 6);
  const copyFromId = String(formData.get("copyFromId") ?? "");
  // Los que se archivan, uno a uno: ver `archivables` en la página
  const archivar = formData.getAll("archivar").map(String).filter(Boolean);
  const copyRules = formData.get("copyRules") === "on";
  const copyLevelCaps = formData.get("copyLevelCaps") === "on";
  const copyRoulettes = formData.get("copyRoulettes") === "on";
  const copyParticipants = formData.get("copyParticipants") === "on";

  if (!Number.isFinite(startingPoints) || !Number.isFinite(maxPlayers)) {
    return { error: "Puntos iniciales y jugadores tienen que ser números." };
  }
  const estilo = leerEstilo(String(formData.get("estilo") ?? ""));
  const soulLink = estilo === "soullink";
  const plazas = Math.min(
    soulLink ? JUGADORES_DEL_SOUL_LINK.maximo : JUGADORES_MAXIMOS,
    Math.max(2, Math.trunc(maxPlayers)),
  );
  // En un dualocke hace falta saber de cuántas va (ver JORNADAS_DEL_DUALOCKE);
  // en un Soul Link no hay jornadas
  const jornadasPrevistas = soulLink
    ? null
    : (numeroOpcional(formData.get("jornadasPrevistas"), 50) ??
      (plazas === 2 ? JORNADAS_DEL_DUALOCKE : null));

  /**
   * Si los jugadores del locke de origen no caben, no se crea nada. Antes se
   * copiaban los primeros de la lista hasta llenarlo y el resto se quedaba
   * fuera sin avisar: de un locke de seis a un dualocke entraban los dos
   * primeros por orden de alta, que no tienen por qué ser los que juegan.
   * Se cuenta antes de crear para no dejar un locke a medias.
   */
  if (copyFromId && copyParticipants) {
    const aCopiar = await prisma.participant.count({
      where: {
        competitionId: copyFromId,
        competition: filtroDeLockesVisibles(admin),
        // El organizador entra por su cuenta (ver abajo): no se copia
        ...(esAdminGlobal ? {} : { userId: { not: admin.id } }),
      },
    });
    // …y ocupa plaza, así que al resto le queda una menos
    const libres = esAdminGlobal ? plazas : plazas - 1;
    if (aCopiar > libres) {
      return {
        error: `En el locke de origen hay ${aCopiar} jugadores y en este caben ${libres}. Desmarca "Jugadores" y apúntalos a mano, o sube el número de jugadores.`,
      };
    }
  }

  const created = await prisma.competition.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      game,
      gameId,
      juegoNoOficial,
      // Solo llega si el juego deja elegir (ver JuegoPicker); si no, lo de cada juego
      tipos: leerTipos(formData.get("tipos")),
      modality,
      description,
      startingPoints: Math.trunc(startingPoints),
      maxPlayers: plazas,
      estilo,
      jornadasPrevistas,
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
  if (archivar.length) {
    await prisma.competition.updateMany({
      where: {
        id: { in: archivar, not: created.id },
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
            jornadaDespues: cap.jornadaDespues,
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

  const juego = leerJuego({
    gameId: String(formData.get("gameId") ?? ""),
    game: String(formData.get("game") ?? ""),
    noOficial: String(formData.get("noOficial") ?? ""),
  });
  if ("error" in juego) return juego;

  /**
   * El estilo y las plazas, que **se pueden cambiar con el locke empezado**
   * (ver EditCompetitionForm). Lo que no se puede es dejar a nadie fuera: menos
   * plazas que apuntados, o un Soul Link de más de cuatro.
   */
  const actual = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { maxPlayers: true, estilo: true, _count: { select: { participants: true } } },
  });
  if (!actual) return { error: "Competición no encontrada." };
  const enSolitario = actual.maxPlayers === 1;
  const estilo = enSolitario
    ? actual.estilo
    : leerEstilo(String(formData.get("estilo") ?? actual.estilo));
  const pedidas = Number(formData.get("maxPlayers") ?? actual.maxPlayers);
  const tope = estilo === "soullink" ? JUGADORES_DEL_SOUL_LINK.maximo : JUGADORES_MAXIMOS;
  const plazas = enSolitario
    ? 1
    : Number.isFinite(pedidas)
      ? Math.min(tope, Math.max(2, Math.trunc(pedidas)))
      : actual.maxPlayers;
  if (plazas < actual._count.participants) {
    return {
      error:
        estilo === "soullink" && actual._count.participants > tope
          ? `Un Soul Link es de ${tope} como mucho y aquí hay ${actual._count.participants} apuntados.`
          : `Ya hay ${actual._count.participants} apuntados: no se puede bajar a ${plazas} plazas.`,
    };
  }

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      name,
      estilo,
      maxPlayers: plazas,
      game: juego.game,
      gameId: juego.gameId,
      juegoNoOficial: juego.juegoNoOficial,
      tipos: leerTipos(formData.get("tipos")),
      modality: String(formData.get("modality") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      jornadasPrevistas: numeroOpcional(formData.get("jornadasPrevistas"), 50),
      ...(Number.isFinite(startingPoints)
        ? { startingPoints: Math.trunc(startingPoints) }
        : {}),
      // Al almacén como todas: si no se ha tocado llega "sin cambios" y se
      // queda la que había; vacío es quitarlo
      logo: await guardarPorContenido(imagenEditada(formData.get("logo"))),
    },
  });

  await registrar(competitionId, "locke", "Cambia los datos del locke (nombre, juego, plazas, estilo…)");
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
  await registrar(competitionId, "locke", status === COMPETITION_STATUS.ARCHIVED ? "Archiva el locke" : "Reabre el locke");

  revalidatePath("/", "layout");
}

/**
 * Marcar un locke como **sin empezar**, o empezarlo. Al empezarlo, su fecha de
 * inicio pasa a ser hoy: lo que se haya tardado en montarlo no cuenta como
 * días de locke. Lo decide quien lo administra, como archivarlo.
 */
export async function cambiarArranqueAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);
  const sinEmpezar = formData.get("sinEmpezar") === "si";

  // Solo si cambia de verdad: un doble clic en «Empezar» no puede mover la
  // fecha de un locke que ya estaba en marcha
  const cambiados = await prisma.competition.updateMany({
    where: { id: competitionId, sinEmpezar: !sinEmpezar },
    data: sinEmpezar ? { sinEmpezar: true } : { sinEmpezar: false, startedAt: new Date() },
  });
  if (cambiados.count) {
    await registrar(competitionId, "locke", sinEmpezar ? "Marca el locke como sin empezar" : "Empieza el locke");
  }

  revalidatePath("/", "layout");
}

/** Y borrarlo, igual: es suyo. Se lleva por delante todo lo que tenga dentro. */
export async function deleteCompetitionAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);
  const borrado = await prisma.competition.delete({ where: { id: competitionId }, select: { name: true } });
  await registrar(competitionId, "locke", `Borra el locke «${borrado.name}» con todo lo que tenía`, borrado.name);
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

  // El usuario escrito a mano manda sobre la lista (ver AddParticipantForm)
  const username = String(formData.get("username") ?? "").trim().replace(/^@/, "");
  const user = username
    ? await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
      })
    : await prisma.user.findUnique({
        where: { id: String(formData.get("userId") ?? "") },
      });
  if (!user) {
    return {
      error: username
        ? `No hay ninguna cuenta con el usuario @${username}. Tiene que ser exacto, el de entrar.`
        : "Ese usuario no existe.",
    };
  }
  const userId = user.id;

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

  await registrar(competitionId, "jugadores", `Apunta a ${user.displayName} al locke${formData.get("isAdmin") === "on" ? " como administrador" : ""}`);
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
  {
    const nombre = String(formData.get("displayName") ?? "").trim() || participant.displayName;
    const admin = formData.get("isAdmin") === "on";
    const cambios = [
      nombre !== participant.displayName ? `nombre «${participant.displayName}» → «${nombre}»` : null,
      admin !== participant.isAdmin ? (admin ? "ahora administra" : "deja de administrar") : null,
    ].filter(Boolean);
    if (cambios.length) {
      await registrar(participant.competitionId, "jugadores", `Edita a ${nombre}: ${cambios.join(", ")}`);
    }
  }

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
      data: { retiredAt: null, motivoDeSalida: null },
    });
    await registrar(participant.competitionId, "jugadores", `Readmite a ${participant.displayName} en el locke`);
    revalidatePath("/", "layout");
    return;
  }

  await prisma.participant.update({
    where: { id: participantId },
    // Queda escrito por qué está fuera: lo dejó, no perdió el locke
    data: { retiredAt: new Date(), motivoDeSalida: MOTIVOS_DE_SALIDA.RETIRADA },
  });
  await registrar(participant.competitionId, "jugadores", `Retira a ${participant.displayName} del locke`);

  /**
   * Las jornadas que ya estén enteras jugadas se resuelven en el momento; las
   * que no, esperan a su último combate. Así los puntos entran en el mismo
   * orden en que pasaron las cosas.
   */
  await resolverRetiradas(participant.competitionId, manager.id);

  revalidatePath("/", "layout");
}

/**
 * Reparte al azar las versiones de la pareja (Rubí Omega y Zafiro Alfa) entre
 * los que siguen jugando, a partes iguales. Es como lo hace el grupo en la
 * vida real; esto solo lo ahorra. Cambia la de todos, así que va con aviso.
 */
export async function repartirVersionesAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { gameId: true, juegoNoOficial: true },
  });
  const versiones = competition ? versionesDeLaEdicion(competition) : [];
  if (versiones.length < 2) return;

  const jugadores = await prisma.participant.findMany({
    where: { competitionId, retiredAt: null },
    select: { id: true },
  });
  const reparto = repartirVersiones(
    jugadores.map((j) => j.id),
    versiones,
  );
  await prisma.$transaction(
    [...reparto].map(([id, gameVersion]) =>
      prisma.participant.update({ where: { id }, data: { gameVersion } }),
    ),
  );
  await registrar(competitionId, "jugadores", "Reparte al azar las versiones del juego");
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
  await registrar(
    participant.competitionId,
    "jugadores",
    `Saca a ${participant.displayName} del locke (se borra su cementerio, sus combates y sus puntos)`,
  );
  // Sus combates se van con él; los puntos que dieron a sus rivales, no solos
  await borrarPuntosHuerfanos(participant.competitionId);
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

  // El usuario escrito a mano manda sobre la lista (ver AddParticipantForm)
  const username = String(formData.get("username") ?? "").trim().replace(/^@/, "");
  const user = username
    ? await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
      })
    : await prisma.user.findUnique({
        where: { id: String(formData.get("userId") ?? "") },
      });
  if (!user) {
    return {
      error: username
        ? `No hay ninguna cuenta con el usuario @${username}. Tiene que ser exacto, el de entrar.`
        : "Ese usuario no existe.",
    };
  }
  const userId = user.id;

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

  await registrar(competitionId, "jugadores", `Deja mirar el locke a ${user.displayName}`);
  revalidatePath("/", "layout");
  return { success: `${user.displayName} ya puede mirar este locke.` };
}

/** Le quita el acceso de espectador: deja de ver esa edición. */
export async function quitarEspectadorAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  await requireCompetitionManager(competitionId);

  const quitados = await prisma.spectator.deleteMany({ where: { competitionId, userId } });
  if (quitados.count) {
    const quien = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    await registrar(competitionId, "jugadores", `Ya no deja mirar el locke a ${quien?.displayName ?? "alguien"}`);
  }
  revalidatePath("/", "layout");
}
