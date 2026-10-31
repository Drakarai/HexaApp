"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { resolverRetiradas } from "@/lib/retiradas";
import { emparejamientosDeJornada } from "@/lib/emparejamientos";
import { alMejorDeDeLaJornada, perfilDeLocke } from "@/lib/perfiles-de-locke";
import { ajustarDesempate } from "@/lib/series";
import { borrarJornadaALaPapelera, restaurarJornada } from "@/lib/papelera";
import { esRoyale, formatoDeCombate } from "@/lib/formatos-de-combate";
import { enlaceSeguro } from "@/lib/utils";
import { nombresDeJugadores, registrar } from "@/lib/registro";

/**
 * Lo que se lleva de diferencia quien gana porque el otro no se presentó. No
 * presentarse no puede salir más barato que perder jugando, y la diferencia de
 * pokémon es el segundo desempate de la clasificación.
 */
const DIFERENCIA_POR_RETIRADA = 3;
import type { FormState } from "@/app/actions/auth";

export async function createMatchdayAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Ponle nombre a la jornada." };

  /**
   * Con uno solo en pie no hay jornada posible: antes se creaba vacía, sin un
   * combate y sin decir por qué. Ese uno ya ha ganado (ver `POR_ABANDONO`).
   */
  const enPie = await prisma.participant.findMany({
    where: { competitionId, retiredAt: null },
    select: { displayName: true },
  });
  if (enPie.length < 2) {
    return {
      error: enPie.length
        ? `Solo queda ${enPie[0].displayName} en el locke: no hay contra quién jugar. Ha ganado por abandono; está en la final y en el hall de la fama.`
        : "No queda nadie jugando este locke.",
    };
  }

  const pointsForWin = Number(formData.get("pointsForWin") ?? 1);
  // En un dualocke, un combate o al mejor de tres; en los demás no hay series
  const delLocke = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { maxPlayers: true },
  });
  const perfil = perfilDeLocke(delLocke?.maxPlayers ?? enPie.length);
  const alMejorDe = perfil.serieAlMejorDe
    ? alMejorDeDeLaJornada(Number(formData.get("alMejorDe") ?? 0), perfil)
    : null;
  // El formato se valida contra la lista: si llega uno raro, singles
  const formato = formatoDeCombate(String(formData.get("formato") ?? "")).id;
  const last = await prisma.matchday.findFirst({
    where: { competitionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? 0) + 1;

  const matchday = await prisma.matchday.create({
    data: {
      competitionId,
      label,
      milestone: String(formData.get("milestone") ?? "").trim() || null,
      pointsForWin: Number.isFinite(pointsForWin) ? Math.trunc(pointsForWin) : 1,
      formato,
      condiciones: String(formData.get("condiciones") ?? "").trim() || null,
      alMejorDe,
      position,
    },
  });
  await registrar(competitionId, "jornadas", `Crea la ${label}`);

  /**
   * Los emparejamientos se proponen solos si se pide (`lib/emparejamientos.ts`).
   * Se **proponen**, no se imponen: son combates normales y corrientes, así que
   * se pueden borrar y añadir otros a mano como siempre.
   */
  let propuestos = 0;
  let descansa: string | null = null;

  if (esRoyale(formato)) {
    /**
     * Un Battle Royale no se empareja: **no hay parejas**. La jornada nace con
     * un royale y todos los que siguen jugando dentro, y el orden de llegada se
     * rellena al terminar.
     */
    const jugadores = await prisma.participant.findMany({
      where: { competitionId, retiredAt: null },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (jugadores.length >= 2) {
      await prisma.royale.create({
        data: {
          matchdayId: matchday.id,
          puestos: {
            create: jugadores.map((jugador) => ({ participantId: jugador.id })),
          },
        },
      });
    }
    revalidatePath("/jornadas");
    return {
      success: `Jornada creada con un Battle Royale de ${jugadores.length} jugadores.`,
    };
  }

  if (formData.get("emparejar") === "on") {
    const resultado = await emparejarJornada(competitionId, matchday.id, position, alMejorDe);
    propuestos = resultado.propuestos;
    descansa = resultado.descansa;
  }

  revalidatePath("/jornadas");
  if (!propuestos) return { success: "Jornada creada." };
  return {
    success: `Jornada creada con ${propuestos} ${
      propuestos === 1 ? "combate" : "combates"
    }${descansa ? `. Descansa ${descansa}.` : "."}`,
  };
}

/**
 * Rellena una jornada recién creada con los emparejamientos que le tocan.
 *
 * El orden de los jugadores es **por fecha de alta**, no por nombre: la
 * rotación de la liguilla se cuenta desde ahí, y si alguien se cambia el mote
 * el reparto no puede bailar. Solo entran los que siguen jugando.
 */
async function emparejarJornada(
  competitionId: string,
  matchdayId: string,
  position: number,
  alMejorDe: number | null,
) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { maxPlayers: true },
  });

  const jugadores = await prisma.participant.findMany({
    where: { competitionId, retiredAt: null },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: { id: true, displayName: true },
  });
  if (jugadores.length < 2) return { propuestos: 0, descansa: null };

  const perfil = perfilDeLocke(competition?.maxPlayers ?? jugadores.length);
  const ronda = emparejamientosDeJornada(
    perfil,
    jugadores.map((jugador) => jugador.id),
    position,
    alMejorDeDeLaJornada(alMejorDe, perfil),
  );
  if (!ronda.pares.length) return { propuestos: 0, descansa: null };

  await prisma.match.createMany({
    data: ronda.pares.map(([participantAId, participantBId], indice) => ({
      matchdayId,
      participantAId,
      participantBId,
      position: indice,
    })),
  });

  const queDescansa = jugadores.find((jugador) => jugador.id === ronda.descansa);
  return {
    propuestos: ronda.pares.length,
    descansa: queDescansa?.displayName ?? null,
  };
}

