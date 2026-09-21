// Génération et normalisation des codes de vérification à chiffres (compte interne et
// adresses des réponses). Le code est envoyé par e-mail ; la personne le saisit ensuite.

import "server-only";
import { randomInt } from "node:crypto";
import { CODE_LENGTH } from "@/lib/codeConstants";

// Ré-export pour compatibilité des imports serveur existants.
export { CODE_LENGTH, MAX_CODE_ATTEMPTS, CODE_TTL_MINUTES, CODE_TTL_MS } from "@/lib/codeConstants";

/// Génère un code aléatoire (uniforme) de CODE_LENGTH chiffres, zéros de tête compris.
export function generateCode(): string {
  const max = 10 ** CODE_LENGTH;
  return randomInt(0, max).toString().padStart(CODE_LENGTH, "0");
}

/// Ne garde que les chiffres d'une saisie (l'utilisateur peut coller des espaces/tirets).
export function normalizeCode(input: string): string {
  return (input ?? "").replace(/\D/g, "").slice(0, CODE_LENGTH);
}
