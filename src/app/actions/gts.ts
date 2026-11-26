"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { requireUser } from "@/lib/auth";
import {
  TAMANO_USUM,
  cambiarEnLaPartida,
  cerrarPartida,
  comprobacionesCuadran,
  estaEnLaPartida,
  pkDescifrado,
} from "@/lib/partida/oficial/escribir-usum";
import { claveDeFirma, firmarRegion } from "@/lib/partida/oficial/firma-usum";
import { assertPuedeTocarLaCaja } from "@/lib/caja-servidor";
import { mensajeDeError } from "@/lib/permiso";
import { registrar } from "@/lib/registro";
import { leerBusco, sePuedeTenerGts, type FichaDeGts } from "@/lib/gts";
import {
  boletosDe,
  caducarLaGts,
  capturasEnLaGts,
  fichaDeLaApp,
  fichaDeLaPartida,
  getCapturaParaGts,
  getMomentoDeLaGts,
  hacerIntercambio,
  partidaDeLaGts,
} from "@/lib/gts-servidor";

/**
 * Las acciones de la GTS (las reglas, en lib/gts.ts). Todo lo comprueba el
 * servidor: que la GTS esté encendida, que tu ventana esté abierta, que te
 * queden boletos y que el pokémon sea tuyo, esté vivo y no esté ya en juego.
 */

type Resultado = { error?: string; aviso?: string };

