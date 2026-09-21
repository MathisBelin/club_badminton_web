// Vérification de l'adresse d'un COMPTE interne : création et vérification du CODE à
// chiffres envoyé par e-mail à la création du compte (table AccountVerification).

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  generateCode,
  normalizeCode,
  CODE_LENGTH,
  MAX_CODE_ATTEMPTS,
  CODE_TTL_MS,
} from "@/lib/verificationCode";

/// Crée (ou remplace) une demande de vérification pour un utilisateur et renvoie le code.
/// Les anciennes demandes non consommées de cet utilisateur sont supprimées (une seule active),
/// ce qui désactive tout code précédent lors d'un renvoi.
export async function createAccountVerification(userId: string): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.$transaction([
    prisma.accountVerification.deleteMany({ where: { userId, verifiedAt: null } }),
    prisma.accountVerification.create({ data: { userId, code, expiresAt } }),
  ]);
  return code;
}

export type VerifyCodeResult =
  | { state: "ok" }
  | { state: "deja" } // adresse déjà confirmée
  | { state: "expire" } // code périmé, en redemander un
  | { state: "trop" } // trop d'essais, en redemander un
  | { state: "invalide" } // code erroné
  | { state: "absente" }; // aucune demande / format incorrect

/// Vérifie le code saisi pour l'adresse d'un compte interne : marque le compte comme
/// vérifié (emailVerifiedAt) si le code est correct et encore valable. La recherche est
/// faite par utilisateur (le code n'est pas unique).
export async function verifyAccountCode(email: string, rawCode: string): Promise<VerifyCodeResult> {
  const code = normalizeCode(rawCode);
  const normalizedEmail = email.trim().toLowerCase();
  if (code.length !== CODE_LENGTH || !normalizedEmail) return { state: "absente" };

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, provider: true, emailVerifiedAt: true },
  });
  if (!user || user.provider !== "CREDENTIALS") return { state: "absente" };
  if (user.emailVerifiedAt) return { state: "deja" };

  const verification = await prisma.accountVerification.findFirst({
    where: { userId: user.id, verifiedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, attempts: true, expiresAt: true },
  });
  if (!verification) return { state: "absente" };
  if (verification.expiresAt.getTime() < Date.now()) return { state: "expire" };
  if (verification.attempts >= MAX_CODE_ATTEMPTS) return { state: "trop" };

  if (verification.code !== code) {
    await prisma.accountVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    return verification.attempts + 1 >= MAX_CODE_ATTEMPTS ? { state: "trop" } : { state: "invalide" };
  }

  await prisma.$transaction([
    prisma.accountVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);
  return { state: "ok" };
}
