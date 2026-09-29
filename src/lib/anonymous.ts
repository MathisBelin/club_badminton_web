// Préinscriptions ANONYMES créées depuis le desktop. Le site exige un e-mail comme identité
// (non nul, unique par formulaire) : le desktop utilise donc un e-mail-marqueur non routable
// « anon-<id>@anonyme.local ». Ces adresses ne doivent JAMAIS être affichées telles quelles :
// l'admin voit « Anonyme ». (Détection uniquement — la création reste côté desktop.)

const ANONYMOUS_EMAIL_DOMAIN = "anonyme.local";

/// Vrai si l'e-mail est un marqueur de préinscription anonyme.
export function isAnonymousEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith("@" + ANONYMOUS_EMAIL_DOMAIN);
}

/// Nom à afficher pour un répondant : son nom, sinon « Anonyme » si l'e-mail est un marqueur,
/// sinon le repli fourni (par défaut « — »).
export function respondentLabel(
  name: string | null | undefined,
  email: string | null | undefined,
  fallback = "—",
): string {
  if (name && name.trim()) return name.trim();
  if (isAnonymousEmail(email)) return "Anonyme";
  return fallback;
}
