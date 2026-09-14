import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import { canManageCompetition, getActiveCompetition } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { RichText } from "@/components/rich-text";
import { EmptyState, ConfirmSubmit } from "@/components/ui";
import { deleteRuleAction, moveRuleAction } from "@/app/actions/rules";
import { NewRuleForm, EditRuleForm } from "./rule-forms";

export const metadata = { title: "Reglas" };

export default async function RulesPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const canManage = await canManageCompetition(competition.id, user);
  const rules = await prisma.ruleSection.findMany({
    where: { competitionId: competition.id },
    orderBy: { position: "asc" },
  });

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
                    <article key={rule.id} className="card">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-white">
                          {rule.title}
                        </h3>
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

                      {canManage ? (
                        <EditRuleForm
                          rule={{
                            id: rule.id,
                            title: rule.title,
                            body: rule.body,
                            category: rule.category,
                          }}
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
