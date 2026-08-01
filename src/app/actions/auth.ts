"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordError } from "@/lib/password";
import { createAccountVerification } from "@/lib/accountVerification";
import { sendAccountVerificationEmail } from "@/lib/mailer";

/// Construit l'URL absolue de vérification à partir de l'origine de la requête.
async function verifyAccountUrl(token: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/verifier-compte/${token}`;
}

// État renvoyé aux formulaires (useActionState) : erreurs par champ + message général.
export type AuthFormState =
  | {
      errors?: { firstName?: string; lastName?: string; email?: string; password?: string };
      message?: string;
    }
  | undefined;

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis."),
  lastName: z.string().trim().min(1, "Nom requis."),
  email: z.email("Adresse e-mail invalide.").trim().toLowerCase(),
  password: z.string(),
});

/// Crée un compte interne (nom, prénom, e-mail, mot de passe) puis connecte la personne.
/// Refuse si l'e-mail est déjà utilisé (Google ou compte interne).
export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      errors: {
        firstName: f.firstName?.[0],
        lastName: f.lastName?.[0],
        email: f.email?.[0],
        password: f.password?.[0],
      },
    };
  }

  const { firstName, lastName, email, password } = parsed.data;

  const pwdError = passwordError(password);
  if (pwdError) return { errors: { password: pwdError } };

  // Confirmation du mot de passe (contrôle aussi fait côté client).
  if (password !== String(formData.get("confirmPassword") || "")) {
    return { message: "Les deux mots de passe ne correspondent pas." };
  }

  // Unicité de l'adresse — mais un compte interne NON vérifié n'est « techniquement pas
  // inscrit » : tant que son adresse n'est pas confirmée, il ne doit pas bloquer une nouvelle
  // inscription. On bloque donc uniquement si l'adresse est réellement prise :
  //   - un compte Google (jamais « non vérifié ») ;
  //   - un compte interne déjà VÉRIFIÉ.
  // Un compte interne non vérifié est simplement RÉÉCRIT (nom / mot de passe) et sa
  // vérification est relancée : la 1re inscription non aboutie n'emprisonne pas l'adresse.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && (existing.provider !== "CREDENTIALS" || existing.emailVerifiedAt)) {
    return { errors: { email: "Un compte existe déjà avec cette adresse." } };
  }

  const passwordHash = await hashPassword(password);
  const data = {
    email,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    passwordHash,
    provider: "CREDENTIALS" as const,
    // L'adresse doit TOUJOURS être confirmée : le compte reste inactif jusque-là.
    // But : vérifier que l'adresse existe et que c'est bien son titulaire qui s'inscrit.
    emailVerifiedAt: null,
  };
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });

  // On envoie l'e-mail de confirmation et on renvoie vers la page d'attente
  // (aucune connexion tant que l'adresse n'est pas confirmée).
  const token = await createAccountVerification(user.id);
  const sent = await sendAccountVerificationEmail(email, await verifyAccountUrl(token));
  redirect(`/inscription/verification?email=${encodeURIComponent(email)}${sent.ok ? "" : "&mail=ko"}`);
}

export type ResendState = { ok?: boolean; error?: string } | undefined;

// Délai minimal entre deux envois d'un même e-mail de confirmation (anti-spam).
const RESEND_COOLDOWN_MS = 60_000;

/// Renvoie l'e-mail de confirmation de compte (page d'attente d'inscription).
/// Réponse volontairement neutre : ne révèle pas si l'adresse correspond à un compte.
export async function resendAccountVerification(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Adresse manquante." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Compte inexistant, déjà vérifié ou compte Google : on ne renvoie rien mais on
  // répond « ok » pour ne pas divulguer l'existence du compte.
  if (!user || user.provider !== "CREDENTIALS" || user.emailVerifiedAt) {
    return { ok: true };
  }

  // Anti-spam : si un e-mail vient d'être envoyé (création du compte ou renvoi
  // précédent), on n'en renvoie pas un autre. On répond quand même « ok » pour
  // rester neutre et ne pas révéler l'état du compte : le lien précédent reste valable.
  const last = await prisma.accountVerification.findFirst({
    where: { userId: user.id, verifiedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: true };
  }

  const token = await createAccountVerification(user.id);
  const sent = await sendAccountVerificationEmail(email, await verifyAccountUrl(token));
  if (!sent.ok) return { error: "L'envoi de l'e-mail a échoué. Réessayez plus tard." };
  return { ok: true };
}

/// Connecte un compte interne existant (e-mail + mot de passe).
export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    return { message: "Renseignez votre e-mail et votre mot de passe." };
  }

  const callbackUrl = String(formData.get("callbackUrl") || "/");
  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "E-mail ou mot de passe incorrect." };
    }
    throw error;
  }
  return undefined;
}
