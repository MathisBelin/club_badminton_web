import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { MULTI_SEP, contactFieldLabel, isQuestion } from "@/lib/questions";
import { matchesResponse, searchableQuestionIds } from "@/lib/responseFilter";
import ResponsesFilter, { SearchPendingProvider, SearchResults } from "@/components/ResponsesFilter";

// Cellule d'une question « adresse à vérifier » : chaque adresse porte son état de confirmation.
function EmailCell({ value, verified }: { value: string; verified: Set<string> }) {
  const emails = value.split(MULTI_SEP).map((e) => e.trim()).filter(Boolean);
  if (emails.length === 0) return <span className="text-zinc-300">—</span>;
  return (
    <div className="space-y-1">
      {emails.map((email) => (
        <div key={email} className="flex items-center gap-1.5">
          <span>{email}</span>
          {verified.has(email.toLowerCase()) ? (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
              vérifiée
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
              en attente
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Visualiseur des réponses d'un formulaire (admin) : un répondant par ligne.
export default async function ResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const search = (await searchParams).q ?? "";

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: {
        orderBy: { submittedAt: "asc" },
        include: { answers: true, verifications: true },
      },
    },
  });
  if (!form || form.ownerEmail.toLowerCase() !== user.email.toLowerCase()) notFound();

  // Les blocs de texte informatifs n'attendent pas de réponse : pas de colonne.
  const questions = form.questions.filter((q) => isQuestion(q.type));

  // Liste d'attente : proposée dès qu'une option du formulaire y place les répondants.
  const hasWaitlist = form.questions.some((q) => q.optionActions.includes("WAITLIST"));
  const waitlistCount = form.responses.filter((r) => r.waitlistedAt).length;

  // Filtre e-mail / nom / prénom : porte sur le compte du répondant et sur les réponses
  // associées à un champ de contact. L'export CSV reçoit le même terme.
  const searchableIds = searchableQuestionIds(form.questions);
  const filtered = form.responses.filter((r) => matchesResponse(r, searchableIds, search));

  const rows = filtered.map((r) => {
    const byQuestion = new Map(r.answers.map((a) => [a.questionId, a.value]));
    // Adresses confirmées par le répondant (questions « faire vérifier l'adresse »).
    const verified = new Set(
      r.verifications.filter((v) => v.verifiedAt).map((v) => v.email.toLowerCase()),
    );
    return { response: r, byQuestion, verified };
  });

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <SearchPendingProvider>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Retour aux formulaires
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{form.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {search
              ? `${rows.length} réponse${rows.length > 1 ? "s" : ""} sur ${form.responses.length}`
              : `${rows.length} réponse${rows.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {form.responses.length > 0 && <ResponsesFilter initial={search} />}
          {hasWaitlist && (
            <Link
              href={`/admin/forms/${form.id}/attente`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Liste d&apos;attente ({waitlistCount})
            </Link>
          )}
          {rows.length > 0 && (
            <a
              href={
                search
                  ? `/admin/forms/${form.id}/responses/export?q=${encodeURIComponent(search)}`
                  : `/admin/forms/${form.id}/responses/export`
              }
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              title="Exporter les réponses affichées (le filtre est pris en compte)"
            >
              ⬇ Exporter CSV
            </a>
          )}
        </div>
      </div>

      {/* Pendant une recherche, le tableau laisse la place à l'indicateur de chargement. */}
      <SearchResults>
        {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          {search ? "Aucune réponse ne correspond à cette recherche." : "Aucune réponse pour l'instant."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-max text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Répondant</th>
                <th className="px-4 py-3 font-medium">Envoyé le</th>
                <th className="px-4 py-3 font-medium">Modifié le</th>
                {questions.map((q) => (
                  <th key={q.id} className="px-4 py-3 font-medium">
                    {q.title}
                    {/* Correspondance avec la fiche contact (utilisée par l'app desktop). */}
                    {q.contactField && (
                      <span className="ml-2 rounded-full bg-zinc-200 px-1.5 py-0.5 text-xs font-normal text-zinc-600">
                        {contactFieldLabel(q.contactField)}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(({ response, byQuestion, verified }) => {
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
                    {questions.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-zinc-700">
                        {q.verifyEmail ? (
                          <EmailCell value={byQuestion.get(q.id) ?? ""} verified={verified} />
                        ) : (
                          byQuestion.get(q.id) || <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </SearchResults>
    </SearchPendingProvider>
  );
}
