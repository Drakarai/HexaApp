import "server-only";
import { createHash } from "node:crypto";
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
  /**
   * Para poder cambiar el formato algún día sin comerse un fichero antiguo.
   *
   * - **1**: el volcado lleva todo dentro, imágenes incluidas. Es el de los
   *   ficheros que se descargan, y el de las copias hechas antes del almacén.
   * - **2**: igual pero **sin los bytes de las imágenes**, que se sacan del
   *   almacén al leerla. Es el que se guarda dentro de la base de datos.
   */
  formato: 1 | 2;
  fecha: string;
  tablas: Record<string, Record<string, unknown>[]>;
};

/** La tabla del almacén dentro de un volcado, y la columna que pesa. */
const TABLA_IMAGENES = "Imagen";
const COLUMNA_IMAGEN = "datos";

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

/** Las columnas que tiene de verdad cada tabla ahora mismo. */
async function columnasPorTabla(): Promise<Map<string, string[]>> {
  const filas = await prisma.$queryRaw<{ tabla: string; columna: string }[]>`
    select table_name as tabla, column_name as columna
    from information_schema.columns
    where table_schema = 'public'
    order by ordinal_position
  `;
  const mapa = new Map<string, string[]>();
  for (const fila of filas) {
    mapa.set(fila.tabla, [...(mapa.get(fila.tabla) ?? []), fila.columna]);
  }
  return mapa;
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

/**
 * El mismo volcado pero **sin los bytes de las imágenes**, para guardarlo
 * dentro de la base de datos.
 *
 * Por qué: las imágenes están ya en la tabla `Imagen`, una sola vez cada una.
 * Meterlas otra vez dentro de la copia, y encima en las cinco copias que se
 * guardan, multiplicaba por cinco justo lo que más pesa —eran 147 MB de 179—
 * para guardar cinco veces exactamente lo mismo que ya estaba al lado.
 *
 * No vale para el fichero que se descarga: ese tiene que llevarlo todo dentro,
 * porque es el que salva el día si se cae la base de datos entera.
 */
async function sinLasImagenes(
  volcado: Volcado,
): Promise<{ ligero: Volcado; claves: string[] }> {
  const claves = new Set<string>();

  /**
   * Primero, cualquier imagen suelta que haya quedado pegada dentro de una
   * fila se guarda en el almacén y se cambia por su referencia. Pasa con las
   * filas de antes del almacén y con las que no se hayan repartido todavía;
   * sin esto, una copia podría seguir cargando imágenes sueltas.
   */
  for (const filas of Object.values(volcado.tablas)) {
    for (const registro of filas) {
      for (const [campo, valor] of Object.entries(registro)) {
        registro[campo] = await alAlmacen(valor, claves);
      }
    }
  }

  // Y ahora sí, fuera los bytes de la tabla del almacén
  const filas = volcado.tablas[TABLA_IMAGENES] ?? [];
  for (const fila of filas) {
    const clave = String(fila.clave ?? "");
    if (clave) claves.add(clave);
  }

  return {
    ligero: {
      ...volcado,
      formato: 2,
      tablas: {
        ...volcado.tablas,
        // Se quedan la clave y lo demás; lo que se va es la imagen
        [TABLA_IMAGENES]: filas.map(({ [COLUMNA_IMAGEN]: _fuera, ...resto }) => resto),
      },
    },
    claves: [...claves],
  };
}

/**
 * Un valor del volcado: si es una imagen se guarda en el almacén y se deja la
 * referencia en su sitio. Lo que no sea una imagen sale tal cual.
 */
async function alAlmacen(valor: unknown, claves: Set<string>): Promise<unknown> {
  if (Array.isArray(valor)) {
    return Promise.all(valor.map((x) => alAlmacen(x, claves)));
  }
  if (typeof valor !== "string") return valor;

  // Una referencia que ya estaba también cuenta como imagen que hace falta
  if (valor.startsWith("ref:")) {
    claves.add(valor.slice("ref:".length));
    return valor;
  }
  if (!valor.startsWith("data:image")) return valor;

  const clave = `h-${createHash("md5").update(valor).digest("hex")}`;
  await prisma.imagen.upsert({
    where: { clave },
    update: {},
    create: { clave, datos: valor, bytes: valor.length },
  });
  claves.add(clave);
  return `ref:${clave}`;
}

/**
 * Le devuelve al volcado los bytes de las imágenes, sacándolos del almacén.
 *
 * Si alguna ya no está —se tiró como huérfana antes de que existiera el aviso
 * de que una copia la necesitaba— esa fila se cae del volcado en vez de
 * restaurarse a medias: `Imagen.datos` no admite nulo, y una fila sin imagen
 * rompería la restauración entera por un sprite.
 */
async function conLasImagenes(
  volcado: Volcado,
  /**
   * Las claves que la copia apuntó al guardarse. Son imprescindibles para las
   * copias **aligeradas a posteriori**: esas son de antes del almacén, no
   * tienen tabla `Imagen` dentro, y sus imágenes se convirtieron en
   * referencias. Sin esta lista el fichero saldría con referencias y sin
   * ninguna imagen, que es justo lo que no puede pasar.
   */
  claves: string[] = [],
): Promise<Volcado> {
  if (volcado.formato !== 2) return volcado;

  const filas = volcado.tablas[TABLA_IMAGENES] ?? [];
  const todas = new Set<string>(claves);
  for (const fila of filas) {
    const clave = String(fila.clave ?? "");
    if (clave) todas.add(clave);
  }
  if (!todas.size) return { ...volcado, formato: 1 };

  const guardadas = await prisma.imagen.findMany({
    where: { clave: { in: [...todas] } },
    select: { clave: true, datos: true, bytes: true, createdAt: true },
  });

  return {
    ...volcado,
    formato: 1,
    /**
     * La tabla se rehace entera desde el almacén. Una imagen que ya no esté
     * —se tiró como huérfana antes de que las copias avisaran de cuáles
     * necesitaban— se queda fuera en vez de restaurarse a medias:
     * `Imagen.datos` no admite nulo y una fila coja rompería la restauración
     * entera por un sprite.
     */
    tablas: { ...volcado.tablas, [TABLA_IMAGENES]: guardadas },
  };
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
    // Dentro de la base de datos va sin imágenes: ya están en el almacén
    const { ligero, claves } = await sinLasImagenes(volcado);
    const json = JSON.stringify(ligero);
    const comprimido = gzipSync(Buffer.from(json, "utf8")).toString("base64");

    const copia = await prisma.backup.update({
      where: { id: reservaId },
      data: {
        summary: resumir(volcado),
        rawSize: Buffer.byteLength(json, "utf8"),
        payload: comprimido,
        imagenes: claves,
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
  const filas = await prisma.$queryRaw<{ payload: string; imagenes: string[] | null }[]>`
    select "payload", "imagenes" from "Backup" where "id" = ${id}
  `;
  if (!filas.length) return null;
  const json = gunzipSync(Buffer.from(filas[0].payload, "base64")).toString("utf8");
  /**
   * Sale de aquí **siempre entero** (formato 1), con las imágenes puestas: lo
   * usan tanto restaurar como el fichero que se descarga, y ninguno de los dos
   * quiere saber cómo estaba guardado por dentro.
   */
  return conLasImagenes(JSON.parse(json) as Volcado, filas[0].imagenes ?? []);
}

/**
 * Aligera **una** copia ya guardada: le saca las imágenes de dentro y las deja
 * en el almacén, que es donde tienen que estar.
 *
 * Hace falta porque las copias de antes llevan las imágenes pegadas dentro de
 * cada fila, y esas no encogen solas por mucho que se arregle la base de datos:
 * son un JSON ya escrito. Esto lo reescribe.
 *
 * **Va de una en una a propósito.** Una copia descomprimida son decenas de
 * megas en memoria; hacerlas todas de un tirón se comería el tiempo y la
 * memoria del servidor. Se pulsa el botón las veces que haga falta y cada
 * pulsación dice cuántas quedan.
 */
export async function aligerarUnaCopia(): Promise<{
  hecha: boolean;
  quedan: number;
  antes: number;
  despues: number;
} | null> {
  /**
   * En SQL y no con `imagenes: { isEmpty: true }`: a las copias que ya estaban
   * cuando se añadió la columna, PostgreSQL les puso **NULL**, y para Prisma
   * eso no es una lista vacía, así que no las encontraba ninguna.
   */
  const pendientes = await prisma.$queryRaw<{ id: string }[]>`
    select "id" from "Backup"
    where "rawSize" > 0 and coalesce(array_length("imagenes", 1), 0) = 0
    order by "createdAt" desc
  `;
  if (!pendientes.length) return null;

  const id = pendientes[0].id;
  const [fila] = await prisma.$queryRaw<{ payload: string }[]>`
    select "payload" from "Backup" where "id" = ${id}
  `;
  if (!fila) return null;

  const antes = fila.payload.length;
  const volcado = JSON.parse(
    gunzipSync(Buffer.from(fila.payload, "base64")).toString("utf8"),
  ) as Volcado;

  /**
   * Las imágenes que lleve dentro se guardan en el almacén —las de la tabla
   * `Imagen` del propio volcado también, que en una copia vieja vienen con sus
   * bytes— y en su sitio queda la referencia.
   */
  for (const registro of volcado.tablas[TABLA_IMAGENES] ?? []) {
    const clave = String(registro.clave ?? "");
    const datos = registro[COLUMNA_IMAGEN];
    if (clave && typeof datos === "string") {
      await prisma.imagen.upsert({
        where: { clave },
        update: {},
        create: { clave, datos, bytes: datos.length },
      });
    }
  }

  const { ligero, claves } = await sinLasImagenes(volcado);
  const json = JSON.stringify(ligero);
  const comprimido = gzipSync(Buffer.from(json, "utf8")).toString("base64");

  await prisma.backup.update({
    where: { id },
    data: {
      payload: comprimido,
      rawSize: Buffer.byteLength(json, "utf8"),
      imagenes: claves,
    },
  });
  // Sin esto el hueco queda marcado como libre pero la tabla no encoge
  await prisma.$executeRawUnsafe(`vacuum full "Backup"`).catch(() => {});

  return {
    hecha: true,
    quedan: pendientes.length - 1,
    antes,
    despues: comprimido.length,
  };
}

/** Cuántas copias guardadas llevan todavía las imágenes dentro. */
export async function copiasSinAligerar() {
  // Mismo motivo que arriba: las de antes tienen la columna a NULL
  const [fila] = await prisma.$queryRaw<{ n: bigint }[]>`
    select count(*)::bigint as n from "Backup"
    where "rawSize" > 0 and coalesce(array_length("imagenes", 1), 0) = 0
  `;
  return Number(fila?.n ?? 0);
}

/** Comprueba que lo que llega es un volcado de los nuestros antes de tocar nada. */
export function esVolcadoValido(dato: unknown): dato is Volcado {
  if (!dato || typeof dato !== "object") return false;
  const posible = dato as Partial<Volcado>;
  if (posible.formato !== 1 && posible.formato !== 2) return false;
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
  const columnasReales = await columnasPorTabla();

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

        /**
         * Se insertan **solo las columnas que trae la copia**, no todas.
         *
         * Una copia de hace un mes no sabe nada de las columnas que se hayan
         * añadido después, y `json_populate_recordset` las devuelve a null. Si
         * esa columna no admite nulo —porque tiene valor por defecto—, la
         * restauración entera se caía con un error del tipo "null value in
         * column ... violates not-null constraint". Dejándolas fuera del
         * `insert`, cada una toma su valor por defecto, que es lo que querría
         * cualquiera al restaurar algo antiguo.
         */
        const presentes = (columnasReales.get(tabla) ?? []).filter(
          (columna) =>
            !columnasAplazadas.includes(columna) &&
            primeraPasada.some((fila) => columna in fila),
        );
        if (!presentes.length) continue;
        const lista = presentes.map((columna) => `"${columna}"`).join(", ");

        // json_populate_recordset convierte el JSON al tipo exacto de la tabla:
        // fechas, listas y nulos incluidos, sin escribir el mapeo a mano
        await tx.$executeRawUnsafe(
          `insert into "${tabla}" (${lista})
           select ${lista} from json_populate_recordset(null::"${tabla}", $1::json)`,
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
