"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreador, requireUser } from "@/lib/auth";
import {
  assertPuedeApuntarEn,
  getActiveCompetition,
  getMyParticipant,
} from "@/lib/competition";
import { imagenEditada } from "@/lib/image";
import {
  guardarPorContenido,
  resolverImagen,
} from "@/lib/almacen-de-imagenes";
import { REGIONES_DE_MAPA, type Region } from "@/lib/juegos";
import { LIENZO, MAPAS_DE_FABRICA } from "@/lib/mapas-de-fabrica";
import { detectarZonas } from "@/lib/detectar-zonas";
import { FORMAS, esRedonda } from "@/lib/zonas";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import type { FormState } from "@/app/actions/auth";
import { sitioParaUnaNueva } from "@/lib/equipo-y-caja";
import { vincularCapturaNueva } from "@/lib/soul-link";

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

/** Un giro en grados enteros de 0 a 359, venga como venga del formulario. */
function gradosValidos(grados: number) {
  if (!Number.isFinite(grados)) return 0;
  return ((Math.round(grados) % 360) + 360) % 360;
}

/** Crea la fila del mapa si no existe todavía. */
async function asegurarRegion(slug: string) {
  const region = REGIONES_DE_MAPA.find((candidata) => candidata.slug === slug);
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
  await requireCreador();

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
  await requireCreador();

  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "La zona necesita un nombre." };
  if (name.length > 60) return { error: "Ese nombre es demasiado largo." };

  const region = await asegurarRegion(slug);
  const cuantas = await prisma.mapZone.count({ where: { regionId: region.id } });

  const forma = String(formData.get("shape") ?? "rect");
  // Un círculo nace cuadrado; con el ancho de una ruta saldría un punto diminuto
  const ancho = esRedonda(forma) ? 90 : 150;
  const alto = esRedonda(forma) ? 90 : 44;

  await prisma.mapZone.create({
    data: {
      regionId: region.id,
      name,
      kind: String(formData.get("kind") ?? "ruta"),
      shape: forma,
      // En el centro del lienzo: se arrastra y se estira a donde toque
      x: Math.round(region.width / 2) - Math.round(ancho / 2),
      y: Math.round(region.height / 2) - Math.round(alto / 2),
      w: ancho,
      h: alto,
      position: cuantas,
    },
  });

  refrescarMapa();
  return { success: `"${name}" añadida. Arrástrala a su sitio.` };
}

