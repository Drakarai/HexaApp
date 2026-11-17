"use server";

import { revalidatePath } from "next/cache";
import { registrar } from "@/lib/registro";
import { prisma } from "@/lib/db";
import { esCreador, getCurrentUser, requireCreador } from "@/lib/auth";
import { canManageCompetition, requireCompetitionManager } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";
import { conPermiso, mensajeDeError } from "@/lib/permiso";

/**
 * Títulos: se inventan y se reparten. Son **solo estéticos** —ni puntos, ni
 * ventajas, ni cuentan para la clasificación—, así que aquí la única regla es
 * quién puede tocar qué (ver lib/titulos.ts para cómo se ven):
 *
 * - El **catálogo común** y los títulos generales sin locke: el Creador.
 * - Los **extras de un locke** y lo que se da dentro de un locke (sea solo de
 *   él o general «ganado en él»): el Creador y quien administra ese locke, y
 *   solo a quien lo juega.
 */

/** Refresca todo lo que enseña un título: perfiles, clasificación, ajustes. */
function refrescar() {
  revalidatePath("/", "layout");
}

/** Lo que se teclea de un título, igual al crearlo que al cambiarlo */
function datosDelTitulo(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    // Un emoji o dos como mucho: la chapa es pequeña
    icon: String(formData.get("icon") ?? "").trim().slice(0, 4) || null,
    color: String(formData.get("color") ?? "").trim() || "#a78bfa",
  };
}

/** Quien puede tocar un título: el Creador, o quien administra su locke si es un extra */
async function assertPuedeTocarElTitulo(competitionId: string | null) {
  if (competitionId) return requireCompetitionManager(competitionId);
  return requireCreador();
}

export async function crearTituloAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Con locke, es un extra de ese locke; sin él, del catálogo común
  const competitionId = String(formData.get("competitionId") ?? "") || null;
  const [, sinPermiso] = await conPermiso(assertPuedeTocarElTitulo(competitionId));
  if (sinPermiso) return sinPermiso;

  const datos = datosDelTitulo(formData);
  if (!datos.name) return { error: "El título necesita un nombre." };
  if (datos.name.length > 60) return { error: "Ese nombre es demasiado largo." };

  await prisma.title.create({
    // Un extra ya es de su locke; en el común se elige
    data: { ...datos, competitionId, deLocke: !competitionId && formData.get("deLocke") === "on" },
  });
  if (competitionId) await registrar(competitionId, "jugadores", `Crea el título «${datos.name}» para el locke`);
  refrescar();
  return { success: `Título "${datos.name}" creado.` };
}

export async function editarTituloAction(formData: FormData) {
  const id = String(formData.get("titleId") ?? "");
  const titulo = await prisma.title.findUnique({ where: { id }, select: { competitionId: true } });
  if (!titulo) return;
  await assertPuedeTocarElTitulo(titulo.competitionId);
  const datos = datosDelTitulo(formData);
  if (!datos.name) return;
  await prisma.title.update({
    where: { id },
    data: {
      ...datos,
      // Solo el común (el formulario lo trae con su casilla); un extra lo es siempre
    },
  });
  refrescar();
}

/**
 * Meter un título del catálogo en **la lista de títulos a obtener** (la que
 * comparten todos los lockes: se gana en cada uno) o sacarlo de ella. Solo el
 * Creador, que es el dueño del catálogo.
 *
 * Al meterlo, lo que ya se había dado **en un locke** pasa a ser de ese locke,
 * que es lo que significa estar en la lista; lo dado sin locke se queda como
 * general hasta que se le diga dónde (con «Dónde vale»). Al sacarlo, lo dado
 * se queda como está.
 */
export async function listaDeTitulosAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("titleId") ?? "");
  const enLaLista = formData.get("enLaLista") === "1";
  const titulo = await prisma.title.findUnique({ where: { id }, select: { competitionId: true, name: true } });
  // Los extras de un locke ya son de su locke: no entran ni salen de la lista común
  if (!titulo || titulo.competitionId) return;
  await prisma.$transaction([
    prisma.title.update({ where: { id }, data: { deLocke: enLaLista } }),
    ...(enLaLista
      ? [
          prisma.titleAward.updateMany({
            where: { titleId: id, competitionId: { not: null }, soloEnElLocke: false },
            // Uno de un locke no se lleva como general
            data: { soloEnElLocke: true, equipped: false },
          }),
        ]
      : []),
  ]);
  await registrar(
    null,
    "jugadores",
    enLaLista
      ? `Pasa «${titulo.name}» a la lista de títulos a obtener`
      : `Saca «${titulo.name}» de la lista de títulos a obtener`,
  );
  refrescar();
}

