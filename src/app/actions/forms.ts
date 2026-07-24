"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { TYPES_WITH_FORMAT } from "@/lib/formats";

// TEXT_BLOCK = bloc de texte informatif (pas une question) : son « titre » porte le texte affiché.
const ItemTypes = [
  "TEXT",
  "PARAGRAPH",
  "RADIO",
  "CHECKBOX",
  "DROP_DOWN",
  "DATE",
  "TEXT_LIST",
  "TEXT_BLOCK",
] as const;

const questionSchema = z.object({
  id: z.string().optional(), // cuid existant, ou absent/temporaire pour un nouvel élément
  title: z.string().trim().min(1, "Intitulé requis"),
  description: z.string().trim().default(""),
  type: z.enum(ItemTypes),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).default([]),
  // Effet de chaque option (aligné sur `options`) : "NONE" ou "WAITLIST".
  optionActions: z.array(z.enum(["NONE", "WAITLIST"])).default([]),
  // Contrôle de saisie (TEXT / TEXT_LIST) et, pour le format EMAIL, confirmation par e-mail.
  format: z.enum(["EMAIL", "PHONE", "INTEGER", "DECIMAL"]).nullable().default(null),
  // Champ de fiche contact correspondant (TEXT / TEXT_LIST).
  contactField: z
    .enum(["FIRST_NAME", "LAST_NAME", "PHONE", "EMAIL", "SECONDARY_EMAIL"])
    .nullable()
    .default(null),
  verifyEmail: z.boolean().default(false),
});

