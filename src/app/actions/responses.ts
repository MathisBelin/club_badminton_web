"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MULTI_SEP, isQuestion } from "@/lib/questions";
import { checkAnswer, emailsOf } from "@/lib/formats";
import { sendVerificationEmail } from "@/lib/mailer";
import { isRegistered } from "@/lib/googleContacts";

const submitSchema = z.object({
  formId: z.string().min(1),
  // Acceptation des conditions d'inscription (exigée si le formulaire en définit).
  termsAccepted: z.boolean().default(false),
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

// Durée de validité d'un lien de vérification d'adresse.
const VERIFICATION_DAYS = 7;

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

  // Déjà inscrit (membre du libellé Contacts du formulaire) : plus aucune modification possible.
  if (form.labelResource && (await isRegistered(form.labelResource, user.email))) {
    return {
      ok: false,
      error: "Vous êtes déjà inscrit : votre réponse ne peut plus être modifiée.",
    };
  }

  const answersByQuestion = new Map(data.answers.map((a) => [a.questionId, a.value.trim()]));

  // Les blocs de texte informatifs ne sont pas des questions : aucune réponse attendue.
  const questions = form.questions.filter((q) => isQuestion(q.type));

  // Contrôle des champs obligatoires puis des formats de saisie (contrôle faisant foi).
  for (const q of questions) {
    if (q.required && !answersByQuestion.get(q.id)) {
      return { ok: false, error: `La question « ${q.title} » est obligatoire.` };
    }
    const formatError = checkAnswer(q, answersByQuestion.get(q.id) ?? "");
    if (formatError) return { ok: false, error: formatError };
  }

  // Conditions d'inscription : acceptation obligatoire si l'option est activée.
  const termsRequired = form.termsEnabled && Boolean(form.termsText);
  if (termsRequired && !data.termsAccepted) {
    return { ok: false, error: "Vous devez accepter les conditions d'inscription." };
  }
  const termsAcceptedAt = termsRequired ? new Date() : null;

  // Liste d'attente : au moins une option choisie porte l'effet « WAITLIST ».
  const waitlisted = questions.some((q) =>
    selectedOptions(q, answersByQuestion.get(q.id) ?? "").some(
      (index) => q.optionActions[index] === "WAITLIST",
    ),
  );

  const existing = await prisma.response.findUnique({
    where: { formId_respondentEmail: { formId: form.id, respondentEmail: user.email } },
    select: { id: true, waitlistedAt: true },
  });

  // La priorité est donnée par la date de PREMIÈRE mise en liste d'attente.
  const waitlistedAt = waitlisted ? (existing?.waitlistedAt ?? new Date()) : null;

  if (existing && !form.allowEditResponse) {
    return { ok: false, error: "Vous avez déjà répondu et la modification n'est pas autorisée." };
  }

  const answerData = questions
    .filter((q) => answersByQuestion.has(q.id))
    .map((q) => ({ questionId: q.id, value: answersByQuestion.get(q.id) ?? "" }));

  let responseId: string;
  if (existing) {
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { responseId: existing.id } }),
      prisma.response.update({
        where: { id: existing.id },
        data: {
          respondentName: user.name ?? undefined,
          termsAcceptedAt,
          waitlistedAt,
          lastSubmittedAt: new Date(),
          answers: { create: answerData },
        },
      }),
    ]);
    responseId = existing.id;
  } else {
    const created = await prisma.response.create({
      data: {
        formId: form.id,
        respondentEmail: user.email,
        respondentName: user.name ?? undefined,
        termsAcceptedAt,
        waitlistedAt,
        answers: { create: answerData },
      },
      select: { id: true },
    });
    responseId = created.id;
  }

  // Adresses à faire confirmer (questions au format e-mail avec vérification demandée).
  const toVerify: Array<{ questionId: string; email: string }> = [];
  for (const q of questions) {
    if (!q.verifyEmail || q.format !== "EMAIL") continue;
    for (const email of emailsOf(q, answersByQuestion.get(q.id) ?? "")) {
      toVerify.push({ questionId: q.id, email });
    }
  }

  if (toVerify.length === 0) {
    redirect(`/forms/${form.id}/merci`);
  }

  const pendingCount = await syncVerifications(responseId, form.title, toVerify, user.email);
  // Tout est déjà confirmé (adresse du répondant, ou vérification faite précédemment).
  redirect(pendingCount === 0 ? `/forms/${form.id}/merci` : `/forms/${form.id}/verification`);
}

/// Indices des options retenues par le répondant pour une question à choix
/// (RADIO / DROP_DOWN : une seule ; CHECKBOX : plusieurs, jointes par MULTI_SEP).
function selectedOptions(
  question: { type: string; options: string[] },
  value: string,
): number[] {
  if (!question.options.length || !value) return [];
  const chosen = question.type === "CHECKBOX" ? value.split(MULTI_SEP) : [value];
  return chosen
    .map((v) => question.options.indexOf(v.trim()))
    .filter((index) => index >= 0);
}

