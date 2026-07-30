import { guardIntegration } from "@/lib/integration";
import { sendRegistrationConfirmedEmail } from "@/lib/mailer";

// Notification d'inscription validée, déclenchée par l'application desktop lorsqu'un
// admin valide une (ou plusieurs) préinscription(s). Envoie un e-mail « inscription
// validée » à chaque destinataire, via le Gmail du club (SMTP, cf. mailer).
//   POST /api/integration/notify/registration
//   body : { recipients: [{ email, name? }], formTitle? }
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

  let sent = 0;
  const errors: string[] = [];
  for (const r of recipients) {
    const res = await sendRegistrationConfirmedEmail(r.email, r.name, formTitle);
    if (res.ok) sent += 1;
    else errors.push(`${r.email} : ${res.error}`);
  }

  return Response.json({ sent, failed: recipients.length - sent, errors });
}