const saveSchema = z.object({
  formId: z.string().min(1),
  title: z.string().trim().min(1, "Le titre est requis"),
  description: z.string().trim().default(""),
  // URL de l'image d'en-tête (Vercel Blob) ; null = aucune image.
  headerImageUrl: z.string().url().nullable().default(null),
  // Conditions d'inscription : affichées (et à accepter) seulement si l'option est activée.
  termsEnabled: z.boolean().default(false),
  termsText: z.string().trim().default(""),
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

// Configuration d'un formulaire telle que stockée dans un modèle (JSON).
const templateSchema = z.object({
  title: z.string().default("Nouveau formulaire"),
  description: z.string().default(""),
  headerImageUrl: z.string().nullable().default(null),
  termsEnabled: z.boolean().default(false),
  termsText: z.string().default(""),
  allowEditResponse: z.boolean().default(true),
  singleResponse: z.boolean().default(true),
  questions: z
    .array(
      z.object({
        title: z.string().default(""),
        description: z.string().default(""),
        type: z.enum(ItemTypes).default("TEXT"),
        required: z.boolean().default(false),
        options: z.array(z.string()).default([]),
        optionActions: z.array(z.enum(["NONE", "WAITLIST"])).default([]),
        format: z.enum(["EMAIL", "PHONE", "INTEGER", "DECIMAL"]).nullable().default(null),
        contactField: z
          .enum(["FIRST_NAME", "LAST_NAME", "PHONE", "EMAIL", "SECONDARY_EMAIL"])
          .nullable()
          .default(null),
        verifyEmail: z.boolean().default(false),
      }),
    )
    .default([]),
});

export type FormTemplateContent = z.infer<typeof templateSchema>;

/// Libellés Contacts disponibles (poussés par l'application desktop) pour la création.
export async function listLabels() {
  await requireAdmin();
  const labels = await prisma.clubLabel.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return labels.map((l) => ({
    resourceName: l.resourceName,
    name: l.name,
    memberCount: l._count.members,
  }));
}

/// Change le libellé Contacts d'un formulaire existant (constructeur).
/// Le libellé dit qui est déjà inscrit : le changer change donc qui est bloqué.
export async function setFormLabel(formId: string, labelResource: string) {
  const user = await requireAdmin();
  await assertOwner(formId, user.email);

  const label = labelResource.trim();
  if (!label) throw new Error("Choisissez un libellé.");
  const known = await prisma.clubLabel.findUnique({ where: { resourceName: label } });
  if (!known) throw new Error("Libellé inconnu : rouvrez la liste pour la mettre à jour.");

  await prisma.form.update({ where: { id: formId }, data: { labelResource: label } });
  revalidatePath(`/admin/forms/${formId}/edit`);
  revalidatePath("/admin");
}

/// Crée un formulaire — vierge, ou à partir d'un modèle — puis redirige vers son constructeur.
/// Un formulaire est TOUJOURS rattaché à un seul libellé Contacts (choisi à la création).
export async function createForm(templateId?: string, labelResource?: string) {
  const user = await requireAdmin();

  const label = (labelResource ?? "").trim();
  if (!label) throw new Error("Choisissez le libellé auquel ce formulaire inscrit les personnes.");
  const known = await prisma.clubLabel.findUnique({ where: { resourceName: label } });
  if (!known) throw new Error("Libellé inconnu : renvoyez vos libellés depuis l'application desktop.");

  let content: FormTemplateContent | null = null;
  if (templateId) {
    // Les modèles sont partagés entre tous les admins du club.
    const template = await prisma.formTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error("Modèle introuvable.");
    content = templateSchema.parse(template.content);
  }

  const form = await prisma.form.create({
    data: content
      ? {
          ownerEmail: user.email,
          labelResource: label,
          title: content.title,
          description: content.description,
          headerImageUrl: content.headerImageUrl,
          termsEnabled: content.termsEnabled,
          termsText: content.termsText,
          allowEditResponse: content.allowEditResponse,
          singleResponse: content.singleResponse,
          questions: {
            create: content.questions.map((q, order) => ({ ...q, order })),
          },
        }
      : { title: "Nouveau formulaire", ownerEmail: user.email, labelResource: label },
  });
  revalidatePath("/admin");
  redirect(`/admin/forms/${form.id}/edit`);
}

/// Duplique un formulaire (paramètres + questions, sans les réponses) sous un nouveau nom.
export async function duplicateForm(formId: string) {
  const user = await requireAdmin();
  await assertOwner(formId, user.email);

  const source = await prisma.form.findUniqueOrThrow({
    where: { id: formId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const copy = await prisma.form.create({
    data: {
      ownerEmail: user.email,
      // La copie garde le libellé de l'original (modifiable ensuite dans le constructeur).
      labelResource: source.labelResource,
      title: await uniqueTitle(user.email, source.title),
      description: source.description,
      headerImageUrl: source.headerImageUrl,
      termsEnabled: source.termsEnabled,
      termsText: source.termsText,
      allowEditResponse: source.allowEditResponse,
      singleResponse: source.singleResponse,
      // La copie repart en brouillon : à publier explicitement.
      questions: {
        create: source.questions.map((q, order) => ({
          order,
          title: q.title,
          description: q.description,
          type: q.type,
          required: q.required,
          options: q.options,
          optionActions: q.optionActions,
          format: q.format,
          contactField: q.contactField,
          verifyEmail: q.verifyEmail,
        })),
      },
    },
  });
  revalidatePath("/admin");
  redirect(`/admin/forms/${copy.id}/edit`);
}

/// « Copie de X », « Copie de X (2) »… pour ne jamais réutiliser un titre existant.
async function uniqueTitle(ownerEmail: string, title: string): Promise<string> {
  const taken = new Set(
    (await prisma.form.findMany({ where: { ownerEmail }, select: { title: true } })).map(
      (f) => f.title,
    ),
  );
  const base = `Copie de ${title}`;
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})`;
    if (!taken.has(candidate)) return candidate;
  }
}

/// Enregistre la configuration d'un formulaire comme modèle réutilisable.
export async function saveAsTemplate(formId: string, name: string) {
  const user = await requireAdmin();
  await assertOwner(formId, user.email);
  const label = name.trim();
  if (!label) throw new Error("Le nom du modèle est requis.");

  const form = await prisma.form.findUniqueOrThrow({
    where: { id: formId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const content: FormTemplateContent = {
    title: form.title,
    description: form.description,
    headerImageUrl: form.headerImageUrl,
    termsEnabled: form.termsEnabled,
    termsText: form.termsText,
    allowEditResponse: form.allowEditResponse,
    singleResponse: form.singleResponse,
    questions: form.questions.map((q) => ({
      title: q.title,
      description: q.description,
      type: q.type,
      required: q.required,
      options: q.options,
      optionActions: q.optionActions as ("NONE" | "WAITLIST")[],
      format: q.format,
      contactField: q.contactField,
      verifyEmail: q.verifyEmail,
    })),
  };

  await prisma.formTemplate.create({
    data: { name: label, ownerEmail: user.email, content },
  });
  revalidatePath("/admin");
}

/// Supprime un modèle (partagé : n'importe quel admin peut le retirer).
export async function deleteTemplate(templateId: string) {
  await requireAdmin();
  const template = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Modèle introuvable.");
  await prisma.formTemplate.delete({ where: { id: templateId } });
  revalidatePath("/admin");
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
        headerImageUrl: data.headerImageUrl,
        termsEnabled: data.termsEnabled,
        termsText: data.termsText,
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
      // Un bloc de texte n'attend aucune réponse : jamais « obligatoire ».
      const required = q.type === "TEXT_BLOCK" ? false : q.required;
      // Le format ne s'applique qu'aux saisies libres ; la vérification, qu'au format e-mail.
      const format = TYPES_WITH_FORMAT.includes(q.type) ? q.format : null;
      const verifyEmail = format === "EMAIL" ? q.verifyEmail : false;
      // Le champ de contact ne concerne que les saisies libres.
      const contactField = TYPES_WITH_FORMAT.includes(q.type) ? q.contactField : null;
      // Un effet par option, dans le même ordre (« NONE » par défaut).
      const optionActions = optionsForType.map((_, i) => q.optionActions[i] ?? "NONE");
      if (q.id && existingIds.has(q.id)) {
        return prisma.question.update({
          where: { id: q.id },
          data: {
            order: index,
            title: q.title,
            description: q.description,
            type: q.type,
            required,
            options: optionsForType,
            optionActions,
            format,
            contactField,
            verifyEmail,
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
          required,
          options: optionsForType,
          optionActions,
          format,
          contactField,
          verifyEmail,
        },
      });
    }),
  ]);

  revalidatePath(`/admin/forms/${data.formId}/edit`);
  revalidatePath("/admin");
}

/// Bascule l'accessibilité : « Rendre accessible » ↔ « Clôturer ».
/// La 1re mise en ligne est horodatée : un formulaire clôturé devient « Inaccessible »
/// (et non « Brouillon », réservé à ceux jamais publiés).
export async function togglePublish(formId: string) {
  const user = await requireAdmin();
  await assertOwner(formId, user.email);
  const form = await prisma.form.findUniqueOrThrow({
    where: { id: formId },
    select: { isPublished: true, firstPublishedAt: true, labelResource: true },
  });
  const nowPublished = !form.isPublished;

  // Un formulaire sans libellé ne saurait pas qui est déjà inscrit : on refuse de le
  // rendre accessible (le clôturer reste toujours possible).
  if (nowPublished && !form.labelResource) {
    throw new Error(
      "Associez d'abord un libellé Contacts à ce formulaire (bouton 🏷 du constructeur).",
    );
  }

  await prisma.form.update({
    where: { id: formId },
    data: {
      isPublished: nowPublished,
      // Horodate la 1re mise en ligne. Au premier clic sur « Clôturer », les formulaires
      // publiés avant l'ajout du champ sont eux aussi marqués comme déjà mis en ligne.
      ...(form.firstPublishedAt ? {} : { firstPublishedAt: new Date() }),
    },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/forms/${formId}/edit`);
}

/// Supprime un formulaire (questions et réponses suivent via cascade) + son image d'en-tête.
export async function deleteForm(formId: string) {
  const user = await requireAdmin();
  await assertOwner(formId, user.email);
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { headerImageUrl: true },
  });
  await prisma.form.delete({ where: { id: formId } });
  if (form?.headerImageUrl) await deleteBlob(form.headerImageUrl);
  revalidatePath("/admin");
}

/// Supprime un fichier du store Vercel Blob (sans jamais faire échouer l'action appelante).
async function deleteBlob(url: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch {
    // L'image orpheline n'est pas bloquante.
  }
}
