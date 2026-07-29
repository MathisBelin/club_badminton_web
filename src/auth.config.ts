import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Identifiant du 2e provider : même compte Google, mais autorisation ÉLARGIE
// (lecture de Google Contacts) demandée uniquement aux admins, à la demande.
// Les répondants gardent l'écran de consentement minimal du provider standard.
export const CONTACTS_PROVIDER = "google-contacts";

/// Portée demandée pour lire les libellés Contacts et leurs membres (lecture seule).
export const CONTACTS_SCOPE =
  "openid email profile https://www.googleapis.com/auth/contacts.readonly";

// Configuration Auth.js « edge-safe » (sans accès base de données) : utilisée par
// le middleware. Provider Google uniquement, sessions JWT. Les identifiants sont lus
// automatiquement depuis AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
export const authConfig = {
  providers: [
    Google,
    Google({
      id: CONTACTS_PROVIDER,
      name: "Google Contacts",
      authorization: {
        params: {
          scope: CONTACTS_SCOPE,
          // Jeton de rafraîchissement : le serveur doit pouvoir lire Contacts plus tard,
          // y compris pendant la visite d'un répondant. `consent` force sa délivrance.
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  // Sessions JWT conservées 30 jours (cookie) : c'est le « cache » de connexion —
  // l'utilisateur n'a pas à ressaisir son mot de passe à chaque visite.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  pages: { signIn: "/connexion" },
  callbacks: {
    // Autorise l'accès aux routes protégées uniquement si l'utilisateur est connecté.
    // Le contrôle admin (ADMIN_EMAILS) est fait côté page serveur (voir lib/session.ts).
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
