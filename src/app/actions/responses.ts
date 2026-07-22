"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const submitSchema = z.object({
  formId: z.string().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.string().default(""),
      }),
    )
    .default([]),
});

export type SubmitInput = z.input<typeof submitSchema>;

export type SubmitResult = { ok: true } | { ok: false; error: string };

/// Enregistre (ou met à jour) la réponse de l'utilisateur connecté à un formulaire publié.
export async function submitResponse(input: SubmitInput): Promise<SubmitResult> {
  const user = await requireUser();
  const data = submitSchema.parse(input);

  const form = await prisma.form.findUnique({
    where: { id: data.formId },
    include: { questions: true },
  });
  if (!form) return { ok: false, error: "Formulaire introuvable." };
  if (!form.isPublished) return { ok: false, error: "Ce formulaire n'est pas accessible." };

  const answersByQuestion = new Map(data.answers.map((a) => [a.questionId, a.value.trim()]));

  // Contrôle des champs obligatoires.
  for (const q of form.questions) {
    if (q.required && !answersByQuestion.get(q.id)) {
      return { ok: false, error: `La question « ${q.title} » est obligatoire.` };
    }
  }

  const existing = await prisma.response.findUnique({
    where: { formId_respondentEmail: { formId: form.id, respondentEmail: user.email } },
    select: { id: true },
  });

  if (existing && !form.allowEditResponse) {
    return { ok: false, error: "Vous avez déjà répondu et la modification n'est pas autorisée." };
  }

  const answerData = form.questions
    .filter((q) => answersByQuestion.has(q.id))
    .map((q) => ({ questionId: q.id, value: answersByQuestion.get(q.id) ?? "" }));

  if (existing) {
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { responseId: existing.id } }),
      prisma.response.update({
        where: { id: existing.id },
        data: {
          respondentName: user.name ?? undefined,
          lastSubmittedAt: new Date(),
          answers: { create: answerData },
        },
      }),
    ]);
  } else {
    await prisma.response.create({
      data: {
        formId: form.id,
        respondentEmail: user.email,
        respondentName: user.name ?? undefined,
        answers: { create: answerData },
      },
    });
  }

  redirect(`/forms/${form.id}/merci`);
}
