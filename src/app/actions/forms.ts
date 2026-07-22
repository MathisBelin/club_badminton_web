"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const QuestionTypes = ["TEXT", "PARAGRAPH", "RADIO", "CHECKBOX", "DROP_DOWN", "DATE"] as const;

const questionSchema = z.object({
  id: z.string().optional(), // cuid existant, ou absent/temporaire pour une nouvelle question
  title: z.string().trim().min(1, "Intitulé requis"),
  description: z.string().trim().default(""),
  type: z.enum(QuestionTypes),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).default([]),
});

const saveSchema = z.object({
  formId: z.string().min(1),
  title: z.string().trim().min(1, "Le titre est requis"),
  description: z.string().trim().default(""),
  allowEditResponse: z.boolean().default(true),
  singleResponse: z.boolean().default(true),
  questions: z.array(questionSchema).default([]),
});

export type SaveFormInput = z.input<typeof saveSchema>;

/// Vérifie que le formulaire appartient bien à l'admin courant.
async function assertOwner(formId: string, email: string) {
  const form = await prisma.form.findUnique({ where: { id: formId }, select: { ownerEmail: true } });
  if (!form || form.ownerEmail.toLowerCase() !== email.toLowerCase()) {
    throw new Error("Formulaire introuvable ou accès refusé.");
  }
}

/// Crée un formulaire vierge et redirige vers son constructeur.
export async function createForm() {
  const user = await requireAdmin();
  const form = await prisma.form.create({
    data: { title: "Nouveau formulaire", ownerEmail: user.email },
  });
  redirect(`/admin/forms/${form.id}/edit`);
}

/// Enregistre le formulaire et ses questions (upsert par id, suppression des retirées).
export async function saveForm(input: SaveFormInput) {
  const user = await requireAdmin();
  const data = saveSchema.parse(input);
  await assertOwner(data.formId, user.email);

  const existing = await prisma.question.findMany({
    where: { formId: data.formId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((q) => q.id));
  const keptIds = new Set(data.questions.filter((q) => q.id && existingIds.has(q.id)).map((q) => q.id!));

  await prisma.$transaction([
    prisma.form.update({
      where: { id: data.formId },
      data: {
        title: data.title,
        description: data.description,
        allowEditResponse: data.allowEditResponse,
        singleResponse: data.singleResponse,
      },
    }),
    // Supprime les questions retirées (les réponses associées suivent via cascade).
    prisma.question.deleteMany({
      where: { formId: data.formId, id: { notIn: [...keptIds] } },
    }),
    // Met à jour ou crée chaque question dans l'ordre.
    ...data.questions.map((q, index) => {
      const optionsForType = ["RADIO", "CHECKBOX", "DROP_DOWN"].includes(q.type) ? q.options : [];
      if (q.id && existingIds.has(q.id)) {
        return prisma.question.update({
          where: { id: q.id },
          data: {
            order: index,
            title: q.title,
            description: q.description,
            type: q.type,
            required: q.required,
            options: optionsForType,
          },
        });
      }
      return prisma.question.create({
        data: {
          formId: data.formId,
          order: index,
          title: q.title,
          description: q.description,
          type: q.type,
          required: q.required,
          options: optionsForType,
        },
      });
    }),
  ]);

  revalidatePath(`/admin/forms/${data.formId}/edit`);
  revalidatePath("/admin");
}

/// Bascule l'accessibilité (publié / brouillon).
export async function togglePublish(formId: string) {
  const user = await requireAdmin();
  await assertOwner(formId, user.email);
  const form = await prisma.form.findUniqueOrThrow({
    where: { id: formId },
    select: { isPublished: true },
  });
  await prisma.form.update({
    where: { id: formId },
    data: { isPublished: !form.isPublished },
  });
  revalidatePath("/admin");
}

/// Supprime un formulaire (questions et réponses suivent via cascade).
export async function deleteForm(formId: string) {
  const user = await requireAdmin();
  await assertOwner(formId, user.email);
  await prisma.form.delete({ where: { id: formId } });
  revalidatePath("/admin");
}
