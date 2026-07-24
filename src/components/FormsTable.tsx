"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CopyLinkButton } from "@/components/ShareLink";
import DeleteFormButton from "@/components/DeleteFormButton";
import BusyLink from "@/components/BusyLink";
import { DuplicateFormButton, PublishToggleButton } from "@/components/FormActions";
import { ChartIcon, EyeIcon, PencilIcon } from "@/components/icons";

const ICON_BTN =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";

export type FormRow = {
  id: string;
  title: string;
  labelName: string | null;
  statusLabel: string;
  statusBadge: string;
  questionCount: number;
  responseCount: number;
  isPublished: boolean;
};

// Liste filtrable des formulaires (recherche par titre ou libellé).
export default function FormsTable({ forms }: { forms: FormRow[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        (f.labelName?.toLowerCase().includes(q) ?? false),
    );
  }, [forms, query]);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un formulaire (titre, libellé)…"
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
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Réponses</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/forms/${f.id}/edit`}
                      className="font-medium text-zinc-900 hover:text-emerald-700"
                    >
                      {f.title}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {f.labelName ? `🏷 ${f.labelName}` : "🏷 aucun libellé"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.statusBadge}`}>
                      {f.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{f.questionCount}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    <Link
                      href={`/admin/forms/${f.id}/responses`}
                      className="text-emerald-700 hover:underline"
                    >
                      {f.responseCount}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/forms/${f.id}`}
                        target="_blank"
                        title="Aperçu"
                        aria-label="Aperçu"
                        className={ICON_BTN}
                      >
                        <EyeIcon />
                      </Link>
                      <BusyLink href={`/admin/forms/${f.id}/edit`} title="Modifier" className={ICON_BTN}>
                        <PencilIcon />
                      </BusyLink>
                      <BusyLink href={`/admin/forms/${f.id}/responses`} title="Réponses" className={ICON_BTN}>
                        <ChartIcon />
                      </BusyLink>
                      <DuplicateFormButton formId={f.id} className={ICON_BTN} />
                      <CopyLinkButton path={`/forms/${f.id}`} accessible={f.isPublished} />
                      <PublishToggleButton
                        formId={f.id}
                        isPublished={f.isPublished}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                      />
                      <DeleteFormButton formId={f.id} title={f.title} responseCount={f.responseCount} />
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
