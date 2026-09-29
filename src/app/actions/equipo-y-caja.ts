"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  assertCanActForParticipant,
  getActiveCompetition,
  getMyParticipant,
} from "@/lib/competition";
import { zonaValidaParaCompeticion } from "@/lib/mapas";
import { descargarSprites, spritesDelFormulario } from "@/lib/sprites-servidor";
import { generacionDelJuego } from "@/lib/juegos";
import { evolucionesDe } from "@/lib/evoluciones";
import {
  companerasDe,
  mover,
  sePuedenVincular,
  sitioParaUnaNueva,
  vinculosDe,
  type Lugar,
} from "@/lib/equipo-y-caja";
import { capturasParaVincular, vincularCapturaNueva } from "@/lib/soul-link";
import type { FormState } from "@/app/actions/auth";

/**
 * Las acciones del Equipo y PC. **Cada una comprueba en el servidor** que quien
 * la lanza es el dueño de ese pokémon o administra el locke
 * (`assertCanActForParticipant`), que ocultar un botón no protege nada. Las de
 * mover se llaman directamente desde el navegador, sin formulario, porque el
 * arrastre ya ha movido la casilla y solo falta guardarlo.
 *
 * Todo lo que cambia algo deja **cómo estaba** en `CambioDeCaja`, para el
 * botón de deshacer.
 */

type Resultado = { error?: string; aviso?: string };

/** Los campos de una captura que se pueden deshacer */
const CAMPOS = {
  id: true,
  lugar: true,
  hueco: true,
  species: true,
  pokemonId: true,
  vinculo: true,
  deathId: true,
  image: true,
} as const;
type Foto = Prisma.CaptureGetPayload<{ select: typeof CAMPOS }>;

async function fotos(ids: string[]): Promise<Foto[]> {
  if (!ids.length) return [];
  return prisma.capture.findMany({ where: { id: { in: ids } }, select: CAMPOS });
}

/** Cuántos cambios se guardan por jugador: más atrás nadie se acuerda */
const CAMBIOS_GUARDADOS = 20;

async function apuntarCambio(
  participantId: string,
  descripcion: string,
  antes: Foto[],
  muertes: string[] = [],
) {
  if (!antes.length && !muertes.length) return;
  await prisma.cambioDeCaja.create({
    data: { participantId, descripcion, antes: antes as unknown as Prisma.InputJsonValue, muertes },
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
function refrescar(conBajas = false) {
  revalidatePath("/soul-link");
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
 * La captura y su dueño, **con el permiso comprobado**. Si no es tuya y no
 * administras el locke, o la edición está archivada, salta el error.
 */
async function capturaQuePuedoTocar(captureId: string) {
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
            select: { id: true, estilo: true, gameId: true, juegoNoOficial: true },
          },
        },
      },
    },
  });
  if (!captura || captura.failed) throw new Error("Ese pokémon ya no está.");
  await assertCanActForParticipant(captura.participantId);
  return captura;
}

const nombreDe = (c: { nickname: string | null; species: string }) => c.nickname || c.species;

