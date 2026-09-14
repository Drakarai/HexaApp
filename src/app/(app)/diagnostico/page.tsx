import { prisma } from "@/lib/db";
import { requireCreadorPage } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { medirOcupacion, pesar, PLAN_GRATIS } from "@/lib/ocupacion";
import { copiasSinAligerar } from "@/lib/copias";
import { MantenimientoDelAlmacen } from "./almacen-client";
import { cx } from "@/lib/utils";

export const metadata = { title: "Diagnóstico" };
export const dynamic = "force-dynamic";

/**
 * Por qué existe esta pantalla: la aplicación puede ir lenta sin que el código
 * tenga nada raro, simplemente porque el servidor y la base de datos están
 * lejos. Cada consulta cruza esa distancia, y una página hace unas cuantas.
 *
 * Aquí se mide esa distancia de verdad, en el sitio donde está desplegada la
 * aplicación, en vez de suponerla.
 */

/** Ida y vuelta a la base de datos, repetida para quedarse con lo mejor. */
async function medirIdaYVuelta(veces = 8) {
  const tiempos: number[] = [];
  for (let i = 0; i < veces; i++) {
    const t0 = performance.now();
    await prisma.$queryRaw`select 1`;
    tiempos.push(performance.now() - t0);
  }
  tiempos.sort((a, b) => a - b);
  return {
    mejor: tiempos[0],
    mediana: tiempos[Math.floor(tiempos.length / 2)],
    peor: tiempos[tiempos.length - 1],
  };
}

/** Lo que se puede contar de la dirección de la base de datos sin enseñarla. */
function leerConexion() {
  const bruta = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(bruta);
    return {
      servidor: url.hostname,
      // Neon mete la región en el nombre: ...eu-central-1.aws.neon.tech
      region:
        url.hostname.match(
          /(us|eu|ap|sa|ca|me|af)-(east|west|central|north|south|northeast|southeast)-\d/,
        )?.[0] ?? null,
      agrupada: url.hostname.includes("-pooler"),
    };
  } catch {
    return { servidor: null, region: null, agrupada: false };
  }
}

