"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant } from "@/lib/competition";
import { imagenEditada } from "@/lib/image";
import { REGIONES, type Region } from "@/lib/juegos";
import { LIENZO, MAPAS_DE_FABRICA } from "@/lib/mapas-de-fabrica";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import type { FormState } from "@/app/actions/auth";

/**
 * Los mapas y las capturas.
 *
 * Dos mundos separados y con permisos distintos:
 * - **El mapa** (zonas, nombres, sitios, imagen de fondo) lo tocan solo los
 *   administradores, y da igual en qué edición estén: es global.
 * - **Las capturas** son de cada uno y solo suyas. Todas las acciones de abajo
 *   resuelven el participante **desde la sesión**, nunca desde el formulario:
 *   así no hay forma de escribir en el mapa de otro ni equivocándose.
 */

function refrescarMapa() {
  revalidatePath("/mapa");
  revalidatePath("/admin/mapas");
}

// ---------------------------------------------------------------------------
// El mapa (administradores)
// ---------------------------------------------------------------------------

/** Crea la fila de la región si no existe todavía. */
async function asegurarRegion(slug: string) {
  const region = REGIONES.find((candidata) => candidata.slug === slug);
  if (!region) throw new Error("Esa región no existe.");

  return prisma.mapRegion.upsert({
    where: { slug },
    create: {
      slug,
      name: region.nombre,
      width: LIENZO.ancho,
      height: LIENZO.alto,
    },
    update: {},
    omit: { image: true },
  });
}

/**
 * Copia las zonas que tengo escritas para esa región. **Solo añade lo que
 * falte**: si ya has renombrado o movido algo, no se toca, y si borraste una
 * zona a propósito, vuelve a salir y la borras otra vez (es un botón, no algo
 * automático).
 */
export async function rellenarRegionAction(formData: FormData) {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const deFabrica = MAPAS_DE_FABRICA[slug as Region];
  if (!deFabrica) return;

  const region = await asegurarRegion(slug);
  const existentes = await prisma.mapZone.findMany({
    where: { regionId: region.id },
    select: { name: true },
  });
  const yaEstan = new Set(existentes.map((zona) => zona.name.toLowerCase()));

  const nuevas = deFabrica.filter(
    (zona) => !yaEstan.has(zona.nombre.toLowerCase()),
  );
  if (nuevas.length) {
    await prisma.mapZone.createMany({
      data: nuevas.map((zona, indice) => ({
        regionId: region.id,
        name: zona.nombre,
        kind: zona.tipo,
        x: zona.x,
        y: zona.y,
        position: existentes.length + indice,
      })),
    });
  }

  refrescarMapa();
}

export async function anadirZonaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "La zona necesita un nombre." };
  if (name.length > 60) return { error: "Ese nombre es demasiado largo." };

  const region = await asegurarRegion(slug);
  const cuantas = await prisma.mapZone.count({ where: { regionId: region.id } });

  await prisma.mapZone.create({
    data: {
      regionId: region.id,
      name,
      kind: String(formData.get("kind") ?? "ruta"),
      // En el centro del lienzo: se arrastra a donde toque
      x: Math.round(region.width / 2),
      y: Math.round(region.height / 2),
      position: cuantas,
    },
  });

  refrescarMapa();
  return { success: `"${name}" añadida. Arrástrala a su sitio.` };
}

export async function editarZonaAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("zoneId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  await prisma.mapZone.update({
    where: { id },
    data: { name, kind: String(formData.get("kind") ?? "ruta") },
  });
  refrescarMapa();
}

export async function borrarZonaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("zoneId") ?? "");
  if (id) await prisma.mapZone.delete({ where: { id } });
  refrescarMapa();
}

/**
 * Guarda de una vez dónde ha quedado cada chincheta después de arrastrarlas.
 *
 * Van todas juntas y en una transacción porque colocar un mapa son veinte
 * arrastres seguidos: mandar uno por movimiento sería un viaje a la base de
 * datos por cada pixel soltado.
 */
export async function moverZonasAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  let sitios: { id: string; x: number; y: number }[];
  try {
    sitios = JSON.parse(String(formData.get("sitios") ?? "[]"));
  } catch {
    return { error: "No he entendido dónde has dejado las zonas." };
  }
  if (!Array.isArray(sitios) || !sitios.length) {
    return { error: "No has movido nada." };
  }

  await prisma.$transaction(
    sitios
      .filter((sitio) => sitio?.id && Number.isFinite(sitio.x) && Number.isFinite(sitio.y))
      .map((sitio) =>
        prisma.mapZone.update({
          where: { id: sitio.id },
          data: { x: Math.round(sitio.x), y: Math.round(sitio.y) },
        }),
      ),
  );

  refrescarMapa();
  return { success: "Mapa guardado." };
}

/** La imagen de fondo de una región, y el tamaño del lienzo. */
export async function guardarFondoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const region = await asegurarRegion(slug);

  const ancho = Number(formData.get("width") ?? region.width);
  const alto = Number(formData.get("height") ?? region.height);
  if (!Number.isFinite(ancho) || ancho < 200 || ancho > 4000) {
    return { error: "El ancho tiene que estar entre 200 y 4000." };
  }
  if (!Number.isFinite(alto) || alto < 200 || alto > 4000) {
    return { error: "El alto tiene que estar entre 200 y 4000." };
  }

  await prisma.mapRegion.update({
    where: { id: region.id },
    data: {
      image: imagenEditada(formData.get("image")),
      width: Math.round(ancho),
      height: Math.round(alto),
    },
  });

  refrescarMapa();
  return { success: "Guardado." };
}

// ---------------------------------------------------------------------------
// Las capturas (cada uno las suyas)
// ---------------------------------------------------------------------------

/**
 * El participante de quien está mirando, en la edición activa. **De aquí sale
 * siempre**, nunca del formulario: es lo que hace que no se pueda escribir en
 * el mapa de otro.
 */
async function miParticipante() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return null;
  return getMyParticipant(competition.id, user.id);
}

export async function apuntarCapturaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participante = await miParticipante();
  if (!participante) {
    return { error: "No juegas esta edición, así que no tienes mapa." };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "¿Qué pokémon has capturado?" };

  const zoneIdBruto = String(formData.get("zoneId") ?? "").trim();
  let zoneId: string | null = null;
  if (zoneIdBruto) {
    // Que la zona exista de verdad; si no, entra como captura extra
    const zona = await prisma.mapZone.findUnique({
      where: { id: zoneIdBruto },
      select: { id: true },
    });
    zoneId = zona?.id ?? null;
  }

  const sprites = await spritesDelFormulario(formData);

  await prisma.capture.create({
    data: {
      participantId: participante.id,
      zoneId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      image: sprites?.boxImage ?? null,
    },
  });

  revalidatePath("/mapa");
  return { success: `${species} apuntado.` };
}

/** Borrar solo lo tuyo: el `where` lleva el participante, no solo el id. */
export async function borrarCapturaAction(formData: FormData) {
  const participante = await miParticipante();
  if (!participante) return;

  const id = String(formData.get("captureId") ?? "");
  if (!id) return;

  await prisma.capture.deleteMany({
    where: { id, participantId: participante.id },
  });
  revalidatePath("/mapa");
}
