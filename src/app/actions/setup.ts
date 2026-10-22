"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { problemaDeContrasena } from "@/lib/seguridad";
import { createSession } from "@/lib/session";
import { ROLES, PALETTE } from "@/lib/constants";
import {
  SAMPLE_COMPETITION,
  SAMPLE_LEVEL_CAPS,
  SAMPLE_ROULETTES,
  SAMPLE_RULES,
} from "@/lib/sample-data";
import type { FormState } from "@/app/actions/auth";

/**
 * Crea el primer administrador. Solo funciona mientras no exista ningún
 * usuario: en cuanto hay uno, esta pantalla deja de estar disponible.
 */
export async function createFirstAdminAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const existing = await prisma.user.count();
  if (existing > 0) {
    return {
      error: "Esta aplicación ya está instalada. Entra con tu usuario.",
    };
  }

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const withSample = formData.get("sample") === "on";

  if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
    return {
      error:
        "El usuario debe tener entre 3 y 20 caracteres: letras, números, punto, guion o guion bajo.",
    };
  }
  if (!displayName) return { error: "Escribe tu nombre." };
  const problema = problemaDeContrasena(password, username);
  if (problema) return { error: problema };

  const admin = await prisma.user.create({
    data: {
      username,
      displayName,
      // La primera cuenta de todas es la de quien monta la aplicación
      role: ROLES.CREADOR,
      passwordHash: await hashPassword(password),
      avatarColor: PALETTE[0],
    },
  });

  if (withSample) {
    const competition = await prisma.competition.create({
      data: {
        ...SAMPLE_COMPETITION,
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
              color: PALETTE[index % PALETTE.length],
              position: index,
            })),
          },
        },
      });
    }

    // El administrador entra también como jugador de esa competición
    await prisma.participant.create({
      data: {
        competitionId: competition.id,
        userId: admin.id,
        displayName: admin.displayName,
        color: PALETTE[0],
        isAdmin: true,
      },
    });
  }

  await createSession({
    userId: admin.id,
    username: admin.username,
    role: admin.role,
    version: admin.sesionVersion,
  });

  redirect("/");
}
