import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ResendVerification from "@/components/ResendVerification";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { mailerConfigured, senderAddress } from "@/lib/mailer";

// Étape intermédiaire : la réponse n'est prise en compte qu'une fois la ou les
// adresses confirmées depuis l'e-mail reçu.
export default async function VerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const form = await prisma.form.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!form) notFound();

  const response = await prisma.response.findUnique({
    where: { formId_respondentEmail: { formId: form.id, respondentEmail: user.email } },
    select: { id: true },
  });
  if (!response) notFound();

  const pending = await prisma.emailVerification.findMany({
    where: { responseId: response.id, verifiedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  // Plus rien à confirmer : la réponse est prise en compte.
  if (pending.length === 0) redirect(`/forms/${form.id}/merci`);

  const plural = pending.length > 1;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <div className="rounded-xl border border-amber-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-zinc-900">
            Une dernière étape avant la prise en compte
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            Votre réponse au formulaire « {form.title} » ne sera <strong>prise en compte</strong>{" "}
            qu&apos;après confirmation de {plural ? "vos adresses e-mail" : "votre adresse e-mail"}.
          </p>
          <p className="mt-3 text-sm text-zinc-600">
            Un e-mail de confirmation a été envoyé de la part de{" "}
            <strong>{senderAddress()}</strong> {plural ? "aux adresses suivantes" : "à l'adresse suivante"} :
          </p>

          <ul className="mt-3 space-y-3">
            {pending.map((v) => (
              <li key={v.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                <div className="text-sm font-medium text-zinc-800">{v.email}</div>
                <div className="mt-2">
                  <ResendVerification formId={form.id} email={v.email} />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-zinc-600">
            Ouvrez cet e-mail puis cliquez sur <strong>« Vérifier mon adresse »</strong> : vous serez
            alors redirigé vers la confirmation de prise en compte. Le lien est valable 7 jours ; si
            vous ne recevez rien (pensez aux indésirables), utilisez le bouton de renvoi ci-dessus.
          </p>

          {!mailerConfigured() && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              L&apos;envoi d&apos;e-mails n&apos;est pas configuré sur ce site : contactez
              l&apos;administrateur du club.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Retour à l&apos;accueil
            </Link>
            <Link
              href={`/forms/${form.id}`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Revoir ma réponse
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
