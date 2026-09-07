"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateResponseAnswers } from "@/app/actions/responses";
import { Spinner } from "@/components/icons";

type Field = { questionId: string; title: string; value: string };

// Correction, par un admin, de la saisie d'un répondant (fautes de frappe) : ouvre une
// fenêtre avec un champ par question et enregistre les valeurs modifiées.
export default function EditResponseButton({
  formId,
  responseId,
  respondentName,
  fields,
}: {
  formId: string;
  responseId: string;
  respondentName: string;
  fields: Field[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    // On repart des valeurs actuelles à chaque ouverture.
    setValues(Object.fromEntries(fields.map((f) => [f.questionId, f.value])));
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    const answers = fields
      .map((f) => ({ questionId: f.questionId, value: values[f.questionId] ?? "" }))
      .filter((a) => a.value !== (fields.find((f) => f.questionId === a.questionId)?.value ?? ""));

    if (answers.length === 0) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await updateResponseAnswers({ formId, responseId, answers });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        title="Corriger la saisie de ce répondant"
      >
        ✎ Modifier
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-zinc-900">Modifier la saisie</h2>
            <p className="mt-1 text-sm text-zinc-500">{respondentName}</p>

            <div className="mt-4 space-y-4">
              {fields.map((f) => {
                const multiline = (values[f.questionId] ?? "").includes("\n");
                return (
                  <label key={f.questionId} className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-700">{f.title}</span>
                    {multiline ? (
                      <textarea
                        value={values[f.questionId] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.questionId]: e.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[f.questionId] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.questionId]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
                      />
                    )}
                  </label>
                );
              })}
            </div>

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
                onClick={save}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
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
