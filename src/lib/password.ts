// Hachage et contrôle des mots de passe des comptes internes (bcrypt).
// Le mot de passe en clair ne quitte jamais le serveur et n'est JAMAIS stocké :
// seul le hash bcrypt est conservé (User.passwordHash), irréversible.

import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/// Règle minimale : au moins 8 caractères. On reste volontairement souple
/// (public du club) : la robustesse repose surtout sur le hachage et la limite de tentatives.
export const PASSWORD_MIN = 8;

export function passwordError(value: string): string | null {
  if (value.length < PASSWORD_MIN) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`;
  }
  return null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/// Génère un mot de passe temporaire lisible (pour la réinitialisation par un admin).
/// Sans caractères ambigus (0/O, 1/l/I) pour faciliter la communication au membre.
export function generateTempPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
