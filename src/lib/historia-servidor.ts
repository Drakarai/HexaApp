import "server-only";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { puedeVerLocke } from "@/lib/acceso";
import { getMvpStates } from "@/lib/mvp";
import { getFormatoFinal, NOMBRE_POR_DEFECTO } from "@/lib/final-four";
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
    competition: { select: { estilo: true } },
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
            matchday: { select: { id: true, label: true, playedAt: true } },
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
  const quien = laCaptura ?? baja ?? entrada!;
  const laBaja =
    baja ??
    (laCaptura?.deathId
      ? await prisma.death.findUnique({
          where: { id: laCaptura.deathId },
          include: { zone: { select: { name: true } } },
        })
      : null);

  const suyos = equipos.filter((mp) => esElMismo(mp, quien));
  const sucesos: Suceso[] = [];

  // Lo de la caja, solo si se puede ver
  if (laCaptura) {
    const guardados = leerHistoria(laCaptura.historia);
    const evoluciones = guardados.flatMap((s) => (s.tipo === "evoluciona" ? [s] : []));
    // Shiny desde la captura: si lo fuera por un premio, saldría su suceso aparte
    const nacioShiny = laCaptura.shiny && !guardados.some((s) => s.tipo === "shiny");
    const sitio = laCaptura.zone?.name ?? laCaptura.sitio;
    sucesos.push({
      tipo: "captura",
      texto: sitio ? `Capturado en ${sitio}` : "Capturado",
      detalle:
        [
          nacioShiny ? "shiny" : null,
          evoluciones.length ? `era un ${evoluciones[0].de}` : null,
          // Lo apuntado al capturarlo: «huevo de regalo» es parte de su historia
          laCaptura.notes,
        ]
          .filter(Boolean)
          .join(" · ")
          .replace(/^./, (l) => l.toUpperCase()) || null,
      fecha: laCaptura.createdAt.toISOString(),
    });
    for (const suceso of guardados) {
      sucesos.push(
        suceso.tipo === "evoluciona"
          ? { tipo: "evoluciona", texto: `Evolucionó en ${suceso.a}`, fecha: suceso.fecha }
          : { tipo: "shiny", texto: "Se volvió shiny", fecha: suceso.fecha },
      );
    }
  }

  const resultado = (ganador: string | null | undefined) =>
    ganador ? ganador === participantId : null;
  const rotuloDe = (gano: boolean | null) =>
    gano === null ? "Por jugar" : gano ? "Victoria" : "Derrota";

  const fechaDe = new Map<string, string | null>();
  for (const mp of suyos) {
    if (mp.match) {
      const m = mp.match;
      const rival = m.participantAId === participantId ? m.participantB : m.participantA;
      const gano = resultado(m.winnerId);
      const fecha = (m.playedAt ?? m.matchday.playedAt)?.toISOString() ?? null;
      fechaDe.set(mp.id, fecha);
      sucesos.push({
        tipo: "jornada",
        texto: `${m.matchday.label} contra ${rival.displayName}`,
        detalle: rotuloDe(gano),
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

  if (laBaja) {
    const sitio = laBaja.zone?.name ?? laBaja.location;
    sucesos.push({
      tipo: "caida",
      texto: sitio ? `Cayó en ${sitio}` : "Cayó",
      detalle: [laBaja.cause, laBaja.level ? `Nv. ${laBaja.level}` : null].filter(Boolean).join(" · ") || null,
      fecha: laBaja.diedAt.toISOString(),
    });
  }

  const ordenados = ordenarSucesos(sucesos);
  const desde = laCaptura ? laCaptura.createdAt.toISOString() : null;
  const hasta = laBaja?.diedAt.toISOString() ?? enElHall?.createdAt.toISOString() ?? new Date().toISOString();
  return {
    sucesos: ordenados,
    cifras: cifrasDeLaHistoria(ordenados, desde, hasta),
    conLaCaja: Boolean(laCaptura),
    cajaAjena: !veLaCaja,
  };
}
