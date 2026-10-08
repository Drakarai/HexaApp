import "server-only";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { descargarSprites } from "@/lib/sprites-servidor";
import { companerasDe } from "@/lib/equipo-y-caja";
import { capturasParaVincular } from "@/lib/soul-link";

/**
 * Lo que comparten las acciones del Equipo y PC y el cementerio: quién puede
 * tocar la caja de quién, la foto para deshacer y **dar por muerto**.
 *
 * Va aquí y no en `actions/equipo-y-caja.ts` porque un fichero `"use server"`
 * convierte en acción **todo lo que exporta**: `darPorMuerto` sin su
 * comprobación de permisos se podría llamar desde cualquier navegador.
 */

/**
 * Quién puede tocar la caja de un jugador.
 *
 * - En un **Soul Link** la caja es de todos a la vista, y la toca su dueño o
 *   quien administra el locke, como el resto de cosas de un jugador.
 * - En cualquier otro locke es **privada como el mapa**: solo su dueño, ni
 *   siquiera quien administra. Ahí dentro va lo que se ha capturado, y eso no
 *   se le enseña a los rivales.
 */
export async function assertPuedeTocarLaCaja(participantId: string) {
  const { user, participant } = await assertCanActForParticipant(participantId);
  const competicion = await prisma.competition.findUnique({
    where: { id: participant.competitionId },
    select: { estilo: true },
  });
  if (competicion?.estilo !== "soullink" && participant.userId !== user.id) {
    throw new Error("El equipo y la caja son de cada uno: nadie más puede tocarlos.");
  }
  return { user, participant };
}

/** Los campos de una captura que se pueden deshacer */
export const CAMPOS = {
  id: true,
  lugar: true,
  hueco: true,
  species: true,
  pokemonId: true,
  vinculo: true,
  deathId: true,
  image: true,
  historia: true,
  shiny: true,
} as const;
export type Foto = Prisma.CaptureGetPayload<{ select: typeof CAMPOS }> & {
  /**
   * Lo que solo cambia al intercambiarlo (el mote y su ficha de combate son del
   * que se va). Solo lo lleva la foto de un intercambio: en las demás no se
   * toca, que deshacer un movimiento no tiene por qué devolver un mote viejo.
   */
  nickname?: string | null;
  naturaleza?: string | null;
  objeto?: string | null;
  movimientos?: Prisma.JsonValue;
  habilidad?: string | null;
  habilidadMega?: string | null;
};

export async function fotos(ids: string[]): Promise<Foto[]> {
  if (!ids.length) return [];
  return prisma.capture.findMany({ where: { id: { in: ids } }, select: CAMPOS });
}

/** Cuántos cambios se guardan por jugador: más atrás nadie se acuerda */
const CAMBIOS_GUARDADOS = 20;

export async function apuntarCambio(
  participantId: string,
  descripcion: string,
  antes: Foto[],
  muertes: string[] = [],
  /** Las capturas que se crearon con el cambio (leer la partida): deshacer las borra */
  capturas: string[] = [],
) {
  if (!antes.length && !muertes.length && !capturas.length) return;
  await prisma.cambioDeCaja.create({
    data: { participantId, descripcion, antes: antes as unknown as Prisma.InputJsonValue, muertes, capturas },
  });
  const sobran = await prisma.cambioDeCaja.findMany({
    where: { participantId },
    orderBy: { createdAt: "desc" },
    skip: CAMBIOS_GUARDADOS,
    select: { id: true },
  });
  if (sobran.length) {
    await prisma.cambioDeCaja.deleteMany({ where: { id: { in: sobran.map((c) => c.id) } } });
  }
}

/** Lo que cambia cuando cambia el equipo, la caja o una baja */
export function refrescarCaja(conBajas = false) {
  revalidatePath("/equipo");
  revalidatePath("/");
  if (conBajas) {
    revalidatePath("/muertes");
    revalidatePath("/mapa");
    revalidatePath("/hall-de-la-fama");
    revalidatePath("/actividad");
    revalidatePath("/jugador", "layout");
  }
}

/**
 * La captura y su dueño, **con el permiso comprobado** (ver
 * `assertPuedeTocarLaCaja`). Si no, salta el error.
 */
