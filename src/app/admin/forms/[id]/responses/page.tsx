import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// Visualiseur des réponses d'un formulaire (admin) : un répondant par ligne.
export default async function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: {
        orderBy: { submittedAt: "asc" },
        include: { answers: true },
      },
    },
  });
  if (!form || form.ownerEmail.toLowerCase() !== user.email.toLowerCase()) notFound();

  const rows = form.responses.map((r) => {
    const byQuestion = new Map(r.answers.map((a) => [a.questionId, a.value]));
    return { response: r, byQuestion };
  });

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Retour aux formulaires
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{form.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows.length} réponse{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        {rows.length > 0 && (
          <a
            href={`/admin/forms/${form.id}/responses/export`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            ⬇ Exporter CSV
          </a>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Aucune réponse pour l'instant.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-max text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Répondant</th>
                <th className="px-4 py-3 font-medium">Envoyé le</th>
                <th className="px-4 py-3 font-medium">Modifié le</th>
                {form.questions.map((q) => (
                  <th key={q.id} className="px-4 py-3 font-medium">
                    {q.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(({ response, byQuestion }) => {
                const edited = response.lastSubmittedAt.getTime() - response.submittedAt.getTime() > 1000;
                return (
                  <tr key={response.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{response.respondentName ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{response.respondentEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{dateFmt.format(response.submittedAt)}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {edited ? dateFmt.format(response.lastSubmittedAt) : "—"}
                    </td>
                    {form.questions.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-zinc-700">
                        {byQuestion.get(q.id) || <span className="text-zinc-300">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
