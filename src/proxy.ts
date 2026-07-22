import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware d'authentification : redirige vers /connexion tant que l'utilisateur
// n'est pas connecté (callback `authorized`). Exclut les routes publiques.
export default NextAuth(authConfig).auth;

export const config = {
  // Protège tout sauf : API auth, page de connexion, assets Next, favicon.
  matcher: ["/((?!api/auth|connexion|_next/static|_next/image|favicon.ico).*)"],
};