async function conError(accion: () => Promise<Resultado>): Promise<Resultado> {
  try {
    return await accion();
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}

function refrescar() {
  revalidatePath("/gts");
  revalidatePath("/equipo");
}

/** El locke de un jugador, con la GTS encendida, y lo que ya caducó quitado */
async function laGtsDe(participantId: string) {
  const { user, participant } = await assertPuedeTocarLaCaja(participantId);
  if (participant.retiredAt) throw new Error("Estás fuera del locke: la GTS ya no es para ti.");
  const locke = await prisma.competition.findUniqueOrThrow({
    where: { id: participant.competitionId },
    select: { id: true, gts: true, gtsVeto: true, estilo: true, maxPlayers: true, game: true, gameId: true, juegoNoOficial: true },
  });
  if (!locke.gts || !sePuedeTenerGts(locke)) throw new Error("Este locke no tiene GTS.");
  const momento = await getMomentoDeLaGts(locke.id);
  await caducarLaGts(locke.id, momento.actual);
  return { user, participant, locke, momento };
}

function assertVentanaAbierta(ventana: ReturnType<Awaited<ReturnType<typeof getMomentoDeLaGts>>["ventanaDe"]>) {
  if (ventana.estado === "abierta") return ventana.checkpoint;
  throw new Error(
    ventana.estado === "falta-el-hito"
      ? `La GTS se te abre cuando pases ${ventana.hito}, y está abierta hasta que se acabe su jornada.`
      : "La GTS está cerrada: no hay ninguna jornada con checkpoint por jugar.",
  );
}

/**
 * La ficha del pokémon que se pone: de la partida en los juegos que se leen
 * enteros (y entonces es obligatoria: es lo que hará falta para meterlo en la
 * partida del otro), y de la app en los demás.
 */
async function fichaPara(
  participantId: string,
  competitionId: string,
  locke: Parameters<typeof partidaDeLaGts>[0],
  captureId: string,
  pk: string | null,
): Promise<{ ficha: FichaDeGts; pk: string | null; captureId: string }> {
  const captura = await getCapturaParaGts(captureId);
  if (!captura || captura.participantId !== participantId || captura.failed) {
    throw new Error("Ese pokémon no está en tu caja.");
  }
  if (captura.deathId) throw new Error("Un pokémon caído no se puede cambiar.");
  if ((await capturasEnLaGts(competitionId)).has(captura.id)) {
    throw new Error("Ese pokémon ya está en la GTS, puesto o en una oferta.");
  }
  const familia = partidaDeLaGts(locke);
  if (!familia) return { ficha: fichaDeLaApp(captura), pk: null, captureId: captura.id };
  if (!pk) throw new Error("En este juego la GTS va con la partida: súbela y elige el pokémon en ella.");
  const leida = fichaDeLaPartida(captura, pk, familia);
  if ("error" in leida) throw new Error(leida.error);
  return { ...leida, captureId: captura.id };
}

export async function depositarEnLaGtsAction(entrada: {
  participantId: string;
  captureId: string;
  pk?: string | null;
  busco?: string | null;
}): Promise<Resultado> {
  return conError(async () => {
    const { participant, locke, momento } = await laGtsDe(String(entrada.participantId ?? ""));
    const checkpoint = assertVentanaAbierta(momento.ventanaDe(participant.id));
    if ((await boletosDe(locke.id, participant.id)) < 1) {
      return { error: "No te quedan boletos. Se gana uno con cada jornada acabada." };
    }
    const { ficha, pk, captureId } = await fichaPara(
      participant.id,
      locke.id,
      locke,
      String(entrada.captureId ?? ""),
      typeof entrada.pk === "string" ? entrada.pk : null,
    );
    await prisma.gtsDeposito.create({
      data: {
        competitionId: locke.id,
        participantId: participant.id,
        captureId,
        checkpoint,
        ficha,
        pk,
        busco: leerBusco(entrada.busco),
      },
    });
    await registrar(locke.id, "gts", `Pone a ${ficha.mote ?? ficha.especie} en la GTS`);
    refrescar();
    return { aviso: `${ficha.mote ?? ficha.especie} está en la GTS. Ahora, a esperar ofertas.` };
  });
}

/** Quitar lo puesto: vuelve a la caja, y las ofertas que tuviera se caen */
export async function retirarDeLaGtsAction(depositoId: string): Promise<Resultado> {
  return conError(async () => {
    const deposito = await prisma.gtsDeposito.findUnique({ where: { id: String(depositoId ?? "") } });
    if (!deposito) return { error: "Eso ya no está en la GTS." };
    await assertPuedeTocarLaCaja(deposito.participantId);
    const hecho = await prisma.gtsDeposito.updateMany({
      where: { id: deposito.id, estado: "abierto" },
      data: { estado: "retirado" },
    });
    if (!hecho.count) return { error: "Ya no se puede retirar: está cerrado o esperando a la organización." };
    await prisma.gtsOferta.updateMany({
      where: { depositoId: deposito.id, estado: "pendiente" },
      data: { estado: "caducada", resueltaEl: new Date() },
    });
    refrescar();
    return { aviso: "Retirado de la GTS." };
  });
}

export async function ofrecerEnLaGtsAction(entrada: {
  participantId: string;
  depositoId: string;
  captureId: string;
  pk?: string | null;
}): Promise<Resultado> {
  return conError(async () => {
    const { participant, locke, momento } = await laGtsDe(String(entrada.participantId ?? ""));
    assertVentanaAbierta(momento.ventanaDe(participant.id));
    const deposito = await prisma.gtsDeposito.findUnique({
      where: { id: String(entrada.depositoId ?? "") },
      select: { id: true, competitionId: true, participantId: true, estado: true },
    });
    if (!deposito || deposito.competitionId !== locke.id || deposito.estado !== "abierto") {
      return { error: "Ese pokémon ya no está en la GTS." };
    }
    if (deposito.participantId === participant.id) return { error: "Ese lo has puesto tú." };
    const yaOfrecido = await prisma.gtsOferta.count({
      where: { depositoId: deposito.id, participantId: participant.id, estado: "pendiente" },
    });
    if (yaOfrecido) return { error: "Ya tienes una oferta por ese. Retírala si quieres ofrecer otro." };
    if ((await boletosDe(locke.id, participant.id)) < 1) {
      return { error: "No te quedan boletos. Se gana uno con cada jornada acabada." };
    }
    const { ficha, pk, captureId } = await fichaPara(
      participant.id,
      locke.id,
      locke,
      String(entrada.captureId ?? ""),
      typeof entrada.pk === "string" ? entrada.pk : null,
    );
    await prisma.gtsOferta.create({
      data: { depositoId: deposito.id, participantId: participant.id, captureId, ficha, pk },
    });
    refrescar();
    return { aviso: `Oferta mandada: ${ficha.mote ?? ficha.especie}. Ahora decide quien lo puso.` };
  });
}

export async function retirarOfertaDeLaGtsAction(ofertaId: string): Promise<Resultado> {
  return conError(async () => {
    const oferta = await prisma.gtsOferta.findUnique({ where: { id: String(ofertaId ?? "") } });
    if (!oferta) return { error: "Esa oferta ya no existe." };
    await assertPuedeTocarLaCaja(oferta.participantId);
    const hecho = await prisma.gtsOferta.updateMany({
      where: { id: oferta.id, estado: "pendiente" },
      data: { estado: "retirada", resueltaEl: new Date() },
    });
    if (!hecho.count) return { error: "Esa oferta ya está resuelta." };
    refrescar();
    return { aviso: "Oferta retirada." };
  });
}

export async function rechazarOfertaDeLaGtsAction(ofertaId: string): Promise<Resultado> {
  return conError(async () => {
    const oferta = await prisma.gtsOferta.findUnique({
      where: { id: String(ofertaId ?? "") },
      select: { id: true, deposito: { select: { participantId: true } } },
    });
    if (!oferta) return { error: "Esa oferta ya no existe." };
    await assertPuedeTocarLaCaja(oferta.deposito.participantId);
    const hecho = await prisma.gtsOferta.updateMany({
      where: { id: oferta.id, estado: "pendiente" },
      data: { estado: "rechazada", resueltaEl: new Date() },
    });
    if (!hecho.count) return { error: "Esa oferta ya está resuelta." };
    refrescar();
    return { aviso: "Oferta rechazada." };
  });
}

/**
 * Cuando una oferta se acepta, lo demás de esos dos pokémon deja de valer: las
 * otras ofertas por el mismo depósito se rechazan, y lo que cualquiera de los
 * dos tuviera puesto u ofrecido en otro sitio se retira.
 */
async function cerrarLoDemas(depositoId: string, ofertaId: string, capturas: string[]) {
  const ahora = new Date();
  const otrosDepositos = await prisma.gtsDeposito.findMany({
    where: { captureId: { in: capturas }, id: { not: depositoId }, estado: "abierto" },
    select: { id: true },
  });
  const ids = otrosDepositos.map((d) => d.id);
  await prisma.$transaction([
    prisma.gtsOferta.updateMany({
      where: { depositoId, id: { not: ofertaId }, estado: "pendiente" },
      data: { estado: "rechazada", resueltaEl: ahora },
    }),
    prisma.gtsOferta.updateMany({
      where: { captureId: { in: capturas }, id: { not: ofertaId }, estado: "pendiente" },
      data: { estado: "retirada", resueltaEl: ahora },
    }),
    prisma.gtsDeposito.updateMany({ where: { id: { in: ids }, estado: "abierto" }, data: { estado: "retirado" } }),
    prisma.gtsOferta.updateMany({
      where: { depositoId: { in: ids }, estado: "pendiente" },
      data: { estado: "caducada", resueltaEl: ahora },
    }),
  ]);
}

export async function aceptarOfertaDeLaGtsAction(ofertaId: string): Promise<Resultado> {
  return conError(async () => {
    const oferta = await prisma.gtsOferta.findUnique({
      where: { id: String(ofertaId ?? "") },
      include: { deposito: true },
    });
    if (!oferta) return { error: "Esa oferta ya no existe." };
    const { participant, locke, momento } = await laGtsDe(oferta.deposito.participantId);
    assertVentanaAbierta(momento.ventanaDe(participant.id));
    const [mios, suyos] = await Promise.all([
      boletosDe(locke.id, participant.id),
      boletosDe(locke.id, oferta.participantId),
    ]);
    if (mios < 1) return { error: "No te quedan boletos." };
    if (suyos < 1) return { error: "A quien te lo ofrece ya no le quedan boletos." };

    // Reservado primero, para que dos clics a la vez no hagan dos intercambios
    const reservado = await prisma.gtsDeposito.updateMany({
      where: { id: oferta.depositoId, estado: "abierto", checkpoint: momento.actual ?? -1 },
      data: { estado: "reservado" },
    });
    if (!reservado.count) return { error: "Ese depósito ya no está abierto." };
    const ofertaViva = await prisma.gtsOferta.updateMany({
      where: { id: oferta.id, estado: "pendiente" },
      data: { estado: locke.gtsVeto ? "porAprobar" : "aceptada", resueltaEl: new Date() },
    });
    if (!ofertaViva.count) {
      await prisma.gtsDeposito.update({ where: { id: oferta.depositoId }, data: { estado: "abierto" } });
      return { error: "Esa oferta ya está resuelta." };
    }
    await cerrarLoDemas(oferta.depositoId, oferta.id, [oferta.deposito.captureId, oferta.captureId]);

    if (locke.gtsVeto) {
      refrescar();
      return { aviso: "Aceptada. Ahora la organización tiene que aprobar el intercambio." };
    }
    try {
      await hacerIntercambio(oferta.deposito, oferta);
    } catch (error) {
      await deshacerLaReserva(oferta.id, oferta.depositoId);
      throw error;
    }
    await prisma.gtsDeposito.update({ where: { id: oferta.depositoId }, data: { estado: "intercambiado" } });
    await registrar(locke.id, "gts", "Hace un intercambio en la GTS");
    refrescar();
    return { aviso: "¡Intercambio hecho! Ya lo tienes en tu caja." };
  });
}

/** Si el intercambio no se pudo hacer, todo vuelve a como estaba (menos lo ya cancelado) */
async function deshacerLaReserva(ofertaId: string, depositoId: string) {
  await prisma.$transaction([
    prisma.gtsOferta.update({ where: { id: ofertaId }, data: { estado: "caducada" } }),
    prisma.gtsDeposito.update({ where: { id: depositoId }, data: { estado: "retirado" } }),
  ]);
}

/** El veto: quien administra el locke aprueba o tumba un intercambio aceptado */
export async function resolverIntercambioDeLaGtsAction(ofertaId: string, aprobar: boolean): Promise<Resultado> {
  return conError(async () => {
    const oferta = await prisma.gtsOferta.findUnique({
      where: { id: String(ofertaId ?? "") },
      include: { deposito: true },
    });
    if (!oferta) return { error: "Ese intercambio ya no existe." };
    await requireCompetitionManager(oferta.deposito.competitionId);
    if (oferta.estado !== "porAprobar") return { error: "Ese intercambio ya está resuelto." };

    if (!aprobar) {
      const momento = await getMomentoDeLaGts(oferta.deposito.competitionId);
      await prisma.$transaction([
        prisma.gtsOferta.update({ where: { id: oferta.id }, data: { estado: "vetada", resueltaEl: new Date() } }),
        // Vuelve a la GTS si su ventana sigue abierta; si no, ya caducó
        prisma.gtsDeposito.update({
          where: { id: oferta.depositoId },
          data: { estado: oferta.deposito.checkpoint === momento.actual ? "abierto" : "caducado" },
        }),
      ]);
      refrescar();
      return { aviso: "Intercambio vetado: cada uno se queda con el suyo y nadie gasta boleto." };
    }

    const marcada = await prisma.gtsOferta.updateMany({
      where: { id: oferta.id, estado: "porAprobar" },
      data: { estado: "aceptada", resueltaEl: new Date() },
    });
    if (!marcada.count) return { error: "Ese intercambio ya está resuelto." };
    try {
      await hacerIntercambio(oferta.deposito, oferta);
    } catch (error) {
      await deshacerLaReserva(oferta.id, oferta.depositoId);
      throw error;
    }
    await prisma.gtsDeposito.update({ where: { id: oferta.depositoId }, data: { estado: "intercambiado" } });
    await registrar(oferta.deposito.competitionId, "gts", "Aprueba un intercambio de la GTS");
    refrescar();
    return { aviso: "Intercambio aprobado y hecho." };
  });
}

// ---------------------------------------------------------------------------
// Meterlo en la partida (paso 3)
// ---------------------------------------------------------------------------

/** El intercambio hecho y qué lado es quien llama, con su permiso comprobado */
async function miLadoDelIntercambio(ofertaId: string) {
  const oferta = await prisma.gtsOferta.findUnique({
    where: { id: String(ofertaId ?? "") },
    include: { deposito: { include: { competition: true } } },
  });
  if (!oferta || oferta.estado !== "aceptada") throw new Error("Ese intercambio no está hecho.");
  const user = await requireUser();
  const [a, b] = await Promise.all([
    prisma.participant.findUnique({ where: { id: oferta.deposito.participantId }, select: { userId: true } }),
    prisma.participant.findUnique({ where: { id: oferta.participantId }, select: { userId: true } }),
  ]);
  const lado = a?.userId === user.id ? "a" : b?.userId === user.id ? "b" : null;
  if (!lado) throw new Error("Ese intercambio no es tuyo.");
  // Lo que se va es lo tuyo, y lo que llega, lo del otro
  const [sale, entra, deQuien] =
    lado === "a"
      ? [oferta.deposito.pk, oferta.pk, oferta.ficha]
      : [oferta.pk, oferta.deposito.pk, oferta.deposito.ficha];
  if (!sale || !entra) {
    throw new Error("Este intercambio se hizo sin las partidas: hay que meterlo a mano.");
  }
  return {
    oferta,
    lado,
    locke: oferta.deposito.competition,
    sale: new Uint8Array(Buffer.from(sale, "base64")),
    entra: new Uint8Array(Buffer.from(entra, "base64")),
    nombre: ((deQuien ?? {}) as { mote?: string | null; especie?: string }).mote ?? ((deQuien ?? {}) as { especie?: string }).especie ?? "el pokémon",
  };
}

/**
 * **Tu partida con el pokémon del otro dentro**: se sube el `main` de ahora, se
 * cambia el tuyo por el suyo, se rehacen las comprobaciones y la firma, y se
 * devuelve para bajarla. Antes de darla se vuelve a leer, por si acaso. La
 * partida no se guarda en ningún sitio.
 */
export async function meterEnMiPartidaAction(
  formData: FormData,
): Promise<{ error?: string; aviso?: string; partida?: string }> {
  try {
    const { oferta, lado, locke, sale, entra, nombre } = await miLadoDelIntercambio(String(formData.get("ofertaId") ?? ""));
    if (partidaDeLaGts(locke) !== "usum") {
      return { error: "La partida solo se escribe en Ultrasol y Ultraluna. En este juego, bájate el .pk7 y mételo con PKHeX." };
    }
    const clave = claveDeFirma();
    if (!clave) {
      return { error: "Falta la clave para firmar partidas en el servidor (CLAVE_PARTIDAS_3DS): avisa a quien lleva la aplicación." };
    }
    const fichero = formData.get("partida");
    if (!(fichero instanceof File)) return { error: "Sube tu partida." };
    if (fichero.size !== TAMANO_USUM) return { error: "Eso no es el «main» de Ultrasol o Ultraluna." };
    const datos = new Uint8Array(await fichero.arrayBuffer());
    if (!comprobacionesCuadran(datos)) {
      return { error: "Esa partida no está bien guardada (sus comprobaciones no cuadran): guarda en el juego y vuelve a sacarla." };
    }

    const cambio = cambiarEnLaPartida(datos, sale, entra);
    if ("error" in cambio) return { error: cambio.error };
    const lista = cerrarPartida(cambio.datos, (region, tabla) => firmarRegion(clave, region, tabla));
    // Antes de darla: que cuadre, que esté el que llega y que no esté el que se va
    if (!comprobacionesCuadran(lista) || !estaEnLaPartida(lista, entra) || estaEnLaPartida(lista, sale)) {
      return { error: "Algo no ha salido bien al escribir la partida, y no te la doy por si acaso." };
    }
    await prisma.gtsOferta.update({
      where: { id: oferta.id },
      data: lado === "a" ? { metidoAlQueLoPuso: new Date() } : { metidoAlQueOfrecio: new Date() },
    });
    revalidatePath("/gts");
    return {
      partida: Buffer.from(lista).toString("base64"),
      aviso: `Listo: ${nombre} está en ${cambio.donde}${cambio.alaCaja ? " (viene de una caja, así que va a la caja y tu equipo se corre)" : ""}.`,
    };
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}

/** El pokémon que te llega, como un `.pk7`/`.pk6` de PKHeX: para meterlo a mano */
export async function pkDelIntercambioAction(ofertaId: string): Promise<{ error?: string; pk?: string; nombre?: string }> {
  try {
    const { locke, entra, nombre } = await miLadoDelIntercambio(ofertaId);
    const pk = pkDescifrado(entra);
    if (!pk) return { error: "Ese pokémon no se puede leer." };
    const familia = partidaDeLaGts(locke);
    const extension = familia === "xy" || familia === "oras" ? "pk6" : "pk7";
    return { pk: Buffer.from(pk).toString("base64"), nombre: `${nombre}.${extension}` };
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}