/** Borra el título y, en cascada, todas sus concesiones. */
export async function borrarTituloAction(formData: FormData) {
  const id = String(formData.get("titleId") ?? "");
  const titulo = await prisma.title.findUnique({ where: { id }, select: { competitionId: true } });
  if (!titulo) return;
  await assertPuedeTocarElTitulo(titulo.competitionId);
  await prisma.title.delete({ where: { id } });
  refrescar();
}

/**
 * Dónde se da, como lo manda el formulario: `general` (sin locke, solo el
 * Creador), `general:<locke>` (general, ganado en ese locke) o `locke:<locke>`
 * (solo se lleva dentro de ese locke).
 */
function leerAlcance(valor: string) {
  const [tipo, competitionId] = valor.split(":");
  if (tipo === "general" && !competitionId) return { competitionId: null, soloEnElLocke: false };
  if ((tipo === "general" || tipo === "locke") && competitionId) {
    return { competitionId, soloEnElLocke: tipo === "locke" };
  }
  return null;
}

export async function concederTituloAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Tienes que iniciar sesión." };

    const titleId = String(formData.get("titleId") ?? "");
    const userId = String(formData.get("userId") ?? "");
    const alcance = leerAlcance(String(formData.get("alcance") ?? "general"));
    if (!titleId || !userId || !alcance) return { error: "Elige el título, a quién y dónde." };

    // Sin locke solo el Creador; con locke, también quien lo administra
    if (alcance.competitionId) await requireCompetitionManager(alcance.competitionId);
    else await requireCreador();

    const [titulo, usuario, juega] = await Promise.all([
      prisma.title.findUnique({ where: { id: titleId }, select: { name: true, competitionId: true, deLocke: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      alcance.competitionId
        ? prisma.participant.count({ where: { userId, competitionId: alcance.competitionId } })
        : 1,
    ]);
    if (!titulo || !usuario) return { error: "Ese título o esa persona ya no está." };
    if (!juega) return { error: `${usuario.displayName} no juega ese locke.` };
    // Un extra es de su locke: ni se da en otro ni se hace general
    if (titulo.competitionId && (titulo.competitionId !== alcance.competitionId || !alcance.soloEnElLocke)) {
      return { error: "Ese título es de un locke: solo se puede dar dentro de él." };
    }
    // Los «de locke» del catálogo se ganan en cada locke, y solo ahí
    if (titulo.deLocke && !alcance.soloEnElLocke) {
      return { error: "Ese título es de locke: se da como «solo de un locke»." };
    }

    const yaLoTiene = await prisma.titleAward.findFirst({
      where: { titleId, userId, competitionId: alcance.competitionId, soloEnElLocke: alcance.soloEnElLocke },
      select: { id: true },
    });
    if (yaLoTiene) return { error: `${usuario.displayName} ya tiene "${titulo.name}" ahí.` };

    await prisma.titleAward.create({
      data: {
        titleId,
        userId,
        note: String(formData.get("note") ?? "").trim() || null,
        awardedById: user.id,
        ...alcance,
      },
    });
    await registrar(alcance.competitionId, "jugadores", `Concede el título «${titulo.name}» a ${usuario.displayName}`);
    refrescar();
    return { success: `"${titulo.name}" para ${usuario.displayName}.` };
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}

/**
 * Cambiar dónde vale un título ya dado (general, general de un locke o solo de
 * un locke) **sin quitarlo**: se quedan su fecha, quién lo dio y el porqué.
 * Quien administra un locke solo lo mueve dentro de lo suyo: de lo dado en su
 * locke a otra forma de su mismo locke. El resto, el Creador.
 */
export async function cambiarAlcanceDelTituloAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const awardId = String(formData.get("awardId") ?? "");
    const alcance = leerAlcance(String(formData.get("alcance") ?? ""));
    if (!alcance) return { error: "Elige dónde vale." };
    const concesion = await prisma.titleAward.findUnique({
      where: { id: awardId },
      select: {
        id: true,
        userId: true,
        titleId: true,
        competitionId: true,
        soloEnElLocke: true,
        title: { select: { name: true, competitionId: true, deLocke: true } },
        user: { select: { displayName: true } },
      },
    });
    if (!concesion) return { error: "Ese título ya no está." };
    if (concesion.competitionId === alcance.competitionId && concesion.soloEnElLocke === alcance.soloEnElLocke) {
      return {};
    }

    // Hay que poder tocar lo de antes y lo de después
    const user = await getCurrentUser();
    if (!user) return { error: "Tienes que iniciar sesión." };
    if (!esCreador(user)) {
      if (!concesion.competitionId || concesion.competitionId !== alcance.competitionId) {
        return { error: "Solo puedes moverlo dentro de tu locke." };
      }
      await requireCompetitionManager(concesion.competitionId);
    }
    if (alcance.competitionId) {
      const juega = await prisma.participant.count({
        where: { userId: concesion.userId, competitionId: alcance.competitionId },
      });
      if (!juega) return { error: `${concesion.user.displayName} no juega ese locke.` };
    }
    if (
      concesion.title.competitionId &&
      (concesion.title.competitionId !== alcance.competitionId || !alcance.soloEnElLocke)
    ) {
      return { error: "Ese título es de un locke: solo puede ser de él." };
    }
    if (concesion.title.deLocke && !alcance.soloEnElLocke) {
      return { error: "Ese título es de locke: solo puede ser de un locke." };
    }
    const repetido = await prisma.titleAward.findFirst({
      where: {
        titleId: concesion.titleId,
        userId: concesion.userId,
        competitionId: alcance.competitionId,
        soloEnElLocke: alcance.soloEnElLocke,
        NOT: { id: concesion.id },
      },
      select: { id: true },
    });
    if (repetido) return { error: `${concesion.user.displayName} ya lo tiene ahí.` };

    await prisma.titleAward.update({
      where: { id: concesion.id },
      data: {
        ...alcance,
        // Uno de un locke no se lleva como general: si lo llevaba, se le quita
        ...(alcance.soloEnElLocke ? { equipped: false } : {}),
      },
    });
    await registrar(
      alcance.competitionId ?? concesion.competitionId,
      "jugadores",
      `Cambia dónde vale el título «${concesion.title.name}» de ${concesion.user.displayName}`,
    );
    refrescar();
    return { success: "Cambiado." };
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}

export async function revocarTituloAction(formData: FormData) {
  const id = String(formData.get("awardId") ?? "");
  const concesion = await prisma.titleAward.findUnique({
    where: { id },
    select: { competitionId: true, title: { select: { name: true } }, user: { select: { displayName: true } } },
  });
  if (!concesion) return;
  // Lo dado en un locke lo quita también quien lo administra; lo de fuera, el Creador
  if (concesion.competitionId) await requireCompetitionManager(concesion.competitionId);
  else await requireCreador();
  await prisma.titleAward.delete({ where: { id } });
  await registrar(
    concesion.competitionId,
    "jugadores",
    `Quita el título «${concesion.title.name}» a ${concesion.user.displayName}`,
  );
  refrescar();
}

/**
 * Ponerse o quitarse un título. Con `competitionId`, **el de ese locke**
 * (uno general o uno de ese locke); sin él, **el general**, el que sale fuera
 * de los lockes y donde no se ha elegido otro.
 *
 * Lo puede hacer el dueño, el Creador y, para lo de un locke, quien lo
 * administra. El general va en `TitleAward.equipped`: apagar los demás y
 * encender el elegido van en la misma transacción para que no haya dos.
 */
export async function equiparTituloAction(formData: FormData) {
  const usuario = await getCurrentUser();
  if (!usuario) return;

  const awardId = String(formData.get("awardId") ?? "");
  // Sin concesión es quitarse el que lleve; hace falta saber de quién
  const userId = String(formData.get("userId") ?? "");
  const competitionId = String(formData.get("competitionId") ?? "") || null;

  const concesion = awardId
    ? await prisma.titleAward.findUnique({
        where: { id: awardId },
        select: { userId: true, soloEnElLocke: true, competitionId: true },
      })
    : null;
  const dueno = concesion?.userId ?? userId;
  if (!dueno || (awardId && !concesion)) return;

  const puede =
    dueno === usuario.id ||
    esCreador(usuario) ||
    (competitionId ? await canManageCompetition(competitionId, usuario) : false);
  if (!puede) return;

  if (competitionId) {
    // Solo vale uno general o uno de este mismo locke
    if (concesion && concesion.soloEnElLocke && concesion.competitionId !== competitionId) return;
    await prisma.participant.updateMany({
      where: { userId: dueno, competitionId },
      data: { tituloPuestoId: awardId || null },
    });
  } else {
    // Uno de un locke no se lleva fuera de él
    if (concesion?.soloEnElLocke) return;
    await prisma.$transaction([
      prisma.titleAward.updateMany({ where: { userId: dueno, equipped: true }, data: { equipped: false } }),
      ...(awardId ? [prisma.titleAward.update({ where: { id: awardId }, data: { equipped: true } })] : []),
    ]);
  }
  refrescar();
}
