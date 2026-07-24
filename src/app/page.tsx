import Image from "next/image";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/session";

// Accueil. Les formulaires ne sont PAS listés aux utilisateurs : ils y accèdent
// uniquement par le lien de partage reçu. Seul un admin voit ici ses formulaires
// accessibles (raccourci vers l'administration).
export default async function HomePage() {
  const user = await requireUser();
  const admin = isAdmin(user.email);

  if (!admin) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
          <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">Formulaires du club</h1>
            <p className="mt-3 text-sm text-zinc-600">
              {"Les formulaires d'inscription s'ouvrent avec le lien communiqué par le club " +
                "(par e-mail ou sur le groupe). Ouvrez ce lien pour accéder au formulaire ; " +
                "vous êtes déjà connecté, il n'y aura rien d'autre à faire."}
            </p>
            <p className="mt-3 text-xs text-zinc-400">Connecté en tant que {user.email}</p>
          </div>
        </main>
      </>
    );
  }

  const forms = await prisma.form.findMany({
    where: { isPublished: true, ownerEmail: user.email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      headerImageUrl: true,
    },
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Formulaires accessibles</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Vos formulaires en ligne. Les adhérents y accèdent uniquement par le lien de partage.
        </p>

        {forms.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
            Aucun formulaire accessible pour le moment.{" "}
            <Link href="/admin" className="text-emerald-700 hover:underline">
              Aller à l&apos;administration
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {forms.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/forms/${f.id}`}
                  className="block h-full overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-emerald-400 hover:shadow-sm"
                >
                  {f.headerImageUrl && (
                    <Image
                      src={f.headerImageUrl}
                      alt=""
                      width={800}
                      height={200}
                      className="h-28 w-full bg-zinc-50 object-contain"
                      unoptimized
                    />
                  )}
                  <div className="p-5">
                    <h2 className="font-medium text-zinc-900">{f.title}</h2>
                    {f.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-zinc-500">{f.description}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
