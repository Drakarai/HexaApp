import "server-only";
import { gunzipSync, gzipSync } from "node:zlib";
import { prisma } from "@/lib/db";

/**
 * Copias de seguridad de la aplicación entera.
 *
 * Qué se guarda: **todas las tablas menos la de las propias copias**, en JSON,
 * comprimido con gzip. Meter las copias dentro de la copia haría que cada una
 * contuviera a todas las anteriores y el tamaño se multiplicaría solo.
 *
 * Qué protege: un borrado sin querer, una jornada que se lleva por delante sus
 * combates, o una edición entera. Contra que se caiga Neon protege el fichero
 * descargado, que es la única copia que vive fuera.
 */

/** Ni las copias ni la tabla interna de Prisma entran en el volcado. */
const TABLAS_FUERA = new Set(["Backup", "_prisma_migrations"]);

/** Cuántas se guardan dentro de la base de datos antes de tirar las viejas. */
export const COPIAS_QUE_SE_GUARDAN = 5;

/** Cada cuánto se hace la copia automática. */
export const HORAS_ENTRE_COPIAS = 24;

export type Volcado = {
  /** Para poder cambiar el formato algún día sin comerse un fichero antiguo */
  formato: 1;
  fecha: string;
  tablas: Record<string, Record<string, unknown>[]>;
};

type ClaveForanea = {
  tabla: string;
  columna: string;
  destino: string;
  opcional: boolean;
};

async function listarTablas(): Promise<string[]> {
  const filas = await prisma.$queryRaw<{ nombre: string }[]>`
    select c.relname as nombre
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `;
  return filas
    .map((fila) => fila.nombre)
    .filter((nombre) => !TABLAS_FUERA.has(nombre));
}

/**
 * Las claves foráneas, con si admiten nulo. De aquí sale el orden de inserción
 * al restaurar, y así **no hay una lista de tablas escrita a mano** que se
 * quede vieja en cuanto se añada un modelo nuevo.
 */
async function clavesForaneas(): Promise<ClaveForanea[]> {
  return prisma.$queryRaw<ClaveForanea[]>`
    select
      tc.table_name  as tabla,
      kcu.column_name as columna,
      ccu.table_name as destino,
      (col.is_nullable = 'YES') as opcional
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name
     and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    join information_schema.columns col
      on col.table_schema = tc.table_schema
     and col.table_name = tc.table_name
     and col.column_name = kcu.column_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
  `;
}

/** Volcado completo de la base de datos, tabla por tabla. */
export async function volcarTodo(): Promise<Volcado> {
  const tablas = await listarTablas();
  const contenido: Volcado["tablas"] = {};

  for (const tabla of tablas) {
    contenido[tabla] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `select * from "${tabla}"`,
    );
  }

  return { formato: 1, fecha: new Date().toISOString(), tablas: contenido };
}

/** "Death: 72 · LevelCap: 16 · …", para verlo sin abrir el fichero. */
function resumir(volcado: Volcado): string {
  return Object.entries(volcado.tablas)
    .filter(([, filas]) => filas.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tabla, filas]) => `${tabla}: ${filas.length}`)
    .join(" · ");
}

/**
 * Número cualquiera, pero siempre el mismo: identifica el cerrojo con el que se
 * pide turno para hacer una copia.
 */
const CERROJO = 918_273;

/**
 * Hace una copia y la guarda. `motivo` distingue la del día de la que se pide a
 * mano y de la que se hace justo antes de restaurar.
 *
 * Cuando es la automática se pide turno primero: si dos personas entran a la
 * vez y a las dos les toca copia, las dos miraban "¿hace más de un día?" antes
 * de que ninguna hubiera guardado nada, y salían dos copias idénticas. Se
 * reserva la fila vacía dentro de una transacción con cerrojo —que dura lo que
 * tarda un `insert`— y el volcado, que es lo lento, va ya fuera.
 */
