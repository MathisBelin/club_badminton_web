import { prisma } from "@/lib/prisma";
import { guardIntegration } from "@/lib/integration";

// Réponses d'un formulaire, identité = e-mail Google vérifié du répondant.
//   GET /api/integration/forms/<id>/responses
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardIntegration(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const form = await prisma.form.findUnique({ where: { id }, select: { id: true } });
  if (!form) return Response.json({ error: "Formulaire introuvable." }, { status: 404 });

  const responses = await prisma.response.findMany({
    where: { formId: id },
    orderBy: { submittedAt: "asc" },
    include: { answers: true, verifications: { select: { email: true, verifiedAt: true } } },
  });

  return Response.json({
    responses: responses.map((r) => ({
      responseId: r.id,
      respondentEmail: r.respondentEmail,
      respondentName: r.respondentName ?? "",
      submittedAt: r.submittedAt.toISOString(),
      lastSubmittedAt: r.lastSubmittedAt.toISOString(),
      // Non null = en liste d'attente, la date donne l'ordre de priorité.
      waitlistedAt: r.waitlistedAt ? r.waitlistedAt.toISOString() : null,
      termsAcceptedAt: r.termsAcceptedAt ? r.termsAcceptedAt.toISOString() : null,
      // Adresses saisies dont la confirmation par e-mail a abouti.
      verifiedEmails: r.verifications.filter((v) => v.verifiedAt).map((v) => v.email),
      fields: Object.fromEntries(r.answers.map((a) => [a.questionId, a.value])),
    })),
  });
}
