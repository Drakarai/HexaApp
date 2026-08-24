import "server-only";
import { prisma } from "@/lib/db";
import { firmasDeImagen, urlsDeImagen } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { REGIONES, type Region } from "@/lib/juegos";
import { verticesDeZona } from "@/lib/zonas";
import { LIENZO, MAPAS_DE_FABRICA } from "@/lib/mapas-de-fabrica";

/**
 * Los mapas de las regiones y las capturas que cada uno apunta encima.
 *
 * Las capturas son **privadas de verdad**: todas las consultas de aquí piden el
 * participante y filtran por él, igual que las notas filtran por su autor. No
 * hay ninguna función que devuelva las capturas de otro, tampoco para un
 * administrador, y eso es a propósito: si no existe la consulta, no hay pantalla
 * que se pueda equivocar.
 */

export type ZonaDelMapa = {
  id: string;
  name: string;
  kind: string;
  /** "rect" | "circle" | "poly" | "none" */
  shape: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Los vértices, ya leídos, cuando la forma es "poly" */
  points: [number, number][] | null;
  /** Su color propio, si le han puesto uno */
  color: string | null;
  parentId: string | null;
  /**
   * Las zonas que lleva dentro. Si tiene alguna, la forma **no se captura**:
   * al tocarla salen estas para elegir.
   */
  children: ZonaDelMapa[];
};

export type MapaDeRegion = {
  id: string;
  slug: string;
  name: string;
  /** Dirección de la imagen de fondo, si alguien la subió */
  image: string | null;
  width: number;
  height: number;
  zones: ZonaDelMapa[];
};

export type CapturaApuntada = {
  id: string;
  zoneId: string | null;
  species: string;
  nickname: string | null;
  notes: string | null;
  image: string | null;
  createdAt: Date;
};

/**
 * El mapa de una región, creándolo si es la primera vez que se pide.
 *
 * La fila se crea vacía y **las zonas de fábrica no se copian solas**: eso lo
 * pide un administrador con un botón. Así, si alguien borra una zona a
 * conciencia, no vuelve a aparecer sola en la siguiente visita.
 */
export async function getMapa(slug: string): Promise<MapaDeRegion | null> {
  const region = REGIONES.find((candidata) => candidata.slug === slug);
  if (!region) return null;

  const fila = await prisma.mapRegion.upsert({
    where: { slug },
    create: {
      slug,
      name: region.nombre,
      width: LIENZO.ancho,
      height: LIENZO.alto,
    },
    update: {},
    // La imagen puede ser de varios cientos de KB: solo se quiere su firma
    omit: { image: true },
    include: { zones: { orderBy: [{ y: "asc" }, { x: "asc" }] } },
  });

  /**
   * Las hijas se cuelgan de su padre y salen de la lista de arriba: en el mapa
   * solo se dibuja lo que no cuelga de nadie.
   */
  const aZona = (zona: (typeof fila.zones)[number]): ZonaDelMapa => ({
    id: zona.id,
    name: zona.name,
    kind: zona.kind,
    shape: zona.shape,
    x: zona.x,
    y: zona.y,
    w: zona.w,
    h: zona.h,
    points: verticesDeZona(zona.points),
    color: zona.color,
    parentId: zona.parentId,
    children: fila.zones
      .filter((hija) => hija.parentId === zona.id)
      .map((hija) => ({
        id: hija.id,
        name: hija.name,
        kind: hija.kind,
        shape: hija.shape,
        x: hija.x,
        y: hija.y,
        w: hija.w,
        h: hija.h,
        points: verticesDeZona(hija.points),
        color: hija.color,
        parentId: hija.parentId,
        // Solo un nivel: una zona dentro de otra dentro de otra no aporta nada
        children: [],
      })),
  });

  const firma = (await firmasDeImagen("mapa", [fila.id])).get(fila.id);

  return {
    id: fila.id,
    slug: fila.slug,
    name: fila.name,
    image: urlDeImagen("mapa", fila.id, firma),
    width: fila.width,
    height: fila.height,
    zones: fila.zones.filter((zona) => !zona.parentId).map(aZona),
  };
}

/** Las siete regiones con cuántas zonas tiene cada una, para Administración. */
export async function getResumenDeMapas() {
  const filas = await prisma.mapRegion.findMany({
    omit: { image: true },
    include: { _count: { select: { zones: true } } },
  });
  const porSlug = new Map(filas.map((fila) => [fila.slug, fila]));

  return REGIONES.map((region) => ({
    slug: region.slug,
    nombre: region.nombre,
    generacion: region.generacion,
    zonas: porSlug.get(region.slug)?._count.zones ?? 0,
    conImagen: Boolean(porSlug.get(region.slug)),
    /** Si tengo sus zonas escritas y se puede rellenar de una vez */
    hayDeFabrica: Boolean(MAPAS_DE_FABRICA[region.slug as Region]),
  }));
}

/**
 * Las capturas de **una sola persona**. El participante no es opcional y no hay
 * versión que acepte varios: ver el comentario de arriba.
 */
export async function getMisCapturas(
  participantId: string,
): Promise<CapturaApuntada[]> {
  const filas = await prisma.capture.findMany({
    where: { participantId },
    orderBy: { createdAt: "desc" },
    omit: { image: true },
  });

  const imagenes = await urlsDeImagen(
    "captura",
    filas.map((fila) => fila.id),
  );

  return filas.map((fila) => ({
    id: fila.id,
    zoneId: fila.zoneId,
    species: fila.species,
    nickname: fila.nickname,
    notes: fila.notes,
    image: imagenes(fila.id),
    createdAt: fila.createdAt,
  }));
}
