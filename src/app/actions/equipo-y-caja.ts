"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant } from "@/lib/competition";
import { zonaValidaParaCompeticion } from "@/lib/mapas";
import { descargarSprites, spritesDelFormulario } from "@/lib/sprites-servidor";
import { evolucionesDe, queEs } from "@/lib/evoluciones";
import { leerHistoria } from "@/lib/historia";
import { urlsDeImagen } from "@/lib/imagenes";
import {
  mover,
  sePuedenVincular,
  sitioParaUnaNueva,
  vinculosDe,
  type Lugar,
} from "@/lib/equipo-y-caja";
import { capturasParaVincular, vincularCapturaNueva } from "@/lib/soul-link";
import { elegirFondo, esFondo, nombrarCaja } from "@/lib/fondos-de-caja";
import { MOVIMIENTOS_POR_POKEMON, movimientoPorSlug, naturalezaPorSlug } from "@/lib/movimientos";
import { objetoPorSlug } from "@/lib/objetos";
import {
  apuntarCambio,
  assertPuedeTocarLaCaja,
  capturaQuePuedoTocar,
  darPorMuerto,
  fotos,
  nombreDe,
  refrescarCaja as refrescar,
  type Foto,
} from "@/lib/caja-servidor";
import type { FormState } from "@/app/actions/auth";

/**
 * Las acciones del Equipo y PC. **Cada una comprueba en el servidor** quién
 * puede tocar esa caja (`assertPuedeTocarLaCaja`: en un Soul Link su dueño o
 * quien administra; en los demás lockes, solo su dueño), que ocultar un botón
 * no protege nada. Las de
 * mover se llaman directamente desde el navegador, sin formulario, porque el
 * arrastre ya ha movido la casilla y solo falta guardarlo.
 *
 * Todo lo que cambia algo deja **cómo estaba** en `CambioDeCaja`, para el
 * botón de deshacer.
 */

type Resultado = {
  error?: string;
  aviso?: string;
  /** Lo que hay que pasarle a deshacer para deshacer justo esto (ver `soloSi`) */
  deshacer?: string;
  /** Al evolucionar: la dirección del sprite nuevo, para la animación */
  imagen?: string | null;
};

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
  /**
   * El locke: el que diga el formulario o, si no dice ninguno, el que se está
   * mirando. Lo primero es para la cola sin conexión, como en el mapa: lo
   * apuntado en un locke va a ese locke aunque al subirlo se esté en otro.
   */
  const pedido = String(formData.get("competitionId") ?? "").trim();
  const competicion = pedido
    ? await prisma.competition.findUnique({ where: { id: pedido } })
    : await getActiveCompetition();
  if (!competicion) return { error: "No hay ningún locke abierto." };

  /**
   * Para quién: el suyo, salvo que en un Soul Link quien administra elija a
   * otro (le apunta la captura al que no tiene el móvil a mano). En los demás
   * lockes la caja es privada y solo la toca su dueño.
   */
  const elegido = String(formData.get("participantId") ?? "").trim();
  const yo = await getMyParticipant(competicion.id, user.id);
  const participantId = elegido || yo?.id;
  if (!participantId) return { error: "No juegas este locke, así que no tienes caja." };
  try {
    const { participant } = await assertPuedeTocarLaCaja(participantId);
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
      // El mismo apunte que el del Mapa: «2ª captura», «huevo de regalo»…
      notes: String(formData.get("notes") ?? "").trim().slice(0, 120) || null,
      zoneId,
      sitio,
      image: sprites?.boxImage ?? null,
      // La casilla de Shiny del buscador: si se marcó, ya es variocolor
      shiny: formData.get("shiny") === "on",
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
  /** Sin hueco: a la primera libre de esta caja (desde 0) */
  caja?: number | null;
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
      { lugar: entrada.lugar, hueco: entrada.hueco, caja: entrada.caja ?? null },
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
      entrada.lugar === "equipo"
        ? `Meter a ${nombreDe(captura)} en el equipo`
        : entrada.caja != null && entrada.hueco == null
          ? `Mover a ${nombreDe(captura)} a la caja ${entrada.caja + 1}`
          : `Mover a ${nombreDe(captura)}`,
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

    // Solo a lo que de verdad puede evolucionar: el formulario se puede falsear
    const opciones = evolucionesDe(captura.pokemonId, captura.species);
    const elegida = opciones.find((o) => o.pokemonId === entrada.pokemonId);
    if (!elegida) return { error: "No puede evolucionar a eso." };

    const [foto, sprites] = await Promise.all([
      fotos([captura.id]),
      // Un shiny evoluciona en shiny
      descargarSprites(elegida.pokemonId, captura.shiny),
    ]);
    // Queda en su historia; deshacer la quita con el resto de la foto
    const historia = [
      ...leerHistoria(foto[0]?.historia),
      { tipo: "evoluciona", de: captura.species, a: elegida.rotulo, fecha: new Date().toISOString() },
    ];
    await prisma.capture.update({
      where: { id: captura.id },
      data: {
        species: elegida.especie,
        pokemonId: elegida.pokemonId,
        historia,
        // Si no se pudo bajar el sprite nuevo, mejor el viejo que ninguno
        ...(sprites.boxImage ? { image: sprites.boxImage } : {}),
      },
    });
    const descripcion = `Evolucionar a ${nombreDe(captura)} en ${elegida.rotulo}`;
    await apuntarCambio(captura.participantId, descripcion, foto);
    refrescar();
    const imagenes = await urlsDeImagen("captura", [captura.id]);
    return {
      aviso: `¡${nombreDe(captura)} ha evolucionado en ${elegida.rotulo}!`,
      deshacer: descripcion,
      imagen: imagenes(captura.id),
    };
  });
}

