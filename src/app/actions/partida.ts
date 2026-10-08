"use server";

import { prisma } from "@/lib/db";
import { getZonasParaElegir } from "@/lib/mapas";
import { regionesDelJuego } from "@/lib/juegos";
import { leerMovimientos } from "@/lib/movimientos";
import { leerHistoria } from "@/lib/historia";
import { spriteDeEspecie } from "@/lib/sprites-servidor";
import { sitioParaUnaNueva, TAMANO_DEL_EQUIPO } from "@/lib/equipo-y-caja";
import { vincularCapturaNueva } from "@/lib/soul-link";
import { sincronizarAs } from "@/lib/as-servidor";
import {
  apuntarCambio,
  assertPuedeTocarLaCaja,
  caer,
  capturaQuePuedoTocar,
  refrescarCaja,
  CAMPOS,
  type Foto,
} from "@/lib/caja-servidor";
import { partidaDelNavegador, traducir, type PokemonTraducido } from "@/lib/partida/traducir";
import { partidaOficialDelNavegador, traducirOficial } from "@/lib/partida/traducir-oficial";
import { formatoDePartida } from "@/lib/partida/formato";
import { NOMBRE_DE_FAMILIA } from "@/lib/partida/oficial/comun";
import { planear, type PasoDelPlan, type Plan } from "@/lib/partida/plan";
import mapas from "@/lib/anil-mapas.json";

/**
 * **Leer la partida** y ponerla en el Equipo y PC (ver lib/partida): la de
 * Pokémon Añil en sus lockes, y la del juego oficial en los demás (1ª a 7ª
 * generación). El fichero se lee en el navegador; aquí llega solo lo que se
 * sacó de él, que se comprueba entero porque podría mandarlo cualquiera.
 *
 * Dos pasos: `verPartidaAction` dice qué va a cambiar, y
 * `aplicarPartidaAction` lo hace con lo que se dejó marcado. El segundo
 * **vuelve a calcularlo todo** con lo que hay en ese momento: no se fía de la
 * vista previa, que puede haberse quedado vieja.
 *
 * Solo la caja de uno mismo (o, en un Soul Link, la que puede tocar quien
 * administra) y solo en lockes de Añil.
 */

type Entrada = {
  participantId: string;
  /** Lo sacado del fichero (`PartidaLeida`) */
  partida: unknown;
  /** La caja de los caídos (desde 0), o null si no se usa ninguna */
  cajaDeCaidos: number | null;
};

export type PasoParaVer = {
  clave: string;
  tipo: PasoDelPlan["tipo"];
  nombre: string;
  pokemonId: number | null;
  shiny: boolean;
  /** Lo que se le hace, en frases cortas */
  detalle: string[];
  /** Dónde está en el juego: «Equipo» o el nombre de su caja */
  enElJuego: string;
};

export type VistaDeLaPartida = {
  jugador: string | null;
  cajas: string[];
  cajaDeCaidos: number | null;
  pasos: PasoParaVer[];
  iguales: number;
  yaCaidos: number;
  caidosEnLaApp: string[];
  soloEnLaApp: string[];
  /** Especies que la app no conoce: no deberían salir en Añil */
  desconocidos: string[];
  /** Si la app aún no sabe los nombres de los mapas de Añil: las rutas quedan en blanco */
  sinMapas: boolean;
  /** Si el juego no guarda dónde se capturó (1ª, Oro y Plata): las rutas quedan en blanco */
  sinLugares: boolean;
  /** Si no guarda cuándo (hasta la 3ª): los nuevos se apuntan con la fecha de hoy */
  sinFecha: boolean;
};

const HAY_MAPAS = Object.keys(mapas).length > 0;

