import "server-only";
import { prisma } from "@/lib/db";
import { getParticipants } from "@/lib/competition";

export type NodoDelGrafico = {
  participantId: string;
  /** Puesto para leerlo: 1 es el primero. Los empatados repiten puesto. */
  puesto: number;
  /**
   * Altura a la que se dibuja, en carriles (1 arriba). No es lo mismo que el
   * puesto: los empatados se ponen **en el centro** de los carriles que
   * ocupan, así que seis empatados salen todos a media altura en vez de
   * amontonados arriba.
   */
  carril: number;
  puntos: number;
  /** Caídos hasta esa jornada. Es el primer desempate, y se enseña al tocar. */
  muertes: number;
  /** Diferencia de pokémon hasta esa jornada. El segundo desempate. */
  diff: number;
};

export type EtapaDelGrafico = {
  /** Lo que se ve en el eje: "Inicio", "J1", "J2"… */
  etiqueta: string;
  /** El nombre entero, para el texto emergente */
  titulo: string;
  nodos: NodoDelGrafico[];
};

export type JugadorDelGrafico = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
};

/** Quién se fue del locke y en qué jornada dejó de contar. */
export type SalidaDelGrafico = {
  participantId: string;
  /** La etiqueta de la etapa desde la que ya no sale: "J3" */
  etiqueta: string;
  /** "retirada" o "wipeo", para decirlo con su palabra */
  motivo: string | null;
};

export type GraficoClasificacion = {
  etapas: EtapaDelGrafico[];
  /**
   * La misma historia **descontando a los que se fueron**: desde la jornada en
   * la que alguien se retira o pierde el locke, deja de estar en la tabla y los
   * demás suben. `null` si no se ha ido nadie, que entonces sería la misma
   * gráfica dos veces.
   */
  etapasDeLosQueSiguen: EtapaDelGrafico[] | null;
  salidas: SalidaDelGrafico[];
  jugadores: JugadorDelGrafico[];
};

/** Una foto de cómo iba alguien en un momento dado. */
type Corte = { participantId: string; puntos: number; muertes: number; diff: number };

/**
 * Cómo ha ido la clasificación jornada a jornada, para pintarla como líneas.
 *
 * Se dibujan **puestos y no puntos**: con seis jugadores y un punto por
 * victoria, todo el mundo va siempre metido en un margen de dos o tres puntos y
 * las seis líneas saldrían amontonadas en un dedo de alto. Por puestos, cada
 * uno tiene su carril y se ven los adelantamientos, que es lo que se quiere
 * mirar. La cifra de puntos va escrita en cada nodo para no perderla.
 *
 * Devuelve `null` si todavía no se ha jugado ninguna jornada: una sola columna
 * no cuenta nada.
 */
