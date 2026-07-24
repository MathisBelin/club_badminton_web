import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import TemplatesTable, { type TemplateRow } from "@/components/TemplatesTable";

// Gestion des modèles de formulaire (partagés entre tous les admins du club).
export default async function TemplatesPage() {
  await requireAdmin();

  const rows = await prisma.formTemplate.findMany({ orderBy: { createdAt: "desc" } });

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const templates: TemplateRow[] = rows.map((t) => {
    const content = t.content as { title?: string; questions?: unknown[] } | null;
    return {
      id: t.id,
      name: t.name,
      ownerEmail: t.ownerEmail,
      createdAtLabel: dateFmt.format(t.createdAt),
      formTitle: content?.title ?? "",
      questionCount: Array.isArray(content?.questions) ? content.questions.length : 0,
    };
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Retour aux formulaires
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Modèles</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Configurations réutilisables, partagées entre tous les admins. Un modèle se crée depuis un
            formulaire, bouton « Enregistrer comme modèle ».
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Aucun modèle enregistré. Ouvrez un formulaire, puis « Enregistrer comme modèle ».
        </div>
      ) : (
        <TemplatesTable templates={templates} />
      )}
    </>
  );
}