// ---------------------------------------------------------------------------
// Shiny
// ---------------------------------------------------------------------------

/**
 * Volverlo shiny (o quitárselo, si se marcó sin querer). Es uno de los premios
 * que se reparten: se baja su sprite variocolor y queda en su historia. Se
 * puede deshacer como lo demás de la caja.
 */
export async function cambiarShinyAction(entrada: {
  captureId: string;
  shiny: boolean;
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    if (captura.deathId) return { error: "Un pokémon caído ya no cambia." };
    const shiny = entrada.shiny === true;
    if (captura.shiny === shiny) {
      return { error: shiny ? "Ya era shiny." : "No era shiny." };
    }
    const quien = queEs(captura.pokemonId, captura.species);

    const [foto, sprites] = await Promise.all([
      fotos([captura.id]),
      quien ? descargarSprites(quien.pokemonId, shiny) : null,
    ]);
    const anterior = leerHistoria(foto[0]?.historia);
    // Al quitarlo, fuera también de su historia: no llegó a pasar
    const historia = shiny
      ? [...anterior, { tipo: "shiny" as const, fecha: new Date().toISOString() }]
      : anterior.filter((s) => s.tipo !== "shiny");
    await prisma.capture.update({
      where: { id: captura.id },
      data: {
        shiny,
        historia,
        // Sin sprite nuevo (sin línea con GitHub, una especie inventada), el de antes
        ...(sprites?.boxImage ? { image: sprites.boxImage } : {}),
      },
    });
    const descripcion = shiny
      ? `Volver shiny a ${nombreDe(captura)}`
      : `Quitarle lo shiny a ${nombreDe(captura)}`;
    await apuntarCambio(captura.participantId, descripcion, foto);
    refrescar();
    const imagenes = await urlsDeImagen("captura", [captura.id]);
    return {
      aviso: shiny ? `¡${nombreDe(captura)} ahora es shiny!` : `${nombreDe(captura)} ya no es shiny.`,
      deshacer: descripcion,
      imagen: imagenes(captura.id),
    };
  });
}

// ---------------------------------------------------------------------------
// Caer
// ---------------------------------------------------------------------------

