"use client";

import { useState, useTransition } from "react";
import { setFormLabel } from "@/app/actions/forms";
import { syncLabelsFromGoogle, type ClubLabelOption } from "@/app/actions/labels";
import { Spinner } from "@/components/icons";

// Libellé Contacts d'un formulaire, modifiable depuis le constructeur.
// La liste est relue dans Google Contacts à l'ouverture (comme à la création).
export default function FormLabelPicker({
  formId,
  labelName,
  labelResource,
}: {
  formId: string;
  labelName: string | null;
  labelResource: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(labelName);
  const [labels, setLabels] = useState<ClubLabelOption[]>([]);
  const [choice, setChoice] = useState(labelResource ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function openDialog() {
    setOpen(true);
    setError(null);
    setLoading(true);
    const result = await syncLabelsFromGoogle();
    if (result.ok) {
      setLabels(result.labels);
      setChoice((c) =>
        result.labels.some((l) => l.resourceName === c) ? c : (result.labels[0]?.resourceName ?? ""),
      );
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await setFormLabel(formId, choice);
        setCurrent(labels.find((l) => l.resourceName === choice)?.name ?? null);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de l'enregistrement.");
      }
    });
  }

  return (
    <>
      <button
        onClick={openDialog}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        title="Libellé Contacts vers lequel ce formulaire inscrit"
      >
        🏷 {current ?? "Aucun libellé"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-zinc-900">Libellé du formulaire</h2>
            <p className="mt-2 text-xs text-zinc-500">
              Les membres de ce libellé sont considérés comme déjà inscrits : ils ne peuvent plus
              modifier leur réponse. Changer de libellé change donc qui est bloqué.
            </p>

            <div className="mt-4">
              {loading ? (
                <p className="flex items-center gap-2 px-1 py-2 text-xs text-zinc-500">
                  <Spinner />
                  Lecture des libellés Google Contacts…
                </p>
              ) : labels.length === 0 ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {error ?? "Aucun libellé dans vos contacts Google."}
                </p>
              ) : (
                <select
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  aria-label="Libellé Contacts"
                  className="w-full rounded-md border border-zinc-300 bg-white p-2 text-sm outline-none focus:border-emerald-400"
                >
                  {labels.map((l) => (
                    <option key={l.resourceName} value={l.resourceName}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && labels.length > 0 && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={pending || loading || !choice}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
