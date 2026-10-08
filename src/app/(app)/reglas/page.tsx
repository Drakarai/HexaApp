import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import { canManageCompetition, getActiveCompetition } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { RichText } from "@/components/rich-text";
import { EmptyState, ConfirmSubmit } from "@/components/ui";
import { deleteRuleAction, moveRuleAction } from "@/app/actions/rules";
import { NewRuleForm, EditRuleForm } from "./rule-forms";
import { lockeEmpezado, queHaCambiado } from "@/lib/reglas";
import { cx, formatDate } from "@/lib/utils";
import { Icono } from "@/components/icono";

export const metadata = { title: "Reglas" };

/** I, II, III…: los títulos del reglamento. No habrá tantos como para pasar de 39 */
function romano(n: number) {
  const cifras: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let resto = n;
  let texto = "";
  for (const [valor, letra] of cifras) {
    while (resto >= valor) {
      texto += letra;
      resto -= valor;
    }
  }
  return texto;
}

/**
 * Las reglas, como un **reglamento**: títulos con número romano (las
 * categorías), artículos numerados seguidos (las secciones) y un índice al
 * lado para saltar a cada uno. Lo cambiado desde tu última visita sale
 * marcado y avisado arriba.
 *
 * Quien administra no ve los botones de mover, borrar y editar en cada
 * artículo mientras lee: están en **«Editar reglas»** (`?editar=1`), que es
 * cuando se necesitan. Antes salían siempre y la normativa parecía un
 * formulario.
 */
