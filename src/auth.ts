import NextAuth from "next-auth";
import { CONTACTS_PROVIDER, authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

// Instance complète Auth.js (runtime Node) : ajoute la persistance de l'utilisateur
// en base à la connexion. Utilisée par les route handlers et les composants serveur.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) return false;

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