export async function crearCopia(
  motivo: "auto" | "manual" | "previa",
  autor?: string | null,
) {
  let reservaId: string | null = null;

  await prisma.$transaction(async (tx) => {
    if (motivo === "auto") {
      const [cerrojo] = await tx.$queryRaw<{ mio: boolean }[]>`
        select pg_try_advisory_xact_lock(${CERROJO}) as mio
      `;
      if (!cerrojo?.mio) return;

      const ultima = await tx.backup.findFirst({
        where: { kind: "auto" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const horas = ultima
        ? (Date.now() - ultima.createdAt.getTime()) / 3_600_000
        : null;
      if (horas !== null && horas < HORAS_ENTRE_COPIAS) return;
    }

    // rawSize 0 = reservada pero todavía sin contenido
    const reserva = await tx.backup.create({
      data: {
        kind: motivo,
        authorName: autor ?? null,
        summary: "",
        rawSize: 0,
        payload: "",
      },
      select: { id: true },
    });
    reservaId = reserva.id;
  });

  if (!reservaId) return null;

  try {
    const volcado = await volcarTodo();
    const json = JSON.stringify(volcado);
    const comprimido = gzipSync(Buffer.from(json, "utf8")).toString("base64");

    const copia = await prisma.backup.update({
      where: { id: reservaId },
      data: {
        summary: resumir(volcado),
        rawSize: Buffer.byteLength(json, "utf8"),
        payload: comprimido,
      },
      select: { id: true, createdAt: true, rawSize: true },
    });

    await podarCopias();
    return copia;
  } catch (error) {
    // Que no quede una reserva vacía ocupando sitio si el volcado falla
    await prisma.backup.delete({ where: { id: reservaId } }).catch(() => {});
    throw error;
  }
}

/** Solo las terminadas: las de tamaño 0 son reservas a medio hacer. */
export const COPIAS_HECHAS = { rawSize: { gt: 0 } } as const;

/**
 * Deja solo las últimas. La base de datos gratis no es infinita y cada copia
 * pesa casi lo que pesa la aplicación entera.
 */
export async function podarCopias() {
  // Reservas que se quedaron a medias hace rato: nadie las va a terminar
  await prisma.backup.deleteMany({
    where: {
      rawSize: 0,
      createdAt: { lt: new Date(Date.now() - 3_600_000) },
    },
  });

  const sobran = await prisma.backup.findMany({
    where: COPIAS_HECHAS,
    orderBy: { createdAt: "desc" },
    skip: COPIAS_QUE_SE_GUARDAN,
    select: { id: true },
  });
  if (!sobran.length) return 0;
  await prisma.backup.deleteMany({
    where: { id: { in: sobran.map((copia) => copia.id) } },
  });
  return sobran.length;
}

/** El volcado de una copia guardada, ya descomprimido. */
export async function leerCopia(id: string): Promise<Volcado | null> {
  const filas = await prisma.$queryRaw<{ payload: string }[]>`
    select "payload" from "Backup" where "id" = ${id}
  `;
  if (!filas.length) return null;
  const json = gunzipSync(Buffer.from(filas[0].payload, "base64")).toString("utf8");
  return JSON.parse(json) as Volcado;
}

/** Comprueba que lo que llega es un volcado de los nuestros antes de tocar nada. */
export function esVolcadoValido(dato: unknown): dato is Volcado {
  if (!dato || typeof dato !== "object") return false;
  const posible = dato as Partial<Volcado>;
  if (posible.formato !== 1) return false;
  if (!posible.tablas || typeof posible.tablas !== "object") return false;
  return Object.values(posible.tablas).every((filas) => Array.isArray(filas));
}

/**
 * Restaura un volcado: vacía todo y lo vuelve a meter. **Va entero dentro de
 * una transacción**, así que o entra todo o no se toca nada.
 *
 * El orden de inserción sale de las claves foráneas de la propia base de datos.
 * El truco para no pelearse con las dependencias circulares —una jornada apunta
 * al pokémon MVP, que apunta a su combate, que apunta a la jornada— es meter
 * **todas las columnas que admiten nulo vacías** y rellenarlas en una segunda
 * pasada, cuando ya está todo dentro. Así solo hay que ordenar por las que son
 * obligatorias, que nunca pueden formar un círculo (si lo formaran, esos datos
 * no habrían podido existir).
 */
export async function restaurarVolcado(volcado: Volcado) {
  const tablas = await listarTablas();
  const foraneas = await clavesForaneas();

  const obligatorias = foraneas.filter((fk) => !fk.opcional);
  const aplazadas = new Map<string, string[]>();
  for (const fk of foraneas) {
    if (!fk.opcional || TABLAS_FUERA.has(fk.tabla)) continue;
    aplazadas.set(fk.tabla, [...(aplazadas.get(fk.tabla) ?? []), fk.columna]);
  }

  // Orden topológico: primero las tablas de las que otras dependen
  const pendientes = new Set(tablas);
  const orden: string[] = [];
  while (pendientes.size) {
    const sinDeudas = [...pendientes].filter((tabla) =>
      obligatorias.every(
        (fk) =>
          fk.tabla !== tabla ||
          fk.destino === tabla ||
          !pendientes.has(fk.destino),
      ),
    );
    if (!sinDeudas.length) {
      throw new Error(
        `No se puede ordenar la restauración: ${[...pendientes].join(", ")} dependen entre sí de forma obligatoria.`,
      );
    }
    for (const tabla of sinDeudas) {
      orden.push(tabla);
      pendientes.delete(tabla);
    }
  }

  const entrecomilladas = tablas.map((tabla) => `"${tabla}"`).join(", ");
  let filasMetidas = 0;

  await prisma.$transaction(
    async (tx) => {
      // CASCADE se encarga del orden del borrado; la tabla de copias no entra
      await tx.$executeRawUnsafe(
        `truncate table ${entrecomilladas} restart identity cascade`,
      );

      for (const tabla of orden) {
        const filas = volcado.tablas[tabla];
        if (!filas?.length) continue;

        const columnasAplazadas = aplazadas.get(tabla) ?? [];
        const primeraPasada = columnasAplazadas.length
          ? filas.map((fila) => {
              const copia = { ...fila };
              for (const columna of columnasAplazadas) delete copia[columna];
              return copia;
            })
          : filas;

        // json_populate_recordset convierte el JSON al tipo exacto de la tabla:
        // fechas, listas y nulos incluidos, sin escribir el mapeo a mano
        await tx.$executeRawUnsafe(
          `insert into "${tabla}" select * from json_populate_recordset(null::"${tabla}", $1::json)`,
          JSON.stringify(primeraPasada),
        );
        filasMetidas += filas.length;
      }

      // Segunda pasada: ahora que está todo dentro, se rellenan los enlaces
      // que se dejaron vacíos
      for (const [tabla, columnas] of aplazadas) {
        const filas = volcado.tablas[tabla];
        if (!filas?.length) continue;
        const conValor = filas.filter((fila) =>
          columnas.some((columna) => fila[columna] != null),
        );
        if (!conValor.length) continue;

        const asignaciones = columnas
          .map((columna) => `"${columna}" = v."${columna}"`)
          .join(", ");
        await tx.$executeRawUnsafe(
          `update "${tabla}" as t set ${asignaciones}
           from json_populate_recordset(null::"${tabla}", $1::json) as v
           where t."id" = v."id"`,
          JSON.stringify(conValor),
        );
      }
    },
    // Un volcado con las fotos dentro son varios megas: el minuto por defecto
    // se queda corto cuando la base de datos está lejos
    { timeout: 120_000, maxWait: 20_000 },
  );

  return { tablas: orden.length, filas: filasMetidas };
}

/** Hace cuánto fue la última copia, en horas. `null` si no hay ninguna. */
export async function horasDesdeLaUltimaCopia(): Promise<number | null> {
  const ultima = await prisma.backup.findFirst({
    where: COPIAS_HECHAS,
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!ultima) return null;
  return (Date.now() - ultima.createdAt.getTime()) / 3_600_000;
}
