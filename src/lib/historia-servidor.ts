import "server-only";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { puedeVerLocke } from "@/lib/acceso";
import { getMvpStates } from "@/lib/mvp";
import { getFormatoFinal, NOMBRE_POR_DEFECTO } from "@/lib/final-four";
import { alMejorDeDeLaJornada, perfilDeLocke } from "@/lib/perfiles-de-locke";
import { ganadorDeLaJornada } from "@/lib/marcador";
import {
  cifrasDeLaHistoria,
  esElMismo,
  leerHistoria,
  ordenarSucesos,
  type Suceso,
} from "@/lib/historia";

export type DeQuienEsLaHistoria =
  | { tipo: "captura"; id: string }
  | { tipo: "baja"; id: string }
  | { tipo: "hall"; id: string };

export type Historia = {
  sucesos: Suceso[];
  cifras: ReturnType<typeof cifrasDeLaHistoria>;
  /**
   * Si lleva lo de la caja (dónde se capturó y sus evoluciones). Fuera de un
   * Soul Link la caja es privada, así que en el cementerio o el hall de otro
   * solo sale lo que ya es público: combates, MVP, hall y caída.
   */
  conLaCaja: boolean;
  /** Si quien mira no puede ver la caja de su dueño, para decírselo */
  cajaAjena: boolean;
};

const DEL_JUGADOR = {
  select: {
    id: true,
    userId: true,
    competitionId: true,
    competition: { select: { estilo: true, maxPlayers: true } },
  },
} as const;

const CAPTURA = {
  id: true,
  species: true,
  nickname: true,
  pokemonId: true,
  sitio: true,
  notes: true,
  historia: true,
  shiny: true,
  createdAt: true,
  deathId: true,
  zone: { select: { name: true } },
} as const;

/**
 * La historia de un pokémon, se llegue desde donde se llegue: su captura del
 * Equipo y PC, su baja del cementerio o su casilla del hall. Las cuentas de
 * quién es quién están en lib/historia.ts.
 */
