// Statut d'un formulaire, partagé par le tableau de bord et le constructeur.
//   Brouillon    : jamais mis en ligne
//   Accessible   : en ligne (remplissable, lien de partage actif)
//   Inaccessible : a été mis en ligne puis clôturé (le lien ne fonctionne plus)

export type FormStatus = "BROUILLON" | "ACCESSIBLE" | "INACCESSIBLE";

export function formStatus(form: { isPublished: boolean; firstPublishedAt: Date | null }): FormStatus {
  if (form.isPublished) return "ACCESSIBLE";
  return form.firstPublishedAt ? "INACCESSIBLE" : "BROUILLON";
}

export const STATUS_LABEL: Record<FormStatus, string> = {
  BROUILLON: "Brouillon",
  ACCESSIBLE: "Accessible",
  INACCESSIBLE: "Inaccessible",
};

/// Classes du badge de statut (pastille colorée).
export const STATUS_BADGE: Record<FormStatus, string> = {
  BROUILLON: "bg-zinc-100 text-zinc-500",
  ACCESSIBLE: "bg-emerald-100 text-emerald-700",
  INACCESSIBLE: "bg-amber-100 text-amber-700",
};
