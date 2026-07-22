// Détermination du rôle admin : liste d'e-mails autorisés dans la variable
// d'environnement ADMIN_EMAILS (séparés par des virgules). Aucun rôle en base.

function adminList(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return adminList().includes(email.toLowerCase());
}
