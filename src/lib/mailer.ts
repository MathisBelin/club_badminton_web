// Envoi d'e-mails transactionnels (vérification d'adresse) via le compte Gmail du club,
// en SMTP (nodemailer). Variables d'env :
//   GMAIL_USER           adresse Gmail expéditrice, ex. lesfousduvolant69@gmail.com
//   GMAIL_APP_PASSWORD   « mot de passe d'application » Google (16 caractères, PAS le mot
//                        de passe du compte ; nécessite la validation en 2 étapes)
//   MAIL_FROM            (facultatif) expéditeur affiché, ex. « Club de badminton <…@gmail.com> »
//                        — Gmail réécrit l'adresse avec GMAIL_USER, seul le nom affiché suit.
// Sans configuration, l'envoi échoue proprement (message explicite) : le reste de
// l'application continue de fonctionner.

import nodemailer from "nodemailer";

export function mailerConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export type SendResult = { ok: true } | { ok: false; error: string };

/// Adresse d'expédition affichée aux répondants (« l'e-mail vient de… »).
export function senderAddress(): string {
  return process.env.GMAIL_USER?.trim() || "l'adresse du club";
}

/// Nettoie un mot de passe d'application collé depuis Google : espaces des groupes de 4,
/// et éventuels chevrons ou guillemets entourant la valeur.
function cleanAppPassword(value: string | undefined): string {
  return (value ?? "").trim().replace(/^[<"']|[>"']$/g, "").replace(/\s+/g, "");
}

// Le transport est réutilisé entre les envois, et recréé si les identifiants changent
// (sinon un serveur de dev garderait en mémoire une configuration erronée).
let transporter: nodemailer.Transporter | null = null;
let transporterKey = "";

function getTransporter() {
  const key = `${process.env.GMAIL_USER}|${cleanAppPassword(process.env.GMAIL_APP_PASSWORD)}`;
  if (!transporter || transporterKey !== key) {
    transporterKey = key;
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER?.trim(),
        pass: cleanAppPassword(process.env.GMAIL_APP_PASSWORD),
      },
    });
  }
  return transporter;
}

async function sendMail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  if (!mailerConfigured()) {
    return { ok: false, error: "Envoi d'e-mails non configuré (GMAIL_USER / GMAIL_APP_PASSWORD)." };
  }
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.GMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de l'envoi de l'e-mail." };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/// E-mail de confirmation envoyé à la CRÉATION d'un compte interne (vérification d'adresse).
export async function sendAccountVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<SendResult> {
  const subject = "Confirmez votre adresse — Formulaires du club";
  const text =
    `Vous venez de créer un compte sur les formulaires du club.\n\n` +
    `Cliquez sur ce lien pour confirmer votre adresse et activer votre compte :\n${verifyUrl}\n\n` +
    `Ce lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#18181b;line-height:1.5">
      <p>Vous venez de créer un compte sur les <strong>formulaires du club</strong>.</p>
      <p>Confirmez votre adresse pour activer votre compte :</p>
      <p>
        <a href="${escapeHtml(verifyUrl)}"
           style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
          Confirmer mon adresse
        </a>
      </p>
      <p style="font-size:13px;color:#71717a">
        Lien valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
      </p>
    </div>`;
  return sendMail(to, subject, html, text);
}

/// E-mail de confirmation d'adresse envoyé après l'envoi d'un formulaire.
export async function sendVerificationEmail(
  to: string,
  formTitle: string,
  verifyUrl: string,
): Promise<SendResult> {
  const subject = `Vérifiez votre adresse — ${formTitle}`;
  const text =
    `Vous avez indiqué cette adresse dans le formulaire « ${formTitle} ».\n\n` +
    `Cliquez sur ce lien pour la vérifier :\n${verifyUrl}\n\n` +
    `Ce lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#18181b;line-height:1.5">
      <p>Vous avez indiqué cette adresse dans le formulaire « <strong>${escapeHtml(formTitle)}</strong> ».</p>
      <p>
        <a href="${escapeHtml(verifyUrl)}"
           style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
          Vérifier mon adresse
        </a>
      </p>
      <p style="font-size:13px;color:#71717a">
        Lien valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
      </p>
    </div>`;
  return sendMail(to, subject, html, text);
}
