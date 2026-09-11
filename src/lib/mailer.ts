// Envoi d'e-mails transactionnels (vérification d'adresse, confirmation d'inscription) en
// SMTP (nodemailer). Deux modes, dans l'ordre de priorité :
//
// 1) Service d'e-mail dédié (RECOMMANDÉ pour la délivrabilité, notamment vers laposte.net
//    et SFR/numericable) — Brevo, Mailjet, Resend, Scaleway… Variables d'env :
//      SMTP_HOST    ex. smtp-relay.brevo.com (Brevo), in-v3.mailjet.com (Mailjet)
//      SMTP_PORT    (facultatif) 587 par défaut ; 465 = connexion chiffrée d'emblée
//      SMTP_USER    identifiant / login SMTP fourni par le service
//      SMTP_PASS    clé / mot de passe SMTP fourni par le service
//      SMTP_SECURE  (facultatif) "true"/"false" pour forcer ; sinon déduit du port (465 = true)
//
// 2) Compte Gmail (repli, comportement historique) — utilisé si SMTP_HOST n'est PAS défini :
//      GMAIL_USER           adresse Gmail expéditrice, ex. lesfousduvolant69@gmail.com
//      GMAIL_APP_PASSWORD   « mot de passe d'application » Google (16 caractères)
//
// Dans les deux cas, MAIL_FROM (facultatif) fixe l'expéditeur affiché, ex.
// « Club de badminton <lesfousduvolant69@gmail.com> ». Avec un service dédié, pensez à
// VÉRIFIER cette adresse d'expéditeur dans son tableau de bord.
// Sans configuration, l'envoi échoue proprement : le reste de l'application continue.

import nodemailer from "nodemailer";

/// Paramètres SMTP effectifs : service dédié si SMTP_HOST est défini, sinon repli Gmail.
function smtpSettings() {
  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE.trim().toLowerCase() === "true"
      : port === 465;
    return {
      host,
      port,
      secure,
      user: process.env.SMTP_USER?.trim() ?? "",
      pass: cleanSecret(process.env.SMTP_PASS),
    };
  }
  // Repli : compte Gmail (SMTP direct). Le mot de passe d'application peut être collé avec
  // des espaces par groupes de 4 → on les retire.
  return {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    user: process.env.GMAIL_USER?.trim() ?? "",
    pass: cleanAppPassword(process.env.GMAIL_APP_PASSWORD),
  };
}

export function mailerConfigured(): boolean {
  const s = smtpSettings();
  return Boolean(s.host && s.user && s.pass);
}

export type SendResult = { ok: true } | { ok: false; error: string };

/// Adresse d'expédition affichée aux répondants (« l'e-mail vient de… ») : celle de
/// MAIL_FROM si présente, sinon l'identifiant SMTP / Gmail.
export function senderAddress(): string {
  return fromAddress() || smtpSettings().user || "l'adresse du club";
}

/// Adresse (sans le nom affiché) contenue dans MAIL_FROM, ex. « Club <x@y> » → « x@y ».
function fromAddress(): string {
  const raw = process.env.MAIL_FROM?.trim();
  if (!raw) return "";
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

/// Nettoie une valeur secrète collée : chevrons/guillemets qui l'entourent (garde les
/// espaces internes éventuels d'un mot de passe).
function cleanSecret(value: string | undefined): string {
  return (value ?? "").trim().replace(/^[<"']|[>"']$/g, "");
}

/// Nettoie un mot de passe d'application collé depuis Google : espaces des groupes de 4,
/// et éventuels chevrons ou guillemets entourant la valeur.
function cleanAppPassword(value: string | undefined): string {
  return cleanSecret(value).replace(/\s+/g, "");
}

// Le transport est réutilisé entre les envois, et recréé si les identifiants changent
// (sinon un serveur de dev garderait en mémoire une configuration erronée).
let transporter: nodemailer.Transporter | null = null;
let transporterKey = "";

function getTransporter() {
  const s = smtpSettings();
  const key = `${s.host}:${s.port}:${s.secure}|${s.user}|${s.pass}`;
  if (!transporter || transporterKey !== key) {
    transporterKey = key;
    transporter = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: { user: s.user, pass: s.pass },
    });
  }
  return transporter;
}

type Envelope = { to?: string; bcc?: string[] };

/// Envoi bas niveau : accepte un destinataire visible (`to`) et/ou une liste en
/// copie cachée (`bcc`), pour envoyer un même message à plusieurs personnes en un seul e-mail.
async function deliver(
  envelope: Envelope,
  subject: string,
  html: string,
  text: string,
): Promise<SendResult> {
  if (!mailerConfigured()) {
    return { ok: false, error: "Envoi d'e-mails non configuré (GMAIL_USER / GMAIL_APP_PASSWORD)." };
  }
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || smtpSettings().user,
      to: envelope.to,
      bcc: envelope.bcc,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de l'envoi de l'e-mail." };
  }
}

