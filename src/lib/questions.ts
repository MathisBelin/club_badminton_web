// Types d'éléments partagés entre le constructeur et l'affichage.

// Types de questions (proposés dans la liste déroulante du constructeur).
export const QUESTION_TYPES = [
  { value: "TEXT", label: "Texte court" },
  { value: "PARAGRAPH", label: "Paragraphe" },
  { value: "TEXT_LIST", label: "Texte multiple" },
  { value: "RADIO", label: "Choix unique" },
  { value: "CHECKBOX", label: "Cases à cocher" },
  { value: "DROP_DOWN", label: "Liste déroulante" },
  { value: "DATE", label: "Date" },
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

// Séparateur des valeurs multiples (CHECKBOX et TEXT_LIST) dans Answer.value.
export const MULTI_SEP = ", ";

// Bloc de texte informatif : affiché dans le formulaire, sans réponse attendue.
// Il n'apparaît donc ni dans le tableau des réponses, ni dans l'export CSV.
export const TEXT_BLOCK = "TEXT_BLOCK";

// Un élément de formulaire est soit une question, soit un bloc de texte.
export type ItemType = QuestionType | typeof TEXT_BLOCK;

export function isQuestion(type: string): type is QuestionType {
  return type !== TEXT_BLOCK;
}

// Types nécessitant une liste d'options.
export const TYPES_WITH_OPTIONS: ItemType[] = ["RADIO", "CHECKBOX", "DROP_DOWN"];

// Effet d'une option de choix sur la réponse.
export const OPTION_ACTIONS = [
  { value: "NONE", label: "Aucun effet" },
  { value: "WAITLIST", label: "Ajouter à la liste d'attente" },
] as const;

export type OptionAction = (typeof OPTION_ACTIONS)[number]["value"];

// Champs de fiche contact auxquels une question libre peut correspondre : permet de
// rapprocher une réponse d'un contact du club (application desktop).
export const CONTACT_FIELDS = [
  { value: "FIRST_NAME", label: "Prénom" },
  { value: "LAST_NAME", label: "Nom" },
  { value: "PHONE", label: "Téléphone" },
  { value: "EMAIL", label: "E-mail" },
  { value: "SECONDARY_EMAIL", label: "E-mail secondaire" },
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number]["value"];

export function contactFieldLabel(field: string): string {
  return CONTACT_FIELDS.find((f) => f.value === field)?.label ?? field;
}

export function typeLabel(type: string): string {
  if (type === TEXT_BLOCK) return "Texte";
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}
