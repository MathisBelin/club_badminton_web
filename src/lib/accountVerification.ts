// Vérification de l'adresse d'un COMPTE interne : création et consommation du jeton
// envoyé par e-mail à la création du compte (table AccountVerification).

import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Durée de validité d'un lien de vérification de compte.
const VERIFICATION_DAYS = 7;

/// Crée (ou remplace) une demande de vérification pour un utilisateur et renvoie le jeton.
/// Les anciennes demandes non consommées de cet utilisateur sont supprimées (une seule active).
export async function createAccountVerification(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.accountVerification.deleteMany({ where: { userId, verifiedAt: null } }),
    prisma.accountVerification.create({ data: { userId, token, expiresAt } }),
  ]);
  return token;
}

export type ConsumeResult =
  | { state: "ok" }
  | { state: "expire" }
  | { state: "invalide" }
  | { state: "deja" };

/// Consomme le jeton : marque le compte comme vérifié (emailVerifiedAt) si le lien est valable.
export async function consumeAccountVerification(token: string): Promise<ConsumeResult> {
  const verification = await prisma.accountVerification.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true, verifiedAt: true },
  });
  if (!verification) return { state: "invalide" };
  if (verification.verifiedAt) return { state: "deja" };
  if (verification.expiresAt.getTime() < Date.now()) return { state: "expire" };

  await prisma.$transaction([
    prisma.accountVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);
  return { state: "ok" };
}
