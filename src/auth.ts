import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

// Instance complète Auth.js (runtime Node) : ajoute la persistance de l'utilisateur
// en base à la connexion. Utilisée par les route handlers et les composants serveur.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
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
