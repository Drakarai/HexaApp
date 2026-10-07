"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant } from "@/lib/competition";
import { esPokemonAnil, GENERACION_ANIL } from "@/lib/anil";
import { generacionDeTipos } from "@/lib/juegos";
import { leerHistoria } from "@/lib/historia";
import { findSpecies } from "@/lib/pokedex";
import {
  frasesDeSuEspecie,
  frasesDeSusTipos,
  frasesDelLocke,
  GENERICAS,
} from "@/lib/frases-del-companero";

/** Lo que pasó hace más de esto ya no se comenta */
const DIAS_DE_NOTICIA = { victoria: 3, baja: 7, evolucion: 3 };
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000);

export type FrasesDelCompanero = {
  /** Con {n} donde va su nombre: lo pone el navegador */
  locke: string[];
  especie: string[];
  tipo: string[];
  generica: string[];
};

/**
 * Las frases del compañero de quien mira (ver lib/frases-del-companero.ts).
 * Se piden **la primera vez que se le toca**, no al cargar cada pantalla: así
 * lo del locke (el próximo rival, la última baja…) no cuesta nada a quien no
 * juega con él. Solo las de su as, y solo de su locke.
 */
export async function frasesDelCompaneroAction(): Promise<FrasesDelCompanero | null> {
  const user = await requireUser();
  const competicion = await getActiveCompetition();
  if (!competicion) return null;
  const yo = await getMyParticipant(competicion.id, user.id);
  if (!yo?.aceSpecies) return null;

  const [as, proximo, gimnasios, superados, victoria, baja] = await Promise.all([
    // Los ases de antes no tienen captura: de esos, solo lo que dice su especie
    prisma.capture.findUnique({
      where: { id: yo.aceCaptureId ?? "" },
      select: { pokemonId: true, species: true, shiny: true, createdAt: true, historia: true, deathId: true },
    }),
    prisma.match.findFirst({
      where: {
        winnerId: null,
        porRetirada: false,
        OR: [{ participantAId: yo.id }, { participantBId: yo.id }],
      },
      orderBy: [{ matchday: { position: "asc" } }, { position: "asc" }],
      select: {
        participantAId: true,
        participantA: { select: { displayName: true } },
        participantB: { select: { displayName: true } },
      },
    }),
    prisma.levelCap.findMany({
      where: { competitionId: competicion.id },
      orderBy: { position: "asc" },
      select: { id: true, label: true, cap: true },
    }),
    prisma.gymClear.findMany({ where: { participantId: yo.id }, select: { levelCapId: true } }),
    prisma.match.findFirst({
      where: { winnerId: yo.id, playedAt: { gte: hace(DIAS_DE_NOTICIA.victoria) } },
      orderBy: { playedAt: "desc" },
      select: {
        participantAId: true,
        participantA: { select: { displayName: true } },
        participantB: { select: { displayName: true } },
      },
    }),
    prisma.death.findFirst({
      where: { participantId: yo.id, revividoEl: null, createdAt: { gte: hace(DIAS_DE_NOTICIA.baja) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, species: true, nickname: true },
    }),
  ]);
  const pokemonId = as?.pokemonId ?? findSpecies(yo.aceSpecies, esPokemonAnil(competicion))?.dex;
  if (!pokemonId) return null;

  const rival = (m: typeof proximo) =>
    m ? (m.participantAId === yo.id ? m.participantB : m.participantA).displayName : null;
  const pasados = new Set(superados.map((s) => s.levelCapId));
  const siguiente = gimnasios.find((g) => !pasados.has(g.id));
  const evolucion = leerHistoria(as?.historia).findLast((s) => s.tipo === "evoluciona");
  const generacion = generacionDeTipos(competicion) ?? 9;

  return {
    locke: frasesDelLocke({
      proximoRival: rival(proximo),
      proximoGimnasio: siguiente ? { nombre: siguiente.label, cap: siguiente.cap } : null,
      victoriaContra: rival(victoria),
      // La suya no: de esa ya se encarga el lazo
      bajaReciente: baja && baja.id !== as?.deathId ? baja.nickname || baja.species : null,
      dias: as ? Math.floor((Date.now() - as.createdAt.getTime()) / 86_400_000) : null,
      shiny: as?.shiny ?? false,
      recienEvolucionado: Boolean(evolucion && new Date(evolucion.fecha) >= hace(DIAS_DE_NOTICIA.evolucion)),
    }),
    especie: frasesDeSuEspecie(pokemonId, as?.species ?? yo.aceSpecies),
    tipo: frasesDeSusTipos(pokemonId, esPokemonAnil(competicion) ? GENERACION_ANIL : generacion),
    generica: GENERICAS,
  };
}
