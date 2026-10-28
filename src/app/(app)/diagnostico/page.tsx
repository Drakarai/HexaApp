import { prisma } from "@/lib/db";
import { requireCreadorPage } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { medirOcupacion, pesar, PLAN_GRATIS } from "@/lib/ocupacion";
import { copiasSinAligerar } from "@/lib/copias";
import { MantenimientoDelAlmacen } from "./almacen-client";
import { cx, formatDateTime } from "@/lib/utils";
import { getErroresAgrupados, type GrupoDeErrores } from "@/lib/errores";
import { resolverErrorAction, vaciarErroresAction } from "@/app/actions/errores";
import { ConfirmSubmit } from "@/components/ui";
import Link from "next/link";
import { PestanasEnlace } from "@/components/pestanas-enlace";
import { ZONAS, type Zona } from "@/lib/registro";
import { verComoAction } from "@/app/actions/ver-como";

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

/** Las pestañas de Diagnóstico: el registro de cambios primero, que es lo que más se mira */
const PESTANAS = [
  { valor: "cambios", rotulo: "Cambios" },
  { valor: "errores", rotulo: "Errores" },
  { valor: "base", rotulo: "Base de datos" },
  { valor: "ver-como", rotulo: "Ver como" },
] as const;
type QueVer = (typeof PESTANAS)[number]["valor"];

