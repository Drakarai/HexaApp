"use server";

import { revalidatePath } from "next/cache";
import { mensajeDeError } from "@/lib/permiso";
import { prisma } from "@/lib/db";
import {
  assertEdicionAbierta,
  canManageCompetition,
  edicionCerradaPara,
  getMyParticipant,
  requireCompetitionManager,
} from "@/lib/competition";
import { assertPuedeTocarLocke } from "@/lib/acceso";
import { requireUser } from "@/lib/auth";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import {
  MAXIMO_DE_GENTE,
  MINIMO_DE_GENTE,
  POR_PERSONA,
} from "@/lib/sorteo";
import type { FormState } from "@/app/actions/auth";

/**
 * El sorteo de pokémon de préstamo.
 *
 * Quién puede qué:
 * - **Echar un pokémon al bote**: cualquiera que juegue el locke. La gracia es
 *   que cada uno ponga los suyos, así que pedir que lo haga un administrador
 *   sería convertirlo en un recado.
 * - **Quitarlo**: quien lo puso, o un administrador.
 * - **Repartir, elegir quién entra y borrar el sorteo**: la organización.
 */

function refrescar() {
  revalidatePath("/sorteo");
}

async function sorteoCon(id: string) {
  return prisma.sorteo.findUnique({
    where: { id },
    select: { id: true, competitionId: true, repartidoAt: true },
  });
}

export async function crearSorteoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }

  /**
   * Nace con todos los que juegan dentro, que es lo que se quiere el 90% de
   * las veces. Quitar a alguien es un toque; añadirlos de uno en uno, seis.
   */
  const jugadores = await prisma.participant.findMany({
    where: { competitionId, retiredAt: null },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: MAXIMO_DE_GENTE,
  });

  await prisma.sorteo.create({
    data: {
      competitionId,
      label: String(formData.get("label") ?? "").trim() || null,
      participantes: {
        create: jugadores.map((jugador) => ({ participantId: jugador.id })),
      },
    },
  });

  refrescar();
  return { success: "Sorteo creado. Id echando pokémon al bote." };
}

export async function borrarSorteoAction(formData: FormData) {
  const id = String(formData.get("sorteoId") ?? "");
  const sorteo = await sorteoCon(id);
  if (!sorteo) return;
  await requireCompetitionManager(sorteo.competitionId);
  await prisma.sorteo.delete({ where: { id } });
  refrescar();
}

/**
 * Echar un pokémon al bote.
 *
 * Lo puede hacer cualquiera que juegue, y queda apuntado quién lo puso: en un
 * préstamo importa de quién era el bicho.
 */
export async function anadirAlBoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const sorteoId = String(formData.get("sorteoId") ?? "");
  const sorteo = await sorteoCon(sorteoId);
  if (!sorteo) return { error: "Ese sorteo ya no está." };

  try {
    const acceso = await assertPuedeTocarLocke(sorteo.competitionId);
    // Un jugador no echa nada al bote de una edición archivada
    if (acceso === "JUGADOR") await assertEdicionAbierta(sorteo.competitionId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const yo = await getMyParticipant(sorteo.competitionId, user.id);
  const cuantos = await prisma.sorteoPokemon.count({ where: { sorteoId } });
  // Las imágenes las baja el servidor, como en todo lo demás
  const sprites = await spritesDelFormulario(formData);

  await prisma.sorteoPokemon.create({
    data: {
      sorteoId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      boxImage: sprites?.boxImage ?? null,
      aportadoPor: yo?.id ?? null,
      position: cuantos,
    },
  });

  refrescar();
  return { success: `${species} al bote.` };
}

export async function quitarDelBoteAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("pokemonId") ?? "");
  const pokemon = await prisma.sorteoPokemon.findUnique({
    where: { id },
    select: { aportadoPor: true, sorteo: { select: { competitionId: true } } },
  });
  if (!pokemon) return;

  // Lo quita quien lo puso; si no, tiene que ser de la organización
  const yo = await getMyParticipant(pokemon.sorteo.competitionId, user.id);
  const esSuyo = Boolean(yo) && pokemon.aportadoPor === yo!.id;
  /**
   * Se comprueba aquí y no solo escondiendo la ✕, pero **sin reventar**: esta
   * acción no devuelve nada, así que lanzar un error dejaría al que lo intente
   * mirando una pantalla rota en vez de un botón que no hace nada.
   */
  if (!esSuyo && !(await canManageCompetition(pokemon.sorteo.competitionId, user))) {
    return;
  }
  // Lo suyo, pero en una edición archivada ya no (salvo que la administre)
  if (await edicionCerradaPara(pokemon.sorteo.competitionId, user)) return;

  await prisma.sorteoPokemon.delete({ where: { id } });
  refrescar();
}

