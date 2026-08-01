import { signOut } from "@/auth";
import { consumeAccountVerification } from "@/lib/accountVerification";

// « Se connecter » depuis cette page repart TOUJOURS d'une session propre : si un AUTRE
// compte est encore connecté dans ce navigateur, /connexion le renverrait vers l'accueil
// (voir connexion/page.tsx) au lieu d'afficher le formulaire. On déconnecte donc avant.
async function signOutToLogin() {
  "use server";
  await signOut({ redirectTo: "/connexion" });
}

// Page atteinte depuis le lien « Confirmer mon adresse » de l'e-mail de création de compte.
// Accessible SANS connexion (exclue du proxy) : le jeton fait office de preuve.
export default async function VerifierComptePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await consumeAccountVerification(token);

  const ok = result.state === "ok" || result.state === "deja";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-16">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 text-center">
        {ok && (
          <>
            <div className="text-4xl">✅</div>
            <h1 className="mt-3 text-xl font-semibold text-emerald-700">Adresse confirmée</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Votre compte est activé. Vous pouvez maintenant vous connecter.
            </p>
            <form action={signOutToLogin}>
              <button
                type="submit"
                className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
              >
                Se connecter
              </button>
            </form>
          </>
        )}

        {result.state === "expire" && (
          <>
            <h1 className="text-xl font-semibold text-amber-700">Lien expiré</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Ce lien de confirmation n&apos;est plus valable. Connectez-vous pour recevoir un nouvel
              e-mail de confirmation.
            </p>
            <form action={signOutToLogin}>
              <button
                type="submit"
                className="mt-6 inline-block rounded-lg border border-zinc-300 px-5 py-2.5 text-zinc-700 hover:bg-zinc-100"
              >
                Aller à la connexion
              </button>
            </form>
          </>
        )}

        {result.state === "invalide" && (
          <>
            <h1 className="text-xl font-semibold text-zinc-900">Lien invalide</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Ce lien de confirmation est inconnu : il a peut-être déjà été remplacé par un envoi plus
              récent.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