async function conError(accion: () => Promise<Resultado | void>): Promise<Resultado> {
  try {
    return (await accion()) ?? {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Apuntar
// ---------------------------------------------------------------------------

export async function apuntarEnCajaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const competicion = await getActiveCompetition();
  if (!competicion) return { error: "No hay ningún locke abierto." };

  /**
   * Para quién: el suyo, salvo que quien apunta administre el locke y elija a
   * otro (el que lleva el locke le apunta la captura al que no tiene el móvil
   * a mano).
   */
  const elegido = String(formData.get("participantId") ?? "").trim();
  const yo = await getMyParticipant(competicion.id, user.id);
  const participantId = elegido || yo?.id;
  if (!participantId) return { error: "No juegas este locke, así que no tienes caja." };
  try {
    const { participant } = await assertCanActForParticipant(participantId);
    if (participant.competitionId !== competicion.id) {
      return { error: "Ese jugador no es de este locke." };
    }
  } catch (error) {
    return { error: (error as Error).message };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "¿Qué pokémon has capturado?" };
  const pokemonIdBruto = Number(formData.get("pokemonId") ?? "");
  const pokemonId = Number.isInteger(pokemonIdBruto) && pokemonIdBruto > 0 ? pokemonIdBruto : null;

  // El sitio: una zona del mapa, si el juego lo tiene, o escrito a mano
  let zoneId: string | null = String(formData.get("zoneId") ?? "").trim() || null;
  const escrito = String(formData.get("location") ?? "").trim() || null;
  if (zoneId && !(await zonaValidaParaCompeticion(zoneId, competicion.gameId))) zoneId = null;
  const sitio = zoneId ? null : escrito;

  const vincularCon = String(formData.get("vincularCon") ?? "").trim();

  const [sprites, suyas] = await Promise.all([
    spritesDelFormulario(formData),
    prisma.capture.findMany({
      where: { participantId, failed: false, deathId: null },
      select: { id: true, lugar: true, hueco: true, createdAt: true },
    }),
  ]);
  // Al equipo si queda hueco, como en los juegos; si no, a la caja
  const donde = sitioParaUnaNueva(suyas.map((c) => ({ ...c, creado: c.createdAt.getTime() })));

  const nueva = await prisma.capture.create({
    data: {
      participantId,
      species,
      pokemonId,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      zoneId,
      sitio,
      image: sprites?.boxImage ?? null,
      lugar: donde.lugar,
      hueco: donde.hueco,
    },
  });

  /**
   * El vínculo: el que se eligió a mano manda; si no, se busca solo por la
   * ruta. En un locke que no es Soul Link no hay vínculos que hacer.
   */
  let con: string[] = [];
  if (vincularCon && competicion.estilo === "soullink") {
    const error = await unir(competicion.id, nueva.id, vincularCon);
    if (error) {
      refrescar();
      return { success: `${species} apuntado, pero sin vincular: ${error}` };
    }
    con = [vincularCon];
  } else {
    con = await vincularCapturaNueva(nueva.id);
  }

  refrescar();
  if (!con.length) {
    return {
      success:
        competicion.estilo === "soullink"
          ? `${species} apuntado. Va suelto hasta que otro capture en esa ruta.`
          : `${species} apuntado.`,
    };
  }
  const parejas = await prisma.capture.findMany({
    where: { id: { in: con } },
    select: { species: true, nickname: true, participant: { select: { displayName: true } } },
  });
  return {
    success: `${species} apuntado y vinculado con ${parejas
      .map((p) => `${nombreDe(p)} de ${p.participant.displayName}`)
      .join(" y ")}.`,
  };
}

// ---------------------------------------------------------------------------
// Mover
// ---------------------------------------------------------------------------

export async function moverPokemonAction(entrada: {
  captureId: string;
  lugar: Lugar;
  hueco: number | null;
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    if (captura.deathId) return { error: "Los caídos no se mueven: están en el cementerio." };
    if (entrada.lugar !== "equipo" && entrada.lugar !== "caja") return { error: "Ese sitio no existe." };

    const suyas = await prisma.capture.findMany({
      where: { participantId: captura.participantId, failed: false, deathId: null },
      select: { id: true, lugar: true, hueco: true, createdAt: true },
    });
    const resultado = mover(
      suyas.map((c) => ({ ...c, creado: c.createdAt.getTime() })),
      captura.id,
      { lugar: entrada.lugar, hueco: entrada.hueco },
    );
    if ("error" in resultado) return resultado;

    // Solo se escriben las que cambian de verdad
    const antes = new Map(suyas.map((c) => [c.id, c]));
    const cambian = resultado.posiciones.filter((p) => {
      const era = antes.get(p.id);
      return !era || era.lugar !== p.lugar || era.hueco !== p.hueco;
    });
    if (!cambian.length) return {};

    const foto = await fotos(cambian.map((p) => p.id));
    await prisma.$transaction(
      cambian.map((p) =>
        prisma.capture.update({ where: { id: p.id }, data: { lugar: p.lugar, hueco: p.hueco } }),
      ),
    );
    await apuntarCambio(
      captura.participantId,
      entrada.lugar === "equipo" ? `Meter a ${nombreDe(captura)} en el equipo` : `Mover a ${nombreDe(captura)}`,
      foto,
    );
    refrescar();
  });
}

// ---------------------------------------------------------------------------
// Evolucionar
// ---------------------------------------------------------------------------

export async function evolucionarAction(entrada: {
  captureId: string;
  pokemonId: number;
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    if (captura.deathId) return { error: "Un pokémon caído ya no evoluciona." };
    const { competition } = captura.participant;

    // Solo a lo que de verdad puede evolucionar: el formulario se puede falsear
    const opciones = evolucionesDe(
      captura.pokemonId,
      captura.species,
      competition.juegoNoOficial ? null : generacionDelJuego(competition.gameId),
    );
    const elegida = opciones.find((o) => o.pokemonId === entrada.pokemonId);
    if (!elegida) return { error: "No puede evolucionar a eso." };

    const [foto, sprites] = await Promise.all([
      fotos([captura.id]),
      descargarSprites(elegida.pokemonId, false),
    ]);
    await prisma.capture.update({
      where: { id: captura.id },
      data: {
        species: elegida.especie,
        pokemonId: elegida.pokemonId,
        // Si no se pudo bajar el sprite nuevo, mejor el viejo que ninguno
        ...(sprites.boxImage ? { image: sprites.boxImage } : {}),
      },
    });
    await apuntarCambio(
      captura.participantId,
      `Evolucionar a ${nombreDe(captura)} en ${elegida.rotulo}`,
      foto,
    );
    refrescar();
    return { aviso: `¡${nombreDe(captura)} ha evolucionado en ${elegida.rotulo}!` };
  });
}

