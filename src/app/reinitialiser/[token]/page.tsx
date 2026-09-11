import Link from "next/link";
import { verifyResetToken } from "@/lib/passwordReset";
import ConfirmResetForm from "@/components/ConfirmResetForm";

// Page PUBLIQUE ouverte depuis le lien « mot de passe oublié » (le jeton signé fait preuve).
// La vérification ci-dessous est en LECTURE SEULE : le mot de passe n'est changé qu'au clic
// sur le bouton de confirmation (évite qu'un anti-virus/prefetch de messagerie le change).
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = await verifyResetToken(token);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">🔑</div>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">Réinitialiser le mot de passe</h1>

        {valid ? (
          <ConfirmResetForm token={token} />
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-600">
              Ce lien est invalide ou a expiré (valable 1 heure et une seule fois).
            </p>
            <Link
              href="/connexion"
              className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
