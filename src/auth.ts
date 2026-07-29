import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CONTACTS_PROVIDER, authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { verifyPassword } from "@/lib/password";

// Instance complète Auth.js (runtime Node) : ajoute la persistance de l'utilisateur
// en base à la connexion, et le provider « compte interne » (e-mail + mot de passe).
// Ce provider n'est PAS dans auth.config.ts (edge) car il touche la base et bcrypt.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      id: "credentials",
      name: "E-mail et mot de passe",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const email = String(raw?.email ?? "").trim().toLowerCase();
        const password = String(raw?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Compte inconnu ou compte Google (sans mot de passe interne) : refus.
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        // Compte interne : l'adresse doit toujours être vérifiée pour se connecter.
        if (!user.emailVerifiedAt) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Compte interne : l'utilisateur est déjà validé par `authorize`, rien à upserter
      // (il existe forcément) et surtout ne pas écraser ses champs.
      if (account?.provider === "credentials") return true;

      // Autorisation « Google Contacts » (admins) : on conserve le jeton de
      // rafraîchissement pour lire les libellés côté serveur, même hors session admin.
      if (account?.provider === CONTACTS_PROVIDER) {
        if (!isAdmin(user.email)) return false;
        if (account.refresh_token) {
          await prisma.googleAccount.upsert({
            where: { email: user.email.toLowerCase() },
            update: { refreshToken: account.refresh_token, scope: account.scope ?? "" },
            create: {
              email: user.email.toLowerCase(),
              refreshToken: account.refresh_token,
              scope: account.scope ?? "",
            },
          });
        }
      }

      await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name ?? undefined, image: user.image ?? undefined },
        create: {
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
      });
      return true;
    },
  },
});