export async function capturaQuePuedoTocar(captureId: string) {
  const captura = await prisma.capture.findUnique({
    where: { id: captureId },
    select: {
      ...CAMPOS,
      participantId: true,
      nickname: true,
      zoneId: true,
      sitio: true,
      failed: true,
      participant: {
        select: {
          displayName: true,
          competition: {
            select: { id: true, estilo: true, game: true, gameId: true, juegoNoOficial: true },
          },
        },
      },
    },
  });
  if (!captura || captura.failed) throw new Error("Ese pokémon ya no está.");
  await assertPuedeTocarLaCaja(captura.participantId);
  return captura;
}
export type CapturaTocable = Awaited<ReturnType<typeof capturaQuePuedoTocar>>;

export const nombreDe = (c: { nickname: string | null; species: string }) =>
  c.nickname || c.species;

/**
 * Dar un pokémon por muerto, **con el permiso ya comprobado**. Va al
 * cementerio como cualquier baja, y en un Soul Link **se lleva a su pareja**:
 * a las compañeras de su vínculo que sigan vivas se les apunta la baja también,
 * con la causa de que cayó la otra. Queda para deshacer.
 */
export async function darPorMuerto(
  captura: CapturaTocable,
  causaEscrita: string,
  /**
   * Dónde cayó: una zona del mapa o lo escrito a mano (ver `SitioPicker`).
   * Antes se ponía la zona donde se **capturó**, que no tiene nada que ver.
   * Las que caen por el vínculo de un Soul Link cayeron en el mismo momento:
   * van con el mismo sitio.
   */
  sitio: { zoneId: string | null; location: string | null } = { zoneId: null, location: null },
) {
  const { foto, muertes, mensaje } = await caer(captura, causaEscrita, sitio);
  await apuntarCambio(captura.participantId, `Dar por muerto a ${nombreDe(captura)}`, foto, muertes);
  refrescarCaja(true);
  return mensaje;
}

/**
 * La caída en sí, sin apuntarla para deshacer: devuelve la foto de antes y las
 * bajas creadas para que quien llama la apunte. Leer la partida da por muertos
 * a varios de golpe y los deshace todos juntos, con lo demás que cambió.
 */
export async function caer(
  captura: CapturaTocable,
  causaEscrita: string,
  sitio: { zoneId: string | null; location: string | null },
) {
  if (captura.deathId) throw new Error("Ya estaba en el cementerio.");
  const { competition } = captura.participant;
  const causa = causaEscrita.trim().slice(0, 200) || null;

  const companeras =
    competition.estilo === "soullink"
      ? companerasDe(await capturasParaVincular(competition.id), captura.id).filter(
          (c) => !c.muerta,
        )
      : [];
  const todas = await prisma.capture.findMany({
    where: { id: { in: [captura.id, ...companeras.map((c) => c.id)] } },
    select: {
      ...CAMPOS,
      participantId: true,
      nickname: true,
      zoneId: true,
      sitio: true,
      participant: { select: { displayName: true } },
    },
  });
  const foto = await fotos(todas.map((c) => c.id));

  const muertes: string[] = [];
  for (const c of todas) {
    const esLaMisma = c.id === captura.id;
    // La ilustración grande, como las bajas del cementerio; el sprite es el suyo
    const sprites = c.pokemonId ? await descargarSprites(c.pokemonId, false) : null;
    const baja = await prisma.death.create({
      data: {
        participantId: c.participantId,
        species: c.species,
        nickname: c.nickname,
        cause: esLaMisma
          ? causa
          : `Vínculo: cayó ${nombreDe(captura)} de ${captura.participant.displayName}${causa ? ` (${causa})` : ""}`,
        zoneId: sitio.zoneId,
        location: sitio.zoneId ? null : sitio.location,
        boxImage: c.image ?? sprites?.boxImage ?? null,
        detailImage: sprites?.detailImage ?? null,
      },
      select: { id: true },
    });
    muertes.push(baja.id);
    await prisma.capture.update({ where: { id: c.id }, data: { deathId: baja.id } });
  }

  const otras = todas.filter((c) => c.id !== captura.id);
  const mensaje = otras.length
    ? `F por ${nombreDe(captura)}. Con él cae ${otras
        .map((c) => `${nombreDe(c)} de ${c.participant.displayName}`)
        .join(" y ")}.`
    : `F por ${nombreDe(captura)}.`;
  return { foto, muertes, mensaje };
}