export default async function DiagnosticoPage({
  searchParams,
}: {
  searchParams: Promise<{ locke?: string; zona?: string; ver?: string }>;
}) {
  await requireCreadorPage();
  const filtro = await searchParams;
  const ver: QueVer = PESTANAS.some((p) => p.valor === filtro.ver) ? (filtro.ver as QueVer) : "cambios";
  const zona = filtro.zona && filtro.zona in ZONAS ? (filtro.zona as Zona) : null;

  // Solo lo de la pestaña que se mira: medir la base de datos son una docena de consultas
  const [errores, cambios, lockesDelRegistro] = await Promise.all([
    getErroresAgrupados(),
    ver === "cambios"
      ? prisma.cambioDelLocke.findMany({
          where: {
            ...(filtro.locke ? { competitionId: filtro.locke === "app" ? null : filtro.locke } : {}),
            ...(zona ? { zona } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : [],
    // Los lockes que salen en el registro, con el último nombre que tenían
    ver === "cambios"
      ? prisma.cambioDelLocke.findMany({
          distinct: ["competitionId"],
          orderBy: { createdAt: "desc" },
          select: { competitionId: true, locke: true },
        })
      : [],
  ]);
  const vecesQueHaFallado = errores.reduce((suma, g) => suma + g.veces, 0);

  return (
    <>
      <PageHeader
        title="Diagnóstico"
        subtitle="Lo que se cambia en cada locke, lo que falla y cómo va la base de datos."
      />

      <PestanasEnlace
        className="mb-4"
        etiqueta="Partes de Diagnóstico"
        activa={ver}
        opciones={PESTANAS.map((p) => ({
          ...p,
          href: p.valor === "cambios" ? "/diagnostico" : `/diagnostico?ver=${p.valor}`,
          cuenta: p.valor === "errores" ? vecesQueHaFallado : undefined,
        }))}
      />

      {ver === "cambios" ? (
        <Cambios
          cambios={cambios}
          lockes={lockesDelRegistro}
          lockeElegido={filtro.locke ?? null}
          zonaElegida={zona}
        />
      ) : ver === "errores" ? (
        <Errores grupos={errores} />
      ) : ver === "ver-como" ? (
        <VerComo />
      ) : (
        <BaseDeDatos />
      )}
    </>
  );
}

/** Lo de la base de datos: lo que tarda, lo que ocupa y dónde está cada cosa */
async function BaseDeDatos() {
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

/**
 * Lo que le ha fallado a la gente, del navegador o del servidor, agrupado (ver
 * lib/errores.ts). Va lo primero porque es lo que se viene a mirar cuando
 * alguien dice «me ha petado»; aunque lo normal es enterarse aquí antes.
 */
function Errores({ grupos }: { grupos: GrupoDeErrores[] }) {
  const total = grupos.reduce((suma, g) => suma + g.veces, 0);
  return (
    <section className="card mb-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="section-title">Errores de la app</h2>
        {grupos.length ? (
          <form action={vaciarErroresAction} className="ml-auto">
            <ConfirmSubmit message="¿Vaciar el registro de errores entero?" className="btn-ghost btn-sm">
              Vaciar
            </ConfirmSubmit>
          </form>
        ) : null}
      </div>
      <p className="muted mb-4">
        Lo que se ha roto en los últimos 30 días, en el móvil de alguien o en el
        servidor, con quién y dónde. Los iguales van juntos.
        {total ? ` ${total} en total.` : ""}
      </p>

      {grupos.length ? (
        <ul className="space-y-2">
          {grupos.map((g) => (
            <li key={g.huella}>
              <details className="group rounded-xl border border-white/10 bg-white/[0.02]">
                <summary className="flex cursor-pointer list-none items-start gap-3 p-3 marker:hidden">
                  <span
                    className={cx(
                      "chip shrink-0 text-[10px]",
                      g.origen === "servidor" ? "text-amber-200" : "text-sky-200",
                    )}
                  >
                    {g.origen === "servidor" ? "Servidor" : "Navegador"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-100 group-open:whitespace-normal">
                      {g.mensaje}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {g.veces === 1 ? "Una vez" : `${g.veces} veces`} · la última el{" "}
                      {formatDateTime(g.ultima)}
                      {g.quienes.length ? ` · ${g.quienes.join(", ")}` : ""}
                    </span>
                  </span>
                </summary>
                <div className="space-y-2 border-t border-white/10 p-3 text-xs">
                  {g.rutas.length ? (
                    <p className="text-slate-400">
                      <span className="text-slate-500">Dónde: </span>
                      {g.rutas.slice(0, 6).join(" · ")}
                    </p>
                  ) : null}
                  {g.codigos.length ? (
                    <p className="text-slate-400">
                      <span className="text-slate-500">Códigos del fallo: </span>
                      <span className="font-mono">{g.codigos.slice(0, 4).join(", ")}</span>
                    </p>
                  ) : null}
                  <p className="text-slate-500">Desde el {formatDateTime(g.primera)}</p>
                  {g.detalle ? (
                    <pre className="max-h-56 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-slate-400">
                      {g.detalle}
                    </pre>
                  ) : null}
                  <form action={resolverErrorAction}>
                    <input type="hidden" name="huella" value={g.huella} />
                    <button type="submit" className="btn-ghost btn-sm">
                      Ya está arreglado
                    </button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-sm text-emerald-200">
          Ni un fallo apuntado. Así da gusto.
        </p>
      )}
    </section>
  );
}

type FilaDeCambio = {
  id: string;
  createdAt: Date;
  competitionId: string | null;
  locke: string | null;
  quien: string | null;
  zona: string;
  texto: string;
};

/**
 * El registro de cambios: quién tocó qué en cada locke. Es lo que contesta a
 * «yo no cambié ese resultado». Se filtra por locke y por zona con enlaces,
 * para que funcione sin esperar a que cargue nada.
 */
function Cambios({
  cambios,
  lockes,
  lockeElegido,
  zonaElegida,
}: {
  cambios: FilaDeCambio[];
  lockes: { competitionId: string | null; locke: string | null }[];
  lockeElegido: string | null;
  zonaElegida: Zona | null;
}) {
  const enlace = (locke: string | null, zona: Zona | null) => {
    const params = new URLSearchParams();
    if (locke) params.set("locke", locke);
    if (zona) params.set("zona", zona);
    const query = params.toString();
    return `/diagnostico${query ? `?${query}` : ""}#cambios`;
  };
  const chip = (activo: boolean) =>
    cx("chip text-xs transition", activo ? "border-brand-400/60 bg-brand-600/20 text-white" : "hover:bg-white/10");

  // Por días, como un diario: lo de hoy arriba
  const dias = new Map<string, FilaDeCambio[]>();
  for (const cambio of cambios) {
    const dia = cambio.createdAt.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Madrid",
    });
    dias.set(dia, [...(dias.get(dia) ?? []), cambio]);
  }

  return (
    <section id="cambios" className="card mb-4 scroll-mt-20">
      <h2 className="section-title mb-1">Registro de cambios</h2>
      <p className="muted mb-3">
        Lo que hace quien administra cada locke —resultados, jornadas, puntos, reglas, bolsas,
        gimnasios, jugadores— con quién lo hizo y cuándo. Se guarda medio año.
      </p>

      <div className="fila-de-filtros mb-2">
        <Link href={enlace(null, zonaElegida)} className={chip(!lockeElegido)}>
          Todos los lockes
        </Link>
        {lockes.map((l) => (
          <Link
            key={l.competitionId ?? "app"}
            href={enlace(l.competitionId ?? "app", zonaElegida)}
            className={chip(lockeElegido === (l.competitionId ?? "app"))}
          >
            {l.competitionId ? (l.locke ?? "Locke borrado") : "De toda la app"}
          </Link>
        ))}
      </div>
      <div className="fila-de-filtros mb-4">
        <Link href={enlace(lockeElegido, null)} className={chip(!zonaElegida)}>
          Todo
        </Link>
        {(Object.keys(ZONAS) as Zona[]).map((z) => (
          <Link key={z} href={enlace(lockeElegido, z)} className={chip(zonaElegida === z)}>
            {ZONAS[z]}
          </Link>
        ))}
      </div>

      {cambios.length ? (
        <div className="space-y-4">
          {[...dias].map(([dia, filas]) => (
            <div key={dia}>
              <p className="rotulo mb-1.5">{dia}</p>
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
                {filas.map((c) => (
                  <li key={c.id} className="flex gap-3 px-3 py-2 text-sm">
                    <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-slate-500">
                      {c.createdAt.toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Madrid",
                      })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-slate-100">
                        <span className="font-semibold">{c.quien ?? "Alguien"}</span> · {c.texto}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {ZONAS[c.zona as Zona] ?? c.zona}
                        {!lockeElegido && c.locke ? ` · ${c.locke}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-slate-400">
          {lockeElegido || zonaElegida ? "Nada con ese filtro." : "Todavía no se ha apuntado ningún cambio."}
        </p>
      )}
    </section>
  );
}

/**
 * Ponerse en la piel de otro papel para ver la app como la ve la gente: sin
 * los botones de administrar, sin Diagnóstico ni Administración. Ver `VER_COMO`.
 */
function VerComo() {
  return (
    <section className="card mb-4">
      <h2 className="section-title mb-1">Ver la app como…</h2>
      <p className="muted mb-3">
        Para comprobar qué ve cada uno sin pedirle una captura. Mientras dura no eres Creador
        ni administras ningún locke, también al guardar: no se puede tocar nada sin querer.
        Arriba de cada pantalla sale el botón para volver, y se quita solo a las seis horas.
      </p>
      <div className="flex flex-wrap gap-2">
        <form action={verComoAction}>
          <input type="hidden" name="modo" value="jugador" />
          <button type="submit" className="btn-ghost">
            Como jugador
          </button>
        </form>
        <form action={verComoAction}>
          <input type="hidden" name="modo" value="espectador" />
          <button type="submit" className="btn-ghost">
            Como espectador
          </button>
        </form>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        De jugador, en los lockes que juegas ves lo tuyo como cualquiera; en los demás, como un
        espectador. Es por papel y no por persona: la caja y las notas de cada uno siguen siendo
        suyas.
      </p>
    </section>
  );
}
