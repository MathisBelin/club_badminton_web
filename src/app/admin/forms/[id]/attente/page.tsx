import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { isQuestion } from "@/lib/questions";

// Liste d'attente d'un formulaire : répondants ayant choisi une option marquée
// « Ajouter à la liste d'attente », classés par ordre d'arrivée (priorité).
export default async function WaitlistPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: {
        where: { waitlistedAt: { not: null } },
        orderBy: { waitlistedAt: "asc" },
        include: { answers: true },
      },
    },
  });
  if (!form || form.ownerEmail.toLowerCase() !== user.email.toLowerCase()) notFound();

  // Questions dont au moins une option place en liste d'attente : ce sont elles
  // qui expliquent la présence dans la liste.
  const waitlistQuestions = form.questions.filter(
    (q) => isQuestion(q.type) && q.optionActions.includes("WAITLIST"),
  );

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <div className="mb-6">
        <Link href={`/admin/forms/${form.id}/responses`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Retour aux réponses
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Liste d&apos;attente</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {form.title} — {form.responses.length} personne{form.responses.length > 1 ? "s" : ""} en
          attente, classée{form.responses.length > 1 ? "s" : ""} par ordre d&apos;inscription.
        </p>
      </div>

      {waitlistQuestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Aucune option de ce formulaire ne place en liste d&apos;attente. Dans le constructeur,
          choisissez « Ajouter à la liste d&apos;attente » sur l&apos;option concernée.
        </div>
      ) : form.responses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Personne en liste d&apos;attente pour l&apos;instant.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-max text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Priorité</th>
                <th className="px-4 py-3 font-medium">Répondant</th>
                <th className="px-4 py-3 font-medium">En attente depuis</th>
                {waitlistQuestions.map((q) => (
                  <th key={q.id} className="px-4 py-3 font-medium">
                    {q.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {form.responses.map((r, index) => {
                const byQuestion = new Map(r.answers.map((a) => [a.questionId, a.value]));
                return (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{r.respondentName ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{r.respondentEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {r.waitlistedAt ? dateFmt.format(r.waitlistedAt) : "—"}
                    </td>
                    {waitlistQuestions.map((q) => (
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
