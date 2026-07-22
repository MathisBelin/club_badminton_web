import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Confirmation après envoi d'une réponse.
export default async function MerciPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    select: { id: true, title: true, allowEditResponse: true },
  });
  if (!form) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <div className="text-4xl">✅</div>
          <h1 className="mt-3 text-xl font-semibold text-zinc-900">Réponse enregistrée</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Merci, votre réponse au formulaire « {form.title} » a bien été enregistrée.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Retour à l'accueil
            </Link>
            {form.allowEditResponse && (
              <Link
                href={`/forms/${form.id}`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Modifier ma réponse
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