export async function deleteMatchdayAction(formData: FormData) {
  const id = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({ where: { id } });
  if (!matchday) return;
  const manager = await requireCompetitionManager(matchday.competitionId);

  // A la papelera, no a la basura: se puede devolver unos días (ver lib/papelera)
  await borrarJornadaALaPapelera(id, manager.displayName);
  await registrar(matchday.competitionId, "jornadas", `Borra la ${matchday.label} (a la papelera)`);
  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
}

/** Devolver una jornada de la papelera, con todo lo que tenía */
export async function restaurarJornadaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("borradaId") ?? "");
  const borrada = await prisma.jornadaBorrada.findUnique({
    where: { id },
    select: { competitionId: true },
  });
  if (!borrada) return { error: "Esa jornada ya no está en la papelera." };
  try {
    await requireCompetitionManager(borrada.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const resultado = await restaurarJornada(id);
  if (resultado.error) return { error: resultado.error };
  await registrar(borrada.competitionId, "jornadas", `Recupera de la papelera la ${resultado.label}`);
  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  return { success: `${resultado.label} ha vuelto, con todo lo que tenía.` };
}

/** Borrarla de verdad, sin esperar a que caduque */
export async function vaciarDeLaPapeleraAction(formData: FormData) {
  const id = String(formData.get("borradaId") ?? "");
  const borrada = await prisma.jornadaBorrada.findUnique({
    where: { id },
    select: { competitionId: true },
  });
  if (!borrada) return;
  await requireCompetitionManager(borrada.competitionId);
  const deVerdad = await prisma.jornadaBorrada.delete({ where: { id }, select: { label: true } });
  await registrar(borrada.competitionId, "jornadas", `Vacía de la papelera la ${deVerdad.label}: ya no se puede recuperar`);
  revalidatePath("/jornadas");
}

export async function addMatchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: { _count: { select: { matches: true } } },
  });
  if (!matchday) return { error: "Jornada no encontrada." };

  try {
    await requireCompetitionManager(matchday.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantAId = String(formData.get("participantAId") ?? "");
  const participantBId = String(formData.get("participantBId") ?? "");
  if (!participantAId || !participantBId) {
    return { error: "Elige los dos jugadores del emparejamiento." };
  }
  if (participantAId === participantBId) {
    return { error: "Un jugador no puede combatir contra sí mismo." };
  }

  const losDos = await prisma.participant.findMany({
    where: {
      id: { in: [participantAId, participantBId] },
      competitionId: matchday.competitionId,
    },
    select: { id: true, displayName: true, retiredAt: true },
  });
  if (losDos.length !== 2) {
    return { error: "Esos jugadores no son de esta competición." };
  }

  /**
   * La excepción a la norma. El emparejador automático sigue sin contar con
   * quien está fuera del locke, pero montando el combate a mano la
   * organización puede dejarle jugar: **eso es el permiso**, no hace falta
   * nada más. Marcarlo es lo que evita que `lib/retiradas.ts` se lo dé por
   * ganado al rival antes de que lo jueguen.
   */
  const fuera = losDos.filter((jugador) => jugador.retiredAt !== null);

  await prisma.match.create({
    data: {
      matchdayId,
      participantAId,
      participantBId,
      position: matchday._count.matches,
      excepcion: fuera.length > 0,
    },
  });

  const [a, b] = [losDos.find((j) => j.id === participantAId), losDos.find((j) => j.id === participantBId)];
  await registrar(
    matchday.competitionId,
    "jornadas",
    `Añade el combate ${a?.displayName} vs ${b?.displayName} a la ${matchday.label}${fuera.length ? " (con permiso)" : ""}`,
  );

  revalidatePath("/jornadas");
  if (!fuera.length) return { success: "Emparejamiento añadido." };
  return {
    success: `Emparejamiento añadido. ${fuera
      .map((jugador) => jugador.displayName)
      .join(" y ")} ${fuera.length === 1 ? "está fuera" : "están fuera"} del locke y lo ${
      fuera.length === 1 ? "juega" : "juegan"
    } con permiso: el combate no se dará por retirada.`,
  };
}

/**
 * Guarda el resultado de un combate y sincroniza el punto de la victoria:
 * cada combate genera como mucho una entrada de puntos, enlazada por
 * sourceMatchId, de modo que corregir el resultado no duplica puntos.
 */
export async function setMatchResultAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  const manager = await requireCompetitionManager(match.matchday.competitionId);

  const winnerRaw = String(formData.get("winnerId") ?? "").trim();
  const winnerId =
    winnerRaw === match.participantAId || winnerRaw === match.participantBId
      ? winnerRaw
      : null;

  const diffRaw = String(formData.get("pokemonDiff") ?? "").trim();
  const diff = diffRaw ? Number(diffRaw) : null;
  const playedAtRaw = String(formData.get("playedAt") ?? "").trim();

  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId,
      pokemonDiff:
        diff !== null && Number.isFinite(diff) ? Math.abs(Math.trunc(diff)) : null,
      playedAt: playedAtRaw ? new Date(playedAtRaw) : winnerId ? new Date() : null,
      // Guardar un resultado a mano quiere decir que se jugó: si antes estaba
      // dado por retirada, deja de estarlo
      porRetirada: false,
      notes: String(formData.get("notes") ?? "").trim() || null,
      // Saneado antes de guardarlo: acaba en un href de la pantalla de todos
      replayUrl: enlaceSeguro(String(formData.get("replayUrl") ?? "")),
    },
  });

  const existing = await prisma.pointEntry.findUnique({
    where: { sourceMatchId: matchId },
  });

  if (!winnerId) {
    if (existing) {
      await prisma.pointEntry.delete({ where: { id: existing.id } });
    }
  } else {
    const winner = await prisma.participant.findUnique({
      where: { id: winnerId },
      select: { displayName: true },
    });
    const payload = {
      competitionId: match.matchday.competitionId,
      participantId: winnerId,
      delta: match.matchday.pointsForWin,
      reason: `${match.matchday.label}: victoria de ${winner?.displayName ?? "?"}`,
      createdById: manager.id,
      sourceMatchId: matchId,
    };
    if (existing) {
      await prisma.pointEntry.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.pointEntry.create({ data: payload });
    }
  }

  {
    const nuevaDiferencia = diff !== null && Number.isFinite(diff) ? Math.abs(Math.trunc(diff)) : null;
    const nombre = await nombresDeJugadores(match.participantAId, match.participantBId);
    const combate = `${nombre(match.participantAId)} vs ${nombre(match.participantBId)}`;
    const cambiaElResultado = match.winnerId !== winnerId || match.pokemonDiff !== nuevaDiferencia;
    await registrar(
      match.matchday.competitionId,
      "resultados",
      !cambiaElResultado
        ? `${match.matchday.label}, ${combate}: cambia las notas, la fecha o la repetición`
        : !winnerId
          ? `${match.matchday.label}, ${combate}: quita el resultado (ganaba ${nombre(match.winnerId)})`
          : `${match.matchday.label}, ${combate}: gana ${nombre(winnerId)}${nuevaDiferencia !== null ? ` por ${nuevaDiferencia}` : ""}${
              match.winnerId && match.winnerId !== winnerId ? ` (antes ganaba ${nombre(match.winnerId)})` : ""
            }`,
    );
  }

  /**
   * Con este resultado puede haberse completado la jornada, y entonces toca
   * dar por ganados los combates que estaban esperando por retirada.
   */
  await resolverRetiradas(match.matchday.competitionId, manager.id);

  // Y si la jornada es una serie al mejor de tres, puede tocar añadir o quitar
  // el desempate: ver lib/series.ts
  await ajustarDesempate(match.matchdayId);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/");
}