/** Quién entra en el reparto: se enciende y se apaga tocando su nombre. */
export async function cambiarParticipanteAction(formData: FormData) {
  const sorteoId = String(formData.get("sorteoId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  const sorteo = await sorteoCon(sorteoId);
  if (!sorteo) return;
  await requireCompetitionManager(sorteo.competitionId);

  const existe = await prisma.sorteoParticipante.findUnique({
    where: { sorteoId_participantId: { sorteoId, participantId } },
    select: { id: true },
  });

  if (existe) {
    await prisma.sorteoParticipante.delete({ where: { id: existe.id } });
  } else {
    const cuantos = await prisma.sorteoParticipante.count({ where: { sorteoId } });
    if (cuantos >= MAXIMO_DE_GENTE) return;
    const juega = await prisma.participant.count({
      where: { id: participantId, competitionId: sorteo.competitionId },
    });
    if (!juega) return;
    await prisma.sorteoParticipante.create({ data: { sorteoId, participantId } });
  }

  refrescar();
}

/**
 * El reparto.
 *
 * Se baraja el bote y se va dando uno a cada uno por turnos hasta que se
 * acaban los pokémon o todos llegan a seis. **Lo que sobra se queda en el
 * bote**: no se tira ni se avisa de nada raro, simplemente no le toca a nadie
 * y se ve en su sitio.
 *
 * Repartir otra vez vuelve a barajar desde cero, así que no hay forma de que
 * queden restos del reparto anterior.
 */
export async function repartirAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sorteoId = String(formData.get("sorteoId") ?? "");
  const sorteo = await prisma.sorteo.findUnique({
    where: { id: sorteoId },
    include: {
      participantes: { select: { participantId: true } },
      pokemon: { select: { id: true } },
    },
  });
  if (!sorteo) return { error: "Ese sorteo ya no está." };

  try {
    await requireCompetitionManager(sorteo.competitionId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }

  const gente = sorteo.participantes.map((fila) => fila.participantId);
  if (gente.length < MINIMO_DE_GENTE) {
    return { error: `Hacen falta al menos ${MINIMO_DE_GENTE} personas.` };
  }
  if (gente.length > MAXIMO_DE_GENTE) {
    return { error: `De momento son ${MAXIMO_DE_GENTE} personas como mucho.` };
  }
  if (!sorteo.pokemon.length) return { error: "El bote está vacío." };

  const barajados = barajar(sorteo.pokemon.map((pokemon) => pokemon.id));
  /** A quién le toca cada uno, y en qué sitio de su equipo */
  const reparto = new Map<string, { tocaAId: string; position: number }>();

  for (let indice = 0; indice < barajados.length; indice++) {
    const vuelta = Math.floor(indice / gente.length);
    if (vuelta >= POR_PERSONA) break; // todos llenos: lo que queda, al bote
    reparto.set(barajados[indice], {
      tocaAId: gente[indice % gente.length],
      position: vuelta,
    });
  }

  await prisma.$transaction([
    // Lo primero, deshacer el reparto anterior entero
    prisma.sorteoPokemon.updateMany({
      where: { sorteoId },
      data: { tocaAId: null, position: 0 },
    }),
    ...[...reparto.entries()].map(([id, donde]) =>
      prisma.sorteoPokemon.update({ where: { id }, data: donde }),
    ),
    prisma.sorteo.update({
      where: { id: sorteoId },
      data: { repartidoAt: new Date() },
    }),
  ]);

  refrescar();
  const sobran = barajados.length - reparto.size;
  return {
    success: sobran
      ? `Repartido. ${sobran} ${sobran === 1 ? "se queda" : "se quedan"} en el bote.`
      : "Repartido.",
  };
}

/** Deshacer el reparto y dejar el bote como estaba. */
export async function deshacerRepartoAction(formData: FormData) {
  const sorteoId = String(formData.get("sorteoId") ?? "");
  const sorteo = await sorteoCon(sorteoId);
  if (!sorteo) return;
  await requireCompetitionManager(sorteo.competitionId);

  await prisma.$transaction([
    prisma.sorteoPokemon.updateMany({
      where: { sorteoId },
      data: { tocaAId: null, position: 0 },
    }),
    prisma.sorteo.update({ where: { id: sorteoId }, data: { repartidoAt: null } }),
  ]);
  refrescar();
}

/**
 * Barajar de verdad (Fisher-Yates). Ordenar por `Math.random()` parece que
 * baraja pero no reparte parejo, y aquí lo único que hay que hacer bien es
 * justo eso.
 */
function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
