import { SignJWT, jwtVerify } from "jose";

/**
 * El token de la sesión, sin nada de Next alrededor.
 *
 * Va aparte de `session.ts` porque lo usan dos sitios que no se parecen: las
 * páginas y acciones (que leen la cookie con `next/headers`) y el proxy, que
 * corre antes que ellas y renueva la cookie de quien sigue entrando. Si cada
 * uno firmara a su manera, un cambio en uno dejaría al otro echando a la gente.
 */

export const COOKIE_DE_SESION = "hexaapp_session";

/** Lo que dura una sesión **sin entrar**: cada visita la vuelve a estirar. */
export const DURACION_DE_SESION = 60 * 60 * 24 * 30; // 30 días

/**
 * Cada cuánto se renueva como mucho. Renovarla en cada petición sería firmar
 * y mandar una cookie nueva cada vez que se toca algo, para ganar segundos
 * sobre un mes.
 */
export const RENOVAR_CADA = 60 * 60 * 24; // un día

export type SessionPayload = {
  userId: string;
  username: string;
  role: string;
};

export const opcionesDeLaCookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DURACION_DE_SESION,
} as const;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "Falta AUTH_SECRET (mínimo 16 caracteres). Copia .env.example a .env y define una clave.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function firmarSesion(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DE_SESION}s`)
    .sign(getSecret());
}

/** La sesión del token y cuándo se firmó, o null si no vale o ha caducado. */
export async function leerSesion(
  token: string,
): Promise<{ sesion: SessionPayload; firmadaEn: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.userId || typeof payload.userId !== "string") return null;
    return {
      sesion: {
        userId: payload.userId,
        username: String(payload.username ?? ""),
        role: String(payload.role ?? "PLAYER"),
      },
      firmadaEn: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}