export async function editarZonaAction(formData: FormData) {
  await requireCreador();

  const id = String(formData.get("zoneId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const forma = String(formData.get("shape") ?? "");
  const color = String(formData.get("color") ?? "").trim();

  /**
   * Al pasar una zona a círculo se le iguala el ancho y el alto: se dibuja con
   * el lado más corto, y si la caja se quedara alargada el tirador de estirar
   * aparecería en una esquina que ya no toca el dibujo.
   */
  let cuadrada: { w: number; h: number } | null = null;
  if (esRedonda(forma)) {
    const antes = await prisma.mapZone.findUnique({
      where: { id },
      select: { w: true, h: true },
    });
    if (antes && antes.w !== antes.h) {
      const lado = Math.max(12, Math.min(antes.w, antes.h));
      cuadrada = { w: lado, h: lado };
    }
  }

  await prisma.mapZone.update({
    where: { id },
    data: {
      name,
      kind: String(formData.get("kind") ?? "ruta"),
      angle: gradosValidos(Number(formData.get("angle") ?? 0)),
      ...(cuadrada ?? {}),
      ...(FORMAS.some((f) => f.id === forma) ? { shape: forma } : {}),
      // Un color vacío significa "el de su tipo", no "negro"
      color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : null,
    },
  });
  refrescarMapa();
}

/**
 * Mete una zona dentro de otra, o la saca. Una zona con hijas deja de poder
 * capturarse ella misma: al tocarla salen las de dentro.
 */
export async function anidarZonaAction(formData: FormData) {
  await requireCreador();

  const id = String(formData.get("zoneId") ?? "");
  const parentIdBruto = String(formData.get("parentId") ?? "").trim();
  if (!id) return;

  // Ni dentro de sí misma ni dentro de una que ya cuelga de otra: un solo nivel
  let parentId: string | null = null;
  if (parentIdBruto && parentIdBruto !== id) {
    const padre = await prisma.mapZone.findUnique({
      where: { id: parentIdBruto },
      select: { id: true, parentId: true },
    });
    if (padre && !padre.parentId) parentId = padre.id;
  }

  await prisma.mapZone.update({ where: { id }, data: { parentId } });
  refrescarMapa();
}

/**
 * Saca las zonas de la imagen de fondo mirando sus colores, y las crea con
 * nombre provisional para que solo haya que renombrarlas.
 *
 * **Solo añade**: lo que ya hubiera se queda como está. Si sale mal, se borran
 * las nuevas y a otra cosa.
 */
export async function detectarZonasAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCreador();

  const slug = String(formData.get("slug") ?? "");
  // Aquí sí hacen falta los bytes del fondo: se pide a propósito
  const region = await prisma.mapRegion.findUnique({
    where: { slug },
    select: { id: true, image: true, width: true, height: true },
  });
  if (!region) return { error: "Esa región no existe." };
  if (!region.image) {
    return { error: "Primero ponle al mapa la imagen de fondo." };
  }

  // El fondo puede estar en el almacén: aquí hacen falta los píxeles de verdad
  const fondo = await resolverImagen(region.image);
  if (!fondo) return { error: "No encuentro la imagen de fondo del mapa." };

  const encontradas = await detectarZonas(fondo, {
    width: region.width,
    height: region.height,
  });
  if (!encontradas.length) {
    return {
      error:
        "No he reconocido ninguna casilla. Esto funciona con los mapas de tracker que llevan las ciudades en rojo y las rutas en blanco; si el tuyo no es así, dibuja las zonas a mano.",
    };
  }

  const cuantas = await prisma.mapZone.count({ where: { regionId: region.id } });
  await prisma.mapZone.createMany({
    data: encontradas.map((zona, indice) => ({
      regionId: region.id,
      name: `Zona ${cuantas + indice + 1}`,
      kind: zona.kind,
      shape: "rect",
      x: zona.x,
      y: zona.y,
      w: zona.w,
      h: zona.h,
      position: cuantas + indice,
    })),
  });

  refrescarMapa();
  return {
    success: `${encontradas.length} zonas sacadas de la imagen. Ahora ponles el nombre.`,
  };
}

export async function borrarZonaAction(formData: FormData) {
  await requireCreador();
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
  await requireCreador();

  let sitios: {
    id: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
    angle?: number;
    points?: [number, number][];
  }[];
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
      .filter(
        (sitio) =>
          sitio?.id && Number.isFinite(sitio.x) && Number.isFinite(sitio.y),
      )
      .map((sitio) =>
        prisma.mapZone.update({
          where: { id: sitio.id },
          data: {
            x: Math.round(sitio.x),
            y: Math.round(sitio.y),
            // El tamaño y los vértices solo si vienen: mover no es redimensionar
            ...(Number.isFinite(sitio.w) ? { w: Math.max(8, Math.round(sitio.w!)) } : {}),
            ...(Number.isFinite(sitio.h) ? { h: Math.max(8, Math.round(sitio.h!)) } : {}),
            ...(Number.isFinite(sitio.angle) ? { angle: gradosValidos(sitio.angle!) } : {}),
            ...(sitio.points ? { points: JSON.stringify(sitio.points) } : {}),
          },
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
  await requireCreador();

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

  const relleno = Number(formData.get("relleno") ?? region.relleno);

  await prisma.mapRegion.update({
    where: { id: region.id },
    data: {
      image: await guardarPorContenido(imagenEditada(formData.get("image"))),
      width: Math.round(ancho),
      height: Math.round(alto),
      relleno: Math.min(100, Math.max(10, Math.round(relleno) || 100)),
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
/**
 * La ficha de quien apunta, en la edición activa o **en la que diga el
 * formulario**. Lo segundo es para la cola sin conexión: una captura apuntada
 * en el Hexalocke 2 tiene que ir al Hexalocke 2 aunque, cuando por fin se
 * sube, se esté mirando otro locke. No abre ninguna puerta: si en esa edición
 * no tiene ficha, no hay mapa que tocar.
 */
async function miParticipante(competitionId?: string) {
  const user = await requireUser();
  const id = competitionId || (await getActiveCompetition())?.id;
  if (!id) return null;
  const participante = await getMyParticipant(id, user.id);
  if (!participante) return null;
  // En una edición archivada el mapa ya no se toca (ver assertEdicionAbierta)
  await assertPuedeApuntarEn(id, user);
  return participante;
}

export async function apuntarCapturaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let participante;
  try {
    participante = await miParticipante(String(formData.get("competitionId") ?? "").trim());
  } catch (error) {
    return { error: (error as Error).message };
  }
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

  /**
   * Si no se pudo capturar **no se baja el sprite**: no hace falta, en su sitio
   * va una ✕, y así apuntar un encuentro fallido es instantáneo en vez de
   * esperar a que el servidor se traiga una imagen que no se va a ver.
   */
  const fallado = formData.get("failed") === "on";
  const sprites = fallado ? null : await spritesDelFormulario(formData);

  /**
   * Dónde entra en el equipo y la caja (ver lib/equipo-y-caja.ts): al equipo
   * si queda hueco y si no a la caja, como en los juegos. Y qué pokémon es de
   * verdad, para sus tipos y sus evoluciones.
   */
  const pokemonIdBruto = Number(formData.get("pokemonId") ?? "");
  const pokemonId = Number.isInteger(pokemonIdBruto) && pokemonIdBruto > 0 ? pokemonIdBruto : null;
  const suyas = fallado
    ? []
    : await prisma.capture.findMany({
        where: { participantId: participante.id, failed: false, deathId: null },
        select: { id: true, lugar: true, hueco: true, createdAt: true },
      });
  const donde = sitioParaUnaNueva(suyas.map((c) => ({ ...c, creado: c.createdAt.getTime() })));

  const nueva = await prisma.capture.create({
    data: {
      participantId: participante.id,
      zoneId,
      species,
      pokemonId,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      image: sprites?.boxImage ?? null,
      failed: fallado,
      lugar: donde.lugar,
      hueco: donde.hueco,
    },
  });
  // En un Soul Link, con la captura de los demás en esa misma zona
  await vincularCapturaNueva(nueva.id);

  revalidatePath("/mapa");
  revalidatePath("/equipo");
  return {
    success: fallado
      ? `${species} apuntado como fallado.`
      : `${species} apuntado.`,
  };
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
  revalidatePath("/equipo");
}