// ---------------------------------------------------------------------------
// Caer
// ---------------------------------------------------------------------------

/**
 * Dar un pokémon por muerto. Va al cementerio como cualquier baja, y en un Soul
 * Link **se lleva a su pareja**: a las compañeras de su vínculo que sigan vivas
 * se les apunta la baja también, con la causa de que cayó la otra.
 */
export async function darPorMuertoAction(entrada: {
  captureId: string;
  causa: string;
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    if (captura.deathId) return { error: "Ya estaba en el cementerio." };
    const { competition } = captura.participant;
    const causa = entrada.causa.trim().slice(0, 200) || null;

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
          zoneId: c.zoneId,
          location: c.sitio,
          boxImage: c.image ?? sprites?.boxImage ?? null,
          detailImage: sprites?.detailImage ?? null,
        },
        select: { id: true },
      });
      muertes.push(baja.id);
      await prisma.capture.update({ where: { id: c.id }, data: { deathId: baja.id } });
    }

    await apuntarCambio(captura.participantId, `Dar por muerto a ${nombreDe(captura)}`, foto, muertes);
    refrescar(true);
    const otras = todas.filter((c) => c.id !== captura.id);
    return {
      aviso: otras.length
        ? `F por ${nombreDe(captura)}. Con él cae ${otras
            .map((c) => `${nombreDe(c)} de ${c.participant.displayName}`)
            .join(" y ")}.`
        : `F por ${nombreDe(captura)}.`,
    };
  });
}

// ---------------------------------------------------------------------------
// Vincular
// ---------------------------------------------------------------------------

/**
 * Junta dos capturas en un vínculo. Si alguna ya iba vinculada, la otra (y su
 * grupo, si lo tiene) entra en ese. Devuelve el error, o null si fue bien.
 */
async function unir(competitionId: string, unaId: string, otraId: string) {
  const capturas = await capturasParaVincular(competitionId);
  const error = sePuedenVincular(capturas, unaId, otraId);
  if (error) return error;

  const grupos = vinculosDe(capturas);
  const una = capturas.find((c) => c.id === unaId)!;
  const otra = capturas.find((c) => c.id === otraId)!;
  const deUna = una.vinculo && grupos.has(una.vinculo) ? una.vinculo : null;
  const deOtra = otra.vinculo && grupos.has(otra.vinculo) ? otra.vinculo : null;
  const clave = deOtra ?? deUna ?? crypto.randomUUID();
  const entran = [
    ...(deUna ? grupos.get(deUna)! : [una]),
    ...(deOtra ? grupos.get(deOtra)! : [otra]),
  ].map((c) => c.id);
  await prisma.capture.updateMany({ where: { id: { in: entran } }, data: { vinculo: clave } });
  return null;
}

