/**
 * Datos de ejemplo: reproduce el "Hexalocke 2" del PDF para que la aplicación
 * arranque con algo real dentro. Todo es editable desde la propia app, así que
 * sirve igual como plantilla para futuras ediciones.
 *
 * Ejecutar con: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  SAMPLE_COMPETITION,
  SAMPLE_LEVEL_CAPS,
  SAMPLE_MATCHDAYS,
  SAMPLE_ROULETTES,
  SAMPLE_RULES,
} from "../src/lib/sample-data";

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
    where: { slug: SAMPLE_COMPETITION.slug },
  });
  if (existing) {
    console.log("El seed ya se había ejecutado (existe hexalocke-2). Nada que hacer.");
    return;
  }

  const competition = await prisma.competition.create({
    data: {
      ...SAMPLE_COMPETITION,
      startedAt: new Date("2026-06-16"),
      createdById: admin.id,
      rules: {
        create: SAMPLE_RULES.map((rule, index) => ({
          title: rule.title,
          body: rule.body,
          category: rule.category,
          position: index + 1,
        })),
      },
      levelCaps: {
        create: SAMPLE_LEVEL_CAPS.map((levelCap, index) => ({
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

  for (const [index, matchday] of SAMPLE_MATCHDAYS.entries()) {
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
  for (const roulette of SAMPLE_ROULETTES) {
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
