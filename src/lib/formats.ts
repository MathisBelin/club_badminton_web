// Contrôles de saisie applicables aux questions libres (TEXT / TEXT_LIST).
// Partagés par le constructeur, le remplissage (contrôle immédiat) et le
// Server Action de soumission (contrôle faisant foi).

import { MULTI_SEP } from "@/lib/questions";

export const QUESTION_FORMATS = [
  { value: "EMAIL", label: "Adresse e-mail" },
  { value: "PHONE", label: "Numéro de téléphone" },
  { value: "INTEGER", label: "Nombre entier" },
  { value: "DECIMAL", label: "Nombre décimal" },
] as const;

export type QuestionFormat = (typeof QUESTION_FORMATS)[number]["value"];

export function formatLabel(format: string): string {
  return QUESTION_FORMATS.find((f) => f.value === format)?.label ?? format;
}

// Seules ces questions acceptent un format (les autres types contraignent déjà la saisie).
export const TYPES_WITH_FORMAT = ["TEXT", "TEXT_LIST"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s.\-()]{8,20}$/;
const INTEGER_RE = /^-?\d+$/;
const DECIMAL_RE = /^-?\d+([.,]\d+)?$/;

/// Contrôle une valeur unique. Retourne null si elle est valide, sinon le motif du refus.
export function checkValue(format: QuestionFormat, value: string): string | null {
  const v = value.trim();
  if (!v) return null; // le caractère obligatoire est vérifié séparément
  switch (format) {
    case "EMAIL":
      return EMAIL_RE.test(v) ? null : `« ${v} » n'est pas une adresse e-mail valide.`;
    case "PHONE":
      // Au moins 8 chiffres, en plus des séparateurs autorisés.
      return PHONE_RE.test(v) && (v.match(/\d/g)?.length ?? 0) >= 8
        ? null
        : `« ${v} » n'est pas un numéro de téléphone valide.`;
    case "INTEGER":
      return INTEGER_RE.test(v) ? null : `« ${v} » n'est pas un nombre entier.`;
    case "DECIMAL":
      return DECIMAL_RE.test(v) ? null : `« ${v} » n'est pas un nombre décimal.`;
  }
}

/// Contrôle la réponse à une question (TEXT_LIST = plusieurs valeurs jointes par MULTI_SEP).
export function checkAnswer(
  question: { title: string; type: string; format?: string | null },
  value: string,
): string | null {
  const format = question.format;
  if (!format || !TYPES_WITH_FORMAT.includes(question.type)) return null;
  const values = question.type === "TEXT_LIST" ? value.split(MULTI_SEP) : [value];
  for (const v of values) {
    const error = checkValue(format as QuestionFormat, v);
    if (error) return `Question « ${question.title} » : ${error}`;
  }
  return null;
}

/// Adresses e-mail saisies pour une question (TEXT_LIST = plusieurs).
export function emailsOf(question: { type: string }, value: string): string[] {
  const values = question.type === "TEXT_LIST" ? value.split(MULTI_SEP) : [value];
  return values.map((v) => v.trim()).filter(Boolean);
}
