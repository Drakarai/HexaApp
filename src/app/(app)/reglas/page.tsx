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

export const metadata = { title: "Reglas" };

export default async function RulesPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const [canManage, rules, visto, empezado] = await Promise.all([
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
  ]);

  /** Lo cambiado desde tu última visita, sin contar lo que cambiaste tú */
  const esNuevaParaMi = (rule: (typeof rules)[number]) =>
    Boolean(
      rule.cambiadaAt &&
        rule.cambiadaPorId !== user.id &&
        (!visto || rule.cambiadaAt > visto.seenAt),
    );

  const categories = [...new Set(rules.map((rule) => rule.category ?? "General"))];

  return (
    <>
      <PageHeader
        title="Reglas del locke"
        subtitle={`Normativa de ${competition.name}. ${
          canManage
            ? "Como administrador puedes editarlas, reordenarlas y añadir secciones nuevas."
            : "Solo los administradores pueden modificarlas."
        }`}
      />

      {rules.length === 0 ? (
        <EmptyState
          title="Todavía no hay reglas cargadas"
          hint={
            canManage
              ? "Añade la primera sección con el formulario de abajo."
              : "Pídele a un administrador que las cargue."
          }
        />
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">
                {category}
              </h2>
              <div className="space-y-4">
                {rules
                  .filter((rule) => (rule.category ?? "General") === category)
                  .map((rule) => (
                    <article
                      key={rule.id}
                      className={cx(
                        "card",
                        esNuevaParaMi(rule) && "border-amber-400/40 ring-1 ring-amber-400/20",
                      )}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-white">
                            {rule.title}
                          </h3>
                          {rule.cambiadaAt ? (
                            <p
                              className={cx(
                                "mt-1 text-xs",
                                esNuevaParaMi(rule) ? "text-amber-300" : "text-slate-500",
                              )}
                            >
                              {/* Sin texto de antes es que no existía: se añadió */}
                              {rule.textoAnterior === null ? "🆕 Añadida" : "✏️ Cambiada"}{" "}
                              el {formatDate(rule.cambiadaAt)}
                              {esNuevaParaMi(rule) ? " · no la habías visto" : ""}
                            </p>
                          ) : null}
                        </div>
                        {canManage ? (
                          <div className="flex shrink-0 gap-1">
                            <form action={moveRuleAction}>
                              <input type="hidden" name="ruleId" value={rule.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button
                                className="btn-ghost btn-sm"
                                title="Subir"
                                type="submit"
                              >
                                ↑
                              </button>
                            </form>
                            <form action={moveRuleAction}>
                              <input type="hidden" name="ruleId" value={rule.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button
                                className="btn-ghost btn-sm"
                                title="Bajar"
                                type="submit"
                              >
                                ↓
                              </button>
                            </form>
                            <form action={deleteRuleAction}>
                              <input type="hidden" name="ruleId" value={rule.id} />
                              <ConfirmSubmit
                                message={`¿Borrar la sección "${rule.title}"?`}
                                title="Borrar"
                              >
                                ✕
                              </ConfirmSubmit>
                            </form>
                          </div>
                        ) : null}
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

                      {canManage ? (
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
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {canManage ? (
        <div className="mt-8">
          <NewRuleForm competitionId={competition.id} />
        </div>
      ) : null}
    </>
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
