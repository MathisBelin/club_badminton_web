import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { createForm, deleteForm, togglePublish } from "@/app/actions/forms";
import { CopyLinkButton } from "@/components/ShareLink";

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
      createdAt: true,
      _count: { select: { responses: true, questions: true } },
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Mes formulaires</h1>
          <p className="mt-1 text-sm text-zinc-500">Créez et gérez vos formulaires d'inscription.</p>
        </div>
        <form action={createForm}>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Créer un formulaire
          </button>
        </form>
      </div>

      {forms.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Aucun formulaire. Cliquez sur « Créer un formulaire » pour commencer.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Réponses</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {forms.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/forms/${f.id}/edit`} className="font-medium text-zinc-900 hover:text-emerald-700">
                      {f.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {f.isPublished ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Accessible
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{f._count.questions}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    <Link href={`/admin/forms/${f.id}/responses`} className="text-emerald-700 hover:underline">
                      {f._count.responses}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/forms/${f.id}/edit`}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                      >
                        Modifier
                      </Link>
                      <Link
                        href={`/admin/forms/${f.id}/responses`}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                      >
                        Réponses
                      </Link>
                      {f.isPublished && <CopyLinkButton path={`/forms/${f.id}`} />}
                      <form action={togglePublish.bind(null, f.id)}>
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        >
                          {f.isPublished ? "Retirer" : "Rendre accessible"}
                        </button>
                      </form>
                      <form action={deleteForm.bind(null, f.id)}>
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
