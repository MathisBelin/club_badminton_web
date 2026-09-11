// Jeton « mot de passe oublié » SIGNÉ (HMAC), sans stockage en base :
//   - lié à l'utilisateur, avec une expiration ;
//   - lié à l'empreinte du mot de passe ACTUEL → dès que le mot de passe change (à la fin
//     du flux), le jeton devient invalide : usage unique de fait ;
//   - inviolable (signé avec AUTH_SECRET).
// Choix volontaire du sans‑stockage : évite une migration de schéma ; suffisant pour un
// lien à durée de vie courte.

import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Durée de validité du lien de réinitialisation.
const TTL_MS = 60 * 60 * 1000; // 1 heure

function secret(): string {
  // AUTH_SECRET est toujours défini (Auth.js) ; repli neutre pour le typage.
  return process.env.AUTH_SECRET || "insecure-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/// Empreinte du mot de passe actuel : change dès qu'il est modifié → invalide le jeton.
function fingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

/// Construit un jeton signé pour réinitialiser le mot de passe de cet utilisateur.
export function createResetToken(userId: string, passwordHash: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, e: Date.now() + TTL_MS, f: fingerprint(passwordHash) }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/// Vérifie un jeton (signature, expiration, empreinte du mot de passe encore valable).
/// Renvoie l'identifiant utilisateur, ou null si le jeton est invalide/expiré/déjà utilisé.
export async function verifyResetToken(token: string): Promise<{ userId: string } | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let data: { u?: string; e?: number; f?: string };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data.u || !data.e || !data.f || Date.now() > data.e) return null;

  const user = await prisma.user.findUnique({
    where: { id: data.u },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) return null;
  if (fingerprint(user.passwordHash) !== data.f) return null; // mot de passe déjà changé
  return { userId: data.u };
}
