import Link from "next/link";
import { auth, signOut } from "@/auth";
import { isAdmin } from "@/lib/admin";

// En-tête partagé : marque, navigation (Admin si autorisé) et bloc utilisateur.
export default async function AppHeader() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;
  const admin = isAdmin(email);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-emerald-700">
          <span className="text-lg">🏸</span>
          <span>Formulaires du club</span>
        </Link>

        <nav className="ml-4 flex items-center gap-4 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            Accueil
          </Link>
          {admin && (
            <Link href="/admin" className="text-zinc-600 hover:text-zinc-900">
              Administration
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {email && (
            <>
              <span className="hidden text-zinc-500 sm:inline">{email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/connexion" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
                >
                  Déconnexion
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
