import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";

// Page « Mon compte » : modification du profil et du mot de passe (compte interne).
export default async function ComptePage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { email: session.email } });
  if (!user) redirect("/connexion");

  const isCredentials = user.provider === "CREDENTIALS";

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Mon compte</h1>
        <p className="mt-1 text-sm text-zinc-500">{user.email}</p>

        {user.mustChangePassword && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Un mot de passe temporaire vous a été attribué. Changez-le ci-dessous.
          </p>
        )}

        {isCredentials ? (
          <>
            <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-zinc-900">Mes informations</h2>
              <ProfileForm firstName={user.firstName ?? ""} lastName={user.lastName ?? ""} />
            </section>

            <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-zinc-900">Mot de passe</h2>
              <ChangePasswordForm />
            </section>
          </>
        ) : (
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-600">
              Votre compte est géré par <strong>Google</strong> : votre nom et votre mot de passe se
              modifient depuis votre compte Google.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
