/**
 * Piezas para montar casos de prueba sin base de datos: fichas de la
 * clasificación, combates y marcadores inventados.
 */
import type { StandingRow } from "@/lib/competition";

/** Una fila de la clasificación con lo justo; el resto, lo de por defecto. */
export function fila(participantId: string, cambios: Partial<StandingRow> = {}): StandingRow {
  return {
    participantId,
    userId: `u-${participantId}`,
    displayName: participantId,
    gameVersion: null,
    color: "#6366f1",
    avatarImage: null,
    isAdmin: false,
    ace: { species: null, nickname: null, reason: null, image: null, detailImage: null },
    points: 5,
    deaths: 0,
    wins: 0,
    losses: 0,
    played: 0,
    pokemonDiff: 0,
    position: 0,
    retirado: false,
    retiredAt: null,
    motivoDeSalida: null,
    wipeos: 0,
    title: null,
    ...cambios,
  } as StandingRow;
}

/** Un combate entre dos, con ganador o sin él. */
export function combate(a: string, b: string, ganador: string | null = null, extra = {}) {
  return {
    id: `${a}-${b}-${Math.random().toString(36).slice(2, 7)}`,
    participantAId: a,
    participantBId: b,
    winnerId: ganador,
    excepcion: false,
    pokemonDiff: ganador ? 2 : null,
    ...extra,
  };
}

/** Una jornada de dualocke al mejor de tres, con quién ganó cada combate. */
export function jornadaDual(numero: number, ...ganadores: (string | null)[]) {
  return {
    id: `j${numero}`,
    label: `Jornada ${numero}`,
    milestone: null,
    matches: ganadores.map((winnerId) => ({ winnerId })),
  };
}

export const DRAKA = { id: "draka", displayName: "Draka", color: "#f00", avatarImage: null };
export const PABLO = { id: "pablo", displayName: "Pablo", color: "#00f", avatarImage: null };
