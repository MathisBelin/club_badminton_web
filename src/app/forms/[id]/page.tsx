import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import FillForm from "@/components/FillForm";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/session";
import type { QuestionType } from "@/lib/questions";

// Page de remplissage d'un formulaire. Accessible seulement si publié
// (les admins peuvent prévisualiser un brouillon).
export default async function FillFormPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!form) notFound();
  if (!form.isPublished && !isAdmin(user.email)) notFound();

  const existing = await prisma.response.findUnique({
    where: { formId_respondentEmail: { formId: form.id, respondentEmail: user.email } },
    include: { answers: true },
  });
  const previousAnswers: Record<string, string> = {};
  existing?.answers.forEach((a) => {
    previousAnswers[a.questionId] = a.value;
  });

  const locked = !!existing && !form.allowEditResponse;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {!form.isPublished && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Aperçu — ce formulaire est en brouillon (non accessible aux utilisateurs).
          </div>
        )}
        {existing && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            Vous avez déjà répondu.{" "}
            {form.allowEditResponse ? "Vous pouvez modifier votre réponse ci-dessous." : "La modification n'est pas autorisée."}
          </div>
        )}

        <FillForm
          formId={form.id}
          title={form.title}
          description={form.description}
          respondentEmail={user.email}
          locked={locked}
          questions={form.questions.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            type: q.type as QuestionType,
            required: q.required,
            options: q.options,
          }))}
          previousAnswers={previousAnswers}
        />
      </main>
    </>
  );
}