/**
 * Dar un combate por retirada: alguien no se presenta y lo pierde.
 *
 * Es distinto de retirarse del locke entero (ver `lib/retiradas.ts`): aquí el
 * que no aparece sigue jugando, simplemente no se presentó a ese combate. Por
 * eso se resuelve **en el momento**, sin esperar a que acabe la jornada.
 *
 * El ganador se lleva su punto y una **diferencia de 3 pokémon**, que es el
 * castigo acordado: no presentarse no puede salir más barato que perder
 * jugando.
 */
export async function darPorRetiradaAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  const manager = await requireCompetitionManager(match.matchday.competitionId);

  const seRetiraId = String(formData.get("seRetiraId") ?? "").trim();
  if (seRetiraId !== match.participantAId && seRetiraId !== match.participantBId) {
    return;
  }
  const ganadorId =
    seRetiraId === match.participantAId
      ? match.participantBId
      : match.participantAId;

  const [ganador, perdedor] = await Promise.all([
    prisma.participant.findUnique({
      where: { id: ganadorId },
      select: { displayName: true },
    }),
    prisma.participant.findUnique({
      where: { id: seRetiraId },
      select: { displayName: true },
    }),
  ]);

  const fechaRaw = String(formData.get("playedAt") ?? "").trim();

  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: ganadorId,
      pokemonDiff: DIFERENCIA_POR_RETIRADA,
      porRetirada: true,
      playedAt: fechaRaw ? new Date(fechaRaw) : new Date(),
    },
  });

  const datos = {
    competitionId: match.matchday.competitionId,
    participantId: ganadorId,
    delta: match.matchday.pointsForWin,
    reason: `${match.matchday.label}: victoria de ${ganador?.displayName ?? "?"} por retirada de ${perdedor?.displayName ?? "?"}`,
    createdById: manager.id,
    sourceMatchId: matchId,
  };
  const existente = await prisma.pointEntry.findUnique({
    where: { sourceMatchId: matchId },
  });
  if (existente) {
    await prisma.pointEntry.update({ where: { id: existente.id }, data: datos });
  } else {
    await prisma.pointEntry.create({ data: datos });
  }

  await registrar(
    match.matchday.competitionId,
    "resultados",
    `${match.matchday.label}: da el combate por retirada de ${perdedor?.displayName ?? "?"}, gana ${ganador?.displayName ?? "?"}`,
  );

  // Puede haber completado la jornada y desbloquear otras retiradas
  await resolverRetiradas(match.matchday.competitionId, manager.id);
  await ajustarDesempate(match.matchdayId);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/");
}

