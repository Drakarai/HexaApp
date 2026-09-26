import "server-only";
import { prisma } from "@/lib/db";

/**
 * Si el locke ya se está jugando. Antes de empezar, las reglas se están
 * montando: añadirlas y retocarlas es preparar, no cambiarlas, y avisar de cada
 * una llenaría de puntos la pantalla de todo el mundo antes de la primera ruta.
 * Cuenta como empezado en cuanto hay una jornada o alguien se ha pasado un
 * gimnasio (esto último, por los lockes en solitario, que no tienen jornadas).
 */
export async function lockeEmpezado(competitionId: string) {
  const [jornada, gimnasio] = await Promise.all([
    prisma.matchday.findFirst({ where: { competitionId }, select: { id: true } }),
    prisma.gymClear.findFirst({
      where: { levelCap: { competitionId } },
      select: { id: true },
    }),
  ]);
  return Boolean(jornada || gimnasio);
}

/**
 * Qué líneas ha ganado y perdido una regla, para contarlo sin tener que
 * comparar dos textos largos a ojo. Se compara línea a línea sin la viñeta ni
 * los espacios: una línea retocada sale como una quitada y otra añadida, que es
 * justo como se lee un cambio de reglas ("antes ponía esto, ahora esto").
 */
export function queHaCambiado(antes: string, ahora: string) {
  const lineas = (texto: string) =>
    texto
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((linea) => linea.trim().replace(/^[-*•]\s+/, ""))
      .filter(Boolean);
  const viejas = lineas(antes);
  const nuevas = lineas(ahora);
  return {
    anadidas: nuevas.filter((linea) => !viejas.includes(linea)),
    quitadas: viejas.filter((linea) => !nuevas.includes(linea)),
  };
}