export async function getGraficoClasificacion(
  competitionId: string,
): Promise<GraficoClasificacion | null> {
  const [competition, participantes, jornadas, entradas, muertes, retos] =
    await Promise.all([
      prisma.competition.findUnique({
        where: { id: competitionId },
        select: { startingPoints: true, challengeDiffCounts: true },
      }),
      getParticipants(competitionId),
      prisma.matchday.findMany({
        where: { competitionId },
        orderBy: { position: "asc" },
        select: {
          id: true,
          label: true,
          playedAt: true,
          matches: {
            select: {
              id: true,
              winnerId: true,
              pokemonDiff: true,
              participantAId: true,
              participantBId: true,
              playedAt: true,
            },
          },
        },
      }),
      prisma.pointEntry.findMany({
        where: { competitionId },
        select: {
          participantId: true,
          delta: true,
          createdAt: true,
          sourceMatchId: true,
        },
      }),
      prisma.death.findMany({
        where: { participant: { competitionId } },
        select: { participantId: true, diedAt: true },
      }),
      prisma.challengeMatch.findMany({
        where: { competitionId, winnerId: { not: null } },
        select: {
          participantAId: true,
          participantBId: true,
          winnerId: true,
          pokemonDiff: true,
          playedAt: true,
        },
      }),
    ]);

  const startingPoints = competition?.startingPoints ?? 0;
  const retosCuentan = competition?.challengeDiffCounts ?? false;

  // Solo las jornadas con algún resultado: una jornada vacía es un tramo plano
  // que no cuenta nada
  const jugadas = jornadas.filter((jornada) =>
    jornada.matches.some((combate) => combate.winnerId),
  );
  if (!participantes.length || !jugadas.length) return null;

  /**
   * Hasta cuándo llega cada jornada. Hace falta para repartir lo que no está
   * enlazado a un combate —las muertes y los ajustes de puntos a mano—, que
   * solo tienen fecha. Se mira la fecha de la jornada, la de sus combates y,
   * como último recurso, cuándo se apuntaron sus puntos: eso siempre existe si
   * hay resultado. Y nunca puede ir hacia atrás respecto a la anterior.
   */
  const puntosDeCombate = new Map(
    entradas
      .filter((entrada) => entrada.sourceMatchId)
      .map((entrada) => [entrada.sourceMatchId!, entrada.createdAt]),
  );

  let anterior = new Date(0);
  const cortes: Date[] = jugadas.map((jornada) => {
    const candidatas = [
      jornada.playedAt,
      ...jornada.matches.map((combate) => combate.playedAt),
      ...jornada.matches.map((combate) => puntosDeCombate.get(combate.id) ?? null),
    ].filter((fecha): fecha is Date => Boolean(fecha));

    const propia = candidatas.length
      ? new Date(Math.max(...candidatas.map((fecha) => fecha.getTime())))
      : anterior;
    const corte = propia > anterior ? propia : anterior;
    anterior = corte;
    return corte;
  });

  /**
   * **El último corte es "ahora", no la fecha de la última jornada.**
   *
   * Todo lo que pasa después de la última jornada —los ajustes de puntos a
   * mano, las bajas que se apuntan más tarde— tiene fecha posterior a ese
   * corte, así que se quedaba fuera del gráfico entero: la última columna decía
   * una cosa y la tabla de al lado, otra. La última foto es la de ahora mismo,
   * y tiene que cuadrar con la clasificación.
   */
  cortes[cortes.length - 1] = new Date();

  /** Los combates de cada jornada, acumulados desde la primera. */
  const idsHasta = jugadas.map((_, indice) =>
    new Set(
      jugadas
        .slice(0, indice + 1)
        .flatMap((jornada) => jornada.matches.map((combate) => combate.id)),
    ),
  );

  const foto = (indice: number): Corte[] => {
    // El inicio: todos con los puntos de salida, sin muertes ni diferencia
    if (indice < 0) {
      return participantes.map((jugador) => ({
        participantId: jugador.id,
        puntos: startingPoints,
        muertes: 0,
        diff: 0,
      }));
    }

    const corte = cortes[indice];
    const combatesContados = idsHasta[indice];

    const puntos = new Map(
      participantes.map((jugador) => [jugador.id, startingPoints]),
    );
    for (const entrada of entradas) {
      const cuenta = entrada.sourceMatchId
        ? combatesContados.has(entrada.sourceMatchId)
        : entrada.createdAt <= corte;
      if (!cuenta) continue;
      puntos.set(
        entrada.participantId,
        (puntos.get(entrada.participantId) ?? startingPoints) + entrada.delta,
      );
    }

    const muertos = new Map(participantes.map((jugador) => [jugador.id, 0]));
    for (const baja of muertes) {
      if (baja.diedAt > corte) continue;
      muertos.set(baja.participantId, (muertos.get(baja.participantId) ?? 0) + 1);
    }

    const diferencias = new Map(participantes.map((jugador) => [jugador.id, 0]));
    const sumarDiferencia = (combate: {
      participantAId: string;
      participantBId: string;
      winnerId: string | null;
      pokemonDiff: number | null;
    }) => {
      if (!combate.winnerId) return;
      const perdedorId =
        combate.winnerId === combate.participantAId
          ? combate.participantBId
          : combate.participantAId;
      const diff = combate.pokemonDiff ?? 0;
      diferencias.set(combate.winnerId, (diferencias.get(combate.winnerId) ?? 0) + diff);
      diferencias.set(perdedorId, (diferencias.get(perdedorId) ?? 0) - diff);
    };

    for (const jornada of jugadas) {
      for (const combate of jornada.matches) {
        if (combatesContados.has(combate.id)) sumarDiferencia(combate);
      }
    }
    if (retosCuentan) {
      for (const reto of retos) {
        // Sin fecha cuenta igual: la clasificación tampoco mira la fecha de los
        // retos, y si no cuadraran las dos cifras no se parecerían
        if (reto.playedAt && reto.playedAt > corte) continue;
        sumarDiferencia(reto);
      }
    }

    return participantes.map((jugador) => ({
      participantId: jugador.id,
      puntos: puntos.get(jugador.id) ?? startingPoints,
      muertes: muertos.get(jugador.id) ?? 0,
      diff: diferencias.get(jugador.id) ?? 0,
    }));
  };

  /**
   * De la foto a los carriles. El orden es el mismo de la clasificación
   * (puntos → menos muertos → mejor diferencia) pero **sin desempatar por
   * nombre**: los que van de verdad igualados comparten carril, y ese carril es
   * el centro de los puestos que ocupan entre todos.
   */
  const aNodos = (corte: Corte[]): NodoDelGrafico[] => {
    const ordenados = [...corte].sort(
      (a, b) => b.puntos - a.puntos || a.muertes - b.muertes || b.diff - a.diff,
    );
    const igualados = (a: Corte, b: Corte) =>
      a.puntos === b.puntos && a.muertes === b.muertes && a.diff === b.diff;

    const nodos: NodoDelGrafico[] = [];
    let inicio = 0;
    while (inicio < ordenados.length) {
      let fin = inicio;
      while (fin + 1 < ordenados.length && igualados(ordenados[inicio], ordenados[fin + 1])) {
        fin += 1;
      }
      // Los índices van de 0; los puestos y los carriles, de 1
      const carril = (inicio + fin) / 2 + 1;
      for (let i = inicio; i <= fin; i++) {
        nodos.push({
          participantId: ordenados[i].participantId,
          puesto: inicio + 1,
          carril,
          puntos: ordenados[i].puntos,
          muertes: ordenados[i].muertes,
          diff: ordenados[i].diff,
        });
      }
      inicio = fin + 1;
    }
    return nodos;
  };

  /** Las fotos, una sola vez: las dos gráficas salen de las mismas cuentas. */
  const fotos = [foto(-1), ...jugadas.map((_, indice) => foto(indice))];
  const etiquetaDe = (etapa: number) =>
    etapa === 0 ? "Inicio" : `J${etapa}`;

  /**
   * En qué etapa deja de contar cada uno que se fue.
   *
   * Es **la jornada en la que se va**, no la siguiente: si se retira jugándose
   * la tercera, en la tercera ya no está. Se busca la primera jornada que
   * termina después de su fecha de salida, que es la que se estaba jugando
   * cuando lo dejó. Y como el último corte es "ahora" (ver arriba), quien se va
   * después de la última jornada cae en esa última columna.
   */
  const salidaEnEtapa = new Map<string, number>();
  for (const jugador of participantes) {
    if (!jugador.retiredAt) continue;
    const cuando = jugador.retiredAt;
    const indice = cortes.findIndex((corte) => corte >= cuando);
    salidaEnEtapa.set(jugador.id, (indice === -1 ? cortes.length - 1 : indice) + 1);
  }

  const etapas: EtapaDelGrafico[] = fotos.map((corte, etapa) => ({
    etiqueta: etiquetaDe(etapa),
    titulo: etapa === 0 ? "Antes de empezar" : jugadas[etapa - 1].label,
    nodos: aNodos(corte),
  }));

  /**
   * La otra: en cada etapa se quedan solo los que seguían jugando entonces. Al
   * caerse uno, los de abajo suben de puesto **en esa misma columna**, que es
   * justo lo que se quiere mirar.
   */
  const etapasDeLosQueSiguen = salidaEnEtapa.size
    ? fotos.map((corte, etapa) => ({
        etiqueta: etiquetaDe(etapa),
        titulo: etapa === 0 ? "Antes de empezar" : jugadas[etapa - 1].label,
        nodos: aNodos(
          corte.filter(
            (fila) =>
              (salidaEnEtapa.get(fila.participantId) ?? Infinity) > etapa,
          ),
        ),
      }))
    : null;

  return {
    etapas,
    etapasDeLosQueSiguen,
    // Por orden de marcha, que es como se cuenta: primero el que se fue antes
    salidas: participantes
      .filter((jugador) => salidaEnEtapa.has(jugador.id))
      .sort((a, b) => salidaEnEtapa.get(a.id)! - salidaEnEtapa.get(b.id)!)
      .map((jugador) => ({
        participantId: jugador.id,
        etiqueta: etiquetaDe(salidaEnEtapa.get(jugador.id)!),
        motivo: jugador.motivoDeSalida,
      })),
    jugadores: participantes.map((jugador) => ({
      participantId: jugador.id,
      displayName: jugador.displayName,
      color: jugador.color,
      avatarImage: jugador.user.avatarImage,
    })),
  };
}
