import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";

export type SessionUser = {
  email: string;
  name?: string | null;
  image?: string | null;
};

/// Exige un utilisateur connecté ; sinon redirige vers la connexion.
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/connexion");
  return { email, name: session!.user?.name, image: session!.user?.image };
}

/// Exige un utilisateur admin ; sinon renvoie vers l'accueil utilisateur.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user.email)) redirect("/");
  return user;
}
