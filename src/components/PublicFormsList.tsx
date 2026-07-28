"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type PublicFormCard = {
  id: string;
  title: string;
  description: string | null;
  headerImageUrl: string | null;
  hasResponded: boolean;
};

// Liste filtrable (recherche par nom) des formulaires accessibles, présentée aux utilisateurs.
// Le filtrage est fait côté client sur la liste fournie par le serveur (comme FormsTable).
export default function PublicFormsList({ forms }: { forms: PublicFormCard[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter((f) => f.title.toLowerCase().includes(q));
  }, [forms, query]);

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un formulaire par nom…"
          aria-label="Rechercher un formulaire par nom"
          className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none"
        />
        <span className="text-xs text-zinc-500">
          {query.trim() ? `${shown.length} sur ${forms.length}` : `${forms.length} formulaire(s)`}
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Aucun formulaire ne correspond à cette recherche.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {shown.map((f) => (
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
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-medium text-zinc-900">{f.title}</h2>
                    {f.hasResponded && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        ✓ Déjà répondu
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-500">{f.description}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
