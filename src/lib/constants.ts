export const ROLES = {
  ADMIN: "ADMIN",
  PLAYER: "PLAYER",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const COMPETITION_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type CompetitionStatus =
  (typeof COMPETITION_STATUS)[keyof typeof COMPETITION_STATUS];

export const LEVEL_CAP_KINDS = {
  GYM: "GYM",
  ELITE_FOUR: "ELITE_FOUR",
  CHAMPION: "CHAMPION",
  OTHER: "OTHER",
} as const;
export type LevelCapKind =
  (typeof LEVEL_CAP_KINDS)[keyof typeof LEVEL_CAP_KINDS];

export const LEVEL_CAP_KIND_LABELS: Record<string, string> = {
  GYM: "Gimnasio",
  ELITE_FOUR: "Alto Mando",
  CHAMPION: "Campeón",
  OTHER: "Otro",
};

/** Paleta por defecto para jugadores y opciones de ruleta. */
export const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#84cc16",
  "#06b6d4",
  "#f43f5e",
];

export const MAX_PLAYERS_DEFAULT = 6;
