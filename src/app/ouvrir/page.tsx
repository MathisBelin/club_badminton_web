import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

// Point d'entrée ouvert DEPUIS l'application desktop (bouton « Ouvrir l'application web »).
// Le desktop passe l'e-mail du compte Google auquel il est connecté (?email=…).
// But : entrer sur le site avec CE compte, sans se retrouver silencieusement sur une
// autre session déjà ouverte dans le navigateur.
//
// PUBLIQUE (exclue du proxy) : la personne peut ne pas encore être connectée. La bascule
// de compte n'est jamais automatique : si une session d'un autre compte est ouverte, on
// propose explicitement de continuer avec le compte demandé (login_hint Google) ou de rester.

/// N'accepte qu'un chemin interne (évite une redirection ouverte via ?callbackUrl=).
function safePath(p?: string): string {
  if (p && p.startsWith("/") && !p.startsWith("//")) return p;
  return "/";
}

export default async function OuvrirPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; callbackUrl?: string }>;
}) {
  const { email, callbackUrl } = await searchParams;
  const target = safePath(callbackUrl);
  const hint = email?.trim().toLowerCase() ?? "";

  const session = await auth();
  const current = session?.user?.email ?? "";
  const currentLower = current.toLowerCase();

  // Déjà connecté au bon compte (ou aucun compte précis demandé mais une session existe) :
  // on entre directement, sans étape supplémentaire.
  if (currentLower && (!hint || currentLower === hint)) redirect(target);

  // Lance la connexion Google en présélectionnant le compte demandé (login_hint).
  async function continueWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: target }, hint ? { login_hint: hint } : undefined);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">🏸</div>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">Formulaires du club</h1>

        {current ? (
          <p className="mt-2 text-sm text-zinc-500">
            Vous êtes connecté en tant que <strong className="text-zinc-700">{current}</strong>.
            {hint && (
              <>
                {" "}
                Ouvrir plutôt en tant que <strong className="text-zinc-700">{hint}</strong> ?
              </>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            {hint ? (
              <>
                Connectez-vous en tant que <strong className="text-zinc-700">{hint}</strong> pour
                continuer.
              </>
            ) : (
              <>Connectez-vous pour accéder aux formulaires.</>
            )}
          </p>
        )}

        <form action={continueWithGoogle} className="mt-6">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <GoogleIcon />
            {hint ? `Continuer en tant que ${hint}` : "Continuer avec Google"}
          </button>
        </form>

        {current && (
          <Link
            href={target}
            className="mt-3 block rounded-lg px-4 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50"
          >
            Rester connecté en tant que {current}
          </Link>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