/**
 * Dar o quitar el permiso para que un combate se juegue aunque uno de los dos
 * esté fuera del locke.
 *
 * Existe porque la norma casi siempre se rompe **a medias**: el combate ya
 * estaba puesto y el wipeo llega después. Sin esto habría que borrar el
 * combate y volver a montarlo, que es lo mismo pero perdiendo las notas y el
 * equipo apuntado.
 *
 * Si ya se había dado por retirada, darle el permiso lo deshace: se le quita
 * el ganador y el punto, y vuelve a estar pendiente para que lo jueguen.
 */
export async function permitirCombateAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  const manager = await requireCompetitionManager(match.matchday.competitionId);

  const permitir = !match.excepcion;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      excepcion: permitir,
      // Al permitirlo se deshace lo que hubiera hecho la retirada; un
      // resultado jugado de verdad no se toca
      ...(permitir && match.porRetirada
        ? { winnerId: null, porRetirada: false, playedAt: null }
        : {}),
    },
  });

  if (permitir && match.porRetirada) {
    await prisma.pointEntry.deleteMany({ where: { sourceMatchId: matchId } });
  }
  {
    const nombre = await nombresDeJugadores(match.participantAId, match.participantBId);
    await registrar(
      match.matchday.competitionId,
      "resultados",
      `${match.matchday.label}, ${nombre(match.participantAId)} vs ${nombre(match.participantBId)}: ${
        permitir
          ? `da permiso para jugarlo aunque haya alguien fuera${match.porRetirada ? " (deshace la retirada)" : ""}`
          : "quita el permiso para jugarlo"
      }`,
    );
  }

  // Quitar el permiso lo devuelve a la cola de las retiradas, y puede tocarle
  // ya si su jornada está terminada
  await resolverRetiradas(match.matchday.competitionId, manager.id);
  await ajustarDesempate(match.matchdayId);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/");
}