async function sendMail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  return deliver({ to }, subject, html, text);
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

/// E-mail « mot de passe oublié » : lien de confirmation. Le mot de passe n'est PAS changé
/// tant que ce lien n'est pas ouvert (preuve que le demandeur contrôle bien la boîte —
/// évite qu'un tiers change le mot de passe d'un membre en connaissant juste son adresse).
export async function sendPasswordResetLinkEmail(to: string, resetUrl: string): Promise<SendResult> {
  const subject = "Réinitialiser votre mot de passe — Formulaires du club";
  const text =
    `Vous avez demandé à réinitialiser le mot de passe de votre compte des formulaires du club.\n\n` +
    `Cliquez sur ce lien pour confirmer et recevoir un nouveau mot de passe :\n${resetUrl}\n\n` +
    `Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce ` +
    `message : votre mot de passe reste inchangé.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#18181b;line-height:1.5">
      <p>Vous avez demandé à réinitialiser le mot de passe de votre compte des
         <strong>formulaires du club</strong>.</p>
      <p>Confirmez pour recevoir un nouveau mot de passe :</p>
      <p>
        <a href="${escapeHtml(resetUrl)}"
           style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p style="font-size:13px;color:#71717a">
        Lien valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message :
        votre mot de passe reste inchangé.
      </p>
    </div>`;
  return sendMail(to, subject, html, text);
}

/// E-mail envoyé APRÈS confirmation du lien : contient le nouveau mot de passe temporaire
/// (à changer après connexion).
export async function sendNewPasswordEmail(to: string, password: string): Promise<SendResult> {
  const subject = "Votre nouveau mot de passe — Formulaires du club";
  const text =
    `Vous avez demandé un nouveau mot de passe pour votre compte des formulaires du club.\n\n` +
    `Votre nouveau mot de passe : ${password}\n\n` +
    `Connectez-vous avec ce mot de passe, puis changez-le depuis « Mon compte ».\n` +
    `Si vous n'êtes pas à l'origine de cette demande, changez votre mot de passe et prévenez le club.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#18181b;line-height:1.5">
      <p>Vous avez demandé un nouveau mot de passe pour votre compte des
         <strong>formulaires du club</strong>.</p>
      <p>Votre nouveau mot de passe :</p>
      <p style="font-size:18px;font-weight:700;letter-spacing:1px;background:#f4f4f5;
                display:inline-block;padding:8px 14px;border-radius:8px">${escapeHtml(password)}</p>
      <p>Connectez-vous avec ce mot de passe, puis changez-le depuis « Mon compte ».</p>
      <p style="font-size:13px;color:#71717a">
        Si vous n'êtes pas à l'origine de cette demande, changez votre mot de passe et prévenez le club.
      </p>
    </div>`;
  return sendMail(to, subject, html, text);
}

/// E-mail annonçant que l'inscription au club est VALIDÉE.
/// Envoyé en **un message INDIVIDUEL par personne** (destinataire = elle-même) :
///   - message correctement adressé → bonne délivrabilité, et surtout PAS de rejet Gmail
///     « 550 5.7.1 rejected per SPAM policy » (déclenché par un envoi sans destinataire
///     visible, comme un BCC seul) ;
///   - AUCUNE copie au club (l'adresse d'envoi ne se reçoit pas le message à elle-même) ;
///   - les personnes ne voient pas les adresses des autres (un destinataire par e-mail).
/// Message générique (pas de prénom, commun à tous). Déclenché par l'application desktop
/// à la validation d'une (ou plusieurs) préinscription(s).
export async function sendRegistrationConfirmed(
  emails: string[],
  formTitle?: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const forWhat = formTitle && formTitle.trim() ? ` à « ${formTitle.trim()} »` : "";
  const subject = "Votre inscription est validée ✅";
  const text =
    `Bonjour,\n\n` +
    `Bonne nouvelle : votre inscription${forWhat} a bien été validée par le club.\n\n` +
    `À bientôt sur les courts !\nLe club de badminton`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#18181b;line-height:1.5">
      <p>Bonjour,</p>
      <p>Bonne nouvelle : votre inscription${escapeHtml(forWhat)} a bien été
         <strong>validée</strong> par le club.</p>
      <p style="color:#059669;font-weight:600">À bientôt sur les courts !</p>
      <p style="font-size:13px;color:#71717a">Le club de badminton</p>
    </div>`;

  if (!mailerConfigured()) {
    return {
      sent: 0,
      failed: emails.length,
      errors: ["Envoi d'e-mails non configuré (GMAIL_USER / GMAIL_APP_PASSWORD)."],
    };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const email of emails) {
    const result = await sendMail(email, subject, html, text);
    if (result.ok) sent++;
    else {
      failed++;
      errors.push(`${email} : ${result.error}`);
    }
  }
  return { sent, failed, errors };
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
