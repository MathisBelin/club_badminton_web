import { guardIntegration } from "@/lib/integration";
import { sendRegistrationConfirmed } from "@/lib/mailer";

// Notification d'inscription validée, déclenchée par l'application desktop lorsqu'un
// admin valide une (ou plusieurs) préinscription(s). Envoie un e-mail « inscription
// validée » INDIVIDUEL à chaque personne (destinataire = elle-même), via le Gmail du club :
// pas de copie au club, et pas de rejet Gmail « SPAM policy » (lié à un envoi sans To).
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

  // Un e-mail individuel par personne (adresses dédoublonnées).
  const emails = [...new Set(recipients.map((r) => r.email.trim().toLowerCase()))];
  const res = await sendRegistrationConfirmed(emails, formTitle);

  return Response.json(res);
}
