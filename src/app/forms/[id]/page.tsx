import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import FillForm from "@/components/FillForm";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/session";
import { isRegistered } from "@/lib/googleContacts";
import type { QuestionType } from "@/lib/questions";

// Page de remplissage d'un formulaire. Accessible seulement si publié
// (les admins peuvent prévisualiser un brouillon).
export default async function FillFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ annulee?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { annulee } = await searchParams;

  const form = await prisma.form.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } }, label: true },
  });
  if (!form) notFound();
  if (!form.isPublished && !isAdmin(user.email)) notFound();

  // Déjà inscrit : membre du libellé Contacts associé au formulaire (lu dans Google
  // Contacts, avec cache). Sa réponse est alors figée.
  const alreadyRegistered = form.labelResource
    ? await isRegistered(form.labelResource, user.email)
    : false;

  // Déjà inscrit : on n'affiche pas du tout le formulaire, mais une page qui l'explique.
  if (alreadyRegistered) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <div className="text-4xl">🎫</div>
            <h1 className="mt-3 text-xl font-semibold text-zinc-900">Vous êtes déjà inscrit</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Vous faites déjà partie {form.label ? `du groupe « ${form.label.name} »` : "des inscrits"} :
              il n&apos;est plus possible de répondre au formulaire « {form.title} ».
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Contactez le club si une de vos informations a changé.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

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
            Aperçu — ce formulaire est {form.firstPublishedAt ? "clôturé" : "en brouillon"} (non accessible
            aux utilisateurs).
          </div>
        )}
        {annulee === "1" && !existing && (
          <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600">
            Votre inscription a été annulée. Vous pouvez vous réinscrire en remplissant à nouveau ce
            formulaire.
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
          headerImageUrl={form.headerImageUrl}
          respondentEmail={user.email}
          locked={locked}
          alreadyAnswered={!!existing}
          termsText={form.termsEnabled ? form.termsText : ""}
          termsAlreadyAccepted={!!existing?.termsAcceptedAt}
          questions={form.questions.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            type: q.type as QuestionType,
            required: q.required,
            options: q.options,
            format: q.format,
            verifyEmail: q.verifyEmail,
          }))}
          previousAnswers={previousAnswers}
        />
      </main>
    </>
  );
}
