/**
 * Datos de ejemplo: reproduce el "Hexalocke 2" del PDF para que la aplicación
 * arranque con algo real dentro. Todo es editable desde la propia app, así que
 * sirve igual como plantilla para futuras ediciones.
 *
 * Ejecutar con: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD ?? "hexalocke";

const PLAYERS = [
  { username: "draka", displayName: "Draka", version: "SoulSilver", color: "#8b5cf6", admin: true },
  { username: "pablo", displayName: "Pablo", version: "SoulSilver", color: "#ef4444", admin: true },
  { username: "hector", displayName: "Héctor", version: "SoulSilver", color: "#22c55e", admin: false },
  { username: "rodri", displayName: "Rodri", version: "HeartGold", color: "#eab308", admin: false },
  { username: "enzo", displayName: "Enzo", version: "HeartGold", color: "#3b82f6", admin: false },
  { username: "alex", displayName: "Álex", version: "HeartGold", color: "#ec4899", admin: false },
];

const RULES = [
  {
    category: "Modalidad",
    title: "Modalidad y juego",
    body: [
      "- El locke es de modalidad **random**: pokémon de ruta (con movimientos y habilidades aleatorios) y también los entrenadores normales e importantes (líderes, Alto Mando, rivales…).",
      "- Se juega la **2ª generación**, remake de DS (HeartGold y SoulSilver).",
      "- Ediciones por participante: HeartGold para Rodri, Enzo y Álex; SoulSilver para Héctor, Pablo y Draka.",
    ].join("\n"),
  },
  {
    category: "Modalidad",
    title: "Reglas básicas de locke",
    body: [
      "- Se puede capturar **un pokémon por ruta**. Si se escapa, lo matas o se inmola, te lo pierdes.",
      "- Si es **shiny** se puede capturar aunque ya tengas el encuentro de esa zona.",
      "- Si sale el mismo pokémon o uno de su misma rama evolutiva no se puede capturar, salvo que tenga forma alterna o rama distinta. Si el tuyo está muerto, sí puedes capturarlo en cualquier forma o etapa.",
      "- **Todos los pokémon llevan mote**. Sin mote no se pueden usar.",
      "- El locke no empieza hasta hacer el tutorial de captura y recibir pokéballs.",
      "- Si un pokémon muere, **muere de verdad**: se deja en una caja específica (normalmente la 8, llamada MUERTOS).",
      "- Los pokémon estáticos o de evento cuentan como captura extra, siempre que sean eventos diferentes.",
      "- Hay que mantener al equipo **al level cap** del siguiente gimnasio hasta superarlo.",
      "- No se sigue jugando hasta que todos hayan pasado el gimnasio correspondiente.",
      "- Saltarse estas reglas se considera hacer trampas.",
    ].join("\n"),
  },
  {
    category: "Añadidos del Hexalocke",
    title: "Añadidos a las reglas generales",
    body: [
      "- Cada combate de gimnasio **se graba** y se envía al grupo para comprobar que no hay trampas.",
      "- Si se pilla a alguien haciendo algo ilegal habrá **juicio**: se expone el caso y se decide un castigo.",
      "- Cada 2 gimnasios hay una **jornada** estilo liga deportiva: 5 jornadas en total (2ª, 4ª, 6ª, 8ª medalla y Liga Pokémon).",
      "- Todos los entrenadores importantes tienen 6 pokémon y se juega en **combates fijos**.",
      "- Los entrenadores llevan movesets con sinergias con la habilidad y objetos en todos sus pokémon.",
      "- Los entrenadores tienen pokémon a etapa final a partir del nivel 35. Los iniciales son de 1ª etapa con 2 evoluciones.",
    ].join("\n"),
  },
  {
    category: "Añadidos del Hexalocke",
    title: "Jornadas",
    body: [
      "- En cada jornada hay **1 combate por pareja**, 3 combates por jornada.",
      "- El orden se decide al principio del locke para que no haya líos.",
      "- Se rota siempre de rival: no se puede repetir enfrentamiento en otra jornada.",
    ].join("\n"),
  },
  {
    category: "Añadidos del Hexalocke",
    title: "Puntos y clasificación",
    body: [
      "- El locke va **a puntos**: todos empiezan con **5 puntos**.",
      "- En las jornadas los ganadores se llevan **1 punto**. Los perdedores no ganan nada.",
      "- Hay clasificación global: primero va quien más puntos tenga.",
      "- Desempates: primero **pokémon muertos**, y si sigue el empate, **diferencia de pokémon** en los combates de jornada.",
      "- La clasificación decide la **Final Four**: los 2 primeros se clasifican directos y del 3º al 6º pelean por las otras 2 plazas. La Final Four es un torneo y quien la gane es el ganador oficial.",
    ].join("\n"),
  },
  {
    category: "Aspectos importantes",
    title: "Mejoras de calidad de vida",
    body: [
      "- Las evoluciones por intercambio pasan a ser **por nivel**, y en general los pokémon evolucionan antes (como máximo full evolved a nivel 40).",
      "- Las evoluciones por amistad necesitan 160 puntos en vez de 220.",
      "- Las evoluciones diurnas y nocturnas pasan a ser **por piedras**.",
      "- Los objetos del suelo y los de la habilidad Recogida son **random**.",
      "- Todos los pokémon tienen 4 movimientos de base, aunque estén a nivel 1.",
      "- Potencia de movimientos y estadísticas base actualizadas a **9ª generación**, además de la tabla de tipos (Fantasma y Siniestro son neutros contra Acero).",
      "- El ratio de captura está duplicado.",
    ].join("\n"),
  },
  {
    category: "Aspectos importantes",
    title: "Recompensas y combates entre jornadas",
    body: [
      "- Se pueden hacer combates entre jornadas **apostando** algo: capturas, objetos, limitaciones en la partida del rival o incluso puntos.",
      "- Los límites de cada apuesta se deciden o se someten a **votación**: si hay mayoría, el combate se hace.",
      "- En cada jornada se mira la tabla global y se reparten recompensas según el puesto.",
    ].join("\n"),
  },
];

const LEVEL_CAPS = [
  { label: "Pegaso", cap: 13, kind: "GYM", badge: "Ciudad Malva" },
  { label: "Antón", cap: 17, kind: "GYM", badge: "Ciudad Azalea" },
  { label: "Blanca", cap: 19, kind: "GYM", badge: "Ciudad Iris" },
  { label: "Morti", cap: 25, kind: "GYM", badge: "Pueblo Ecruteak" },
  { label: "Aníbal", cap: 31, kind: "GYM", badge: "Ciudad Olivo" },
  { label: "Yasmina", cap: 35, kind: "GYM", badge: "Ciudad Trigal" },
  { label: "Fredo", cap: 36, kind: "GYM", badge: "Pueblo Caña" },
  { label: "Débora", cap: 41, kind: "GYM", badge: "Ciudad Endrino" },
  {
    label: "Alto Mando",
    cap: 50,
    kind: "ELITE_FOUR",
    notes: "Pendiente de decidir: level cap por cada miembro o directamente el del campeón.",
  },
  { label: "Liga Pokémon", cap: 50, kind: "CHAMPION" },
];

// Parejas del PDF: cada jugador se enfrenta a uno distinto en cada jornada
const MATCHDAYS = [
  { label: "Jornada 1", milestone: "2ª medalla", pairs: [["alex", "pablo"], ["draka", "rodri"], ["hector", "enzo"]] },
  { label: "Jornada 2", milestone: "4ª medalla", pairs: [["alex", "rodri"], ["enzo", "pablo"], ["draka", "hector"]] },
  { label: "Jornada 3", milestone: "6ª medalla", pairs: [["alex", "enzo"], ["hector", "rodri"], ["draka", "pablo"]] },
  { label: "Jornada 4", milestone: "8ª medalla", pairs: [["alex", "hector"], ["draka", "enzo"], ["rodri", "pablo"]] },
  { label: "Jornada 5", milestone: "Endgame", pairs: [["alex", "draka"], ["hector", "pablo"], ["enzo", "rodri"]] },
];

const ROULETTES = [
  {
    name: "Castigos de la jornada",
    description: "Para el que pierde su combate de jornada.",
    allowRepeats: true,
    options: [
      { label: "Monotipo la próxima ruta", weight: 1 },
      { label: "Sin objetos en el próximo gimnasio", weight: 1 },
      { label: "Liberar un pokémon de la caja", weight: 1 },
      { label: "Nivel del equipo -2 en el próximo combate", weight: 1 },
      { label: "Te salvas", weight: 2 },
    ],
  },
  {
    name: "Recompensas del líder",
    description: "Premios para quien va primero en la tabla global.",
    allowRepeats: true,
    options: [
      { label: "Captura extra en la siguiente ruta", weight: 2 },
      { label: "Elegir el objeto de un rival", weight: 1 },
      { label: "+1 punto", weight: 1 },
      { label: "Revivir un pokémon de la caja MUERTOS", weight: 1 },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      displayName: "Administrador",
      passwordHash,
      role: "ADMIN",
      avatarColor: "#6366f1",
    },
  });

  const users = new Map<string, string>();
  for (const player of PLAYERS) {
    const user = await prisma.user.upsert({
      where: { username: player.username },
      update: {},
      create: {
        username: player.username,
        displayName: player.displayName,
        passwordHash,
        role: player.admin ? "ADMIN" : "PLAYER",
        avatarColor: player.color,
      },
    });
    users.set(player.username, user.id);
  }

  const existing = await prisma.competition.findUnique({
    where: { slug: "hexalocke-2" },
  });
  if (existing) {
    console.log("El seed ya se había ejecutado (existe hexalocke-2). Nada que hacer.");
    return;
  }

  const competition = await prisma.competition.create({
    data: {
      name: "Hexalocke 2",
      slug: "hexalocke-2",
      game: "Pokémon HeartGold y SoulSilver",
      modality: "Random",
      description:
        "Segunda edición del Hexalocke. Seis jugadores, level caps por gimnasio, 5 jornadas y Final Four.",
      startingPoints: 5,
      maxPlayers: 6,
      startedAt: new Date("2026-06-16"),
      createdById: admin.id,
      rules: {
        create: RULES.map((rule, index) => ({
          title: rule.title,
          body: rule.body,
          category: rule.category,
          position: index + 1,
        })),
      },
      levelCaps: {
        create: LEVEL_CAPS.map((levelCap, index) => ({
          label: levelCap.label,
          cap: levelCap.cap,
          kind: levelCap.kind,
          badge: levelCap.badge ?? null,
          notes: levelCap.notes ?? null,
          position: index + 1,
        })),
      },
    },
  });

  const participants = new Map<string, string>();
  for (const player of PLAYERS) {
    const participant = await prisma.participant.create({
      data: {
        competitionId: competition.id,
        userId: users.get(player.username)!,
        displayName: player.displayName,
        gameVersion: player.version,
        color: player.color,
        isAdmin: player.admin,
      },
    });
    participants.set(player.username, participant.id);
  }

  for (const [index, matchday] of MATCHDAYS.entries()) {
    await prisma.matchday.create({
      data: {
        competitionId: competition.id,
        label: matchday.label,
        milestone: matchday.milestone,
        position: index + 1,
        pointsForWin: 1,
        matches: {
          create: matchday.pairs.map(([a, b], matchIndex) => ({
            participantAId: participants.get(a)!,
            participantBId: participants.get(b)!,
            position: matchIndex,
          })),
        },
      },
    });
  }

  const palette = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6"];
  for (const roulette of ROULETTES) {
    await prisma.roulette.create({
      data: {
        competitionId: competition.id,
        name: roulette.name,
        description: roulette.description,
        allowRepeats: roulette.allowRepeats,
        options: {
          create: roulette.options.map((option, index) => ({
            label: option.label,
            weight: option.weight,
            color: palette[index % palette.length],
            position: index,
          })),
        },
      },
    });
  }

  console.log(`
Seed completado.

  Competición: ${competition.name}
  Usuarios:    admin, ${PLAYERS.map((player) => player.username).join(", ")}
  Contraseña:  ${PASSWORD}

Cambia las contraseñas desde Administración antes de usarlo en serio.
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
