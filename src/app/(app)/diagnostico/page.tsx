import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
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
  await requireAdmin();

  const [ida, conexion] = await Promise.all([
    medirIdaYVuelta(),
    Promise.resolve(leerConexion()),
  ]);

  const regionServidor =
    process.env.VERCEL_REGION ?? process.env.FLY_REGION ?? null;
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
