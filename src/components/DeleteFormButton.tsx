"use client";

import { useState, useTransition } from "react";
import { deleteForm } from "@/app/actions/forms";
import { TrashIcon } from "@/components/icons";

// Bouton « Supprimer » (icône) avec message d'avertissement : la suppression
// emporte les questions ET toutes les réponses déjà reçues.
export default function DeleteFormButton({
  formId,
  title,
  responseCount,
}: {
  formId: string;
  title: string;
  responseCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteForm(formId);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de la suppression.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Supprimer"
        aria-label="Supprimer"
        className="inline-flex items-center justify-center rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
      >
        <TrashIcon />
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
            <h2 className="text-lg font-semibold text-zinc-900">Supprimer ce formulaire ?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              « {title} » et ses questions seront définitivement supprimés
              {responseCount > 0 && (
                <>
                  , ainsi que <strong>{responseCount}</strong> réponse{responseCount > 1 ? "s" : ""} déjà
                  reçue{responseCount > 1 ? "s" : ""}
                </>
              )}
              . Cette action est irréversible.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={confirm}
                disabled={pending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
