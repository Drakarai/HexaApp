"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import type { FormState } from "@/app/actions/auth";

/** Seis huecos, como un equipo. Un fichero "use server" solo puede exportar
 *  funciones, así que esto se queda dentro. */
const MAX_FAVORITOS = 6;

/**
 * Los pokémon favoritos de un jugador: los que le han hecho el locke. Los pone
 * cada uno para sí mismo, y los administradores pueden echar una mano igual que
 * con las bajas.
 */
export async function addFavoriteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");
  try {
    await assertCanActForParticipant(participantId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie del pokémon." };

  const cuantos = await prisma.favoritePokemon.count({ where: { participantId } });
  if (cuantos >= MAX_FAVORITOS) {
    return { error: `Solo caben ${MAX_FAVORITOS} favoritos.` };
  }

  // La imagen la baja el servidor: aquí solo llega qué pokémon es
  const sprites = await spritesDelFormulario(formData);

  await prisma.favoritePokemon.create({
    data: {
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      image: sprites?.boxImage ?? null,
      position: cuantos,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/jugador", "layout");
  return { success: `${species} añadido a tus favoritos.` };
}

export async function removeFavoriteAction(formData: FormData) {
  const id = String(formData.get("favoriteId") ?? "");
  const favorito = await prisma.favoritePokemon.findUnique({ where: { id } });
  if (!favorito) return;
  await assertCanActForParticipant(favorito.participantId);

  await prisma.favoritePokemon.delete({ where: { id } });

  revalidatePath("/perfil");
  revalidatePath("/jugador", "layout");
}
