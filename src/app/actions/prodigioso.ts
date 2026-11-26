"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertPuedeTocarLaCaja } from "@/lib/caja-servidor";
import { mensajeDeError } from "@/lib/permiso";
import { registrar } from "@/lib/registro";
import { esElMismo, leerHistoria } from "@/lib/historia";
import { sincronizarAs } from "@/lib/as-servidor";
import { descargarSprites } from "@/lib/sprites-servidor";
import { POKEDEX } from "@/lib/pokedex";
import { DE_LA_ESPECIE, elegirEspecie, fabricarPokemon } from "@/lib/prodigioso";
import { bonosProdigiososDe, prodigiosoDelLocke } from "@/lib/prodigioso-servidor";
import { bytesDelHueco, leerPk67 } from "@/lib/partida/oficial/gen67";
import { fichaCompleta67 } from "@/lib/partida/oficial/ficha-gen67";
import { traducirOficial } from "@/lib/partida/traducir-oficial";
import {
  TAMANO_USUM,
  cambiarEnLaPartida,
  cerrarPartida,
  comprobacionesCuadran,
  estaEnLaPartida,
} from "@/lib/partida/oficial/escribir-usum";
import { claveDeFirma, firmarRegion } from "@/lib/partida/oficial/firma-usum";
import type { DondeEnLaPartida } from "@/lib/partida/essentials";

/**
 * **El Intercambio Prodigioso** (las reglas, en lib/prodigioso.ts). Se sube la
 * partida de ahora, se elige uno, y vuelve la partida con el que llega **en su
 * mismo hueco**, firmada; en la app, su captura pasa a ser el que llega. Se
 * comprueba todo aquí: que el locke lo tenga, que queden bonos, que el pokémon
 * sea tuyo y esté vivo, y que el de la partida sea el mismo que el de la app.
 */

export type PokemonDelProdigioso = { nombre: string; pokemonId: number | null; shiny: boolean; sexo: "M" | "F" | null };

export type ResultadoDelProdigioso = {
  error?: string;
  aviso?: string;
  partida?: string;
  sale?: PokemonDelProdigioso;
  llega?: PokemonDelProdigioso;
};

/** Un número entre 0 y 1 que no se puede adivinar (el de Math.random sí) */
const azar = () => randomInt(0, 2 ** 32) / 2 ** 32;

/** «e0» (equipo, 1º) o «c3-12» (caja 4, hueco 13), como en la pantalla */
function dondeDeLaClave(clave: string): DondeEnLaPartida | null {
  const equipo = /^e([0-5])$/.exec(clave);
  if (equipo) return { lugar: "equipo", hueco: Number(equipo[1]) };
  const caja = /^c(\d{1,2})-(\d{1,2})$/.exec(clave);
  if (caja && Number(caja[1]) < 32 && Number(caja[2]) < 30) return { lugar: "caja", caja: Number(caja[1]), hueco: Number(caja[2]) };
  return null;
}

const NOMBRE_POR_DEX = new Map(POKEDEX.map((e) => [e.dex, e.name]));

