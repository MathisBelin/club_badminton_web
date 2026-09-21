import Link from "next/link";
import { senderAddress } from "@/lib/mailer";
import VerifyAccountForm from "@/components/VerifyAccountForm";
import ResendAccountVerification from "@/components/ResendAccountVerification";

// Page affichée juste après la création d'un compte : la personne saisit le CODE reçu
// par e-mail pour confirmer son adresse avant de pouvoir se connecter.
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
            Votre compte a bien été créé, mais l&apos;e-mail contenant le code n&apos;a pas pu être
            envoyé. Renvoyez-le ci-dessous ou contactez le club.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">
            Un code de confirmation vient d&apos;être envoyé
            {email ? (
              <>
                {" "}à <span className="font-medium text-zinc-800">{email}</span>
              </>
            ) : null}{" "}
            (expéditeur : {senderAddress()}). Saisissez-le ci-dessous pour activer votre compte.
          </p>
        )}

        {email ? (
          <>
            <VerifyAccountForm email={email} />

            <p className="mt-6 text-sm text-zinc-500">
              Vous ne voyez pas l&apos;e-mail ? Vérifiez vos courriers indésirables (spam), ou
              renvoyez un code :
            </p>
            <ResendAccountVerification email={email} />
          </>
        ) : (
          <p className="mt-4 text-sm text-zinc-600">
            Retournez à l&apos;inscription pour créer votre compte et recevoir un code.
          </p>
        )}

        <p className="mt-6 text-sm">
          <Link href="/connexion" className="font-medium text-emerald-700 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