async function prepararPlan(entrada: Entrada) {
  const { participant } = await assertPuedeTocarLaCaja(String(entrada.participantId ?? ""));
  const competicion = await prisma.competition.findUniqueOrThrow({
    where: { id: participant.competitionId },
    select: { id: true, game: true, gameId: true, juegoNoOficial: true, estilo: true },
  });
  const formato = formatoDePartida(competicion);
  if (!formato) throw new Error("En este locke no se pueden leer partidas: es de un fangame o no tiene juego elegido.");

  const desconocidos: string[] = [];
  let partida: { jugador: string | null; cajas: string[]; familia?: string };
  let traducidos: PokemonTraducido[];
  if (formato.tipo === "anil") {
    const leida = partidaDelNavegador(entrada.partida);
    if (!leida || !leida.pokemon.length) throw new Error("En esa partida no hay ningún pokémon que leer.");
    partida = leida;
    traducidos = leida.pokemon.flatMap((p) => {
      const t = traducir(p, leida.habilidadesRandom);
      if (!t) desconocidos.push(p.mote || p.especie);
      return t ? [t] : [];
    });
  } else {
    const leida = partidaOficialDelNavegador(entrada.partida);
    if (!leida) throw new Error("Esa partida no se ha podido leer.");
    if (leida.familia !== formato.familia) {
      throw new Error(
        `Esa partida es de ${NOMBRE_DE_FAMILIA[leida.familia]} y este locke se juega a ${NOMBRE_DE_FAMILIA[formato.familia]}.`,
      );
    }
    if (!leida.pokemon.length) throw new Error("En esa partida no hay ningún pokémon que leer.");
    partida = leida;
    traducidos = leida.pokemon.flatMap((p) => {
      const t = traducirOficial(p, leida.familia);
      if (!t) desconocidos.push(p.mote || `nº ${p.especie}`);
      return t ? [t] : [];
    });
  }
  const cajaDeCaidos =
    Number.isInteger(entrada.cajaDeCaidos) && (entrada.cajaDeCaidos ?? -1) >= 0 && entrada.cajaDeCaidos! < partida.cajas.length
      ? entrada.cajaDeCaidos
      : null;

  const [capturas, bajasSueltas, zonas] = await Promise.all([
    prisma.capture.findMany({
      where: { participantId: participant.id, failed: false },
      select: {
        id: true,
        species: true,
        nickname: true,
        pokemonId: true,
        shiny: true,
        naturaleza: true,
        objeto: true,
        movimientos: true,
        habilidad: true,
        deathId: true,
        createdAt: true,
      },
    }),
    // Las del cementerio sin captura detrás (apuntadas a mano) y sin revivir
    prisma.death.findMany({
      where: { participantId: participant.id, revividoEl: null, capturas: { none: {} } },
      select: { id: true, species: true, nickname: true },
    }),
    getZonasParaElegir(regionesDelJuego(competicion.gameId)),
  ]);

  const plan = planear({
    partida: traducidos,
    capturas: capturas.map((c) => ({
      ...c,
      movimientos: leerMovimientos(c.movimientos),
      muerta: Boolean(c.deathId),
      creado: c.createdAt.toISOString(),
    })),
    bajasSueltas,
    zonas: zonas.map((z) => ({ id: z.id, name: z.label.split(" › ").pop() ?? z.label, label: z.label })),
    cajaDeCaidos,
  });
  return { participant, competicion, partida, cajaDeCaidos, plan, desconocidos, anil: formato.tipo === "anil" };
}

function paraVer(paso: PasoDelPlan, cajas: string[], cajaDeCaidos: number | null): PasoParaVer {
  const donde = (p: { donde: { lugar: string; caja?: number } }) =>
    p.donde.lugar === "equipo" ? "Equipo" : (cajas[p.donde.caja ?? 0] ?? "Caja");
  switch (paso.tipo) {
    case "actualizar":
      return {
        clave: paso.clave,
        tipo: paso.tipo,
        nombre: paso.nombre,
        pokemonId: paso.pokemonId,
        shiny: paso.shiny,
        detalle: paso.cambios.map((c) => `${c.campo}: ${c.antes} → ${c.despues}`),
        enElJuego: "",
      };
    case "nueva": {
      const p = paso.pokemon;
      const ruta = paso.zona
        ? `En ${paso.zona}${paso.nota ? ` (nota: «${paso.nota}»)` : ""}`
        : p.sitio
          ? `Sin ruta: en el juego pone «${p.sitio}», que no está en el mapa`
          : "Sin ruta: ponla tú";
      return {
        clave: paso.clave,
        tipo: paso.tipo,
        nombre: paso.nombre,
        pokemonId: p.pokemonId,
        shiny: p.shiny,
        detalle: [
          `${p.especie}${p.shiny ? " shiny" : ""}${p.recibido ? `, capturado el ${new Date(p.recibido).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}` : ""}`,
          ruta,
          ...(p.avisos.length ? [`No se ha podido leer ${p.avisos.join(", ")}`] : []),
        ],
        enElJuego: donde(p),
      };
    }
    case "muere":
      return { clave: paso.clave, tipo: paso.tipo, nombre: paso.nombre, pokemonId: paso.pokemonId, shiny: paso.shiny, detalle: ["Está en la caja de caídos: se da por muerto"], enElJuego: cajas[cajaDeCaidos ?? -1] ?? "" };
    case "baja":
      return {
        clave: paso.clave,
        tipo: paso.tipo,
        nombre: paso.nombre,
        pokemonId: paso.pokemon.pokemonId,
        shiny: paso.pokemon.shiny,
        detalle: [`${paso.pokemon.especie}: no estaba en la app; se apunta en el cementerio`],
        enElJuego: donde(paso.pokemon),
      };
  }
}

