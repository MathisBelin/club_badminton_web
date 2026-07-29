import Link from "next/link";
import { senderAddress } from "@/lib/mailer";
import ResendAccountVerification from "@/components/ResendAccountVerification";

// Page d'attente affichée juste après la création d'un compte quand la vérification
// d'e-mail est exigée : invite à confirmer l'adresse avant de pouvoir se connecter.
export default async function InscriptionVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; mail?: string }>;
}) {
  const { email, mail } = await searchParams;
  const mailFailed = mail === "ko";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">📧</div>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">Confirmez votre adresse</h1>

        {mailFailed ? (
          <p className="mt-3 text-sm text-amber-700">
            Votre compte a bien été créé, mais l&apos;e-mail de confirmation n&apos;a pas pu être
            envoyé. Réessayez ci-dessous ou contactez le club.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">
            Un e-mail de confirmation vient d&apos;être envoyé
            {email ? (
              <>
                {" "}à <span className="font-medium text-zinc-800">{email}</span>
              </>
            ) : null}{" "}
            (expéditeur : {senderAddress()}). Cliquez sur le lien qu&apos;il contient pour activer
            votre compte, puis connectez-vous.
          </p>
        )}

        {email && <ResendAccountVerification email={email} />}

        <p className="mt-6 text-sm">
          <Link href="/connexion" className="font-medium text-emerald-700 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
