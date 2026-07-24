"use client";

import { useState, useTransition } from "react";
import { cancelResponse } from "@/app/actions/responses";
import { Spinner } from "@/components/icons";

// Proposé lors de la modification d'une réponse : retire complètement l'inscription.
export default function CancelResponseButton({ formId }: { formId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelResponse(formId);
      // En cas de succès l'action redirige ; on ne reçoit ici que les erreurs.
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        Annuler mon inscription
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
            <h2 className="text-lg font-semibold text-zinc-900">Annuler votre inscription ?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Votre réponse sera <strong>définitivement supprimée</strong> et vous ne figurerez plus
              parmi les inscrits. Vous pourrez vous réinscrire plus tard en remplissant à nouveau le
              formulaire.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                Revenir
              </button>
              <button
                onClick={confirm}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending ? "Annulation…" : "Annuler mon inscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
