import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware d'authentification : redirige vers /connexion tant que l'utilisateur
// n'est pas connecté (callback `authorized`). Exclut les routes publiques.
export default NextAuth(authConfig).auth;

export const config = {
  // Protège tout sauf : API auth, API blob (qui vérifie elle-même la session et
  // doit répondre en JSON plutôt qu'en redirection), page de connexion, page de
  // vérification d'adresse e-mail (ouverte depuis la messagerie, le jeton fait
  // office de preuve), assets Next, favicon.
  // `api/integration` est authentifiée par clé d'API (x-api-key), pas par session.
  matcher: [
    "/((?!api/auth|api/blob|api/integration|connexion|verifier|_next/static|_next/image|favicon.ico).*)",
  ],
};