/// Met à jour les demandes de vérification d'une réponse et retourne le nombre d'adresses
/// encore en attente. Règles :
///   - l'adresse du répondant (e-mail Google déjà vérifié) est confirmée d'office ;
///   - une demande **en cours** (envoyée il y a moins de 7 jours, sans réponse) est conservée
///     telle quelle : pas de nouvel e-mail à chaque modification de la réponse. Seul le bouton
///     « renvoyer » relance un envoi (cf. resendVerification) ;
///   - les demandes périmées ou portant sur une adresse retirée de la réponse sont supprimées.
async function syncVerifications(
  responseId: string,
  formTitle: string,
  targets: Array<{ questionId: string; email: string }>,
  respondentEmail: string,
): Promise<number> {
  const now = new Date();
  const existing = await prisma.emailVerification.findMany({ where: { responseId } });

  const wanted = new Map(targets.map((t) => [t.email.toLowerCase(), t]));

  // Liste des adresses DÉJÀ vérifiées (toutes réponses confondues, y compris des
  // inscriptions annulées) : une adresse confirmée une fois n'est plus à confirmer.
  const verifiedElsewhere = new Set(
    (
      await prisma.emailVerification.findMany({
        where: { verifiedAt: { not: null } },
        select: { email: true },
      })
    ).map((v) => v.email.toLowerCase()),
  );

  // Nettoyage : adresses qui ne figurent plus dans la réponse, et demandes expirées sans réponse.
  const obsolete = existing.filter(
    (v) =>
      !wanted.has(v.email.toLowerCase()) ||
      (!v.verifiedAt && v.expiresAt.getTime() < now.getTime()),
  );
  if (obsolete.length > 0) {
    await prisma.emailVerification.deleteMany({ where: { id: { in: obsolete.map((v) => v.id) } } });
  }
  const obsoleteIds = new Set(obsolete.map((v) => v.id));
  const current = new Map(
    existing.filter((v) => !obsoleteIds.has(v.id)).map((v) => [v.email.toLowerCase(), v]),
  );

  const expiresAt = new Date(now.getTime() + VERIFICATION_DAYS * 24 * 3600 * 1000);
  const toSend: Array<{ email: string; token: string }> = [];
  let pending = 0;

  for (const [key, target] of wanted) {
    // Adresse de connexion (vérifiée par Google) ou adresse confirmée par le passé.
    const isRespondent = key === respondentEmail.toLowerCase() || verifiedElsewhere.has(key);
    const found = current.get(key);

    if (found?.verifiedAt) continue; // déjà confirmée

    if (found) {
      // L'adresse du répondant n'a plus besoin d'être confirmée par e-mail.
      if (isRespondent) {
        await prisma.emailVerification.update({
          where: { id: found.id },
          data: { verifiedAt: now },
        });
        continue;
      }
      pending++; // demande encore valable : on n'envoie rien de plus
      continue;
    }

    const created = await prisma.emailVerification.create({
      data: {
        responseId,
        questionId: target.questionId,
        email: target.email,
        token: randomBytes(32).toString("base64url"),
        expiresAt,
        // Adresse de connexion du répondant : vérifiée par Google, donc validée d'office.
        verifiedAt: isRespondent ? now : null,
      },
      select: { email: true, token: true },
    });
    if (!isRespondent) {
      toSend.push(created);
      pending++;
    }
  }

  if (toSend.length > 0) {
    const origin = await requestOrigin();
    await Promise.all(
      toSend.map(async (v) => {
        const result = await sendVerificationEmail(v.email, formTitle, `${origin}/verifier/${v.token}`);
        if (!result.ok) {
          // L'échec n'annule pas la réponse : il est signalé sur la page de suivi.
          console.error(`Vérification e-mail non envoyée à ${v.email} : ${result.error}`);
        }
      }),
    );
  }

  return pending;
}

/// Annule l'inscription : la réponse (et ses réponses aux questions) est supprimée.
/// Les demandes de vérification **en attente** sont retirées ; les adresses **déjà
/// vérifiées** sont conservées (elles perdent simplement leur lien vers la réponse).
export async function cancelResponse(formId: string): Promise<{ ok: false; error: string } | never> {
  const user = await requireUser();

  const response = await prisma.response.findUnique({
    where: { formId_respondentEmail: { formId, respondentEmail: user.email } },
    select: { id: true },
  });
  if (!response) return { ok: false, error: "Aucune inscription à annuler." };

  // Une personne déjà inscrite (membre du libellé du formulaire) ne peut plus se retirer seule.
  const form = await prisma.form.findUnique({ where: { id: formId }, select: { labelResource: true } });
  if (form?.labelResource && (await isRegistered(form.labelResource, user.email))) {
    return { ok: false, error: "Vous êtes déjà inscrit : contactez le club pour toute modification." };
  }

  await prisma.emailVerification.deleteMany({ where: { responseId: response.id, verifiedAt: null } });
  await prisma.response.delete({ where: { id: response.id } });

  revalidatePath(`/forms/${formId}`);
  redirect(`/forms/${formId}?annulee=1`);
}

/// Renvoie l'e-mail de confirmation pour une adresse (bouton « renvoyer »), ce qui
/// régénère le jeton et repart pour 7 jours.
export async function resendVerification(
  formId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  const response = await prisma.response.findUnique({
    where: { formId_respondentEmail: { formId, respondentEmail: user.email } },
    select: { id: true, form: { select: { title: true } } },
  });
  if (!response) return { ok: false, error: "Réponse introuvable." };

  const verification = (
    await prisma.emailVerification.findMany({ where: { responseId: response.id } })
  ).find((v) => v.email.toLowerCase() === email.trim().toLowerCase());
  if (!verification) return { ok: false, error: "Adresse inconnue pour cette réponse." };
  if (verification.verifiedAt) return { ok: true }; // déjà confirmée

  const updated = await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      token: randomBytes(32).toString("base64url"),
      expiresAt: new Date(Date.now() + VERIFICATION_DAYS * 24 * 3600 * 1000),
      createdAt: new Date(),
    },
    select: { email: true, token: true },
  });

  const origin = await requestOrigin();
  const result = await sendVerificationEmail(
    updated.email,
    response.form.title,
    `${origin}/verifier/${updated.token}`,
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/forms/${formId}/verification`);
  return { ok: true };
}

/// Origine absolue de la requête courante (pour construire les liens des e-mails).
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
