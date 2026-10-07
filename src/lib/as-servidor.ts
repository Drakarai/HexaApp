import "server-only";
import { prisma } from "@/lib/db";
import { spriteDeEspecie } from "@/lib/sprites-servidor";
import { queEs } from "@/lib/evoluciones";
import { leerAses, quitarAs } from "@/lib/as";

/**
 * El as se elige de la caja (ver lib/as.ts) y **se pone al día solo**: si su
 * captura evoluciona, cambia de mote, se vuelve shiny o se intercambia, la
 * copia que guarda el jugador (especie, mote e imágenes) se rehace con lo de
 * ahora. Se copia en vez de leerlo cada vez de la captura porque todo lo que
 * ya enseñaba el as —la clasificación, el cementerio, la ficha rápida, la
 * dirección de su imagen— lee esas columnas, y así sigue igual.
 *
 * Lo llaman las acciones del Equipo y PC que cambian a quién es un pokémon.
 * Con las capturas tocadas basta: si ninguna es el as de nadie, no hace nada.
 */
export async function sincronizarAs(captureIds: string[]) {
  if (!captureIds.length) return;
  const jugadores = await prisma.participant.findMany({
    where: { aceCaptureId: { in: captureIds } },
    select: {
      id: true,
      aceCapture: { select: { species: true, nickname: true, pokemonId: true, shiny: true, image: true } },
    },
  });
  await Promise.all(
    jugadores.map(async (jugador) => {
      const captura = jugador.aceCapture;
      if (!captura) return;
      await prisma.participant.update({
        where: { id: jugador.id },
        data: await copiaDelAs(captura),
      });
    }),
  );
}

/** Lo que se copia de la captura al as: especie, mote y sus dos imágenes */
export async function copiaDelAs(captura: {
  species: string;
  nickname: string | null;
  pokemonId: number | null;
  shiny: boolean;
  image: string | null;
}) {
  // La ilustración grande es la de su especie (está en el almacén): la captura solo guarda la de caja
  const quien = queEs(captura.pokemonId, captura.species);
  const ilustracion = quien ? await spriteDeEspecie(quien.pokemonId, captura.shiny, "detail") : null;
  return {
    aceSpecies: captura.species,
    aceNickname: captura.nickname,
    aceImage: captura.image,
    aceDetailImage: ilustracion,
  };
}

/**
 * Una captura que se va a borrar (apuntada por error): si era el as de
 * alguien, ese jugador se queda sin as. Su turno se cierra como «quitado».
 */
export async function soltarAs(captureId: string) {
  const jugador = await prisma.participant.findFirst({
    where: { aceCaptureId: captureId },
    select: { id: true, historialDeAses: true },
  });
  if (!jugador) return;
  await prisma.participant.update({
    where: { id: jugador.id },
    data: {
      ...SIN_AS,
      historialDeAses: quitarAs(leerAses(jugador.historialDeAses), new Date().toISOString()),
    },
  });
}

/** Un jugador sin as */
export const SIN_AS = {
  aceCaptureId: null,
  aceSpecies: null,
  aceNickname: null,
  aceReason: null,
  aceImage: null,
  aceDetailImage: null,
};