export default async function DiagnosticoPage() {
  await requireCreadorPage();

  const [ida, conexion, ocupacion, copiasPesadas] = await Promise.all([
    medirIdaYVuelta(),
    Promise.resolve(leerConexion()),
    medirOcupacion(),
    copiasSinAligerar(),
  ]);

  /**
   * Lo que crece con cada locke son **las imágenes**: las tablas, los índices y
   * el texto se pagan casi una vez y se quedan ahí. Por eso el «por locke» se
   * mide con las imágenes y no repartiendo el total, que saldría inflado por un
   * esqueleto que ya está pagado.
   */
  const esqueleto = Math.max(0, ocupacion.sinCopias - ocupacion.totalImagenes);
  const porLocke = ocupacion.lockes
    ? ocupacion.totalImagenes / ocupacion.lockes
    : 0;
  /**
   * Se reserva un 40%: las copias de seguridad guardan el conjunto entero —son
   * cinco— y el texto también sube algo según se juega.
   */
  const hueco = PLAN_GRATIS * 0.6 - esqueleto;
  const cabrian = porLocke > 0 ? Math.max(0, Math.floor(hueco / porLocke)) : 0;

  const regionServidor =
    process.env.VERCEL_REGION ?? process.env.FLY_REGION ?? null;
  // Con pooler hace falta la directa para poder crear las tablas al publicar
  const directaConfigurada = Boolean(process.env.DIRECT_URL?.trim());
  const mismaZona =
    conexion.region && regionServidor
      ? conexion.region.slice(0, 2) === traducirRegion(regionServidor)
      : null;

  // Con ~25 consultas por página, así queda el tiempo de espera
  const consultasPorPagina = 25;
  const estimado = Math.round((ida.mediana * consultasPorPagina) / 100) / 10;

  return (
    <>
      <PageHeader
        title="Diagnóstico"
        subtitle="Para saber si la lentitud viene de la distancia a la base de datos."
      />

      <section className="card mb-4">
        <h2 className="section-title mb-1">Ida y vuelta a la base de datos</h2>
        <p className="muted mb-4">
          Lo que tarda una consulta trivial en ir y volver. Es el coste que
          paga <strong>cada</strong> consulta de cada página.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <Cifra
            valor={`${ida.mejor.toFixed(0)} ms`}
            etiqueta="La más rápida"
            tono={tono(ida.mejor)}
          />
          <Cifra
            valor={`${ida.mediana.toFixed(0)} ms`}
            etiqueta="Lo normal"
            tono={tono(ida.mediana)}
          />
          <Cifra
            valor={`${ida.peor.toFixed(0)} ms`}
            etiqueta="La más lenta"
            tono={tono(ida.peor)}
          />
        </div>

        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
          Una página hace unas {consultasPorPagina} consultas, así que a este
          ritmo son <strong>unos {estimado.toFixed(1)} s</strong> de espera solo
          en hablar con la base de datos.{" "}
          {ida.mediana < 15
            ? "Está bien: la base de datos está al lado del servidor."
            : "Es mucho: la base de datos está lejos del servidor, y eso es lo que se nota."}
        </p>
      </section>

      <section className="card mb-4">
        <h2 className="section-title mb-1">Lo que ocupa</h2>
        <p className="muted mb-4">
          Casi todo el peso son imágenes: los sprites y las ilustraciones se
          guardan dentro de la base de datos, no en un servidor de fotos aparte.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <Cifra
            valor={pesar(ocupacion.total)}
            etiqueta="Todo junto"
            tono={
              ocupacion.total > PLAN_GRATIS * 0.8
                ? "mal"
                : ocupacion.total > PLAN_GRATIS * 0.5
                  ? "regular"
                  : "bien"
            }
          />
          <Cifra
            valor={pesar(porLocke)}
            etiqueta={`Imágenes por locke (hay ${ocupacion.lockes})`}
            tono="bien"
          />
          <Cifra
            valor={cabrian ? `~${cabrian}` : "—"}
            etiqueta="Lockes que cabrían"
            tono={cabrian >= 5 ? "bien" : cabrian >= 2 ? "regular" : "mal"}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500">
          El plan gratis de Neon da {pesar(PLAN_GRATIS)}. Lo que crece con cada
          locke son las imágenes; las tablas y el texto ({pesar(esqueleto)}) se
          pagan una vez y valen para todos. La cuenta deja además un 40% libre
          para las copias de seguridad y para lo que engorde cada locke según se
          juega, así que es prudente a propósito.
        </p>

        <h3 className="mt-4 mb-2 text-xs uppercase tracking-wide text-slate-500">
          En qué se va
        </h3>
        <ul className="space-y-1 text-sm">
          {/* El almacén primero: ahí está ahora el peso de verdad */}
          {ocupacion.almacen.cuantas ? (
            <li className="flex items-baseline gap-2 border-b border-white/5 py-1">
              <span className="text-slate-300">Almacén de imágenes</span>
              <span className="ml-auto shrink-0 text-xs text-slate-500 tabular-nums">
                {ocupacion.almacen.cuantas} distintas
              </span>
              <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-slate-200">
                {pesar(ocupacion.almacen.bytes)}
              </span>
            </li>
          ) : null}
          {ocupacion.imagenes.map((fila) => (
            <li
              key={fila.que}
              className="flex items-baseline gap-2 border-b border-white/5 py-1 last:border-0"
            >
              <span className="text-slate-300">{fila.que}</span>
              <span className="ml-auto shrink-0 text-xs text-slate-500 tabular-nums">
                {fila.filas} × {pesar(fila.media)}
              </span>
              <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-slate-200">
                {pesar(fila.total)}
              </span>
            </li>
          ))}
          <li className="flex items-baseline gap-2 pt-1 text-sm">
            <span className="text-slate-400">Copias de seguridad guardadas</span>
            <span className="ml-auto w-20 shrink-0 text-right font-semibold tabular-nums text-slate-200">
              {pesar(ocupacion.copias)}
            </span>
          </li>
          <li className="flex items-baseline gap-2 text-sm">
            <span className="text-slate-400">
              Texto, índices y tablas vacías
            </span>
            <span className="ml-auto w-20 shrink-0 text-right font-semibold tabular-nums text-slate-200">
              {pesar(esqueleto)}
            </span>
          </li>
        </ul>

        <h3 className="mt-4 mb-2 text-xs uppercase tracking-wide text-slate-500">
          Las tablas más gordas
        </h3>
        <p className="text-sm text-slate-400">
          {ocupacion.tablas
            .map((tabla) => `${tabla.nombre} (${pesar(tabla.bytes)})`)
            .join(" · ")}
        </p>

        <h3 className="mt-4 mb-2 text-xs uppercase tracking-wide text-slate-500">
          El almacén de imágenes
        </h3>
        <p className="text-sm text-slate-400">
          {ocupacion.almacen.cuantas} imágenes distintas guardadas (
          {pesar(ocupacion.almacen.bytes)}).{" "}
          {ocupacion.referencias.apuntan} filas apuntan a ellas
          {ocupacion.referencias.sueltas
            ? `, y ${ocupacion.referencias.sueltas} llevan todavía la imagen dentro.`
            : ". No queda ninguna con la imagen dentro."}
        </p>

        <MantenimientoDelAlmacen copiasPesadas={copiasPesadas} />
      </section>

      <section className="card">
        <h2 className="section-title mb-4">Dónde está cada cosa</h2>
        <dl className="space-y-2 text-sm">
          <Dato
            etiqueta="Región del servidor"
            valor={regionServidor ?? "no se sabe (¿estás en local?)"}
          />
          <Dato
            etiqueta="Región de la base de datos"
            valor={conexion.region ?? "no se puede leer del nombre"}
          />
          <Dato
            etiqueta="¿Misma zona del mundo?"
            valor={
              mismaZona === null
                ? "no se puede saber"
                : mismaZona
                  ? "sí"
                  : "NO — aquí está el problema"
            }
            malo={mismaZona === false}
          />
          <Dato
            etiqueta="Conexión agrupada (pooler)"
            valor={conexion.agrupada ? "sí" : "no — conviene activarla"}
            malo={!conexion.agrupada}
          />
          <Dato
            etiqueta="Dirección directa (DIRECT_URL)"
            valor={
              directaConfigurada
                ? "configurada"
                : conexion.agrupada
                  ? "FALTA — hace falta con pooler"
                  : "no hace falta sin pooler"
            }
            malo={conexion.agrupada && !directaConfigurada}
          />
          <Dato etiqueta="Servidor de la base de datos" valor={conexion.servidor ?? "?"} />
        </dl>
      </section>
    </>
  );
}

