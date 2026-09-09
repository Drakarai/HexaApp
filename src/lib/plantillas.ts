import "server-only";
import { prisma } from "@/lib/db";
import {
  GRUPOS_DE_PLANTILLA,
  generacionDelGrupo,
  grupoDePlantillaPorId,
  nombreDeRegion,
  regionDelGrupo,
  type GrupoDePlantilla,
} from "@/lib/juegos";
import { baseDeFabrica } from "@/lib/level-caps-de-fabrica";

/**
 * Las plantillas de level caps: los hitos que trae cada juego de serie.
 *
 * Es la misma idea que los mapas: viven en la base de datos, se editan desde
 * Administración y valen para todos los lockes, porque los gimnasios de Johto
 * son los mismos jueguen quien juegue. Lo de fábrica
 * (`lib/level-caps-de-fabrica.ts`) solo se copia **con un botón**, así que
 * borrar un hito a conciencia no lo hace volver.
 *
 * Van por **pareja de juegos** y no por juego suelto: Rojo y Azul tienen los
 * mismos gimnasios y los mismos niveles, así que preparar dos listas iguales no
 * aportaba nada. Las terceras versiones y los remakes sí van aparte, que ahí es
 * donde suele haber cambios (ver `GRUPOS_DE_PLANTILLA` en lib/juegos.ts).
 *
 * Dentro de un locke, los level caps siguen siendo suyos y editables como
 * siempre: la plantilla solo es el punto de partida que se copia una vez.
 */

export type ItemDePlantilla = {
  id: string;
  label: string;
  cap: number;
  kind: string;
  notes: string | null;
  position: number;
};

/**
 * Los hitos guardados de un grupo de juegos, en orden.
 *
 * **Sin las medallas**: los bytes se quedan en la base de datos y las pantallas
 * piden solo su dirección (`urlsDeMedallasDePlantilla`). Quien necesita las
 * imágenes de verdad —copiar una plantilla, traerla a un locke— usa
 * `getPlantillaConImagenes`.
 */
export async function getPlantilla(grupoId: string) {
  const plantilla = await prisma.levelCapTemplate.findUnique({
    where: { grupoId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  return plantilla?.items ?? [];
}

/**
 * Igual, pero con las medallas dentro: solo para copiarlas a otro sitio.
 *
 * Va contra los hitos directamente y no por la plantilla porque el `omit` que
 * esconde las imágenes solo se puede levantar en la consulta de primer nivel.
 */
export async function getPlantillaConImagenes(grupoId: string) {
  return prisma.levelCapTemplateItem.findMany({
    where: { template: { grupoId } },
    orderBy: { position: "asc" },
    omit: { images: false },
  });
}

/**
 * Cuántos hitos tiene cada grupo, para pintar las pestañas del panel sin
 * traerse todos los hitos de todos.
 */
export async function getResumenDePlantillas() {
  const cuentas = await prisma.levelCapTemplate.findMany({
    select: { grupoId: true, _count: { select: { items: true } } },
  });
  const porGrupo = new Map(
    cuentas.map((fila) => [fila.grupoId, fila._count.items]),
  );

  return GRUPOS_DE_PLANTILLA.map((grupo) => ({
    ...grupo,
    generacion: generacionDelGrupo(grupo),
    region: regionDelGrupo(grupo),
    hitos: porGrupo.get(grupo.id) ?? 0,
  }));
}

/** Crea la fila de la plantilla si no existía. */
export async function asegurarPlantilla(grupoId: string) {
  const existente = await prisma.levelCapTemplate.findUnique({
    where: { grupoId },
  });
  if (existente) return existente;
  return prisma.levelCapTemplate.create({ data: { grupoId } });
}

/**
 * Lo que traería de fábrica un grupo, y de dónde sale para poder decirlo en el
 * botón ("Traer los de Johto", "Traer los de Ultrasol y Ultraluna").
 *
 * Casi siempre es la lista de su región: los gimnasios y su orden son los
 * mismos en todas las versiones de una, y lo que cambia son los niveles, que se
 * ajustan luego en cada plantilla. La excepción son Ultrasol y Ultraluna, que
 * cambian dominantes y añaden una prueba, así que traen la suya.
 */
export function deFabricaParaGrupo(grupo: GrupoDePlantilla) {
  const region = regionDelGrupo(grupo);
  return baseDeFabrica(grupo.id, region, nombreDeRegion(region));
}

export { grupoDePlantillaPorId };
