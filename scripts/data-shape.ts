/**
 * Orden de las tablas (respeta las dependencias entre ellas) y qué columnas
 * son fechas o booleanos, que es lo único que hay que convertir al pasar de
 * SQLite a PostgreSQL.
 */
export const EXPORT_FILE = "hexaapp-export.json";

export type TableShape = {
  name: string;
  /** Nombre del modelo en Prisma, en minúscula inicial */
  model: string;
  dates: string[];
  booleans: string[];
};

export const TABLES: TableShape[] = [
  { name: "User", model: "user", dates: ["createdAt"], booleans: [] },
  {
    name: "Competition",
    model: "competition",
    dates: ["startedAt", "endedAt", "createdAt", "updatedAt"],
    booleans: [],
  },
  {
    name: "Participant",
    model: "participant",
    dates: ["joinedAt"],
    booleans: ["isAdmin"],
  },
  {
    name: "RuleSection",
    model: "ruleSection",
    dates: ["createdAt", "updatedAt"],
    booleans: [],
  },
  { name: "LevelCap", model: "levelCap", dates: [], booleans: [] },
  { name: "GymClear", model: "gymClear", dates: ["clearedAt"], booleans: [] },
  {
    name: "Death",
    model: "death",
    dates: ["diedAt", "createdAt"],
    booleans: [],
  },
  {
    name: "Note",
    model: "note",
    dates: ["createdAt", "updatedAt"],
    booleans: ["pinned"],
  },
  {
    name: "PointEntry",
    model: "pointEntry",
    dates: ["createdAt"],
    booleans: [],
  },
  { name: "Matchday", model: "matchday", dates: ["playedAt"], booleans: [] },
  { name: "Match", model: "match", dates: ["playedAt"], booleans: [] },
  {
    name: "Roulette",
    model: "roulette",
    dates: ["createdAt", "updatedAt"],
    booleans: ["allowRepeats"],
  },
  {
    name: "RouletteOption",
    model: "rouletteOption",
    dates: [],
    booleans: ["enabled"],
  },
  {
    name: "RouletteSpin",
    model: "rouletteSpin",
    dates: ["createdAt"],
    booleans: [],
  },
];
