import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Accueil utilisateur : uniquement les formulaires accessibles (publiés).
export default async function HomePage() {
  const user = await requireUser();

  const forms = await prisma.form.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      responses: { where: { respondentEmail: user.email }, select: { id: true } },
    },
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Formulaires disponibles</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sélectionnez un formulaire pour vous inscrire.
        </p>

        {forms.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
            Aucun formulaire n'est disponible pour le moment.
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {forms.map((f) => {
              const answered = f.responses.length > 0;
              return (
                <li key={f.id}>
                  <Link
                    href={`/forms/${f.id}`}
                    className="block h-full rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-medium text-zinc-900">{f.title}</h2>
                      {answered && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Répondu
                        </span>
                      )}
                    </div>
                    {f.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-zinc-500">{f.description}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
