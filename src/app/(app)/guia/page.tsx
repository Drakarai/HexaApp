import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Guía de uso" };

/** Dónde vive el PDF. Lo genera `guia/pdf.mjs` y viaja con el despliegue. */
const PDF = "/guia-de-uso.pdf";

/**
 * El manual de la aplicación, para el que se pierda.
 *
 * El PDF es un fichero estático de `public/`, no algo guardado en la base de
 * datos: así se abre igual de rápido para todos, se puede guardar en el móvil
 * y no hay nada que subir ni que administrar. Se rehace con los scripts de
 * `guia/` y se sube con el resto del código.
 *
 * El visor de aquí dentro solo sale en pantalla grande: en el móvil los
 * navegadores no pintan un PDF metido en la página —o lo descargan, o abren su
 * propio visor—, así que arriba mandan los botones.
 */
export default async function GuiaPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Guía de uso"
        subtitle="El manual de la aplicación, con fotos de cada pantalla. Si algo no sabes dónde está o cómo se apunta, mira aquí antes de preguntar."
      />

      <section className="card">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={PDF}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            📖 Abrir la guía
          </a>
          <a href={PDF} download className="btn-ghost">
            ⬇️ Guardarla en el móvil
          </a>
          <span className="text-xs text-slate-500">
            20 páginas · PDF · se puede leer sin conexión una vez guardada
          </span>
        </div>
      </section>

      <section className="card mt-5">
        <h2 className="section-title mb-3">Lo que cuenta</h2>
        <ul className="grid gap-x-6 gap-y-2 text-sm text-slate-300 sm:grid-cols-2">
          {CONTENIDO.map(([pagina, que]) => (
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
          data={`${PDF}#view=FitH`}
          type="application/pdf"
          className="h-[85vh] w-full rounded-xl border border-white/10 bg-ink-950/60"
          aria-label="Guía de uso de HexaApp"
        >
          <p className="p-4 text-sm text-slate-400">
            Tu navegador no sabe enseñar el PDF aquí dentro.{" "}
            <a href={PDF} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">
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

/**
 * El índice, escrito a mano y a propósito: sale del PDF, que no se puede leer
 * desde aquí. Si se añade o se mueve una página en `guia/guia.html`, esta
 * lista hay que tocarla también.
 */
const CONTENIDO: [number, string][] = [
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
  [13, "Ruleta y bolsa"],
  [14, "Notas y cobertura de tipos"],
  [15, "Tu perfil y la actividad"],
  [16, "El final del locke"],
  [17, "Otras formas de jugar"],
  [18, "Para el que organiza"],
  [19, "Los mapas por dentro"],
  [20, "Dudas rápidas"],
];
