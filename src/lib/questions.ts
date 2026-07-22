// Types de questions partagés entre le constructeur et l'affichage.
export const QUESTION_TYPES = [
  { value: "TEXT", label: "Texte court" },
  { value: "PARAGRAPH", label: "Paragraphe" },
  { value: "RADIO", label: "Choix unique" },
  { value: "CHECKBOX", label: "Cases à cocher" },
  { value: "DROP_DOWN", label: "Liste déroulante" },
  { value: "DATE", label: "Date" },
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

// Types nécessitant une liste d'options.
export const TYPES_WITH_OPTIONS: QuestionType[] = ["RADIO", "CHECKBOX", "DROP_DOWN"];

export function typeLabel(type: string): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}
