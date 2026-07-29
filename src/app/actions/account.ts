"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, passwordError } from "@/lib/password";

export type AccountFormState = { ok?: boolean; error?: string } | undefined;

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis."),
  lastName: z.string().trim().min(1, "Nom requis."),
});

/// Met à jour le prénom / nom du compte connecté (compte interne uniquement).
export async function updateProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Compte introuvable." };
  if (user.provider !== "CREDENTIALS") {
    return { error: "Le nom est géré par votre compte Google." };
  }

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const { firstName, lastName } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: { firstName, lastName, name: `${firstName} ${lastName}` },
  });
  revalidatePath("/compte");
  return { ok: true };
}

/// Change le mot de passe du compte connecté (compte interne) après vérification de l'ancien.
export async function changePassword(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { error: "Aucun mot de passe interne pour ce compte." };
  }

  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmNewPassword") || "");

  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: "Mot de passe actuel incorrect." };
  }
  const pwdError = passwordError(next);
  if (pwdError) return { error: pwdError };
  // Confirmation du nouveau mot de passe (contrôle aussi fait côté client).
  if (next !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };

  await prisma.user.update({
    where: { id: user.id },
    // Un changement volontaire lève le drapeau « mot de passe temporaire à changer ».
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  return { ok: true };
}
