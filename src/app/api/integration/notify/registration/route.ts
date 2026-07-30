import { guardIntegration } from "@/lib/integration";
import { sendRegistrationConfirmedBulk } from "@/lib/mailer";

// Notification d'inscription validée, déclenchée par l'application desktop lorsqu'un
// admin valide une (ou plusieurs) préinscription(s). Envoie UN SEUL e-mail « inscription
// validée » à toutes les personnes en copie cachée (BCC), via le Gmail du club.
//   POST /api/integration/notify/registration
//   body : { recipients: [{ email, name? }], formTitle? }  (le champ name est ignoré : message commun)
type Recipient = { email?: string; name?: string };

export async function POST(request: Request) {
  const guard = guardIntegration(request);
  if (!guard.ok) return guard.response;

  let body: { recipients?: Recipient[]; formTitle?: string };
  try {
    body = (await request.json()) as { recipients?: Recipient[]; formTitle?: string };
  } catch {
    return Response.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const recipients = (body.recipients ?? []).filter(
    (r): r is { email: string; name?: string } =>
      typeof r?.email === "string" && r.email.includes("@"),
  );
  if (recipients.length === 0) {
    return Response.json({ error: "Aucun destinataire valide." }, { status: 400 });
  }

  const formTitle = typeof body.formTitle === "string" ? body.formTitle : undefined;

  // Un seul e-mail, toutes les adresses en copie cachée (dédoublonnées).
  const emails = [...new Set(recipients.map((r) => r.email.trim().toLowerCase()))];
  const res = await sendRegistrationConfirmedBulk(emails, formTitle);

  if (res.ok) return Response.json({ sent: emails.length, failed: 0, errors: [] });
  return Response.json({ sent: 0, failed: emails.length, errors: [res.error] });
}
