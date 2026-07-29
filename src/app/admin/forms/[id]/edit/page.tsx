import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import FormBuilder from "@/components/FormBuilder";
import { parseAttachments } from "@/lib/attachments";
import { ShareLinkBar } from "@/components/ShareLink";
import { formStatus, STATUS_BADGE, STATUS_LABEL } from "@/lib/formStatus";
import { PublishToggleButton, SaveTemplateButton } from "@/components/FormActions";
import FormLabelPicker from "@/components/FormLabelPicker";

// Constructeur d'un formulaire (structure + paramètres).
export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } }, label: true },
  });
  if (!form || form.ownerEmail.toLowerCase() !== user.email.toLowerCase()) notFound();

  const status = formStatus(form);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Retour aux formulaires
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          <FormLabelPicker
            formId={form.id}
            labelName={form.label?.name ?? null}
            labelResource={form.labelResource}
          />
          <PublishToggleButton
            formId={form.id}
            isPublished={form.isPublished}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          />
          <SaveTemplateButton formId={form.id} defaultName={form.title} />
          <Link href={`/forms/${form.id}`} className="text-emerald-700 hover:underline" target="_blank">
            Aperçu ↗
          </Link>
        </div>
      </div>

      {form.isPublished ? (
        <div className="mb-6">
          <ShareLinkBar />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
          Ce formulaire est {status === "INACCESSIBLE" ? "clôturé" : "en brouillon"}. Rendez-le{" "}
          <strong>accessible</strong> pour {status === "INACCESSIBLE" ? "réactiver" : "obtenir"} le lien
          de partage.
        </div>
      )}

      <FormBuilder
        initial={{
          formId: form.id,
          title: form.title,
          description: form.description,
          headerImageUrl: form.headerImageUrl,
          attachments: parseAttachments(form.attachments),
          termsEnabled: form.termsEnabled,
          termsText: form.termsText,
          allowEditResponse: form.allowEditResponse,
          singleResponse: form.singleResponse,
          questions: form.questions.map((q) => ({
            id: q.id,
            title: q.title,
            type: q.type,
            required: q.required,
            options: q.options,
            optionActions: q.optionActions as ("NONE" | "WAITLIST")[],
            format: q.format,
            contactField: q.contactField,
            verifyEmail: q.verifyEmail,
          })),
        }}
      />
    </>
  );
}
