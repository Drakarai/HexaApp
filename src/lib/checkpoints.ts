import { prisma } from "@/lib/db";

/**
 * Los **checkpoints de jornada**: en un level cap se marca a mano que, cuando
 * todos lo hayan pasado, toca jugar la jornada antes de seguir. Es como se
 * juega el Hexalocke: "cada dos gimnasios, jornada".
 *
 * Qué jornada es cada uno sale **del orden**: el primer checkpoint es la
 * primera jornada, el segundo la segunda. No se guarda la jornada en el level
 * cap porque normalmente los checkpoints se ponen al montar el locke, cuando
 * las jornadas todavía no existen; y el orden es lo que se ve en la pantalla de
 * los level caps, donde cada checkpoint dice qué jornada le toca.
 *
 * Mientras un checkpoint está abierto —todos lo han pasado y su jornada tiene
 * combates por jugar—, la portada deja de enseñar el siguiente level cap y
 * enseña el rival de la jornada: es lo que hay que hacer ahora, y el siguiente
 * gimnasio todavía no.
 */

export type HitoParaCheckpoint = {
  id: string;
  label: string;
  jornadaDespues: boolean;
};

export type CombateParaCheckpoint = {
  id: string;
  participantAId: string;
  participantBId: string;
  winnerId: string | null;
  /** La organización ha dicho que se juega aunque uno esté fuera del locke */
  excepcion?: boolean;
};

export type JornadaParaCheckpoint = {
  id: string;
  label: string;
  milestone: string | null;
  matches: CombateParaCheckpoint[];
  /** Los Battle Royale de la jornada: quién está dentro y si ya hay ganador */
  royales: { participantes: string[]; ganado: boolean }[];
};

export type Checkpoint<J extends JornadaParaCheckpoint = JornadaParaCheckpoint> = {
  /** El level cap tras el que toca */
  hito: HitoParaCheckpoint;
  /** Su posición entre los level caps, para contar cuántos faltan */
  indiceDelHito: number;
  /** 1 para el primero: es también el número de su jornada */
  numero: number;
  /** Su jornada, si la organización ya la ha creado */
  jornada: J | null;
  jugada: boolean;
};

/** Una jornada está jugada cuando no le queda nada por decidir */
export function jornadaJugada(jornada: JornadaParaCheckpoint) {
  const hayAlgo = jornada.matches.length > 0 || jornada.royales.length > 0;
  return (
    hayAlgo &&
    jornada.matches.every((combate) => combate.winnerId !== null) &&
    jornada.royales.every((royale) => royale.ganado)
  );
}

/** Cada checkpoint con su jornada, en orden */
export function checkpointsDelLocke<J extends JornadaParaCheckpoint>(
  hitos: HitoParaCheckpoint[],
  jornadas: J[],
): Checkpoint<J>[] {
  const checkpoints: Checkpoint<J>[] = [];
  hitos.forEach((hito, indiceDelHito) => {
    if (!hito.jornadaDespues) return;
    const jornada = jornadas[checkpoints.length] ?? null;
    checkpoints.push({
      hito,
      indiceDelHito,
      numero: checkpoints.length + 1,
      jornada,
      jugada: jornada ? jornadaJugada(jornada) : false,
    });
  });
  return checkpoints;
}

/**
 * El checkpoint que manda ahora, si hay uno: el primero que **todos han
 * pasado** y cuya jornada sigue por jugar. El primero y no el último: si una
 * jornada se quedó sin jugar y el grupo siguió avanzando, esa sigue debiéndose.
 *
 * `pasadosPorTodos` es cuántos level caps, desde el principio, tiene superados
 * todo el mundo: el índice del primero que le falta a alguien.
 */
export function checkpointAbierto<J extends JornadaParaCheckpoint>(
  checkpoints: Checkpoint<J>[],
  pasadosPorTodos: number,
): Checkpoint<J> | null {
  return (
    checkpoints.find(
      (checkpoint) => checkpoint.indiceDelHito < pasadosPorTodos && !checkpoint.jugada,
    ) ?? null
  );
}

/**
 * Lo que le toca a un jugador en una jornada: su rival del primer combate que
 * tenga por jugar, si es un royale, o nada si ya lo ha jugado todo.
 */
