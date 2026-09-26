import "server-only";
import { cookies } from "next/headers";
import {
  COOKIE_DE_SESION,
  firmarSesion,
  leerSesion,
  opcionesDeLaCookie,
  type SessionPayload,
} from "@/lib/sesion-token";

export type { SessionPayload };

export async function createSession(payload: SessionPayload) {
  const token = await firmarSesion(payload);
  const store = await cookies();
  store.set(COOKIE_DE_SESION, token, opcionesDeLaCookie);
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_DE_SESION);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_DE_SESION)?.value;
  if (!token) return null;
  return (await leerSesion(token))?.sesion ?? null;
}
