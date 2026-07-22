import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Configuration Auth.js « edge-safe » (sans accès base de données) : utilisée par
// le middleware. Provider Google uniquement, sessions JWT. Les identifiants sont lus
// automatiquement depuis AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
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
