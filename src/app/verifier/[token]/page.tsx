import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Page atteinte depuis le lien « Vérifier mon adresse » d'un e-mail.
// Accessible SANS connexion (exclue du proxy) : le jeton fait office de preuve,
// car le lien est ouvert depuis la messagerie de l'adresse à vérifier.
type VerifyState =
  | { state: "ok"; formId: string }
  | { state: "expire" }
  | { state: "invalide" };

/// Consomme le jeton : marque l'adresse comme vérifiée si le lien est encore valable.
async function consumeToken(token: string): Promise<VerifyState> {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      verifiedAt: true,
      response: { select: { formId: true } },
    },
  });

  // Réponse annulée entre-temps : le lien n'a plus d'objet.
  if (!verification || !verification.response) return { state: "invalide" };

  const expired = verification.expiresAt.getTime() < Date.now();
  if (!verification.verifiedAt) {
    if (expired) return { state: "expire" };
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() },
    });
  }

  return { state: "ok", formId: verification.response.formId };
}

export default async function VerifierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await consumeToken(token);

  // Adresse confirmée : on renvoie vers la page de confirmation habituelle.
  if (result.state === "ok") redirect(`/forms/${result.formId}/merci`);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-16">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 text-center">
        {result.state === "expire" && (
          <>
            <h1 className="text-xl font-semibold text-amber-700">Lien expiré</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Ce lien de vérification n&apos;est plus valable. Renvoyez le formulaire pour recevoir un
              nouvel e-mail de confirmation.
            </p>
          </>
        )}

        {result.state === "invalide" && (
          <>
            <h1 className="text-xl font-semibold text-zinc-900">Lien invalide</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Ce lien de vérification est inconnu : il a peut-être déjà été remplacé par un envoi plus
              récent du formulaire.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