export async function getHistoria(de: DeQuienEsLaHistoria): Promise<Historia> {
  const user = await requireUser();

  // Primero, quién es y de quién: todo lo demás se pide por su dueño
  const [captura, baja, entrada] = await Promise.all([
    de.tipo === "captura"
      ? prisma.capture.findUnique({
          where: { id: de.id },
          select: { ...CAPTURA, failed: true, participant: DEL_JUGADOR },
        })
      : null,
    de.tipo === "baja"
      ? prisma.death.findUnique({
          where: { id: de.id },
          include: {
            zone: { select: { name: true } },
            participant: DEL_JUGADOR,
            capturas: { select: CAPTURA, take: 1 },
          },
        })
      : null,
    de.tipo === "hall"
      ? prisma.hallOfFameEntry.findUnique({
          where: { id: de.id },
          include: { participant: DEL_JUGADOR },
        })
      : null,
  ]);

  const dueno = captura?.participant ?? baja?.participant ?? entrada?.participant;
  if (!dueno || captura?.failed) throw new Error("Ese pokémon ya no está.");
  if (!(await puedeVerLocke(dueno.competitionId))) {
    throw new Error("No tienes acceso a este locke.");
  }
  const veLaCaja = dueno.competition.estilo === "soullink" || dueno.userId === user.id;
  if (de.tipo === "captura" && !veLaCaja) {
    throw new Error("El equipo y la caja son de cada uno.");
  }

  const participantId = dueno.id;
  const competitionId = dueno.competitionId;

  const [equipos, gimnasios, hall, capturas, formato] = await Promise.all([
    prisma.matchPokemon.findMany({
      where: { participantId },
      include: {
        match: {
          include: {
            matchday: {
              select: {
                id: true,
                label: true,
                playedAt: true,
                alMejorDe: true,
                // Para saber quién se llevó la serie, si la jornada es al mejor de tres
                matches: { select: { winnerId: true } },
              },
            },
            participantA: { select: { displayName: true } },
            participantB: { select: { displayName: true } },
          },
        },
        challengeMatch: {
          include: {
            participantA: { select: { displayName: true } },
            participantB: { select: { displayName: true } },
          },
        },
        levelCap: { select: { id: true, label: true } },
        royale: {
          include: {
            matchday: { select: { label: true, playedAt: true } },
            puestos: { where: { participantId }, select: { puesto: true } },
          },
        },
      },
    }),
    prisma.gymClear.findMany({ where: { participantId } }),
    prisma.hallOfFameEntry.findMany({ where: { participantId } }),
    // Desde el hall hay que encontrar su captura y su baja, si las hay
    de.tipo === "hall" && veLaCaja
      ? prisma.capture.findMany({ where: { participantId, failed: false }, select: CAPTURA })
      : [],
    getFormatoFinal(competitionId),
  ]);

  // Quién es, en limpio: lo que mejor lo identifica de lo que haya
  /**
   * La captura **solo si quien mira puede ver la caja**. Si no, ni se usa para
   * reconocerlo en las jornadas: lo de otro se busca solo con lo que ya es
   * público (su baja o su casilla del hall), y así nada de lo que ve sale de
   * una caja privada, ni siquiera de rebote.
   */
  const laCaptura = !veLaCaja
    ? null
    : (captura ??
      baja?.capturas[0] ??
      // Desde el hall, la que siga viva antes que una caída con el mismo mote
      capturas.find((c) => entrada && !c.deathId && esElMismo(c, entrada)) ??
      capturas.find((c) => entrada && esElMismo(c, entrada)) ??
      null);
  /**
   * Una baja revivida ya no tiene su captura enlazada (el pokémon volvió a la
   * caja): se la busca por su historia, que dice qué baja se le revivió.
   */
  const laCapturaDeVerdad =
    laCaptura ??
    (veLaCaja && baja?.revividoEl
      ? await prisma.capture.findFirst({
          where: {
            participantId: baja.participantId,
            failed: false,
            historia: { array_contains: [{ tipo: "revive", deathId: baja.id }] },
          },
          select: CAPTURA,
        })
      : null);
  const quien = laCapturaDeVerdad ?? baja ?? entrada!;

  // Sus bajas: la de ahora, si está caído, y las que se le revivieron (puede caer dos veces)
  const revividas = laCapturaDeVerdad
    ? leerHistoria(laCapturaDeVerdad.historia).flatMap((s) => (s.tipo === "revive" ? [s.deathId] : []))
    : [];
  const idsDeBajas = [...new Set([baja?.id, laCapturaDeVerdad?.deathId, ...revividas].filter((id): id is string => Boolean(id)))];
  const susBajas = idsDeBajas.length
    ? await prisma.death.findMany({
        where: { id: { in: idsDeBajas } },
        include: { zone: { select: { name: true } } },
      })
    : [];
  // La que manda para «hasta cuándo»: la que no se ha revivido, si la hay
  const laBaja = susBajas.find((b) => !b.revividoEl) ?? null;

  const suyos = equipos.filter((mp) => esElMismo(mp, quien));
  const sucesos: Suceso[] = [];

  // Lo de la caja, solo si se puede ver
  if (laCapturaDeVerdad) {
    const laCaptura = laCapturaDeVerdad;
    const guardados = leerHistoria(laCaptura.historia);
    // Lo que fue al principio: lo que se capturó, antes de evolucionar o de cambiarlo
    const cambios = guardados.flatMap((s) => (s.tipo === "evoluciona" || s.tipo === "intercambio" ? [s] : []));
    // Shiny desde la captura: si lo fuera por un premio, saldría su suceso aparte
    const nacioShiny = laCaptura.shiny && !guardados.some((s) => s.tipo === "shiny");
    const sitio = laCaptura.zone?.name ?? laCaptura.sitio;
    sucesos.push({
      tipo: "captura",
      texto: sitio ? `Capturado en ${sitio}` : "Capturado",
      detalle:
        [
          nacioShiny ? "shiny" : null,
          cambios.length ? `era un ${cambios[0].de}` : null,
          // Lo apuntado al capturarlo: «huevo de regalo» es parte de su historia
          laCaptura.notes,
        ]
          .filter(Boolean)
          .join(" · ")
          .replace(/^./, (l) => l.toUpperCase()) || null,
      fecha: laCaptura.createdAt.toISOString(),
    });
    // Revivir sale con su baja, más abajo: la fecha buena está en ella
    for (const suceso of guardados.filter((s) => s.tipo !== "revive")) {
      sucesos.push(
        suceso.tipo === "evoluciona"
          ? { tipo: "evoluciona", texto: `Evolucionó en ${suceso.a}`, fecha: suceso.fecha }
          : suceso.tipo === "intercambio"
            ? { tipo: "intercambio", texto: `Llegó por intercambio, a cambio de ${suceso.de}`, fecha: suceso.fecha }
            : { tipo: "shiny", texto: "Se volvió shiny", fecha: suceso.fecha },
      );
    }
  }

  const resultado = (ganador: string | null | undefined) =>
    ganador ? ganador === participantId : null;
  const rotuloDe = (gano: boolean | null) =>
    gano === null ? "Por jugar" : gano ? "Victoria" : "Derrota";

  const fechaDe = new Map<string, string | null>();
  const perfil = perfilDeLocke(dueno.competition.maxPlayers);
  // De una serie va una línea, aunque las de antes tuvieran el equipo en cada combate
  const seriesVistas = new Set<string>();
  for (const mp of suyos) {
    if (mp.match) {
      const m = mp.match;
      const rival = m.participantAId === participantId ? m.participantB : m.participantA;
      const alMejorDe = alMejorDeDeLaJornada(m.matchday.alMejorDe, perfil);
      if (alMejorDe > 1 && seriesVistas.has(m.matchday.id)) continue;
      if (alMejorDe > 1) seriesVistas.add(m.matchday.id);
      // En una serie cuenta quién se la llevó, no el combate en el que se apuntó el equipo
      const serie = alMejorDe > 1 ? ganadorDeLaJornada(m.matchday.matches) : null;
      const gano = resultado(serie ? serie.ganadorId : m.winnerId);
      const fecha = (m.playedAt ?? m.matchday.playedAt)?.toISOString() ?? null;
      fechaDe.set(mp.id, fecha);
      const mias = serie?.porJugador[participantId] ?? 0;
      const suyas = serie ? Object.entries(serie.porJugador).find(([id]) => id !== participantId)?.[1] ?? 0 : 0;
      sucesos.push({
        tipo: "jornada",
        texto: `${m.matchday.label} contra ${rival.displayName}`,
        // De una serie, también cómo quedó: «Victoria 2-1»
        detalle: serie && gano !== null ? `${rotuloDe(gano)} ${mias}-${suyas}` : rotuloDe(gano),
        fecha,
        gano,
      });
    } else if (mp.challengeMatch) {
      const r = mp.challengeMatch;
      const rival = r.participantAId === participantId ? r.participantB : r.participantA;
      const gano = resultado(r.winnerId);
      sucesos.push({
        tipo: "reto",
        texto: `Reto contra ${rival.displayName}`,
        detalle: rotuloDe(gano),
        fecha: (r.playedAt ?? r.createdAt).toISOString(),
        gano,
      });
    } else if (mp.levelCap) {
      const superado = gimnasios.find((g) => g.levelCapId === mp.levelCap!.id);
      sucesos.push({
        tipo: "gimnasio",
        texto: `Se pasó ${mp.levelCap.label}`,
        fecha: superado?.clearedAt.toISOString() ?? null,
      });
    } else if (mp.royale) {
      const puesto = mp.royale.puestos[0]?.puesto ?? null;
      sucesos.push({
        tipo: "royale",
        texto: `${mp.royale.label ?? "Battle Royale"} · ${mp.royale.matchday.label}`,
        detalle: puesto ? `Quedó ${puesto}º` : "Por jugar",
        fecha: (mp.royale.playedAt ?? mp.royale.matchday.playedAt)?.toISOString() ?? null,
        gano: puesto ? puesto === 1 : null,
      });
    } else if (mp.finalFourId) {
      sucesos.push({
        tipo: "final",
        texto: `Jugó la ${formato?.nombre ?? NOMBRE_POR_DEFECTO}`,
        fecha: null,
      });
    }
  }

  // MVP: la misma cuenta que la pantalla de jornadas, que es la que manda
  const jornadas = [...new Set(suyos.flatMap((mp) => (mp.match ? [mp.match.matchday.id] : [])))];
  if (jornadas.length) {
    const mvp = await getMvpStates(competitionId, jornadas, null);
    for (const mp of suyos) {
      if (mp.match && mvp.get(mp.match.matchday.id)?.winner?.id === mp.id) {
        sucesos.push({
          tipo: "mvp",
          texto: `MVP de la ${mp.match.matchday.label}`,
          fecha: fechaDe.get(mp.id) ?? null,
        });
      }
    }
  }

  const enElHall = entrada ?? hall.find((h) => esElMismo(h, quien));
  if (enElHall) {
    sucesos.push({ tipo: "hall", texto: "Entró en el Hall de la Fama", fecha: enElHall.createdAt.toISOString() });
  }

  // Cada caída y, si se revivió, su vuelta: las dos son públicas (salen en el cementerio)
  for (const unaBaja of susBajas) {
    const sitio = unaBaja.zone?.name ?? unaBaja.location;
    sucesos.push({
      tipo: "caida",
      texto: sitio ? `Cayó en ${sitio}` : "Cayó",
      detalle: [unaBaja.cause, unaBaja.level ? `Nv. ${unaBaja.level}` : null].filter(Boolean).join(" · ") || null,
      fecha: unaBaja.diedAt.toISOString(),
    });
    if (unaBaja.revividoEl) {
      sucesos.push({ tipo: "revive", texto: "Revivió", fecha: unaBaja.revividoEl.toISOString() });
    }
  }

  const ordenados = ordenarSucesos(sucesos);
  const desde = laCapturaDeVerdad ? laCapturaDeVerdad.createdAt.toISOString() : null;
  const hasta = laBaja?.diedAt.toISOString() ?? enElHall?.createdAt.toISOString() ?? new Date().toISOString();
  return {
    sucesos: ordenados,
    cifras: cifrasDeLaHistoria(ordenados, desde, hasta),
    conLaCaja: Boolean(laCapturaDeVerdad),
    cajaAjena: !veLaCaja,
  };
}
