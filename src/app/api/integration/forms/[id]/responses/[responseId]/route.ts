import { prisma } from "@/lib/prisma";
import { guardIntegration } from "@/lib/integration";

// Suppression d'une préinscription depuis l'application desktop : la personne
// n'est plus inscrite et peut de nouveau remplir le formulaire.
//   DELETE /api/integration/forms/<id>/responses/<responseId>
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; responseId: string }> },
) {
  const guard = guardIntegration(request);
  if (!guard.ok) return guard.response;

  const { id, responseId } = await params;
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: { id: true, formId: true },
  });
  if (!response || response.formId !== id) {
    return Response.json({ error: "Réponse introuvable." }, { status: 404 });
  }

  // Les adresses DÉJÀ vérifiées sont conservées (responseId passe à null) ; seules
  // les demandes en attente disparaissent — même règle que l'annulation côté site.
  await prisma.emailVerification.deleteMany({ where: { responseId, verifiedAt: null } });
  await prisma.response.delete({ where: { id: responseId } });

  return Response.json({ deleted: 1 });
}

// Correction d'une réponse depuis l'application desktop (« garder l'état actuel » :
// la valeur du contact remplace celle saisie par la personne).
//   PATCH /api/integration/forms/<id>/responses/<responseId>
//   body : { answers: { "<questionId>": "valeur" } }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; responseId: string }> },
) {
  const guard = guardIntegration(request);
  if (!guard.ok) return guard.response;

  const { id, responseId } = await params;

  let body: { answers?: Record<string, string> };
  try {
    body = (await request.json()) as { answers?: Record<string, string> };
  } catch {
    return Response.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const answers = Object.entries(body.answers ?? {}).filter(([questionId]) => questionId.trim());
  if (answers.length === 0) return Response.json({ error: "Aucune réponse à modifier." }, { status: 400 });

  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: { id: true, formId: true },
  });
  if (!response || response.formId !== id) {
    return Response.json({ error: "Réponse introuvable." }, { status: 404 });
  }

  // Les questions doivent appartenir à ce formulaire (on n'écrit rien ailleurs).
  const questions = await prisma.question.findMany({
    where: { formId: id, id: { in: answers.map(([questionId]) => questionId) } },
    select: { id: true },
  });
  const known = new Set(questions.map((q) => q.id));

  const toWrite = answers.filter(([questionId]) => known.has(questionId));
  if (toWrite.length === 0) return Response.json({ error: "Questions inconnues." }, { status: 400 });

  // Answer n'a pas de clé composée : on retrouve la ligne existante avant d'écrire,
  // pour mettre à jour au lieu d'en créer une seconde.
  const existing = await prisma.answer.findMany({
    where: { responseId, questionId: { in: [...known] } },
    select: { id: true, questionId: true },
  });
  const byQuestion = new Map(existing.map((a) => [a.questionId, a.id]));

  await prisma.$transaction(
    toWrite.map(([questionId, value]) => {
      const existingId = byQuestion.get(questionId);
      return existingId
        ? prisma.answer.update({ where: { id: existingId }, data: { value } })
        : prisma.answer.create({ data: { responseId, questionId, value } });
    }),
  );

  return Response.json({ updated: toWrite.length });
}