export function miParteDeLaJornada(
  jornada: JornadaParaCheckpoint,
  participantId: string,
  /**
   * Los que están fuera del locke. Un combate contra uno de ellos no se juega:
   * se gana solo al acabar la jornada (ver lib/retiradas.ts), y la portada
   * decía "tu rival" de alguien que ya no está.
   */
  retirados: ReadonlySet<string> = new Set(),
):
  | { tipo: "rival"; rivalId: string; combateId: string }
  | { tipo: "porRetirada"; rivalId: string }
  | { tipo: "royale" }
  | { tipo: "hecho" }
  | { tipo: "fuera" } {
  const rivalEn = (combate: CombateParaCheckpoint) =>
    combate.participantAId === participantId ? combate.participantBId : combate.participantAId;
  const pendientes = jornada.matches.filter(
    (combate) =>
      combate.winnerId === null &&
      (combate.participantAId === participantId ||
        combate.participantBId === participantId),
  );
  const pendiente = pendientes.find(
    (combate) => combate.excepcion || !retirados.has(rivalEn(combate)),
  );
  if (pendiente) {
    return { tipo: "rival", rivalId: rivalEn(pendiente), combateId: pendiente.id };
  }
  if (pendientes.length) return { tipo: "porRetirada", rivalId: rivalEn(pendientes[0]) };
  if (
    jornada.royales.some(
      (royale) => !royale.ganado && royale.participantes.includes(participantId),
    )
  ) {
    return { tipo: "royale" };
  }
  const juega =
    jornada.matches.some(
      (combate) =>
        combate.participantAId === participantId ||
        combate.participantBId === participantId,
    ) || jornada.royales.some((royale) => royale.participantes.includes(participantId));
  return juega ? { tipo: "hecho" } : { tipo: "fuera" };
}

/** Cuántos combates le quedan por decidir a la jornada (un royale cuenta uno) */
export function combatesPorJugar(jornada: JornadaParaCheckpoint) {
  return (
    jornada.matches.filter((combate) => combate.winnerId === null).length +
    jornada.royales.filter((royale) => !royale.ganado).length
  );
}

/**
 * Las jornadas del locke, en orden, con lo justo para saber qué le queda a
 * cada una. Los nombres de los jugadores no van: quien pinta ya los tiene.
 */
export async function getJornadasParaCheckpoints(competitionId: string) {
  const jornadas = await prisma.matchday.findMany({
    where: { competitionId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      label: true,
      milestone: true,
      matches: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          participantAId: true,
          participantBId: true,
          winnerId: true,
          excepcion: true,
        },
      },
      royales: { select: { puestos: { select: { participantId: true, puesto: true } } } },
    },
  });
  return jornadas.map((jornada) => ({
    ...jornada,
    royales: jornada.royales.map((royale) => ({
      participantes: royale.puestos.map((puesto) => puesto.participantId),
      ganado: royale.puestos.some((puesto) => puesto.puesto === 1),
    })),
  }));
}

/**
 * **El nivel al que combate ahora un jugador**, que es con el que sale su
 * equipo exportado a Showdown: el primer level cap que no ha superado (o el
 * último, si ya los tiene todos)… **salvo que le deba una jornada**. Si ha
 * pasado un level cap con checkpoint y no ha jugado su parte de esa jornada,
 * lo siguiente que juega es la jornada, y se juega al nivel de ese level cap:
 * pasado el gimnasio del 12, con jornada antes del del 16, el equipo sale al
 * 12. Antes salía al 16, el del gimnasio que aún no tocaba (lo avisó el
 * usuario).
 *
 * Que la jornada no esté creada todavía no cambia nada: se debe igual. Sí lo
 * cambia haber jugado ya su combate, aunque a otros les quede el suyo.
 */
export function capParaCombatir(
  hitos: (HitoParaCheckpoint & { cap: number; superado: boolean })[],
  jornadas: JornadaParaCheckpoint[],
  participantId: string,
): number | null {
  if (!hitos.length) return null;
  const debida = checkpointsDelLocke(hitos, jornadas).find((checkpoint) => {
    if (!hitos[checkpoint.indiceDelHito].superado || checkpoint.jugada) return false;
    if (!checkpoint.jornada) return true;
    const suParte = miParteDeLaJornada(checkpoint.jornada, participantId).tipo;
    return suParte !== "hecho" && suParte !== "fuera";
  });
  if (debida) return hitos[debida.indiceDelHito].cap;
  return (hitos.find((hito) => !hito.superado) ?? hitos.at(-1))!.cap;
}
