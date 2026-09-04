import "server-only";
import { prisma } from "@/lib/db";
import { firmasDeImagen, urlsDeImagen } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { REGIONES, regionesDelJuego, type Region } from "@/lib/juegos";
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
  /** Que no se pudo capturar: se escapó, se murió… */
  failed: boolean;
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

/** Una zona tal y como se ofrece en un desplegable para decir dónde pasó algo. */
export type ZonaParaElegir = {
  id: string;
  /** Cómo se lee en la lista: "Ciudad Trigal › Torre Bellsprout" si cuelga. */
  label: string;
  /** Su tipo, que es por lo que se agrupan en el desplegable */
  kind: string;
  /** De qué región es. Solo se enseña cuando la edición tiene más de una. */
  region: string;
};

/**
 * Todas las zonas de unas regiones, padres e hijas, para elegir una.
 *
 * A diferencia del mapa de capturas, aquí **sí entran las que tienen hijas**:
 * capturar en "Ciudad Trigal" no significa nada, pero morirse ahí sí.
 *
 * Acepta varias regiones porque un juego puede tener más de una —la 2ª
 * generación trae Kanto además de Johto—, y en el cementerio hace falta poder
 * decir que algo cayó en cualquiera de las dos.
 *
 * No crea las regiones que no existan —para eso está `getMapa`—: si no hay
 * fila, tampoco hay zonas que ofrecer.
 */
export async function getZonasParaElegir(
  slugs: string[],
): Promise<ZonaParaElegir[]> {
  if (!slugs.length) return [];

  const regiones = await prisma.mapRegion.findMany({
    where: { slug: { in: slugs } },
    omit: { image: true },
    include: { zones: { select: { id: true, name: true, kind: true, parentId: true } } },
  });
  if (!regiones.length) return [];

  const todas = regiones.flatMap((region) =>
    region.zones.map((zona) => ({
      ...zona,
      region: region.name,
      // El sitio de su región en la lista que pidieron: la principal va antes
      // que la que se abre a mitad de partida
      orden: slugs.indexOf(region.slug),
    })),
  );
  const nombres = new Map(todas.map((zona) => [zona.id, zona.name]));

  return todas
    .sort(
      (a, b) =>
        a.orden - b.orden ||
        // Con número: sin esto la "Ruta 10" se colaba entre la 1 y la 2
        a.name.localeCompare(b.name, "es", { numeric: true }),
    )
    .map((zona) => {
      const padre = zona.parentId ? nombres.get(zona.parentId) : null;
      return {
        id: zona.id,
        label: padre ? `${padre} › ${zona.name}` : zona.name,
        kind: zona.kind,
        region: zona.region,
      };
    });
}

/**
 * Comprueba que una zona es de alguno de los mapas que le tocan a esa edición.
 * Sin esto, cualquiera podría colgar su baja de una zona de otra región
 * mandando el formulario a mano.
 */
export async function zonaValidaParaCompeticion(
  zoneId: string,
  gameId: string | null,
): Promise<boolean> {
  const slugs = regionesDelJuego(gameId);
  if (!slugs.length) return false;
  const zona = await prisma.mapZone.findUnique({
    where: { id: zoneId },
    select: { region: { select: { slug: true } } },
  });
  return Boolean(zona && slugs.includes(zona.region.slug as Region));
}

/**
 * Cuántas bajas ha tenido **una sola persona** en cada zona, para pintar las
 * calaveras de su mapa. Las bajas son públicas, pero el mapa donde salen no lo
 * es, así que se piden igual que las capturas: filtrando por el participante.
 */
export async function getMisBajasPorZona(
  participantId: string,
): Promise<Record<string, number>> {
  const filas = await prisma.death.groupBy({
    by: ["zoneId"],
    where: { participantId, zoneId: { not: null } },
    _count: { _all: true },
  });

  const cuenta: Record<string, number> = {};
  for (const fila of filas) {
    if (fila.zoneId) cuenta[fila.zoneId] = fila._count._all;
  }
  return cuenta;
}

/**
 * Los sitios donde más gente ha caído en toda la edición.
 *
 * Esto sí es de todos: las bajas siempre han sido públicas —el cementerio las
 * enseña— y aquí solo se cuentan. Lo privado es el mapa de capturas, que no
 * entra en esta consulta.
 */
export async function getZonasMasMortiferas(
  competitionId: string,
  cuantas = 4,
): Promise<{ id: string; name: string; kind: string; bajas: number }[]> {
  const filas = await prisma.death.groupBy({
    by: ["zoneId"],
    where: { participant: { competitionId }, zoneId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { zoneId: "desc" } },
    take: cuantas,
  });
  if (!filas.length) return [];

  const zonas = await prisma.mapZone.findMany({
    where: { id: { in: filas.map((fila) => fila.zoneId!) } },
    select: { id: true, name: true, kind: true },
  });
  const porId = new Map(zonas.map((zona) => [zona.id, zona]));

  return filas
    .map((fila) => {
      const zona = porId.get(fila.zoneId!);
      return zona ? { ...zona, bajas: fila._count._all } : null;
    })
    .filter((fila) => fila !== null);
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
    failed: fila.failed,
    createdAt: fila.createdAt,
  }));
}
