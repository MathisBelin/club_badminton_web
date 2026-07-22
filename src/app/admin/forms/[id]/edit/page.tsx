import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import FormBuilder from "@/components/FormBuilder";
import { ShareLinkBar } from "@/components/ShareLink";

// Constructeur d'un formulaire (structure + paramètres).
export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!form || form.ownerEmail.toLowerCase() !== user.email.toLowerCase()) notFound();

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Retour aux formulaires
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {form.isPublished ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Accessible
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
              Brouillon
            </span>
          )}
          <Link href={`/forms/${form.id}`} className="text-emerald-700 hover:underline" target="_blank">
            Aperçu ↗
          </Link>
        </div>
      </div>

      {form.isPublished ? (
        <div className="mb-6">
          <ShareLinkBar path={`/forms/${form.id}`} />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
          Ce formulaire est en brouillon. Rendez-le <strong>accessible</strong> (depuis « Mes formulaires »)
          pour obtenir un lien de partage à diffuser.
        </div>
      )}

      <FormBuilder
        initial={{
          formId: form.id,
          title: form.title,
          description: form.description,
          allowEditResponse: form.allowEditResponse,
          singleResponse: form.singleResponse,
          questions: form.questions.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            type: q.type,
            required: q.required,
            options: q.options,
          })),
        }}
      />
    </>
  );
}