export async function vincularAction(entrada: {
  captureId: string;
  conId: string;
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    const { competition } = captura.participant;
    if (competition.estilo !== "soullink") return { error: "Los vínculos son cosa del Soul Link." };

    // La otra tiene que ser de este locke: se comprueba al buscarla entre las suyas
    const capturas = await capturasParaVincular(competition.id);
    if (!capturas.some((c) => c.id === entrada.conId)) return { error: "Ese pokémon no es de este locke." };

    // Cómo estaban las dos y todas las de sus vínculos, que pueden cambiar de clave
    const otra = capturas.find((c) => c.id === entrada.conId);
    const claves = [captura.vinculo, otra?.vinculo].filter(Boolean);
    const implicadas = capturas
      .filter((c) => c.id === captura.id || c.id === entrada.conId || claves.includes(c.vinculo))
      .map((c) => c.id);
    const foto = await fotos(implicadas);
    const error = await unir(competition.id, captura.id, entrada.conId);
    if (error) return { error };
    await apuntarCambio(captura.participantId, `Vincular a ${nombreDe(captura)}`, foto);
    refrescar();
  });
}

export async function desvincularAction(entrada: { captureId: string }): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    if (!captura.vinculo) return {};
    const foto = await fotos([captura.id]);
    await prisma.capture.update({ where: { id: captura.id }, data: { vinculo: null } });
    await apuntarCambio(captura.participantId, `Desvincular a ${nombreDe(captura)}`, foto);
    refrescar();
  });
}

// ---------------------------------------------------------------------------
// Mote y borrar
// ---------------------------------------------------------------------------

export async function cambiarMoteAction(entrada: {
  captureId: string;
  mote: string;
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    await prisma.capture.update({
      where: { id: captura.id },
      data: { nickname: entrada.mote.trim().slice(0, 40) || null },
    });
    refrescar();
  });
}

/**
 * Quitar una captura apuntada por error. No se deshace (se pregunta antes) y
 * no toca el cementerio: si ya había caído, su baja se queda.
 */
export async function borrarDeLaCajaAction(entrada: { captureId: string }): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    await prisma.capture.delete({ where: { id: captura.id } });
    refrescar();
  });
}

// ---------------------------------------------------------------------------
// Deshacer
// ---------------------------------------------------------------------------

/**
 * Vuelve atrás el último cambio del equipo y la caja de un jugador: deja las
 * capturas como estaban y borra las bajas que se crearon (las de la pareja
 * incluidas). Se puede pulsar varias veces, hasta veinte cambios atrás.
 */
export async function deshacerEnCajaAction(entrada: { participantId: string }): Promise<Resultado> {
  return conError(async () => {
    await assertCanActForParticipant(entrada.participantId);
    const cambio = await prisma.cambioDeCaja.findFirst({
      where: { participantId: entrada.participantId },
      orderBy: { createdAt: "desc" },
    });
    if (!cambio) return { error: "No hay nada que deshacer." };

    const antes = cambio.antes as unknown as Foto[];
    const existen = new Set(
      (
        await prisma.capture.findMany({
          where: { id: { in: antes.map((f) => f.id) } },
          select: { id: true },
        })
      ).map((c) => c.id),
    );
    // Una baja que ya no existe no se puede volver a enlazar: la borraron a mano
    const bajasVivas = new Set(
      (
        await prisma.death.findMany({
          where: {
            id: { in: antes.map((f) => f.deathId).filter((id): id is string => Boolean(id)) },
            NOT: { id: { in: cambio.muertes } },
          },
          select: { id: true },
        })
      ).map((d) => d.id),
    );

    await prisma.$transaction([
      prisma.death.deleteMany({ where: { id: { in: cambio.muertes } } }),
      ...antes
        .filter((f) => existen.has(f.id))
        .map((f) =>
          prisma.capture.update({
            where: { id: f.id },
            data: {
              lugar: f.lugar,
              hueco: f.hueco,
              species: f.species,
              pokemonId: f.pokemonId,
              vinculo: f.vinculo,
              image: f.image,
              deathId: f.deathId && bajasVivas.has(f.deathId) ? f.deathId : null,
            },
          }),
        ),
      prisma.cambioDeCaja.delete({ where: { id: cambio.id } }),
    ]);
    refrescar(cambio.muertes.length > 0);
    return { aviso: `Deshecho: ${cambio.descripcion.charAt(0).toLowerCase()}${cambio.descripcion.slice(1)}.` };
  });
}
