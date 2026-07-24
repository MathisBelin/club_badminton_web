"use client";

import { useState, useTransition } from "react";
import { createForm, deleteTemplate } from "@/app/actions/forms";
import { Spinner, TrashIcon } from "@/components/icons";
import { NAV_START } from "@/components/NavigationProgress";

// Création d'un formulaire à partir d'un modèle (depuis la page « Modèles »).
export function UseTemplateButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        window.dispatchEvent(new Event(NAV_START));
        startTransition(() => createForm(templateId));
      }}
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
    >
      {pending && <Spinner className="h-3.5 w-3.5" />}
      {pending ? "Création…" : "Créer un formulaire"}
    </button>
  );
}

// Suppression d'un modèle, avec confirmation.
export function DeleteTemplateButton({ templateId, name }: { templateId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTemplate(templateId);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de la suppression.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Supprimer le modèle"
        aria-label="Supprimer le modèle"
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
            <h2 className="text-lg font-semibold text-zinc-900">Supprimer ce modèle ?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Le modèle « {name} » sera supprimé pour tous les admins. Les formulaires déjà créés à
              partir de ce modèle ne sont pas affectés.
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
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
