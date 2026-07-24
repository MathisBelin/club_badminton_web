import { prisma } from "@/lib/prisma";
import { guardIntegration } from "@/lib/integration";
import { isQuestion } from "@/lib/questions";

// Structure d'un formulaire : questions, correspondance avec les champs de contact
// et effets des options (liste d'attente).
//   GET /api/integration/forms/<id>/questions
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardIntegration(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!form) return Response.json({ error: "Formulaire introuvable." }, { status: 404 });

  return Response.json({
    id: form.id,
    title: form.title,
    ownerEmail: form.ownerEmail,
    isPublished: form.isPublished,
    // Les blocs de texte informatifs ne sont pas des questions : ils sont exclus.
    questions: form.questions.filter((q) => isQuestion(q.type)).map((q) => ({
      questionId: q.id,
      title: q.title,
      type: q.type,
      required: q.required,
      options: q.options,
      // Aligné sur options : "NONE" ou "WAITLIST".
      optionActions: q.options.map((_, i) => q.optionActions[i] ?? "NONE"),
      format: q.format,
      // FIRST_NAME / LAST_NAME / PHONE / EMAIL / SECONDARY_EMAIL, ou null.
      contactField: q.contactField,
    })),
  });
}