/** Dar un pokémon por muerto: ver `darPorMuerto` en lib/caja-servidor.ts */
export async function darPorMuertoAction(entrada: {
  captureId: string;
  causa: string;
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    return { aviso: await darPorMuerto(captura, entrada.causa ?? "") };
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
 * La ficha completa: naturaleza, objeto y movimientos. Como el mote, no pasa
 * por deshacer: se cambia otra vez y ya. Lo que no existe se rechaza entero en
 * vez de guardarse a medias, para que no desaparezca un movimiento sin avisar.
 */
export async function cambiarFichaDeCombateAction(entrada: {
  captureId: string;
  naturaleza: string | null;
  objeto: string | null;
  movimientos: string[];
}): Promise<Resultado> {
  return conError(async () => {
    const captura = await capturaQuePuedoTocar(entrada.captureId);
    if (entrada.naturaleza && !naturalezaPorSlug(entrada.naturaleza)) {
      return { error: "Esa naturaleza no existe." };
    }
    if (entrada.objeto && !objetoPorSlug(entrada.objeto)) return { error: "Ese objeto no existe." };
    const lista = Array.isArray(entrada.movimientos) ? entrada.movimientos : [];
    const movimientos = [...new Set(lista.filter(Boolean))];
    if (movimientos.length > MOVIMIENTOS_POR_POKEMON) {
      return { error: `Un pokémon lleva ${MOVIMIENTOS_POR_POKEMON} movimientos como mucho.` };
    }
    const raro = movimientos.find((m) => !movimientoPorSlug(m));
    if (raro) return { error: `No conozco el movimiento «${raro}».` };
    await prisma.capture.update({
      where: { id: captura.id },
      data: {
        naturaleza: entrada.naturaleza || null,
        objeto: entrada.objeto || null,
        movimientos,
      },
    });
    refrescar();
    return { aviso: "Ficha guardada." };
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
// El fondo de una caja
// ---------------------------------------------------------------------------

/**
 * Cambia el fondo de una caja. Lo puede cambiar quien puede tocar esa caja, y
 * no pasa por deshacer: es decoración, y se vuelve atrás eligiendo otro.
 */
export async function cambiarFondoDeCajaAction(entrada: {
  participantId: string;
  caja: number;
  fondo: string;
}): Promise<Resultado> {
  return conError(async () => {
    const { participant } = await assertPuedeTocarLaCaja(entrada.participantId);
    if (!esFondo(entrada.fondo)) return { error: "Ese fondo no existe." };
    const actual = await prisma.participant.findUnique({
      where: { id: participant.id },
      select: { fondosDeCaja: true },
    });
    await prisma.participant.update({
      where: { id: participant.id },
      data: { fondosDeCaja: elegirFondo(actual?.fondosDeCaja, entrada.caja, entrada.fondo) },
    });
    refrescar();
  });
}

/**
 * Le pone nombre a una caja, o se lo quita si llega vacío. Como el fondo: lo
 * cambia quien puede tocar esa caja y no pasa por deshacer.
 */
export async function nombrarCajaAction(entrada: {
  participantId: string;
  caja: number;
  nombre: string;
}): Promise<Resultado> {
  return conError(async () => {
    const { participant } = await assertPuedeTocarLaCaja(entrada.participantId);
    const actual = await prisma.participant.findUnique({
      where: { id: participant.id },
      select: { nombresDeCaja: true },
    });
    await prisma.participant.update({
      where: { id: participant.id },
      data: { nombresDeCaja: nombrarCaja(actual?.nombresDeCaja, entrada.caja, String(entrada.nombre ?? "")) },
    });
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
export async function deshacerEnCajaAction(entrada: {
  participantId: string;
  /**
   * Deshacer **solo si** lo último es esto. Es el botón de deshacer que sale
   * en la ficha justo después de evolucionar: si entre medias se ha movido
   * algo, deshacer "lo último" ya no sería la evolución.
   */
  soloSi?: string;
}): Promise<Resultado> {
  return conError(async () => {
    await assertPuedeTocarLaCaja(entrada.participantId);
    const cambio = await prisma.cambioDeCaja.findFirst({
      where: { participantId: entrada.participantId },
      orderBy: { createdAt: "desc" },
    });
    if (!cambio) return { error: "No hay nada que deshacer." };
    if (entrada.soloSi && cambio.descripcion !== entrada.soloSi) {
      return {
        error: "Después has hecho otra cosa: deshazlo con el botón de Deshacer de arriba, paso a paso.",
      };
    }

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
              // Las fotos de antes de que hubiera historia no la traen: se deja como está
              ...(f.historia !== undefined ? { historia: f.historia ?? [] } : {}),
              ...(f.shiny !== undefined ? { shiny: f.shiny } : {}),
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