/** Verde por debajo de 15 ms, ámbar hasta 40, rojo por encima. */
function tono(ms: number) {
  if (ms < 15) return "bien" as const;
  if (ms < 40) return "regular" as const;
  return "mal" as const;
}

function Cifra({
  valor,
  etiqueta,
  tono,
}: {
  valor: string;
  etiqueta: string;
  tono: "bien" | "regular" | "mal";
}) {
  return (
    <div
      className={cx(
        "rounded-xl border p-3",
        tono === "bien"
          ? "border-emerald-500/30 bg-emerald-500/[0.06]"
          : tono === "regular"
            ? "border-amber-400/30 bg-amber-400/[0.06]"
            : "border-red-500/30 bg-red-500/[0.06]",
      )}
    >
      <p className="text-xl font-bold tabular-nums text-white">{valor}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">
        {etiqueta}
      </p>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  malo,
}: {
  etiqueta: string;
  valor: string;
  malo?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2">
      <dt className="text-slate-400">{etiqueta}</dt>
      <dd
        className={cx(
          "font-mono text-xs",
          malo ? "text-red-300" : "text-slate-200",
        )}
      >
        {valor}
      </dd>
    </div>
  );
}

/** "fra1" → "eu", "iad1" → "us"... lo justo para comparar continentes. */
function traducirRegion(region: string) {
  const inicial = region.slice(0, 3).toLowerCase();
  const mapa: Record<string, string> = {
    fra: "eu", cdg: "eu", dub: "eu", lhr: "eu", arn: "eu", zrh: "eu",
    iad: "us", cle: "us", pdx: "us", sfo: "us", gru: "sa",
    hnd: "ap", icn: "ap", sin: "ap", syd: "ap", bom: "ap",
  };
  return mapa[inicial] ?? inicial;
}
