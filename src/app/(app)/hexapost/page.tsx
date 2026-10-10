import Link from "next/link";
import { prisma } from "@/lib/db";
import { esCreador, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ConfirmSubmit, EmptyState } from "@/components/ui";
import { Icono } from "@/components/icono";
import { urlDeContenido } from "@/lib/imagen-url";
import { borrarSugerenciaAction, retirarSugerenciaAction } from "@/app/actions/buzon";
import {
  ESTADOS,
  ESTADOS_PENDIENTES,
  TIPOS_DE_SUGERENCIA,
  esEstadoDeSugerencia,
  esTipoDeSugerencia,
  rotuloDePantalla,
  type EstadoDeSugerencia,
} from "@/lib/buzon";
import { cx, formatDateTime } from "@/lib/utils";
import { ContestarSugerencia, FormularioDeSugerencia, MarcarBuzonVisto } from "./buzon-forms";

export const metadata = { title: "HexaPost" };

/**
 * HexaPost (ver `lib/buzon.ts`). Una pantalla, dos caras: quien juega manda y
 * ve en qué quedó lo suyo; el Creador ve lo de todos y contesta. Es de la
 * aplicación, no de un locke: funciona igual sin ninguno elegido.
 */
export default async function BuzonPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; tipo?: string; fallo?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  if (esCreador(user)) return <Bandeja searchParams={params} />;
  // Desde la pantalla de «Se ha roto algo», con su código (ver `error.tsx`)
  const fallo = params.fallo && /^[\w-]{1,40}$/.test(params.fallo) ? params.fallo : undefined;

  // Solo las suyas, siempre filtradas por quién las mandó
  const mias = await prisma.sugerencia.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader
        title="HexaPost"
        subtitle="¿Algo falla, falta o lo harías de otra forma? Cuéntalo aquí: le llega directamente a quien lleva la aplicación."
      />
      <MarcarBuzonVisto nuevas={false} respuestas={mias.some((s) => !s.vistaPorAutor)} />

      <section className="card">
        <FormularioDeSugerencia fallo={fallo} />
      </section>

      <section className="mt-6">
        <h2 className="section-title">Lo que has mandado</h2>
        {mias.length ? (
          <ul className="mt-3 space-y-3">
            {mias.map((s) => (
              <li key={s.id}>
                <Tarjeta sugerencia={s} nuevaParaTi={!s.vistaPorAutor}>
                  {s.estado === "NUEVA" ? (
                    <form action={retirarSugerenciaAction} className="mt-3">
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmit
                        message="¿Retirarla? Todavía no la ha leído nadie."
                        className="btn-ghost btn-sm"
                      >
                        Retirar
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </Tarjeta>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            dibujo="libreta"
            title="Todavía no has mandado nada"
            hint="Lo que mandes sale aquí, con cuándo lo leen y lo que te contestan."
          />
        )}
      </section>
    </>
  );
}

type Sugerencia = {
  id: string;
  tipo: string;
  titulo: string;
  texto: string;
  pantalla: string | null;
  imagen: string | null;
  estado: string;
  respuesta: string | null;
  createdAt: Date;
};

function Tarjeta({
  sugerencia: s,
  autor,
  nuevaParaTi = false,
  children,
}: {
  sugerencia: Sugerencia;
  autor?: React.ReactNode;
  /** Le han contestado o cambiado el estado desde la última vez que entró */
  nuevaParaTi?: boolean;
  children?: React.ReactNode;
}) {
  const tipo = esTipoDeSugerencia(s.tipo) ? TIPOS_DE_SUGERENCIA[s.tipo] : null;
  const estado = ESTADOS[esEstadoDeSugerencia(s.estado) ? s.estado : "NUEVA"];
  const pantalla = rotuloDePantalla(s.pantalla);
  // Siempre es una referencia al almacén: es lo único que guarda la acción
  const captura = s.imagen?.startsWith("ref:") ? urlDeContenido(s.imagen) : null;

  return (
    <article className={cx("card", nuevaParaTi && "ring-1 ring-amber-400/40")}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 text-lg text-slate-400">
          <Icono emoji={tipo?.icono ?? "💬"} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold text-white">{s.titulo}</h3>
            <span className={cx("chip", estado.clase)}>{estado.rotulo}</span>
            {nuevaParaTi ? (
              <span className="text-xs font-semibold text-amber-300">Novedades</span>
            ) : null}
          </div>
          {/* En la bandeja, primero quién lo manda */}
          {autor}
          <p className="mt-0.5 text-xs text-slate-500">
            {[autor ? null : tipo?.rotulo, pantalla ?? "En general", formatDateTime(s.createdAt)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{s.texto}</p>
          {captura ? (
            <a href={captura} target="_blank" rel="noreferrer" className="mt-3 inline-block">
              {/* Del almacén de imágenes, con su propia dirección */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captura}
                alt="Captura adjunta"
                className="max-h-48 rounded-lg border border-white/10"
              />
            </a>
          ) : null}
          {s.respuesta ? (
            <div className="mt-3 rounded-lg border border-brand-500/25 bg-brand-600/10 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Respuesta</p>
              <p className="mt-0.5 whitespace-pre-line text-sm text-slate-200">{s.respuesta}</p>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </article>
  );
}

const FILTROS = [
  { valor: "pendientes", rotulo: "Por resolver" },
  { valor: "hechas", rotulo: "Hechas" },
  { valor: "descartadas", rotulo: "Descartadas" },
  { valor: "todas", rotulo: "Todas" },
] as const;
type Filtro = (typeof FILTROS)[number]["valor"];

const ESTADOS_DEL_FILTRO: Record<Filtro, EstadoDeSugerencia[] | null> = {
  pendientes: ESTADOS_PENDIENTES,
  hechas: ["HECHA"],
  descartadas: ["DESCARTADA"],
  todas: null,
};

/** Lo que ve el Creador: lo de todos, por resolver primero */
async function Bandeja({ searchParams }: { searchParams: { ver?: string; tipo?: string } }) {
  const ver: Filtro = FILTROS.some((f) => f.valor === searchParams.ver)
    ? (searchParams.ver as Filtro)
    : "pendientes";
  const tipo = searchParams.tipo && esTipoDeSugerencia(searchParams.tipo) ? searchParams.tipo : null;
  const estados = ESTADOS_DEL_FILTRO[ver];

  const [lista, cuentas] = await Promise.all([
    prisma.sugerencia.findMany({
      where: {
        ...(estados ? { estado: { in: estados } } : {}),
        ...(tipo ? { tipo } : {}),
      },
      // Las más viejas sin resolver, arriba: son las que más esperan
      orderBy: { createdAt: ver === "pendientes" ? "asc" : "desc" },
      take: 100,
      include: { user: { select: { displayName: true, username: true } } },
    }),
    prisma.sugerencia.groupBy({ by: ["estado"], _count: { _all: true } }),
  ]);

  const cuantas = (filtro: Filtro) => {
    const valen = ESTADOS_DEL_FILTRO[filtro];
    return cuentas
      .filter((c) => !valen || valen.includes(c.estado as EstadoDeSugerencia))
      .reduce((total, c) => total + c._count._all, 0);
  };
  const enlace = (cambios: { ver?: Filtro; tipo?: string | null }) => {
    const params = new URLSearchParams();
    const v = cambios.ver ?? ver;
    const t = cambios.tipo === undefined ? tipo : cambios.tipo;
    if (v !== "pendientes") params.set("ver", v);
    if (t) params.set("tipo", t);
    const query = params.toString();
    return query ? `/hexapost?${query}` : "/hexapost";
  };
  const nuevas = lista.some((s) => s.estado === "NUEVA");

  return (
    <>
      <PageHeader
        title="HexaPost"
        subtitle="Lo que os cuentan quienes usan la aplicación: errores, mejoras y cambios. Al abrirlo, lo que acaba de llegar pasa a «Leída» para quien lo mandó."
      />
      <MarcarBuzonVisto nuevas={nuevas} respuestas={false} />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={enlace({ ver: f.valor })}
            className={cx("chip", f.valor === ver && "border-brand-500/40 bg-brand-600/20 text-white")}
          >
            {f.rotulo} · {cuantas(f.valor)}
          </Link>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <Link
          href={enlace({ tipo: null })}
          className={cx("chip", !tipo && "border-brand-500/40 bg-brand-600/20 text-white")}
        >
          De todo
        </Link>
        {Object.entries(TIPOS_DE_SUGERENCIA).map(([valor, datos]) => (
          <Link
            key={valor}
            href={enlace({ tipo: valor })}
            className={cx("chip", tipo === valor && "border-brand-500/40 bg-brand-600/20 text-white")}
          >
            <Icono emoji={datos.icono} /> {datos.rotulo}
          </Link>
        ))}
      </div>

      {lista.length ? (
        <ul className="space-y-3">
          {lista.map((s) => (
            <li key={s.id}>
              <Tarjeta
                sugerencia={s}
                autor={
                  <p className="mt-0.5 text-xs text-slate-400">
                    {TIPOS_DE_SUGERENCIA[s.tipo as keyof typeof TIPOS_DE_SUGERENCIA]?.rotulo ?? s.tipo} de{" "}
                    <span className="font-semibold text-slate-200">{s.user.displayName}</span>{" "}
                    <span className="text-slate-500">@{s.user.username}</span>
                    {s.estado === "NUEVA" ? (
                      <span className="ml-2 font-semibold text-amber-300">Nueva</span>
                    ) : null}
                  </p>
                }
              >
                {s.dispositivo ? (
                  <details className="mt-2 text-xs text-slate-500">
                    <summary className="cursor-pointer">Dispositivo</summary>
                    <p className="mt-1 break-words">{s.dispositivo}</p>
                  </details>
                ) : null}
                <div className="mt-3 border-t border-white/5 pt-3">
                  <ContestarSugerencia
                    id={s.id}
                    estado={esEstadoDeSugerencia(s.estado) ? s.estado : "NUEVA"}
                    respuesta={s.respuesta}
                  />
                  <form action={borrarSugerenciaAction} className="mt-2 text-right">
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmSubmit message="¿Borrarla del todo? Quien la mandó dejará de verla.">✕</ConfirmSubmit>
                  </form>
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          dibujo="libreta"
          title={ver === "pendientes" ? "Nada por resolver" : "Aquí no hay nada"}
          hint="Lo que manden los jugadores desde Lo mío → HexaPost llega aquí."
        />
      )}
    </>
  );
}
