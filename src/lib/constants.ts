/**
 * El papel de una **cuenta** en toda la aplicación. Solo hay dos.
 *
 * - **CREADOR**: quien lleva la aplicación. Lo ve y lo toca todo: los mapas,
 *   las plantillas, el catálogo de objetos, las copias, las cuentas y todos los
 *   lockes.
 * - **PLAYER**: todos los demás.
 *
 * **Administrador ya no es un papel de cuenta, sino de locke**: se es
 * administrador *de una edición concreta* (`Participant.isAdmin`), y eso da
 * mando dentro de ella y en nada más. Ver `lib/auth.ts`.
 */
export const ROLES = {
  CREADOR: "CREADOR",
  PLAYER: "PLAYER",
  /**
   * Como se llamaba el Creador antes. Las cuentas que ya estaban lo tienen
   * escrito así y se sigue leyendo igual, para no dejar a nadie fuera de su
   * propia aplicación por un cambio de nombre.
   */
  ADMIN_ANTIGUO: "ADMIN",
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
