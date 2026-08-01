import { signIn } from "@/auth";
import OpenExternal from "@/components/OpenExternal";

// Point d'entrée ouvert DEPUIS l'application desktop (bouton « Écrire un mail »).
// But : ouvrir la fenêtre de composition Gmail AVEC le compte connecté à l'appli, en
// passant d'abord par un bouton « Continuer en tant que … » (connexion Google), comme
// la page /ouvrir. La connexion Google réauthentifie le navigateur sur ce compte, si
// bien que Gmail s'ouvre ensuite avec la bonne adresse.
//
// PUBLIQUE (exclue du proxy). Paramètres passés par le desktop :
//   email = adresse expéditrice (compte connecté à l'appli) ; to / su / body = brouillon.
//   go=1  = étape de RETOUR après la connexion Google → on ouvre Gmail.

/// Construit l'URL de composition Gmail ciblant le compte <email>.
/// On utilise `authuser=<email>` (et non `/u/<index>/`) : c'est le sélecteur de compte
/// par ADRESSE dans un navigateur connecté à plusieurs comptes. Le segment `/u/<email>/`
/// n'est pas fiable (Gmail retombe sur le compte par défaut), d'où l'ouverture du mauvais compte.
function gmailComposeUrl(email: string, to?: string, su?: string, body?: string): string {
  const base = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(email)}&view=cm&fs=1`;
  const parts: string[] = [];
  if (to) parts.push(`to=${encodeURIComponent(to)}`);
  if (su) parts.push(`su=${encodeURIComponent(su)}`);
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  return parts.length ? `${base}&${parts.join("&")}` : base;
}

export default async function OuvrirMailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; to?: string; su?: string; body?: string; go?: string }>;
}) {
  const { email, to, su, body, go } = await searchParams;
  const hint = (email ?? "").trim();

  // Étape de retour après la connexion Google : on ouvre la composition Gmail.
  if (go === "1" && hint) {
    return <OpenExternal url={gmailComposeUrl(hint, to, su, body)} label={hint} />;
  }

  // Lance la connexion Google (compte présélectionné via login_hint), puis revient
  // sur cette même page avec go=1 pour ouvrir Gmail.
  async function continueWithGoogle() {
    "use server";
    const qs = new URLSearchParams();
    if (hint) qs.set("email", hint);
    if (to) qs.set("to", to);
    if (su) qs.set("su", su);
    if (body) qs.set("body", body);
    qs.set("go", "1");
    await signIn(
      "google",
      { redirectTo: `/ouvrir-mail?${qs.toString()}` },
      hint ? { login_hint: hint } : undefined,
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">📧</div>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">Écrire un e-mail</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {hint ? (
            <>
              Connectez-vous avec <strong className="text-zinc-700">{hint}</strong> pour ouvrir Gmail
              avec ce compte.
            </>
          ) : (
            <>Connectez-vous pour ouvrir Gmail.</>
          )}
        </p>

        <form action={continueWithGoogle} className="mt-6">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <GoogleIcon />
            {hint ? `Continuer en tant que ${hint}` : "Continuer avec Google"}
          </button>
        </form>
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
