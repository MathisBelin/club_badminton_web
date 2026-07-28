import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import PublicFormsList from "@/components/PublicFormsList";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/session";

// Accueil. Tout le monde (admins compris) voit la liste des formulaires ACCESSIBLES du club
// (tous propriétaires confondus), avec une recherche par nom et un badge « déjà répondu » selon
// que le compte connecté a déjà une réponse. On peut aussi y accéder par le lien de partage.
export default async function HomePage() {
  const user = await requireUser();
  const admin = isAdmin(user.email);

  const forms = await prisma.form.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      headerImageUrl: true,
    },
  });

  // Formulaires auxquels le compte connecté a DÉJÀ répondu (une Response existe).
  const responded = forms.length
    ? await prisma.response.findMany({
        where: { respondentEmail: user.email, formId: { in: forms.map((f) => f.id) } },
        select: { formId: true },
      })
    : [];
  const respondedIds = new Set(responded.map((r) => r.formId));

  const cards = forms.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    headerImageUrl: f.headerImageUrl,
    hasResponded: respondedIds.has(f.id),
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Formulaires disponibles</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {"Les formulaires d'inscription actuellement en ligne. Cliquez sur l'un d'eux pour vous " +
            "inscrire ou modifier votre réponse — vous êtes déjà connecté."}
          {admin && (
            <>
              {" "}
              <Link href="/admin" className="text-emerald-700 hover:underline">
                Administration
              </Link>
            </>
          )}
        </p>

        {cards.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            {"Aucun formulaire disponible pour le moment. Le club pourra aussi vous communiquer un " +
              "lien direct par e-mail ou sur le groupe."}
            {admin && (
              <>
                {" "}
                <Link href="/admin" className="text-emerald-700 hover:underline">
                  Aller à l&apos;administration
                </Link>
              </>
            )}
          </div>
        ) : (
          <PublicFormsList forms={cards} />
        )}

        <p className="mt-6 text-xs text-zinc-400">Connecté en tant que {user.email}</p>
      </main>
    </>
  );
}
