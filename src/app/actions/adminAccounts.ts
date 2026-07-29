"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateTempPassword } from "@/lib/password";

export type TempPasswordResult =
  | { ok: true; password: string }
  | { ok: false; error: string };

/// Génère un nouveau mot de passe temporaire pour un compte interne et renvoie sa valeur
/// en clair UNE SEULE FOIS (à communiquer au membre). Le hash seul est stocké ; l'admin
/// ne peut jamais relire l'ancien mot de passe. Marque le compte « à changer ».
export async function resetPasswordForUser(userId: string): Promise<TempPasswordResult> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Compte introuvable." };
  if (user.provider !== "CREDENTIALS") {
    return { ok: false, error: "Compte Google : le mot de passe est géré par Google." };
  }

  const password = generateTempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  revalidatePath("/admin/comptes");
  return { ok: true, password };
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/// Supprime un compte. Interdit de supprimer son propre compte (éviter l'auto-verrouillage).
export async function deleteUserAccount(userId: string): Promise<DeleteResult> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Compte introuvable." };
  if (user.email.toLowerCase() === admin.email.toLowerCase()) {
    return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/comptes");
  return { ok: true };
}