/**
 * Cambiar una jornada de dualocke entre **un combate** y **al mejor de tres**.
 * Solo mientras no se haya escrito nada en ella —ni un resultado, ni un
 * equipo, ni una nota—: a mitad de serie cambiar las reglas dejaría combates
 * jugados sin sentido o sin contar. Ajusta los combates de la pareja: uno
 * solo, o los dos con los que nace una serie (el tercero llega si hace falta).
 */
export async function cambiarSerieDeJornadaAction(formData: FormData): Promise<FormState> {
  const matchdayId = String(formData.get("matchdayId") ?? "");
  const jornada = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: {
      id: true,
      label: true,
      competitionId: true,
      alMejorDe: true,
      competition: { select: { maxPlayers: true } },
      matches: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          participantAId: true,
          participantBId: true,
          winnerId: true,
          pokemonDiff: true,
          replayUrl: true,
          notes: true,
          playedAt: true,
          porRetirada: true,
          _count: { select: { team: true } },
        },
      },
    },
  });
  if (!jornada) return { error: "Esa jornada ya no existe." };
  try {
    await requireCompetitionManager(jornada.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }
  const perfil = perfilDeLocke(jornada.competition.maxPlayers);
  if (!perfil.serieAlMejorDe) return { error: "Solo las jornadas de un dualocke pueden ser al mejor de tres." };

  const pedido = alMejorDeDeLaJornada(Number(formData.get("alMejorDe") ?? 0), perfil);
  const ahora = alMejorDeDeLaJornada(jornada.alMejorDe, perfil);
  if (pedido === ahora) return { success: "Ya estaba así." };

  const escrita = jornada.matches.some(
    (m) =>
      m.winnerId || m.pokemonDiff !== null || m.replayUrl || m.notes || m.playedAt || m.porRetirada || m._count.team,
  );
  if (escrita) {
    return { error: "Ya hay algo apuntado en esta jornada: el formato ya no se puede cambiar." };
  }

  const primero = jornada.matches[0];
  if (primero) {
    if (pedido === 1) {
      // Un combate: sobra el resto de la serie, que está sin jugar
      await prisma.match.deleteMany({ where: { id: { in: jornada.matches.slice(1).map((m) => m.id) } } });
    } else if (jornada.matches.length < Math.ceil(pedido / 2)) {
      await prisma.match.createMany({
        data: Array.from({ length: Math.ceil(pedido / 2) - jornada.matches.length }, (_, i) => ({
          matchdayId: jornada.id,
          participantAId: primero.participantAId,
          participantBId: primero.participantBId,
          position: jornada.matches.length + i,
        })),
      });
    }
  }
  await prisma.matchday.update({ where: { id: jornada.id }, data: { alMejorDe: pedido } });
  await registrar(
    jornada.competitionId,
    "jornadas",
    `Pasa la ${jornada.label} a ${pedido === 1 ? "un combate" : `al mejor de ${pedido}`}`,
  );
  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  return { success: pedido === 1 ? "Ahora es un solo combate." : `Ahora es al mejor de ${pedido}.` };
}

export async function deleteMatchAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchday: true },
  });
  if (!match) return;
  await requireCompetitionManager(match.matchday.competitionId);

  await prisma.pointEntry.deleteMany({ where: { sourceMatchId: matchId } });
  await prisma.match.delete({ where: { id: matchId } });
  {
    const nombre = await nombresDeJugadores(match.participantAId, match.participantBId, match.winnerId);
    await registrar(
      match.matchday.competitionId,
      "jornadas",
      `Quita el combate ${nombre(match.participantAId)} vs ${nombre(match.participantBId)} de la ${match.matchday.label}${
        match.winnerId ? ` (lo había ganado ${nombre(match.winnerId)})` : ""
      }`,
    );
  }

  // Borrar el combate que faltaba también deja la jornada terminada
  await resolverRetiradas(match.matchday.competitionId, null);
  await ajustarDesempate(match.matchdayId);

  revalidatePath("/jornadas");
  revalidatePath("/puntos");
  revalidatePath("/jugador/[id]", "page");
}