function vista(
  partida: { jugador: string | null; cajas: string[]; familia?: string },
  cajaDeCaidos: number | null,
  plan: Plan,
  desconocidos: string[],
  anil: boolean,
): VistaDeLaPartida {
  return {
    jugador: partida.jugador,
    cajas: partida.cajas,
    cajaDeCaidos,
    pasos: plan.pasos.map((p) => paraVer(p, partida.cajas, cajaDeCaidos)),
    iguales: plan.iguales,
    yaCaidos: plan.yaCaidos,
    caidosEnLaApp: plan.caidosEnLaApp,
    soloEnLaApp: plan.soloEnLaApp,
    desconocidos,
    sinMapas: anil && !HAY_MAPAS,
    sinLugares: partida.familia === "rby" || partida.familia === "gs",
    sinFecha: ["rby", "gs", "c", "rs", "e", "frlg"].includes(partida.familia ?? ""),
  };
}

export async function verPartidaAction(entrada: Entrada): Promise<{ error?: string; vista?: VistaDeLaPartida }> {
  try {
    const { partida, cajaDeCaidos, plan, desconocidos, anil } = await prepararPlan(entrada);
    return { vista: vista(partida, cajaDeCaidos, plan, desconocidos, anil) };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/** Hace las cosas de pocas en pocas: bajar sprites de muchos a la vez satura a GitHub */
async function deAPocos<T>(lista: T[], tanda: number, hacer: (x: T) => Promise<void>) {
  for (let i = 0; i < lista.length; i += tanda) await Promise.all(lista.slice(i, i + tanda).map(hacer));
}

export async function aplicarPartidaAction(
  entrada: Entrada & { claves: string[] },
): Promise<{ error?: string; aviso?: string }> {
  try {
    const { participant, plan } = await prepararPlan(entrada);
    const elegidas = new Set(Array.isArray(entrada.claves) ? entrada.claves.map(String) : []);
    const pasos = plan.pasos.filter((p) => elegidas.has(p.clave));
    if (!pasos.length) return { error: "No hay nada marcado que cambiar." };

    const ahora = new Date().toISOString();
    const antes: Foto[] = [];
    const muertes: string[] = [];
    const creadas: string[] = [];

    // --- Los que ya estaban: al día ---------------------------------------
    const actualizar = pasos.filter((p): p is Extract<PasoDelPlan, { tipo: "actualizar" }> => p.tipo === "actualizar");
    if (actualizar.length) {
      const fichas = await prisma.capture.findMany({
        where: { id: { in: actualizar.map((p) => p.captureId) } },
        select: { ...CAMPOS, nickname: true, naturaleza: true, objeto: true, movimientos: true, habilidad: true, habilidadMega: true },
      });
      const porId = new Map(fichas.map((f) => [f.id, f]));
      await deAPocos(actualizar, 4, async (paso) => {
        const ficha = porId.get(paso.captureId);
        if (!ficha) return;
        antes.push(ficha);
        const { datos } = paso;
        // Sprite nuevo si cambia de forma o de shiny; si no se puede bajar, el de antes
        const shiny = datos.shiny ?? ficha.shiny;
        const imagen =
          datos.pokemonId !== undefined || datos.shiny !== undefined
            ? await spriteDeEspecie(datos.pokemonId ?? ficha.pokemonId ?? 0, shiny, "box").catch(() => null)
            : null;
        await prisma.capture.update({
          where: { id: paso.captureId },
          data: {
            ...datos,
            ...(imagen ? { image: imagen } : {}),
            ...(paso.evoluciona
              ? { historia: [...leerHistoria(ficha.historia), { tipo: "evoluciona", ...paso.evoluciona, fecha: ahora }] }
              : {}),
          },
        });
      });
    }

    // --- Los nuevos: se apuntan con su ficha, su fecha y su ruta ----------
    const nuevas = pasos.filter((p): p is Extract<PasoDelPlan, { tipo: "nueva" }> => p.tipo === "nueva");
    if (nuevas.length) {
      const imagenes = new Map<string, string | null>();
      await deAPocos(nuevas, 4, async (paso) => {
        imagenes.set(paso.clave, await spriteDeEspecie(paso.pokemon.pokemonId, paso.pokemon.shiny, "box").catch(() => null));
      });
      // Los del equipo del juego, al equipo si hay hueco (y en su orden); los demás, a la caja
      nuevas.sort((a, b) => Number(b.pokemon.donde.lugar === "equipo") - Number(a.pokemon.donde.lugar === "equipo"));
      for (const paso of nuevas) {
        const p = paso.pokemon;
        const vivas = await prisma.capture.findMany({
          where: { participantId: participant.id, failed: false, deathId: null },
          select: { id: true, lugar: true, hueco: true, createdAt: true },
        });
        const colocables = vivas.map((c) => ({ ...c, creado: c.createdAt.getTime() }));
        const hueco = sitioParaUnaNueva(colocables);
        const donde =
          p.donde.lugar === "equipo" || hueco.lugar === "caja"
            ? hueco
            : // Del PC del juego: a la caja aunque quede hueco en el equipo
              sitioParaUnaNueva([
                ...colocables,
                ...Array.from({ length: TAMANO_DEL_EQUIPO }, (_, i) => ({ id: `x${i}`, lugar: "equipo", hueco: i, creado: 0 })),
              ]);
        const nueva = await prisma.capture.create({
          data: {
            participantId: participant.id,
            species: p.especie,
            pokemonId: p.pokemonId,
            nickname: p.mote,
            shiny: p.shiny,
            naturaleza: p.naturaleza,
            habilidad: p.habilidad,
            objeto: p.objeto,
            movimientos: p.movimientos,
            zoneId: paso.zoneId,
            notes: paso.nota?.slice(0, 120) ?? null,
            image: imagenes.get(paso.clave) ?? null,
            lugar: donde.lugar,
            hueco: donde.hueco,
            ...(p.recibido ? { createdAt: new Date(p.recibido) } : {}),
          },
          select: { id: true },
        });
        creadas.push(nueva.id);
        // En un Soul Link, se vincula por la ruta como cualquier captura nueva
        await vincularCapturaNueva(nueva.id);
      }
    }

    // --- Los de la caja de caídos -----------------------------------------
    for (const paso of pasos) {
      if (paso.tipo === "muere") {
        const captura = await capturaQuePuedoTocar(paso.captureId);
        if (captura.deathId) continue;
        const caida = await caer(captura, "", { zoneId: null, location: null });
        // Si cayó también su pareja de un Soul Link, su foto va con las demás
        antes.push(...caida.foto.filter((f) => !antes.some((a) => a.id === f.id)));
        muertes.push(...caida.muertes);
      } else if (paso.tipo === "baja") {
        const p = paso.pokemon;
        const [boxImage, detailImage] = await Promise.all([
          spriteDeEspecie(p.pokemonId, false, "box").catch(() => null),
          spriteDeEspecie(p.pokemonId, false, "detail").catch(() => null),
        ]);
        const baja = await prisma.death.create({
          data: { participantId: participant.id, species: p.especie, nickname: p.mote, boxImage, detailImage },
          select: { id: true },
        });
        muertes.push(baja.id);
      }
    }

    await apuntarCambio(participant.id, "Leer la partida", antes, muertes, creadas);
    await sincronizarAs(actualizar.map((p) => p.captureId));
    const cuenta = (tipo: PasoDelPlan["tipo"]) => pasos.filter((p) => p.tipo === tipo).length;
    const partes = [
      cuenta("actualizar") && `${cuenta("actualizar")} al día`,
      cuenta("nueva") && `${cuenta("nueva")} ${cuenta("nueva") === 1 ? "nuevo" : "nuevos"}`,
      cuenta("muere") + cuenta("baja") && `${cuenta("muere") + cuenta("baja")} al cementerio`,
    ].filter(Boolean);
    refrescarCaja(true);
    return { aviso: `Partida leída: ${partes.join(", ")}. Si algo no te cuadra, «Deshacer» lo deja como estaba.` };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
