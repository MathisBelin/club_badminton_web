"use client";

import { useMemo, useState } from "react";
import { DeleteTemplateButton, UseTemplateButton } from "@/components/TemplateActions";

export type TemplateRow = {
  id: string;
  name: string;
  ownerEmail: string;
  createdAtLabel: string;
  formTitle: string;
  questionCount: number;
};

// Liste filtrable des modèles (recherche par nom ou titre de formulaire).
export default function TemplatesTable({ templates }: { templates: TemplateRow[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.formTitle.toLowerCase().includes(q),
    );
  }, [templates, query]);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un modèle (nom, titre)…"
          className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none"
        />
        <span className="text-xs text-zinc-500">
          {query.trim() ? `${shown.length} sur ${templates.length}` : `${templates.length} modèle(s)`}
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Aucun modèle ne correspond à cette recherche.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Modèle</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
                <th className="px-4 py-3 font-medium">Par</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{t.name}</div>
                    {t.formTitle && t.formTitle !== t.name && (
                      <div className="text-xs text-zinc-500">Titre du formulaire : {t.formTitle}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{t.questionCount}</td>
                  <td className="px-4 py-3 text-zinc-600">{t.createdAtLabel}</td>
                  <td className="px-4 py-3 text-zinc-600">{t.ownerEmail}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <UseTemplateButton templateId={t.id} />
                      <DeleteTemplateButton templateId={t.id} name={t.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
