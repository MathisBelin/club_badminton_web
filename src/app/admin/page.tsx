import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import CreateFormButton from "@/components/CreateFormButton";
import ConnectContacts from "@/components/ConnectContacts";
import { hasContactsAuthorization } from "@/lib/googleContacts";
import { formStatus, STATUS_BADGE, STATUS_LABEL } from "@/lib/formStatus";
import FormsTable, { type FormRow } from "@/components/FormsTable";

// Tableau de bord admin : liste des formulaires + création + publication.
export default async function AdminDashboard() {
  const user = await requireAdmin();

  const forms = await prisma.form.findMany({
    where: { ownerEmail: user.email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      isPublished: true,
      firstPublishedAt: true,
      createdAt: true,
      // Libellé Contacts vers lequel ce formulaire inscrit (poussé depuis le desktop).
      label: { select: { name: true } },
      // Les blocs de texte ne sont pas des questions : exclus du décompte affiché.
      _count: {
        select: { responses: true, questions: { where: { type: { not: "TEXT_BLOCK" } } } },
      },
    },
  });

  // Modèles disponibles pour la création (partagés entre tous les admins du club ;
  // le nombre de questions est lu dans le JSON stocké).
  const templateRows = await prisma.formTemplate.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, content: true },
  });
  const templates = templateRows.map((t) => {
    const questions = (t.content as { questions?: unknown[] } | null)?.questions;
    return { id: t.id, name: t.name, questionCount: Array.isArray(questions) ? questions.length : 0 };
  });

  // Libellés déjà connus : affichage immédiat de la fenêtre de création, qui les
  // relit ensuite dans Google Contacts à chaque ouverture.
  const contactsAuthorized = await hasContactsAuthorization(user.email);
  const labels = await prisma.clubLabel.findMany({
    orderBy: { name: "asc" },
    select: { resourceName: true, name: true },
  });

  // Statut pré-calculé côté serveur (le composant client de liste ne fait que filtrer).
  const formRows: FormRow[] = forms.map((f) => ({
    id: f.id,
    title: f.title,
    labelName: f.label?.name ?? null,
    statusLabel: STATUS_LABEL[formStatus(f)],
    statusBadge: STATUS_BADGE[formStatus(f)],
    questionCount: f._count.questions,
    responseCount: f._count.responses,
    isPublished: f.isPublished,
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Mes formulaires</h1>
          <p className="mt-1 text-sm text-zinc-500">Créez et gérez vos formulaires d&apos;inscription.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/modeles"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Modèles{templates.length > 0 && ` (${templates.length})`}
          </Link>
          <CreateFormButton templates={templates} labels={labels} />
        </div>
      </div>

      {!contactsAuthorized && (
        <div className="mt-6">
          <ConnectContacts />
        </div>
      )}

      {forms.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Aucun formulaire. Cliquez sur « Créer un formulaire » pour commencer.
        </div>
      ) : (
        <FormsTable forms={formRows} />
      )}
    </>
  );
}