export async function hacerProdigiosoAction(formData: FormData): Promise<ResultadoDelProdigioso> {
  try {
    const { participant } = await assertPuedeTocarLaCaja(String(formData.get("participantId") ?? ""));
    if (participant.retiredAt) return { error: "Estás fuera del locke." };
    const locke = await prisma.competition.findUniqueOrThrow({
      where: { id: participant.competitionId },
      select: {
        id: true,
        prodigioso: true,
        prodigiosoPorBst: true,
        prodigiosoLegendarios: true,
        prodigiosoPorNivel: true,
        modality: true,
        game: true,
        gameId: true,
        juegoNoOficial: true,
      },
    });
    const estado = prodigiosoDelLocke(locke);
    if (!estado.abierto) return { error: estado.porQue };
    const clave = claveDeFirma();
    if (!clave) return { error: "Falta la clave para firmar partidas en el servidor: avisa a quien lleva la aplicación." };

    const bonos = await bonosProdigiososDe(locke.id, participant.id);
    if (bonos.porJornadas + bonos.enLaBolsa < 1) {
      return { error: "No te quedan bonos prodigiosos. Se gana uno con cada jornada acabada." };
    }

    const fichero = formData.get("partida");
    if (!(fichero instanceof File)) return { error: "Sube tu partida." };
    if (fichero.size !== TAMANO_USUM) return { error: "Eso no es el «main» de Ultrasol o Ultraluna." };
    const datos = new Uint8Array(await fichero.arrayBuffer());
    if (!comprobacionesCuadran(datos)) {
      return { error: "Esa partida no está bien guardada (sus comprobaciones no cuadran): guarda en el juego y vuelve a sacarla." };
    }

    // El que se va: el de ese hueco de la partida, y el mismo en la caja de la app
    const donde = dondeDeLaClave(String(formData.get("hueco") ?? ""));
    const bytes = donde ? bytesDelHueco(datos, "usum", donde) : null;
    const leido = bytes ? fichaCompleta67(bytes, 7, true) : null;
    const traducido = leido ? traducirOficial(leido.pokemon, "usum") : null;
    if (!donde || !bytes || !leido || !traducido || !leido.nivel) {
      return { error: "En ese hueco de la partida no hay un pokémon que se pueda cambiar." };
    }
    const captura = await prisma.capture.findUnique({
      where: { id: String(formData.get("captureId") ?? "") },
      select: {
        id: true,
        participantId: true,
        species: true,
        nickname: true,
        pokemonId: true,
        image: true,
        historia: true,
        failed: true,
        deathId: true,
      },
    });
    if (!captura || captura.participantId !== participant.id || captura.failed) {
      return { error: "Ese pokémon no está en tu caja de la app." };
    }
    if (captura.deathId) return { error: "Un pokémon caído no se puede cambiar." };
    const mismo = (mote: string | null) =>
      esElMismo(captura, { species: traducido.especie, nickname: mote, pokemonId: traducido.pokemonId });
    if (!mismo(traducido.mote) && !mismo(leido.pokemon.mote)) {
      return { error: "El de ese hueco de la partida no es el mismo que el elegido de tu caja." };
    }
    const enJuego = await prisma.gtsDeposito.count({
      where: { captureId: captura.id, estado: { in: ["abierto", "reservado"] } },
    });
    if (enJuego) return { error: "Ese pokémon está puesto en la GTS: retíralo antes." };

    // El que llega
    const delQueSeVa = DE_LA_ESPECIE(leido.pokemon.especie);
    const especie = elegirEspecie(
      {
        nivel: leido.nivel,
        generacion: 9,
        bstDelQueSeVa: delQueSeVa?.bst ?? null,
        opciones: {
          porBst: locke.prodigiosoPorBst,
          legendarios: locke.prodigiosoLegendarios,
          etapaPorNivel: locke.prodigiosoPorNivel,
        },
      },
      azar,
    );
    const { bytes: nuevo, generado } = fabricarPokemon(
      bytes,
      { especie, nivel: leido.nivel, enEquipo: donde.lugar === "equipo" },
      azar,
    );
    const cambio = cambiarEnLaPartida(datos, bytes, nuevo);
    if ("error" in cambio) return { error: cambio.error };
    const lista = cerrarPartida(cambio.datos, (region, tabla) => firmarRegion(clave, region, tabla));
    if (!comprobacionesCuadran(lista) || !estaEnLaPartida(lista, nuevo) || estaEnLaPartida(lista, bytes)) {
      return { error: "Algo no ha salido bien al escribir la partida, y no te la doy por si acaso. No se ha gastado ningún bono." };
    }

    // Lo que llega, como lo leería la app de la partida
    const llegaLeido = leerPk67(nuevo, 0, 7, donde, true);
    const llega = llegaLeido ? traducirOficial(llegaLeido, "usum") : null;
    if (!llega) return { error: "El pokémon que ha salido no se puede leer: vuelve a intentarlo. No se ha gastado ningún bono." };
    const especieEnLaApp = NOMBRE_POR_DEX.get(especie) ?? llega.especie;
    const sprites = await descargarSprites(llega.pokemonId, generado.shiny).catch(() => null);

    // Los cambios de la caja que se podían deshacer y tocan a este: deshacerlos lo devolvería
    const cambios = await prisma.cambioDeCaja.findMany({
      where: { participantId: participant.id },
      select: { id: true, antes: true, capturas: true },
    });
    const tocan = cambios.filter(
      (c) =>
        c.capturas.includes(captura.id) ||
        (Array.isArray(c.antes) && c.antes.some((f) => (f as { id?: string } | null)?.id === captura.id)),
    );
    const sale = {
      especie: captura.species,
      pokemonId: captura.pokemonId,
      mote: captura.nickname,
      nivel: leido.nivel,
      shiny: leido.pokemon.shiny,
      sexo: leido.sexo,
    };
    const fichaQueLlega = {
      especie: especieEnLaApp,
      pokemonId: llega.pokemonId,
      mote: null,
      nivel: generado.nivel,
      shiny: generado.shiny,
      sexo: generado.sexo,
      naturaleza: llega.naturaleza,
      habilidad: llega.habilidad,
      movimientos: llega.movimientos,
      ivs: generado.ivs,
    };

    const operaciones: Prisma.PrismaPromise<unknown>[] = [
      prisma.capture.update({
        where: { id: captura.id },
        data: {
          species: especieEnLaApp,
          pokemonId: llega.pokemonId,
          nickname: null,
          shiny: generado.shiny,
          naturaleza: llega.naturaleza,
          habilidad: llega.habilidad,
          habilidadMega: null,
          objeto: null,
          movimientos: llega.movimientos,
          image: sprites?.boxImage ?? null,
          historia: [
            ...leerHistoria(captura.historia),
            {
              tipo: "prodigioso" as const,
              de: captura.species,
              deMote: captura.nickname,
              deImagen: captura.image?.startsWith("ref:") ? captura.image : null,
              fecha: new Date().toISOString(),
            },
          ],
        },
      }),
      // Sus combates eran del que se fue: que no se le sumen al que llega
      prisma.matchPokemon.updateMany({ where: { captureId: captura.id }, data: { captureId: null } }),
      prisma.cambioDeCaja.deleteMany({ where: { id: { in: tocan.map((c) => c.id) } } }),
      prisma.intercambioProdigioso.create({
        data: {
          competitionId: locke.id,
          participantId: participant.id,
          captureId: captura.id,
          sale,
          llega: fichaQueLlega,
          deLaBolsa: bonos.porJornadas < 1,
        },
      }),
    ];
    // El bono: primero los de las jornadas (se cuentan solos) y, si no quedan, uno de la Bolsa
    if (bonos.porJornadas < 1 && bonos.entrada) {
      const entrada = bonos.entrada;
      operaciones.push(
        entrada.quantity > 1
          ? prisma.bagEntry.update({ where: { id: entrada.id }, data: { quantity: { decrement: 1 } } })
          : prisma.bagEntry.delete({ where: { id: entrada.id } }),
        prisma.bagUse.create({
          data: { participantId: participant.id, itemId: entrada.itemId, itemName: "Bono prodigioso" },
        }),
      );
    }
    await prisma.$transaction(operaciones);
    await sincronizarAs([captura.id]);
    await registrar(locke.id, "gts", "Hace un Intercambio Prodigioso");
    revalidatePath("/prodigioso");
    revalidatePath("/equipo");
    revalidatePath("/mapa");
    revalidatePath("/bolsa");

    const nombreDeSale = captura.nickname ?? captura.species;
    return {
      partida: Buffer.from(lista).toString("base64"),
      aviso: `${nombreDeSale} se ha ido y ha llegado ${especieEnLaApp} (nivel ${generado.nivel}), en ${cambio.donde}.`,
      sale: { nombre: nombreDeSale, pokemonId: captura.pokemonId, shiny: leido.pokemon.shiny, sexo: leido.sexo },
      llega: { nombre: especieEnLaApp, pokemonId: llega.pokemonId, shiny: generado.shiny, sexo: generado.sexo },
    };
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}
