import Link from "next/link";
import { esCreador, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { cx } from "@/lib/utils";

export const metadata = { title: "Guía de uso" };

/**
 * Las guías, para el que se pierda.
 *
 * Los PDF son ficheros estáticos de `public/`, no algo guardado en la base de
 * datos: así se abren igual de rápido para todos, se pueden guardar en el móvil
 * y no hay nada que subir ni que administrar. Se rehacen con los scripts de
 * `guia/` y se suben con el resto del código.
 *
 * Hay dos: la de todos y la de quien lleva un locke. **La segunda solo se le
 * enseña a quien administra alguna edición** —o al Creador—, porque a un
 * jugador no le sirve de nada y solo sería ruido.
 *
 * El visor de aquí dentro solo sale en pantalla grande: en el móvil los
 * navegadores no pintan un PDF metido en la página —o lo descargan, o abren su
 * propio visor—, así que arriba mandan los botones.
 */
export default async function GuiaPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  const user = await requireUser();

  /**
   * Administrar **cualquier** locke abre la guía del administrador. No se mira
   * el locke que se esté viendo: si llevas uno, te vale igual estés donde estés.
   */
  const administraAlgo =
    esCreador(user) ||
    (await prisma.participant.count({
      where: { userId: user.id, isAdmin: true },
    })) > 0;

  const pedida = (await searchParams).g;
  const cual: Cual = pedida === "admin" && administraAlgo ? "admin" : "uso";
  const guia = GUIAS[cual];

  return (
    <>
      <PageHeader
        title="Guía de uso"
        subtitle="El manual de la aplicación, con fotos de cada pantalla. Si algo no sabes dónde está o cómo se apunta, mira aquí antes de preguntar."
      />

      {/* Las pestañas solo tienen sentido si hay dos guías que enseñar */}
      {administraAlgo ? (
        <nav className="mb-4 flex gap-2">
          {(Object.keys(GUIAS) as Cual[]).map((clave) => (
            <Link
              key={clave}
              href={clave === "uso" ? "/guia" : `/guia?g=${clave}`}
              className={cx(
                "chip",
                clave === cual
                  ? "border-brand-500/40 bg-brand-600/20 text-white"
                  : "opacity-60",
              )}
            >
              {GUIAS[clave].pestana}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className="card">
        <h2 className="section-title mb-1">{guia.titulo}</h2>
        <p className="muted mb-4">{guia.de}</p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={guia.pdf}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            📖 Abrirla
          </a>
          <a href={guia.pdf} download className="btn-ghost">
            ⬇️ Guardarla en el móvil
          </a>
          <span className="text-xs text-slate-500">
            {guia.paginas} páginas · PDF · se puede leer sin conexión una vez
            guardada
          </span>
        </div>
      </section>

      <section className="card mt-5">
        <h2 className="section-title mb-3">Lo que cuenta</h2>
        <ul className="grid gap-x-6 gap-y-2 text-sm text-slate-300 sm:grid-cols-2">
          {guia.contenido.map(([pagina, que]) => (
            <li key={que} className="flex items-baseline justify-between gap-3">
              <span>{que}</span>
              <span className="shrink-0 text-xs text-slate-500">pág. {pagina}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* En pantalla grande se lee aquí mismo, sin salir de la aplicación */}
      <section className="mt-5 hidden lg:block">
        <object
          data={`${guia.pdf}#view=FitH`}
          type="application/pdf"
          className="h-[85vh] w-full rounded-xl border border-white/10 bg-ink-950/60"
          aria-label={guia.titulo}
        >
          <p className="p-4 text-sm text-slate-400">
            Tu navegador no sabe enseñar el PDF aquí dentro.{" "}
            <a
              href={guia.pdf}
              target="_blank"
              rel="noreferrer"
              className="text-brand-400 hover:underline"
            >
              Ábrelo aparte
            </a>
            .
          </p>
        </object>
      </section>

      <p className="mt-5 text-center text-xs text-slate-500">
        ¿Sigues con la duda después de mirarla? Pregúntale a quien organiza el
        locke, o mira las{" "}
        <Link href="/reglas" className="text-brand-400 hover:underline">
          reglas de la edición
        </Link>
        , que son otra cosa: la guía explica la aplicación, no el locke.
      </p>
    </>
  );
}

type Cual = "uso" | "admin";

/**
 * Los índices y la cuenta de páginas están **escritos a mano y a propósito**:
 * salen del PDF, que no se puede leer desde aquí. Si se añade o se mueve una
 * página en `guia/*.html`, esto hay que tocarlo también.
 */
const GUIAS: Record<
  Cual,
  {
    pestana: string;
    titulo: string;
    de: string;
    pdf: string;
    paginas: number;
    contenido: [number, string][];
  }
> = {
  uso: {
    pestana: "📖 Guía de uso",
    titulo: "Guía de uso",
    de: "Para todo el mundo: apuntar capturas y bajas, llevar tus gimnasios y no perderte nada.",
    pdf: "/guia-de-uso.pdf",
    paginas: 22,
    contenido: [
      [3, "Entrar y dejarla en el móvil"],
      [4, "Moverte por la app"],
      [5, "La portada del locke"],
      [6, "Apuntar una captura"],
      [7, "El mapa"],
      [8, "Cuando se te muere uno"],
      [9, "Level caps y gimnasios"],
      [10, "Las jornadas"],
      [11, "MVP y puntos"],
      [12, "Retos"],
      [13, "El sorteo de préstamos"],
      [14, "Ruleta y bolsa"],
      [15, "Notas y cobertura de tipos"],
      [16, "Cuando se va la línea"],
      [17, "Tu perfil y la actividad"],
      [18, "El final del locke"],
      [19, "Otras formas de jugar"],
      [20, "Para el que organiza"],
      [21, "Los mapas por dentro"],
      [22, "Dudas rápidas"],
    ],
  },
  admin: {
    pestana: "🛠️ Llevar un locke",
    titulo: "Guía del administrador",
    de: "Para quien lleva una edición: montarla, emparejar las jornadas, anotar resultados y repartir premios.",
    pdf: "/guia-de-administrador.pdf",
    paginas: 13,
    contenido: [
      [2, "Qué puedes y qué no"],
      [3, "Los jugadores, primero"],
      [4, "Reglas y level caps"],
      [5, "Crear una jornada"],
      [6, "Anotar resultados"],
      [7, "Battle Royale"],
      [8, "Los retos"],
      [9, "El sorteo de préstamos"],
      [10, "Puntos y desempates"],
      [11, "Ruleta y bolsa"],
      [12, "Cómo se acaba un locke"],
      [13, "Dudas rápidas"],
    ],
  },
};
