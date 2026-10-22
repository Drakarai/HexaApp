import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIMITES_DE_ENTRADA, minutosDeEspera } from "@/lib/seguridad";

/**
 * El freno a quien prueba contraseñas sin parar: los fallos de entrada se
 * apuntan (`IntentoDeEntrada`) y, pasados los de `LIMITES_DE_ENTRADA`, hay que
 * esperar unos minutos. Cuenta por usuario escrito —exista o no, para no
 * delatar cuáles existen— y por red.
 */

/**
 * La red desde la que llega la petición, **resumida**: un hash con el secreto
 * de la aplicación. Sirve para contar intentos sin guardar la dirección de
 * nadie. En Vercel la da `x-forwarded-for` (el primero es el de verdad).
 */
async function redDeLaPeticion() {
  const cabeceras = await headers();
  const ip =
    cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabeceras.get("x-real-ip") ||
    "desconocida";
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? ""}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/** Cuántos minutos le quedan de espera a este intento, o 0 si puede probar. */
export async function esperaParaEntrar(usuario: string) {
  const red = await redDeLaPeticion();
  const desde = new Date(Date.now() - LIMITES_DE_ENTRADA.ventanaMinutos * 60_000);
  const [delUsuario, deLaRed] = await Promise.all([
    prisma.intentoDeEntrada.findMany({
      where: { usuario, createdAt: { gt: desde } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: LIMITES_DE_ENTRADA.porUsuario,
    }),
    prisma.intentoDeEntrada.findMany({
      where: { red, createdAt: { gt: desde } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: LIMITES_DE_ENTRADA.porRed,
    }),
  ]);
  return minutosDeEspera({
    fallosDelUsuario: delUsuario.map((f) => f.createdAt),
    fallosDeLaRed: deLaRed.map((f) => f.createdAt),
    ahora: new Date(),
  });
}

export async function apuntarFallo(usuario: string) {
  await prisma.intentoDeEntrada.create({
    data: { usuario: usuario.slice(0, 60), red: await redDeLaPeticion() },
  });
  // De vez en cuando se tira lo viejo: pasado un día ya no cuenta para nada
  if (Math.random() < 0.05) {
    await prisma.intentoDeEntrada.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
    });
  }
}

/** Entró bien: sus fallos ya no tienen que frenarle la próxima vez */
export async function olvidarFallos(usuario: string) {
  await prisma.intentoDeEntrada.deleteMany({ where: { usuario } });
}
