import { prisma } from "@/lib/prisma";
import { guardIntegration } from "@/lib/integration";
import { MULTI_SEP, isQuestion } from "@/lib/questions";

// Indices des options retenues pour une question à choix (CHECKBOX = plusieurs valeurs
// jointes par MULTI_SEP ; RADIO / DROP_DOWN = une seule). Sert au calcul de la liste d'attente.
function selectedOptionIndexes(question: { type: string; options: string[] }, value: string): number[] {
  if (!question.options.length || !value) return [];
  const chosen = question.type === "CHECKBOX" ? value.split(MULTI_SEP) : [value];
  return chosen.map((v) => question.options.indexOf(v.trim())).filter((i) => i >= 0);
}

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

// Création d'une préinscription depuis l'application desktop (saisie manuelle par un
// admin). La personne est ajoutée directement, sans vérification d'e-mail (le desktop
// est de confiance). La liste d'attente est calculée comme à la soumission normale.
//   POST /api/integration/forms/<id>/responses
//   body : { respondentEmail, respondentName?, answers: { "<questionId>": "valeur" } }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardIntegration(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let body: { respondentEmail?: string; respondentName?: string; answers?: Record<string, string> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const email = (body.respondentEmail ?? "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: "E-mail du répondant manquant ou invalide." }, { status: 400 });
  }
  const name = (body.respondentName ?? "").trim() || null;

  const form = await prisma.form.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!form) return Response.json({ error: "Formulaire introuvable." }, { status: 404 });

  // Une seule réponse par (formulaire, e-mail) : on ne crée pas de doublon.
  const already = await prisma.response.findUnique({
    where: { formId_respondentEmail: { formId: form.id, respondentEmail: email } },
    select: { id: true },
  });
  if (already) {
    return Response.json(
      { error: "Une préinscription existe déjà pour cet e-mail." },
      { status: 409 },
    );
  }

  // On n'écrit que les réponses aux questions (hors blocs de texte) de CE formulaire.
  const questions = form.questions.filter((q) => isQuestion(q.type));
  const known = new Map(questions.map((q) => [q.id, q]));
  const answers = Object.entries(body.answers ?? {})
    .filter(([questionId, value]) => known.has(questionId) && value.trim())
    .map(([questionId, value]) => ({ questionId, value }));

  // Liste d'attente : au moins une option retenue porte l'effet « WAITLIST ».
  const waitlisted = answers.some(({ questionId, value }) => {
    const q = known.get(questionId)!;
    return selectedOptionIndexes(q, value).some((i) => q.optionActions[i] === "WAITLIST");
  });

  const created = await prisma.response.create({
    data: {
      formId: form.id,
      respondentEmail: email,
      respondentName: name,
      waitlistedAt: waitlisted ? new Date() : null,
      answers: { create: answers },
    },
    select: { id: true },
  });

  return Response.json({ responseId: created.id }, { status: 201 });
}