export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const [canManage, rules, visto, empezado, { editar }] = await Promise.all([
    canManageCompetition(competition.id, user),
    prisma.ruleSection.findMany({
      where: { competitionId: competition.id },
      orderBy: { position: "asc" },
    }),
    /**
     * Cuándo miraste las reglas por última vez. Se lee **antes** de que la
     * visita de ahora se apunte —eso lo hace el navegador al pintar—, así que
     * sirve para resaltar justo lo que ha cambiado desde entonces.
     */
    prisma.tabSeen.findUnique({
      where: {
        userId_competitionId_tab: {
          userId: user.id,
          competitionId: competition.id,
          tab: "Reglas",
        },
      },
      select: { seenAt: true },
    }),
    lockeEmpezado(competition.id),
    searchParams,
  ]);
  const editando = canManage && editar === "1";

  /** Lo cambiado desde tu última visita, sin contar lo que cambiaste tú */
  const esNuevaParaMi = (rule: (typeof rules)[number]) =>
    Boolean(
      rule.cambiadaAt &&
        rule.cambiadaPorId !== user.id &&
        (!visto || rule.cambiadaAt > visto.seenAt),
    );

  // Los artículos se numeran seguidos, de principio a fin, como en un reglamento
  let articulo = 0;
  const titulos = [...new Set(rules.map((rule) => rule.category ?? "General"))].map((categoria, i) => ({
    categoria,
    numero: romano(i + 1),
    articulos: rules
      .filter((rule) => (rule.category ?? "General") === categoria)
      .map((rule) => ({ rule, numero: ++articulo, nueva: esNuevaParaMi(rule) })),
  }));
  const sinVer = titulos.flatMap((t) => t.articulos.filter((a) => a.nueva));

  return (
    <>
      <PageHeader
        title="Reglas del locke"
        subtitle={
          editando
            ? "Editando: mueve, cambia o borra cada artículo. Lo que cambies les saldrá marcado a los demás."
            : `La normativa de ${competition.name}${rules.length ? `, en ${articulo} artículos` : ""}.`
        }
        actions={
          canManage ? (
            <Link href={editando ? "/reglas" : "/reglas?editar=1"} className={editando ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
              <Icono emoji={editando ? "✅" : "✏️"} /> {editando ? "Terminar" : "Editar reglas"}
            </Link>
          ) : null
        }
      />

      {rules.length === 0 ? (
        <EmptyState
          dibujo="libreta"
          title="Todavía no hay reglas cargadas"
          hint={
            canManage
              ? "Añade la primera sección con el formulario de abajo."
              : "Pídele a un administrador que las cargue."
          }
        />
      ) : (
        <>
          {sinVer.length && !editando ? (
            <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm">
              <p className="font-semibold text-amber-200">
                {sinVer.length === 1 ? "Ha cambiado un artículo" : `Han cambiado ${sinVer.length} artículos`} desde la
                última vez que entraste
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {sinVer.map(({ rule, numero }) => (
                  <a key={rule.id} href={`#articulo-${numero}`} className="text-amber-300/90 hover:underline">
                    Art. {numero} · {rule.title}
                  </a>
                ))}
              </p>
            </div>
          ) : null}

          <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
            <Indice titulos={titulos} />

            <div className="space-y-6">
              {titulos.map((titulo) => (
                <section key={titulo.categoria} aria-labelledby={`titulo-${titulo.numero}`}>
                  <header className="mb-2 px-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">Título {titulo.numero}</p>
                    <h2
                      id={`titulo-${titulo.numero}`}
                      className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-white"
                    >
                      {titulo.categoria}
                    </h2>
                  </header>
                  {/* Una hoja por título, con los artículos separados por una raya:
                      se lee de corrido, como un documento, y no como tarjetas sueltas */}
                  <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
                    {titulo.articulos.map(({ rule, numero, nueva }) => (
                      <article
                        key={rule.id}
                        id={`articulo-${numero}`}
                        className={cx(
                          "flex scroll-mt-24 gap-4 px-4 py-5 sm:px-6",
                          nueva && "bg-amber-400/[0.05] shadow-[inset_3px_0_0_rgb(251_191_36/0.7)]",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cx(
                            "w-9 shrink-0 pt-0.5 text-right font-[family-name:var(--font-display)] text-2xl font-bold leading-none tabular-nums",
                            nueva ? "text-amber-300" : "text-slate-500",
                          )}
                        >
                          {String(numero).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-base font-semibold text-white">
                                <span className="sr-only">Artículo {numero}. </span>
                                {rule.title}
                              </h3>
                              {rule.cambiadaAt ? (
                                <p className={cx("mt-0.5 text-xs", nueva ? "text-amber-300" : "text-slate-500")}>
                                  {/* Sin texto de antes es que no existía: se añadió */}
                                  <Icono emoji={rule.textoAnterior === null ? "🆕" : "✏️"} />{" "}
                                  {rule.textoAnterior === null ? "Añadido" : "Cambiado"} el {formatDate(rule.cambiadaAt)}
                                  {nueva ? " · no lo habías visto" : ""}
                                </p>
                              ) : null}
                            </div>
                            {editando ? <MoverYBorrar id={rule.id} titulo={rule.title} /> : null}
                          </div>

                          <RichText text={rule.body} />

                          {/* Lo que ha cambiado: para que nadie pueda decir que
                              eso no estaba así, ni que siempre lo estuvo */}
                          {rule.textoAnterior !== null ? (
                            <CambiosDeLaRegla
                              tituloAnterior={rule.tituloAnterior}
                              antes={rule.textoAnterior}
                              ahora={rule.body}
                            />
                          ) : null}

                          {editando ? (
                            <EditRuleForm
                              rule={{
                                id: rule.id,
                                title: rule.title,
                                body: rule.body,
                                category: rule.category,
                              }}
                              empezado={empezado}
                            />
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sin reglas no hay nada que editar: el formulario sale ya */}
      {canManage && (editando || rules.length === 0) ? (
        <div className="mt-8">
          <NewRuleForm competitionId={competition.id} />
        </div>
      ) : null}
    </>
  );
}

type TituloDelReglamento = {
  categoria: string;
  numero: string;
  articulos: { rule: { id: string; title: string }; numero: number; nueva: boolean }[];
};

/**
 * El índice: al lado y quieto en el ordenador, plegado arriba en el móvil.
 * Cada artículo lleva a su sitio; los cambiados que no habías visto, con su
 * punto.
 */
function Indice({ titulos }: { titulos: TituloDelReglamento[] }) {
  const lista = (
    <ol className="space-y-3 text-sm">
      {titulos.map((titulo) => (
        <li key={titulo.categoria}>
          <p className="rotulo mb-1">
            {titulo.numero} · {titulo.categoria}
          </p>
          <ol className="space-y-0.5">
            {titulo.articulos.map(({ rule, numero, nueva }) => (
              <li key={rule.id}>
                <a
                  href={`#articulo-${numero}`}
                  className="flex items-baseline gap-2 rounded px-1.5 py-1 text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-500">{numero}</span>
                  <span className="min-w-0 flex-1 leading-snug">{rule.title}</span>
                  {nueva ? <span aria-label="Cambiado" className="h-1.5 w-1.5 shrink-0 self-center rounded-full bg-amber-400" /> : null}
                </a>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
  const total = titulos.reduce((n, t) => n + t.articulos.length, 0);
  return (
    <>
      <details className="card group mb-5 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-200">
          <span className="inline-block transition group-open:rotate-90">▸</span>
          Índice
          <span className="ml-auto text-xs font-normal text-slate-500">{total} artículos</span>
        </summary>
        <div className="mt-3">{lista}</div>
      </details>
      <nav aria-label="Índice de las reglas" className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] overflow-y-auto pr-1 lg:block">
        <p className="antetitulo mb-3">Índice</p>
        {lista}
      </nav>
    </>
  );
}

/** Subir, bajar y borrar un artículo: solo en «Editar reglas» */
function MoverYBorrar({ id, titulo }: { id: string; titulo: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <form action={moveRuleAction}>
        <input type="hidden" name="ruleId" value={id} />
        <input type="hidden" name="direction" value="up" />
        <button className="btn-ghost btn-sm" title="Subir" type="submit">
          ↑
        </button>
      </form>
      <form action={moveRuleAction}>
        <input type="hidden" name="ruleId" value={id} />
        <input type="hidden" name="direction" value="down" />
        <button className="btn-ghost btn-sm" title="Bajar" type="submit">
          ↓
        </button>
      </form>
      <form action={deleteRuleAction}>
        <input type="hidden" name="ruleId" value={id} />
        <ConfirmSubmit message={`¿Borrar la sección "${titulo}"?`} title="Borrar">
          ✕
        </ConfirmSubmit>
      </form>
    </div>
  );
}

/**
 * Las líneas que ha ganado y perdido la regla, y debajo, plegado, cómo estaba
 * entera. Lo primero es lo que se quiere saber; lo segundo, por si hay dudas.
 */
function CambiosDeLaRegla({
  tituloAnterior,
  antes,
  ahora,
}: {
  tituloAnterior: string | null;
  antes: string;
  ahora: string;
}) {
  const { anadidas, quitadas } = queHaCambiado(antes, ahora);
  return (
    <details className="group mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <summary className="cursor-pointer list-none text-xs font-medium text-slate-400">
        <span className="mr-1.5 inline-block transition group-open:rotate-90">▸</span>
        Qué ha cambiado
      </summary>
      <ul className="mt-2 space-y-1.5 text-sm">
        {tituloAnterior ? (
          <li className="text-slate-400">
            Antes se llamaba{" "}
            <span className="line-through">{tituloAnterior}</span>
          </li>
        ) : null}
        {anadidas.map((linea) => (
          <li key={`+${linea}`} className="flex gap-2">
            <span aria-label="Añadido" className="shrink-0 font-bold text-emerald-400">
              +
            </span>
            <RichText text={linea} />
          </li>
        ))}
        {quitadas.map((linea) => (
          <li key={`-${linea}`} className="flex gap-2">
            <span aria-label="Quitado" className="shrink-0 font-bold text-rose-400">
              −
            </span>
            {/* Tachado solo el texto: el signo tachado ya no se lee */}
            <div className="line-through opacity-70">
              <RichText text={linea} />
            </div>
          </li>
        ))}
        {!tituloAnterior && !anadidas.length && !quitadas.length ? (
          <li className="text-slate-500">Solo se movieron líneas de sitio.</li>
        ) : null}
      </ul>
      <details className="group/entera mt-3">
        <summary className="cursor-pointer list-none text-xs text-slate-500">
          <span className="mr-1.5 inline-block transition group-open/entera:rotate-90">▸</span>
          Cómo estaba entera
        </summary>
        <div className="mt-2 opacity-70">
          <RichText text={antes} />
        </div>
      </details>
    </details>
  );
}
